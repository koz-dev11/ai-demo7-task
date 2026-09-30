import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib/core";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Construct } from "constructs";

export class AiDemo7ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const membersTable = new dynamodb.Table(this, "MembersTable", {
      tableName: `${this.stackName}-members`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const tasksTable = new dynamodb.Table(this, "TasksTable", {
      tableName: `${this.stackName}-tasks`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    const distribution = new cloudfront.Distribution(this, "FrontendDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const caBundle = path.join(__dirname, "../.ca-bundle.pem");
    const apiFn = new PythonFunction(this, "ApiFunction", {
      runtime: Runtime.PYTHON_3_12,
      entry: path.join(__dirname, "../../backend"),
      index: "main.py",
      handler: "handler",
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
        TASKS_TABLE: tasksTable.tableName,
      },
      timeout: cdk.Duration.seconds(15),
      logGroup,
      bundling: {
        assetExcludes: [".venv", "__pycache__", "*.pyc", "tests", ".pytest_cache"],
        ...(fs.existsSync(caBundle)
          ? {
              volumes: [{ hostPath: caBundle, containerPath: "/tmp/host-ca.pem" }],
              commandHooks: {
                beforeBundling(): string[] {
                  return [
                    "ca=''; if [ -f /etc/pki/tls/certs/ca-bundle.crt ]; then ca=/etc/pki/tls/certs/ca-bundle.crt; elif [ -f /etc/ssl/certs/ca-certificates.crt ]; then ca=/etc/ssl/certs/ca-certificates.crt; fi; if [ -n \"$ca\" ] && [ -f /tmp/host-ca.pem ]; then cat \"$ca\" /tmp/host-ca.pem > /tmp/combined-ca.pem && export PIP_CERT=/tmp/combined-ca.pem && export SSL_CERT_FILE=/tmp/combined-ca.pem && export REQUESTS_CA_BUNDLE=/tmp/combined-ca.pem && export CURL_CA_BUNDLE=/tmp/combined-ca.pem; fi",
                  ];
                },
                afterBundling(): string[] {
                  return [];
                },
              },
            }
          : {}),
      },
    });
    membersTable.grantReadWriteData(apiFn);
    tasksTable.grantReadWriteData(apiFn);

    const apiIntegration = new HttpLambdaIntegration("ApiIntegration", apiFn);
    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "ai-demo7-task-api",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["content-type"],
      },
    });
    httpApi.addRoutes({
      path: "/api/members",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: apiIntegration,
    });
    httpApi.addRoutes({
      path: "/api/members/{id}",
      methods: [HttpMethod.DELETE],
      integration: apiIntegration,
    });
    httpApi.addRoutes({
      path: "/api/tasks",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: apiIntegration,
    });
    httpApi.addRoutes({
      path: "/api/tasks/{id}",
      methods: [HttpMethod.GET, HttpMethod.DELETE, HttpMethod.PATCH],
      integration: apiIntegration,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: (httpApi.apiEndpoint ?? "").replace(/\/$/, ""),
    });
    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
    });
  }
}

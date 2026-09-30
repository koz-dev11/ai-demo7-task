import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

import main

MEMBER_KEYS = {"id", "name", "createdAt"}
TASK_KEYS = {"id", "title", "assigneeId", "done", "createdAt", "body", "dueOn", "completedAt"}


def test_openapi_has_only_stage_one_routes(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == {
        "/api/members",
        "/api/members/{member_id}",
        "/api/tasks",
        "/api/tasks/{task_id}",
    }
    task_methods = paths["/api/tasks/{task_id}"]
    assert "get" in task_methods
    assert "delete" in task_methods
    assert "patch" in task_methods
    assert "patch" not in paths["/api/members"]
    assert "patch" not in paths["/api/members/{member_id}"]
    assert "patch" not in paths["/api/tasks"]


def test_empty_lists(client: TestClient) -> None:
    assert client.get("/api/members").json() == []
    assert client.get("/api/tasks").json() == []
    assert client.get("/api/members").status_code == 200
    assert client.get("/api/tasks").status_code == 200


def test_create_member_and_reject_empty_name(client: TestClient) -> None:
    created = client.post("/api/members", json={"name": " 花子 "})
    assert created.status_code == 201
    body = created.json()
    assert set(body) == MEMBER_KEYS
    assert body["name"] == "花子"
    assert body["createdAt"].endswith("Z")

    before = dict(main.members)
    for payload in ({}, {"name": ""}, {"name": "   "}):
        rejected = client.post("/api/members", json=payload)
        assert rejected.status_code == 422
        assert main.members == before


def test_duplicate_names_are_allowed(client: TestClient) -> None:
    first = client.post("/api/members", json={"name": "同名"})
    second = client.post("/api/members", json={"name": "同名"})
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


def test_member_list_is_created_at_desc(client: TestClient) -> None:
    older = client.post("/api/members", json={"name": "先"}).json()
    newer = client.post("/api/members", json={"name": "後"}).json()
    listed = client.get("/api/members").json()
    assert [item["id"] for item in listed] == [newer["id"], older["id"]]


def test_same_created_at_members_sort_by_id(client: TestClient) -> None:
    main.members["m-b"] = {"id": "m-b", "name": "後", "createdAt": "2026-01-01T00:00:00Z"}
    main.members["m-a"] = {"id": "m-a", "name": "先", "createdAt": "2026-01-01T00:00:00Z"}
    listed = client.get("/api/members").json()
    assert [item["id"] for item in listed] == ["m-a", "m-b"]


def test_task_requires_a_member_and_ignores_client_fields(client: TestClient) -> None:
    before_members = dict(main.members)
    before_tasks = dict(main.tasks)
    rejected = client.post("/api/tasks", json={"title": "仕事"})
    assert rejected.status_code == 422
    assert main.members == before_members
    assert main.tasks == before_tasks

    member = client.post("/api/members", json={"name": "担当"}).json()
    created = client.post(
        "/api/tasks",
        json={"title": " 資料 ", "assigneeId": "client-id", "done": True, "name": "入れない"},
    )
    assert created.status_code == 201
    body = created.json()
    assert set(body) == TASK_KEYS
    assert "name" not in body
    assert body["title"] == "資料"
    assert body["assigneeId"] == member["id"]
    assert body["done"] is False
    assert body["body"] == ""
    assert body["dueOn"] is None
    assert body["completedAt"] is None
    assert body["createdAt"].endswith("Z")

    before = (dict(main.members), dict(main.tasks))
    for payload in ({}, {"title": ""}, {"title": "  "}):
        assert client.post("/api/tasks", json=payload).status_code == 422
        assert (dict(main.members), dict(main.tasks)) == before


def test_assignment_picks_fewer_then_older_then_id(client: TestClient) -> None:
    older = client.post("/api/members", json={"name": "古"}).json()
    newer = client.post("/api/members", json={"name": "新"}).json()
    first = client.post("/api/tasks", json={"title": "1"}).json()
    assert first["assigneeId"] == older["id"]
    second = client.post("/api/tasks", json={"title": "2"}).json()
    assert second["assigneeId"] == newer["id"]

    main.members.clear()
    main.tasks.clear()
    main.members["id-b"] = {"id": "id-b", "name": "B", "createdAt": "2026-01-02T00:00:00Z"}
    main.members["id-a"] = {"id": "id-a", "name": "A", "createdAt": "2026-01-02T00:00:00Z"}
    tied = client.post("/api/tasks", json={"title": "同着"}).json()
    assert tied["assigneeId"] == "id-a"

    main.tasks.clear()
    main.members["id-old"] = {"id": "id-old", "name": "旧", "createdAt": "2026-01-01T00:00:00Z"}
    main.members["id-new"] = {"id": "id-new", "name": "新", "createdAt": "2026-01-03T00:00:00Z"}
    older_wins = client.post("/api/tasks", json={"title": "古い方"}).json()
    assert older_wins["assigneeId"] == "id-old"


def test_task_list_order_and_missing_task(client: TestClient) -> None:
    client.post("/api/members", json={"name": "担当"})
    older = client.post("/api/tasks", json={"title": "古"}).json()
    newer = client.post("/api/tasks", json={"title": "新"}).json()
    listed = client.get("/api/tasks").json()
    assert [item["id"] for item in listed] == [newer["id"], older["id"]]
    assert "name" not in listed[0]

    missing = client.get("/api/tasks/missing")
    assert missing.status_code == 404
    assert main.tasks


def test_delete_member_blocked_by_task_and_delete_task_keeps_other_assignee(client: TestClient) -> None:
    first = client.post("/api/members", json={"name": "甲"}).json()
    second = client.post("/api/members", json={"name": "乙"}).json()
    kept = client.post("/api/tasks", json={"title": "残す"}).json()
    removed = client.post("/api/tasks", json={"title": "消す"}).json()
    assert kept["assigneeId"] == first["id"]
    assert removed["assigneeId"] == second["id"]

    before_members = dict(main.members)
    before_tasks = dict(main.tasks)
    blocked = client.delete(f"/api/members/{first['id']}")
    assert blocked.status_code == 422
    assert main.members == before_members
    assert main.tasks == before_tasks
    assert client.get("/api/tasks").json()

    deleted = client.delete(f"/api/tasks/{removed['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/tasks/{removed['id']}").status_code == 404
    surviving = client.get(f"/api/tasks/{kept['id']}").json()
    assert surviving["assigneeId"] == kept["assigneeId"]

    freed = client.delete(f"/api/members/{second['id']}")
    assert freed.status_code == 204
    assert all(item["id"] != second["id"] for item in client.get("/api/members").json())
    assert client.delete("/api/members/missing").status_code == 404
    assert client.delete("/api/tasks/missing").status_code == 404


def test_same_created_at_tasks_sort_by_id(client: TestClient) -> None:
    main.tasks["t-b"] = {
        "id": "t-b",
        "title": "B",
        "assigneeId": "m",
        "done": False,
        "createdAt": "2026-01-01T00:00:00Z",
    }
    main.tasks["t-a"] = {
        "id": "t-a",
        "title": "A",
        "assigneeId": "m",
        "done": False,
        "createdAt": "2026-01-01T00:00:00Z",
    }
    listed = client.get("/api/tasks").json()
    assert [item["id"] for item in listed] == ["t-a", "t-b"]


def _store_snapshot() -> tuple[dict, dict]:
    return (
        {key: dict(value) for key, value in main.members.items()},
        {key: dict(value) for key, value in main.tasks.items()},
    )


def test_patch_updates_only_sent_fields(client: TestClient) -> None:
    older = client.post("/api/members", json={"name": "古"}).json()
    newer = client.post("/api/members", json={"name": "新"}).json()
    first = client.post("/api/tasks", json={"title": "先", "assigneeId": "捨てる", "done": True}).json()
    second = client.post("/api/tasks", json={"title": "後"}).json()
    assert first["done"] is False
    assert first["assigneeId"] == older["id"]
    assert second["assigneeId"] == newer["id"]

    same = client.patch(f"/api/tasks/{first['id']}", json={"assigneeId": first["assigneeId"]})
    assert same.status_code == 200
    assert set(same.json()) == TASK_KEYS
    assert "name" not in same.json()

    assignee_only = client.patch(f"/api/tasks/{first['id']}", json={"assigneeId": newer["id"]})
    assert assignee_only.status_code == 200
    body = assignee_only.json()
    assert set(body) == TASK_KEYS
    assert body["assigneeId"] == newer["id"]
    assert body["done"] is False
    assert body["id"] == first["id"]
    assert body["title"] == first["title"]
    assert body["createdAt"] == first["createdAt"]
    other = client.get(f"/api/tasks/{second['id']}").json()
    assert other["assigneeId"] == second["assigneeId"]
    assert other["done"] is False

    done_only = client.patch(f"/api/tasks/{first['id']}", json={"done": True})
    assert done_only.status_code == 200
    done_body = done_only.json()
    assert done_body["done"] is True
    assert done_body["assigneeId"] == newer["id"]
    assert done_body["id"] == first["id"]
    assert done_body["title"] == first["title"]
    assert done_body["createdAt"] == first["createdAt"]
    assert client.get(f"/api/tasks/{second['id']}").json() == {
        **second,
        "assigneeId": second["assigneeId"],
    }

    client.patch(f"/api/tasks/{first['id']}", json={"assigneeId": older["id"], "done": False})
    client.patch(f"/api/tasks/{second['id']}", json={"done": True})
    created = client.post("/api/tasks", json={"title": "割当"}).json()
    assert created["assigneeId"] == newer["id"]
    assert created["done"] is False
    assert client.get(f"/api/tasks/{first['id']}").json()["assigneeId"] == older["id"]
    assert client.get(f"/api/tasks/{first['id']}").json()["done"] is False
    assert client.get(f"/api/tasks/{second['id']}").json()["assigneeId"] == newer["id"]
    assert client.get(f"/api/tasks/{second['id']}").json()["done"] is True

    client.patch(f"/api/tasks/{created['id']}", json={"assigneeId": older["id"]})
    before = _store_snapshot()
    blocked = client.delete(f"/api/members/{newer['id']}")
    assert blocked.status_code == 422
    assert _store_snapshot() == before


def test_patch_rejects_invalid_body_without_changing_store(client: TestClient) -> None:
    member = client.post("/api/members", json={"name": "担当"}).json()
    task = client.post("/api/tasks", json={"title": "仕事"}).json()
    other = client.post("/api/members", json={"name": "別"}).json()
    kept = client.post("/api/tasks", json={"title": "残す"}).json()

    before = _store_snapshot()
    for payload in (
        {},
        {"title": "変えない", "id": "x", "createdAt": "y"},
        {"assigneeId": ""},
        {"assigneeId": "   "},
        {"assigneeId": "missing"},
        {"assigneeId": 1},
        {"done": "true"},
        {"done": 1},
        {"done": None},
        {"done": True, "assigneeId": "missing"},
    ):
        rejected = client.patch(f"/api/tasks/{task['id']}", json=payload)
        assert rejected.status_code == 422
        assert _store_snapshot() == before

    changed = client.patch(
        f"/api/tasks/{task['id']}",
        json={
            "assigneeId": other["id"],
            "id": "other",
            "title": "捨てる",
            "createdAt": "2000-01-01T00:00:00Z",
            "name": "入れない",
        },
    )
    assert changed.status_code == 200
    body = changed.json()
    assert set(body) == TASK_KEYS
    assert body["assigneeId"] == other["id"]
    assert body["id"] == task["id"]
    assert body["title"] == task["title"]
    assert body["createdAt"] == task["createdAt"]
    assert body["done"] is False
    assert client.get(f"/api/tasks/{kept['id']}").json()["assigneeId"] == kept["assigneeId"]

    missing = client.patch("/api/tasks/missing", json={"done": True})
    assert missing.status_code == 404
    invalid_missing = client.patch("/api/tasks/missing", json={"assigneeId": ""})
    assert invalid_missing.status_code == 404
    assert client.get(f"/api/tasks/{task['id']}").json()["assigneeId"] == other["id"]
    assert task["assigneeId"] == member["id"]


def test_task_body_and_due_on_and_missing_keys(client: TestClient) -> None:
    client.post("/api/members", json={"name": "担当"})
    created = client.post(
        "/api/tasks",
        json={
            "title": "資料",
            "body": "  一行目\n二行目  ",
            "dueOn": "2026-09-28",
            "completedAt": "2000-01-01T00:00:00Z",
            "assigneeId": "捨てる",
            "done": True,
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["body"] == "一行目\n二行目"
    assert body["dueOn"] == "2026-09-28"
    assert body["done"] is False
    assert body["completedAt"] is None
    assert "body" in main.tasks[body["id"]]
    assert "completedAt" not in main.tasks[body["id"]]

    main.tasks["old"] = {
        "id": "old",
        "title": "古い",
        "assigneeId": "m",
        "done": False,
        "createdAt": "2026-01-01T00:00:00Z",
    }
    stored = dict(main.tasks["old"])
    loaded = client.get("/api/tasks/old").json()
    assert loaded["body"] == ""
    assert loaded["dueOn"] is None
    assert loaded["completedAt"] is None
    assert main.tasks["old"] == stored

    before = _store_snapshot()
    for payload in (
        {"title": "題", "body": 1},
        {"title": "題", "body": None},
        {"title": "題", "dueOn": "2026-02-31"},
        {"title": "題", "dueOn": "2026-9-1"},
        {"title": "題", "dueOn": 20260929},
    ):
        rejected = client.post("/api/tasks", json=payload)
        assert rejected.status_code == 422
        assert _store_snapshot() == before


def test_patch_body_due_and_completed_at(client: TestClient) -> None:
    client.post("/api/members", json={"name": "担当"})
    task = client.post("/api/tasks", json={"title": "仕事", "dueOn": "2026-09-28", "body": "元"}).json()

    kept = client.patch(f"/api/tasks/{task['id']}", json={"body": "新しい"})
    assert kept.status_code == 200
    assert kept.json()["body"] == "新しい"
    assert kept.json()["dueOn"] == "2026-09-28"
    assert kept.json()["completedAt"] is None

    cleared = client.patch(f"/api/tasks/{task['id']}", json={"dueOn": ""})
    assert cleared.status_code == 200
    assert cleared.json()["dueOn"] is None
    assert "dueOn" not in main.tasks[task["id"]]
    client.patch(f"/api/tasks/{task['id']}", json={"dueOn": "2026-09-28"})
    nulled = client.patch(f"/api/tasks/{task['id']}", json={"dueOn": None})
    assert nulled.json()["dueOn"] is None

    before = _store_snapshot()
    for payload in (
        {"completedAt": "2000-01-01T00:00:00Z"},
        {"id": "x", "title": "変える", "createdAt": "y", "completedAt": "z"},
        {"body": 1, "dueOn": "2026-09-28"},
        {"dueOn": "昨日", "body": "妥当"},
    ):
        assert client.patch(f"/api/tasks/{task['id']}", json=payload).status_code == 422
        assert _store_snapshot() == before

    done = client.patch(
        f"/api/tasks/{task['id']}",
        json={"done": True, "completedAt": "1999-01-01T00:00:00Z"},
    )
    assert done.status_code == 200
    assert done.json()["done"] is True
    assert done.json()["completedAt"].endswith("Z")
    assert done.json()["completedAt"] != "1999-01-01T00:00:00Z"
    stamped = done.json()["completedAt"]

    again = client.patch(f"/api/tasks/{task['id']}", json={"done": True, "body": "維持"})
    assert again.json()["completedAt"] == stamped
    assert again.json()["body"] == "維持"

    undone = client.patch(f"/api/tasks/{task['id']}", json={"done": False})
    assert undone.json()["done"] is False
    assert undone.json()["completedAt"] is None

    missing = client.patch("/api/tasks/missing", json={"body": "無い"})
    assert missing.status_code == 404
    assert client.patch("/api/tasks/missing", json={"body": 1}).status_code == 404


def test_startup_fails_when_only_one_table_is_set() -> None:
    backend = Path(__file__).resolve().parents[1]
    for key in ("MEMBERS_TABLE", "TASKS_TABLE"):
        env = os.environ.copy()
        env.pop("MEMBERS_TABLE", None)
        env.pop("TASKS_TABLE", None)
        env[key] = "demo-table"
        completed = subprocess.run(
            [sys.executable, "-c", "import main"],
            cwd=backend,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert completed.returncode != 0
        assert "MEMBERS_TABLE" in completed.stderr

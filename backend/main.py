import json
import os
import threading
from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from mangum import Mangum
from pydantic import BaseModel, ConfigDict, field_validator

MEMBER_KEYS = ("id", "name", "createdAt")
TASK_KEYS = ("id", "title", "assigneeId", "done", "createdAt", "body", "dueOn", "completedAt")


def _configured(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return None
    return value


def assert_tables_configured() -> None:
    members = _configured("MEMBERS_TABLE")
    tasks = _configured("TASKS_TABLE")
    if (members is None) != (tasks is None):
        raise RuntimeError(
            "MEMBERS_TABLE と TASKS_TABLE は、両方設定するか、両方未設定にしてください"
        )


assert_tables_configured()

app = FastAPI()
handler = Mangum(app, lifespan="off")

members: dict[str, dict] = {}
tasks: dict[str, dict] = {}
_lock = threading.Lock()


class MemberCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("name は必須です")
        return value


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    body: str = ""
    dueOn: str | None = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("title は必須です")
        return value

    @field_validator("body", mode="before")
    @classmethod
    def strip_body(cls, value: object) -> object:
        if not isinstance(value, str):
            raise ValueError("body が不正です")
        return value.strip()

    @field_validator("dueOn", mode="before")
    @classmethod
    def parse_due_on(cls, value: object) -> object:
        return _due_on_value(value)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _due_on_value(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("dueOn が不正です")
    if value == "":
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise ValueError("dueOn が不正です") from None
    if parsed.isoformat() != value:
        raise ValueError("dueOn が不正です")
    return value


def _stored_task(record: dict) -> dict:
    return {key: value for key, value in record.items() if value is not None}


def _use_memory() -> bool:
    return _configured("MEMBERS_TABLE") is None and _configured("TASKS_TABLE") is None


def _members_table():
    import boto3

    return boto3.resource("dynamodb").Table(_configured("MEMBERS_TABLE"))


def _tasks_table():
    import boto3

    return boto3.resource("dynamodb").Table(_configured("TASKS_TABLE"))


def _scan_all(table) -> list[dict]:
    result = table.scan()
    items = list(result.get("Items", []))
    while "LastEvaluatedKey" in result:
        result = table.scan(ExclusiveStartKey=result["LastEvaluatedKey"])
        items.extend(result.get("Items", []))
    return items


def _sort_records(items: list[dict]) -> list[dict]:
    ordered = list(items)
    ordered.sort(key=lambda item: item["id"])
    ordered.sort(key=lambda item: item["createdAt"], reverse=True)
    return ordered


def _member_from_item(item: dict) -> dict:
    return {key: item[key] for key in MEMBER_KEYS}


def _task_from_item(item: dict) -> dict:
    body = item.get("body", "")
    due_on = item.get("dueOn")
    completed_at = item.get("completedAt")
    return {
        "id": item["id"],
        "title": item["title"],
        "assigneeId": item["assigneeId"],
        "done": bool(item["done"]),
        "createdAt": item["createdAt"],
        "body": body if isinstance(body, str) else "",
        "dueOn": due_on if isinstance(due_on, str) and due_on else None,
        "completedAt": completed_at if isinstance(completed_at, str) and completed_at else None,
    }


def _list_members_store() -> list[dict]:
    if _use_memory():
        with _lock:
            items = [_member_from_item(item) for item in members.values()]
    else:
        items = [_member_from_item(item) for item in _scan_all(_members_table())]
    return _sort_records(items)


def _list_tasks_store() -> list[dict]:
    if _use_memory():
        with _lock:
            items = [_task_from_item(item) for item in tasks.values()]
    else:
        items = [_task_from_item(item) for item in _scan_all(_tasks_table())]
    return _sort_records(items)


def _choose_assignee(member_rows: list[dict], task_rows: list[dict]) -> str:
    if not member_rows:
        raise HTTPException(status_code=422, detail="メンバーがいないため登録できません")

    def incomplete_count(member_id: str) -> int:
        return sum(
            1
            for task in task_rows
            if task["assigneeId"] == member_id and task["done"] is False
        )

    chosen = min(
        member_rows,
        key=lambda member: (incomplete_count(member["id"]), member["createdAt"], member["id"]),
    )
    return chosen["id"]


def _create_member_store(name: str) -> dict:
    record = {"id": str(uuid4()), "name": name, "createdAt": _now_iso()}
    if _use_memory():
        with _lock:
            members[record["id"]] = dict(record)
    else:
        _members_table().put_item(Item=record)
    return _member_from_item(record)


def _delete_member_store(member_id: str) -> None:
    member_rows = _list_members_store()
    if not any(member["id"] == member_id for member in member_rows):
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    task_rows = _list_tasks_store()
    if any(task["assigneeId"] == member_id for task in task_rows):
        raise HTTPException(status_code=422, detail="担当タスクが残っています")
    if _use_memory():
        with _lock:
            if member_id not in members:
                raise HTTPException(status_code=404, detail="メンバーが見つかりません")
            if any(task["assigneeId"] == member_id for task in tasks.values()):
                raise HTTPException(status_code=422, detail="担当タスクが残っています")
            del members[member_id]
    else:
        _members_table().delete_item(Key={"id": member_id})


def _create_task_store(title: str, body: str, due_on: str | None) -> dict:
    member_rows = _list_members_store()
    task_rows = _list_tasks_store()
    assignee_id = _choose_assignee(member_rows, task_rows)
    record = {
        "id": str(uuid4()),
        "title": title,
        "assigneeId": assignee_id,
        "done": False,
        "createdAt": _now_iso(),
        "body": body,
        "dueOn": due_on,
        "completedAt": None,
    }
    if _use_memory():
        with _lock:
            current_members = [_member_from_item(item) for item in members.values()]
            current_tasks = [_task_from_item(item) for item in tasks.values()]
            record["assigneeId"] = _choose_assignee(current_members, current_tasks)
            tasks[record["id"]] = _stored_task(record)
    else:
        _tasks_table().put_item(Item=_stored_task(record))
    return _task_from_item(record)


def _get_task_store(task_id: str) -> dict:
    if _use_memory():
        with _lock:
            item = tasks.get(task_id)
            if item is None:
                raise HTTPException(status_code=404, detail="タスクが見つかりません")
            return _task_from_item(item)
    result = _tasks_table().get_item(Key={"id": task_id})
    item = result.get("Item")
    if item is None:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return _task_from_item(item)


def _patch_updates(payload: dict) -> dict:
    has_assignee = "assigneeId" in payload
    has_done = "done" in payload
    has_body = "body" in payload
    has_due = "dueOn" in payload
    if not has_assignee and not has_done and not has_body and not has_due:
        raise HTTPException(status_code=422, detail="更新する項目がありません")
    updates: dict = {}
    if has_assignee:
        value = payload["assigneeId"]
        if not isinstance(value, str):
            raise HTTPException(status_code=422, detail="assigneeId が不正です")
        value = value.strip()
        if not value or not any(member["id"] == value for member in _list_members_store()):
            raise HTTPException(status_code=422, detail="assigneeId が不正です")
        updates["assigneeId"] = value
    if has_done:
        value = payload["done"]
        if type(value) is not bool:
            raise HTTPException(status_code=422, detail="done が不正です")
        updates["done"] = value
    if has_body:
        value = payload["body"]
        if not isinstance(value, str):
            raise HTTPException(status_code=422, detail="body が不正です")
        updates["body"] = value.strip()
    if has_due:
        try:
            updates["dueOn"] = _due_on_value(payload["dueOn"])
        except ValueError:
            raise HTTPException(status_code=422, detail="dueOn が不正です") from None
    return updates


def _with_completed_at(current: dict, updates: dict) -> dict:
    if "done" not in updates:
        return updates
    was_done = bool(current.get("done"))
    next_done = updates["done"]
    applied = dict(updates)
    if was_done is False and next_done is True:
        applied["completedAt"] = _now_iso()
    elif was_done is True and next_done is False:
        applied["completedAt"] = None
    return applied


def _patch_task_store(task_id: str, updates: dict) -> dict:
    if "assigneeId" in updates and not any(
        member["id"] == updates["assigneeId"] for member in _list_members_store()
    ):
        raise HTTPException(status_code=422, detail="assigneeId が不正です")
    if _use_memory():
        with _lock:
            item = tasks.get(task_id)
            if item is None:
                raise HTTPException(status_code=404, detail="タスクが見つかりません")
            if "assigneeId" in updates and updates["assigneeId"] not in members:
                raise HTTPException(status_code=422, detail="assigneeId が不正です")
            updated = dict(item)
            for key, value in _with_completed_at(item, updates).items():
                if value is None:
                    updated.pop(key, None)
                else:
                    updated[key] = value
            tasks[task_id] = updated
            return _task_from_item(updated)
    table = _tasks_table()
    item = table.get_item(Key={"id": task_id}).get("Item")
    if item is None:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    updated = dict(item)
    for key, value in _with_completed_at(item, updates).items():
        if value is None:
            updated.pop(key, None)
        else:
            updated[key] = value
    table.put_item(Item=_stored_task(updated))
    return _task_from_item(updated)


async def _json_object(request: Request) -> dict:
    raw = await request.body()
    if raw.strip() == b"":
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="JSON が不正です") from None
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="オブジェクトで送ってください")
    return payload


def _delete_task_store(task_id: str) -> None:
    if _use_memory():
        with _lock:
            if task_id not in tasks:
                raise HTTPException(status_code=404, detail="タスクが見つかりません")
            del tasks[task_id]
        return
    existing = _tasks_table().get_item(Key={"id": task_id}).get("Item")
    if existing is None:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    _tasks_table().delete_item(Key={"id": task_id})


@app.get("/api/members")
def list_members() -> list[dict]:
    return _list_members_store()


@app.post("/api/members", status_code=201)
def create_member(body: MemberCreate) -> dict:
    return _create_member_store(body.name)


@app.delete("/api/members/{member_id}", status_code=204)
def delete_member(member_id: str) -> Response:
    _delete_member_store(member_id)
    return Response(status_code=204)


@app.get("/api/tasks")
def list_tasks() -> list[dict]:
    return _list_tasks_store()


@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate) -> dict:
    return _create_task_store(body.title, body.body, body.dueOn)


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str) -> dict:
    return _get_task_store(task_id)


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str) -> Response:
    _delete_task_store(task_id)
    return Response(status_code=204)


@app.patch("/api/tasks/{task_id}")
async def patch_task(task_id: str, request: Request) -> dict:
    _get_task_store(task_id)
    payload = await _json_object(request)
    return _patch_task_store(task_id, _patch_updates(payload))

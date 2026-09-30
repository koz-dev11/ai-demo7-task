import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, deleteTask, getTask, listMembers, patchTask, type Member, type Task } from "../api";
import { formatDate, formatDateTime } from "../format";

export default function DetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getTask(id), listMembers()])
      .then(([nextTask, nextMembers]) => {
        if (!active) {
          return;
        }
        setTask(nextTask);
        setMembers(nextMembers);
      })
      .catch((caught) => {
        if (active && caught instanceof ApiError && caught.status === 404) {
          setMissing(true);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (missing) {
    return (
      <main>
        <p>見つかりません。</p>
      </main>
    );
  }
  if (!task) {
    return (
      <main>
        <p>読み込み中</p>
      </main>
    );
  }

  async function onAssignee(nextId: string) {
    const previous = task;
    if (members.length === 0 || previous === null) {
      return;
    }
    setTask({ ...previous, assigneeId: nextId });
    try {
      setTask(await patchTask(previous.id, { assigneeId: nextId }));
    } catch {
      setTask({ ...previous });
    }
  }

  async function onDone(nextDone: boolean) {
    const previous = task;
    if (previous === null) {
      return;
    }
    setTask({ ...previous, done: nextDone });
    try {
      setTask(await patchTask(previous.id, { done: nextDone }));
    } catch {
      setTask({ ...previous });
    }
  }

  async function onBody(nextBody: string) {
    const previous = task;
    if (previous === null) {
      return;
    }
    setTask({ ...previous, body: nextBody });
    try {
      setTask(await patchTask(previous.id, { body: nextBody }));
    } catch {
      setTask({ ...previous });
    }
  }

  async function onDue(nextDue: string) {
    const dueOn = nextDue === "" ? null : nextDue;
    const previous = task;
    if (previous === null || dueOn === previous.dueOn) {
      return;
    }
    setTask({ ...previous, dueOn });
    try {
      setTask(await patchTask(previous.id, { dueOn }));
    } catch {
      setTask({ ...previous });
    }
  }

  async function onDelete() {
    if (!window.confirm("削除しますか？")) {
      return;
    }
    await deleteTask(id);
    navigate("/");
  }

  return (
    <main>
      <p>
        <Link to="/">タスク一覧</Link>
      </p>
      <h1>{task.title}</h1>
      {members.length > 0 ? (
        <label className="field" htmlFor="assignee">
          担当者
          <select
            id="assignee"
            value={task.assigneeId}
            onChange={(event) => {
              if (members.length === 0) {
                return;
              }
              void onAssignee(event.target.value);
            }}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="done-row">
        <p className={task.done ? "done-state done" : "done-state open"}>
          {task.done ? "完了" : "未完了"}
        </p>
        <input
          id="done-toggle"
          type="checkbox"
          checked={task.done}
          onChange={(event) => {
            void onDone(event.target.checked);
          }}
        />
        <label htmlFor="done-toggle">完了を切り替える</label>
      </div>
      <label className="field">
        期限
        <input
          type="date"
          value={task.dueOn ?? ""}
          onChange={(event) => {
            void onDue(event.target.value);
          }}
        />
      </label>
      {task.completedAt ? (
        <p>
          完了日 <time dateTime={task.completedAt}>{formatDate(task.completedAt)}</time>
        </p>
      ) : null}
      <p>
        <time dateTime={task.createdAt}>{formatDateTime(task.createdAt)}</time>
      </p>
      <label className="field">
        内容
        <textarea
          value={task.body}
          onChange={(event) => setTask({ ...task, body: event.target.value })}
          onBlur={(event) => {
            void onBody(event.target.value);
          }}
        />
      </label>
      <button className="delete" type="button" onClick={onDelete}>
        削除
      </button>
    </main>
  );
}

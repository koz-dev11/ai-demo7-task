import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMembers, listTasks, type Member, type Task } from "../api";
import { formatDate } from "../format";

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isOverdue(task: Task, today: string): boolean {
  return task.done === false && task.dueOn !== null && task.dueOn < today;
}

export default function ListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listTasks(), listMembers()])
      .then(([nextTasks, nextMembers]) => {
        if (!active) {
          return;
        }
        setTasks(nextTasks);
        setMembers(nextMembers);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const names = new Map(members.map((member) => [member.id, member.name]));
  const today = localToday();
  const visibleTasks =
    memberId === "" ? tasks : tasks.filter((task) => task.assigneeId === memberId);

  return (
    <main>
      <h1>タスク</h1>
      <nav>
        <Link to="/members">メンバー</Link>
        <Link to="/new">タスクを登録</Link>
      </nav>
      <label className="member-filter">
        メンバー
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          <option value="">全員</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </label>
      {failed ? <p>読み込めません。</p> : null}
      {visibleTasks.length === 0 ? <p>タスクはまだありません。</p> : null}
      <ul>
        {visibleTasks.map((task) => {
          const overdue = isOverdue(task, today);
          const showExtra = task.dueOn !== null || task.completedAt !== null || overdue;
          return (
            <li key={task.id}>
              <Link className={overdue ? "card overdue" : "card"} to={`/tasks/${task.id}`}>
                <span>{task.title}</span>
                <span>{names.get(task.assigneeId) ?? ""}</span>
                <span className={task.done ? "done" : "open"}>{task.done ? "完了" : "未完了"}</span>
                {showExtra ? (
                  <span className="card-extra">
                    {task.dueOn ? <span>期限 {task.dueOn}</span> : null}
                    {task.completedAt ? <span>完了日 {formatDate(task.completedAt)}</span> : null}
                    {overdue ? <span>期限超過</span> : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

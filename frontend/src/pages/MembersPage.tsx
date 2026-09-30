import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createMember, deleteMember, listMembers, type Member } from "../api";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function reload() {
    setMembers(await listMembers());
  }

  useEffect(() => {
    let active = true;
    listMembers()
      .then((next) => {
        if (active) {
          setMembers(next);
        }
      })
      .catch(() => {
        if (active) {
          setError("読み込めません");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("名前は必須です");
      return;
    }
    setError("");
    await createMember(name);
    setName("");
    await reload();
  }

  async function onDelete(id: string) {
    if (!window.confirm("削除しますか？")) {
      return;
    }
    await deleteMember(id);
    await reload();
  }

  return (
    <main>
      <p>
        <Link to="/">タスク一覧</Link>
      </p>
      <h1>メンバー</h1>
      <form onSubmit={onSubmit}>
        <label>
          名前
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit">登録する</button>
      </form>
      {members.length === 0 ? <p>メンバーはまだありません。</p> : null}
      <ul>
        {members.map((member) => (
          <li key={member.id} className="member">
            <span>{member.name}</span>
            <time dateTime={member.createdAt}>{member.createdAt}</time>
            <button className="delete" type="button" onClick={() => onDelete(member.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

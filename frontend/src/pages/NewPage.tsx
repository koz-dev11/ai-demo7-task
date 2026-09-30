import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, createTask } from "../api";

export default function NewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    setError("");
    try {
      await createTask(title, body, dueOn === "" ? null : dueOn);
      navigate("/");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setError("メンバーがいないため登録できません");
        return;
      }
      setError("登録できません");
    }
  }

  return (
    <main>
      <p>
        <Link to="/">タスク一覧</Link>
      </p>
      <h1>タスクを登録</h1>
      <form onSubmit={onSubmit}>
        <label>
          タイトル
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <label>
          内容
          <textarea value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <label>
          期限
          <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
        </label>
        <button type="submit">登録する</button>
      </form>
    </main>
  );
}

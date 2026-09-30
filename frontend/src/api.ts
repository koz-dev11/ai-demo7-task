const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export type Member = {
  id: string;
  name: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  done: boolean;
  createdAt: string;
  body: string;
  dueOn: string | null;
  completedAt: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function listMembers(): Promise<Member[]> {
  return request<Member[]>("/api/members");
}

export function createMember(name: string): Promise<Member> {
  return request<Member>("/api/members", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteMember(id: string): Promise<void> {
  return request<void>(`/api/members/${id}`, { method: "DELETE" });
}

export function listTasks(): Promise<Task[]> {
  return request<Task[]>("/api/tasks");
}

export function createTask(title: string, body: string, dueOn: string | null): Promise<Task> {
  return request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title, body, dueOn }),
  });
}

export function getTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`);
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/api/tasks/${id}`, { method: "DELETE" });
}

export function patchTask(
  id: string,
  body: { assigneeId?: string; done?: boolean; body?: string; dueOn?: string | null },
): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

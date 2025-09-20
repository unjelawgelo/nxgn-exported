export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (path: string, body?: any) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

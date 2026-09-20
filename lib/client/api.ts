export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly data?: unknown,
  ) {
    super(message);
  }
}

/** Minimal JSON client for the Trustline API (same-origin, cookie session). */
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(res.status === 403 && data && typeof data === "object" && "policy" in data)) {
    const err = (data as { error?: { message?: string; code?: string } }).error;
    throw new ApiError(err?.message ?? `Request failed (${res.status})`, res.status, err?.code, data);
  }
  return data as T;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

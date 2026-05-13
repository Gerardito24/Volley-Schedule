let dbEnabledCache: boolean | null = null;

export async function isRemoteDbEnabled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (dbEnabledCache != null) return dbEnabledCache;
  try {
    const res = await fetch("/api/admin/db", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { configured?: boolean };
    dbEnabledCache = Boolean(data.configured);
    return dbEnabledCache;
  } catch {
    dbEnabledCache = false;
    return false;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** Admin API routes: send HttpOnly session cookie. */
export async function fetchAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(url, { ...init, credentials: "include" });
}

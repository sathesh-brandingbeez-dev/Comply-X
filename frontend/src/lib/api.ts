// lib/api.ts
export const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      localStorage.getItem("auth_token") ??
      localStorage.getItem("access_token")
    );
  } catch {
    return null;
  }
}

function buildUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, API_BASE).toString();
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Normalize headers to avoid HeadersInit union issues
  const headers = new Headers(init.headers ?? undefined);

  const hasBody = init.body != null && !(init.body instanceof FormData);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Ensure JSON by default (won’t override if caller already set it)
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // Add auth header if present
  const token = getAuthToken();
   if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // const res = await fetch(`${API_BASE}${path}`, {
  // const url = new URL(path, API_BASE).toString();
  const url = buildUrl(path);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      // credentials: "include", // uncomment if you use cookies
      // mode: "cors", // default in browsers; explicit OK too
    });
    } catch (e) {
    // Network / CORS / DNS errors land here
    throw new Error(`Network error fetching ${url}. ${String(e)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText} (${url})`);
  }

  // If the response has no body, this will throw—adjust if needed
  const text = await res.text();
  return (text ? JSON.parse(text) : (null as unknown)) as T;
  // return res.json() as Promise<T>;
}

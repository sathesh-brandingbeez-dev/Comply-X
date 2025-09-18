// src/lib/api.ts

// Default to backend /api on 8000 if no env provided
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

// Strip trailing slashes only
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

/** Join base + tail without losing '/api' path */
function joinUrl(base: string, tail: string): string {
  const sep = base.endsWith("/") ? "" : "/";
  const t = tail.replace(/^\/+/, "");
  return `${base}${sep}${t}`;
}

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

/** Build a full URL from API_BASE + path.
 *  Robust to callers passing:
 *   - "api/..." or "/api/..."
 *   - "/documents/..." or "documents/..."
 *   - a full absolute URL (returned as-is)
 */
function buildUrl(path: string): string {
  // Full absolute URL -> return as-is
  try {
    const maybe = new URL(path);
    return maybe.toString();
  } catch {
    /* not absolute */
  }

  // Normalize to leading slash for logic
  const p = path.startsWith("/") ? path : `/${path}`;

  const baseEndsWithApi = /\/api$/i.test(API_BASE);

  if (baseEndsWithApi) {
    // If caller passed '/api/...' or '/api', drop that *from the path*
    // and append the remainder to API_BASE so we don't get '/api/api/...'
    if (p.toLowerCase() === "/api") {
      return API_BASE; // exactly '/api'
    }
    if (p.toLowerCase().startsWith("/api/")) {
      const remainder = p.slice(5); // remove '/api/'
      return joinUrl(API_BASE, remainder);
    }
    // Caller did NOT include '/api' -> just append to API_BASE
    return joinUrl(API_BASE, p);
  }

  // Base does not end with '/api' -> normal URL resolution is fine
  return new URL(p, API_BASE).toString();
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? undefined);

  const hasBody = init.body != null && !(init.body instanceof FormData);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = buildUrl(path);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      // credentials: "include",
      // mode: "cors",
    });
  } catch (e) {
    throw new Error(`Network error fetching ${url}. ${String(e)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText} (${url})`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : (null as unknown)) as T;
}

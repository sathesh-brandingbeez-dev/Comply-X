// lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Normalize headers to avoid HeadersInit union issues
  const headers = new Headers(init.headers ?? undefined);

  // Ensure JSON by default (won’t override if caller already set it)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Add auth header if present
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  // If the response has no body, this will throw—adjust if needed
  return res.json() as Promise<T>;
}

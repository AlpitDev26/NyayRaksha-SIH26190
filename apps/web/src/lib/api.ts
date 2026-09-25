const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = "API_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Credentials: 'include' ensures HttpOnly session cookies are transmitted
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    let errorCode = "HTTP_ERROR";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        errorDetail = data.detail;
      } else if (data.detail && typeof data.detail === "object") {
        errorDetail = data.detail.message || JSON.stringify(data.detail);
        errorCode = data.detail.code || errorCode;
      } else if (data.message) {
        errorDetail = data.message;
      }
    } catch {
      errorDetail = `Request failed with status ${res.status}`;
    }
    throw new ApiError(errorDetail, res.status, errorCode);
  }

  return res.json();
}

import { isApiError, type ApiError } from "./contracts";

export type ClientErrorCode = ApiError["code"] | "MALFORMED_RESPONSE";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }

  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== configured) {
    throw new Error("NEXT_PUBLIC_API_URL must be an HTTP(S) origin");
  }
  return url.origin;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiClientError(
      response.status,
      "MALFORMED_RESPONSE",
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ApiClientError(
      response.status,
      "MALFORMED_RESPONSE",
      "Máy chủ trả về dữ liệu không hợp lệ",
    );
  }
}

export async function apiRequest<T>(
  path: `/${string}`,
  init: RequestInit = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetchImplementation(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 204) {
    return undefined as T;
  }

  const body = await readJson(response);
  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiClientError(
        body.statusCode,
        body.code,
        body.message,
        body.requestId,
      );
    }
    throw new ApiClientError(
      response.status,
      "MALFORMED_RESPONSE",
      "Máy chủ trả về lỗi không hợp lệ",
    );
  }

  return body as T;
}

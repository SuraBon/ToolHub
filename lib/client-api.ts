"use client"

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || ""

  if (!contentType.includes("application/json")) {
    return null
  }

  return response.json()
}

async function apiRequest<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, init)
  const data = await parseResponse(response)

  if (!response.ok) {
    const message =
      data && typeof data.error === "string"
        ? data.error
        : "ไม่สามารถเชื่อมต่อระบบได้"

    throw new ApiError(message, response.status)
  }

  return data as T
}

function jsonRequestInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }
}

export function apiGet<T>(url: string, init?: RequestInit) {
  return apiRequest<T>(url, init)
}

export function apiPost<T>(url: string, body?: unknown, init?: RequestInit) {
  const requestInit =
    body instanceof FormData
      ? { method: "POST", body, ...init }
      : { ...jsonRequestInit("POST", body), ...init }

  return apiRequest<T>(url, requestInit)
}

export function apiPut<T>(url: string, body: unknown, init?: RequestInit) {
  return apiRequest<T>(url, { ...jsonRequestInit("PUT", body), ...init })
}

export function apiDelete<T>(url: string, init?: RequestInit) {
  return apiRequest<T>(url, { method: "DELETE", ...init })
}

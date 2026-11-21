
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '/api/v1')

const TOKEN_KEY = 'recall_access_token'

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === 'string'
        ? detail
        : 'Something went wrong. Please try again.'

    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
  timeoutMs?: number
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, timeoutMs, ...requestOptions } = options

  const requestHeaders = new Headers(headers)

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getAccessToken()

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const timeoutController = timeoutMs ? new AbortController() : undefined
  const timeoutId = timeoutMs
    ? window.setTimeout(() => timeoutController?.abort(), timeoutMs)
    : undefined

  try {
    const fetchOptions: RequestInit = {
      ...requestOptions,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    }

    if (timeoutController) {
      fetchOptions.signal = timeoutController.signal
    }

    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions)

    if (response.status === 204) {
      return undefined as T
    }

    const contentType = response.headers.get('content-type')
    const responseData = contentType?.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const detail =
        typeof responseData === 'object' && responseData !== null
          ? responseData.detail ?? responseData.message
          : responseData

      throw new ApiError(response.status, detail)
    }

    return responseData as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (timeoutController?.signal.aborted) {
      throw new ApiError(
        0,
        'The request timed out. Check that the backend and database are running, then try again.',
      )
    }

    throw new ApiError(
      0,
      'Unable to connect to Recall. Make sure the backend server is running.',
    )
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'GET',
    })
  },

    getBlob(path: string, options?: RequestOptions) {
    return apiRequest<Blob>(path, {
      ...options,
      method: 'GET',
    })
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body,
    })
  },

  delete<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'DELETE',
    })
  },
}

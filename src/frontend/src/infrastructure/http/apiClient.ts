export interface ApiProblem {
  status: number
  title: string
  detail?: string
  requestId?: string
}

export class ApiError extends Error {
  public readonly problem: ApiProblem

  public constructor(problem: ApiProblem) {
    super(problem.title)
    this.problem = problem
  }
}

export const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const problem = (await response.json()) as ApiProblem
    throw new ApiError(problem)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

interface AntiforgeryResponse {
  token: string
}

export const secureApiRequest = async <T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> => {
  const { token } = await apiRequest<AntiforgeryResponse>('/api/v1/auth/antiforgery')
  const request: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, ...headers },
  }
  if (body !== undefined) request.body = JSON.stringify(body)
  return apiRequest<T>(path, request)
}

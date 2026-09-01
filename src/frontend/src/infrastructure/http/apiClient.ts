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

  return (await response.json()) as T
}

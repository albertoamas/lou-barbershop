import type { AuthPort, AuthSession } from '../../core/auth/AuthSession'
import { apiRequest } from './apiClient'

interface AntiforgeryResponse {
  token: string
}

const antiforgeryToken = async () =>
  (await apiRequest<AntiforgeryResponse>('/api/v1/auth/antiforgery')).token

const secureRequest = async <T>(path: string, body?: unknown): Promise<T> => {
  const token = await antiforgeryToken()
  const request: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': token,
    },
  }

  if (body !== undefined) {
    request.body = JSON.stringify(body)
  }

  return apiRequest<T>(path, request)
}

export const authApi: AuthPort = {
  login: (userName, password) => secureRequest('/api/v1/auth/login', { userName, password }),
  logout: () => secureRequest('/api/v1/auth/logout'),
  current: () => apiRequest<AuthSession>('/api/v1/auth/me'),
}

import type { AuthPort, AuthSession } from '../../core/auth/AuthSession'
import { apiRequest, secureApiRequest } from './apiClient'

export const authApi: AuthPort = {
  login: (userName, password) =>
    secureApiRequest('/api/v1/auth/login', 'POST', { userName, password }),
  logout: () => secureApiRequest('/api/v1/auth/logout', 'POST'),
  current: () => apiRequest<AuthSession>('/api/v1/auth/me'),
}

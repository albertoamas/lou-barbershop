import type { AuthPort, AuthSession, MfaEnabled, MfaSetup } from '../../core/auth/AuthSession'
import { apiRequest, secureApiRequest } from './apiClient'

export const authApi: AuthPort = {
  login: (userName, password, twoFactorCode) =>
    secureApiRequest('/api/v1/auth/login', 'POST', { userName, password, twoFactorCode }),
  logout: () => secureApiRequest('/api/v1/auth/logout', 'POST'),
  current: () => apiRequest<AuthSession>('/api/v1/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    secureApiRequest('/api/v1/auth/change-password', 'POST', { currentPassword, newPassword }),
  setupMfa: (currentPassword, twoFactorCode) =>
    secureApiRequest<MfaSetup>('/api/v1/auth/mfa/setup', 'POST', {
      currentPassword,
      twoFactorCode,
    }),
  enableMfa: (currentPassword, code) =>
    secureApiRequest<MfaEnabled>('/api/v1/auth/mfa/enable', 'POST', { currentPassword, code }),
  disableMfa: (currentPassword, twoFactorCode) =>
    secureApiRequest('/api/v1/auth/mfa/disable', 'POST', { currentPassword, twoFactorCode }),
}

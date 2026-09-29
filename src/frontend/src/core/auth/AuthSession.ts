export interface AuthSession {
  id: string
  userName: string
  roles: string[]
  mfaEnabled?: boolean
  mfaRequired?: boolean
}

export interface MfaSetup {
  sharedKey: string
  authenticatorUri: string
}

export interface MfaEnabled {
  recoveryCodes: string[]
}

export interface AuthPort {
  login(userName: string, password: string, twoFactorCode?: string): Promise<void>
  logout(): Promise<void>
  current(): Promise<AuthSession>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  setupMfa(currentPassword: string, twoFactorCode?: string): Promise<MfaSetup>
  enableMfa(currentPassword: string, code: string): Promise<MfaEnabled>
  disableMfa(currentPassword: string, twoFactorCode: string): Promise<void>
}

export const internalReturnPath = (value: unknown): string => {
  if (typeof value !== 'string' || !/^\/app(?:\/|\?|#|$)/.test(value) || value.startsWith('//')) {
    return '/app'
  }
  if (/^\/app\/(?:login|sesion-expirada|acceso-denegado)(?:\/|\?|#|$)/.test(value)) {
    return '/app'
  }
  return value
}

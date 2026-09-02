export interface AuthSession {
  id: string
  userName: string
  roles: string[]
}

export interface AuthPort {
  login(userName: string, password: string): Promise<void>
  logout(): Promise<void>
  current(): Promise<AuthSession>
}

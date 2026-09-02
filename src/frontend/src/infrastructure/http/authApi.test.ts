import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './authApi'

describe('authApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('obtains antiforgery token and sends credentials only in the protected request body', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await authApi.login('owner', 'private-password')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/antiforgery',
      expect.objectContaining({
        credentials: 'same-origin',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/login',
      expect.objectContaining({
        credentials: 'same-origin',
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'csrf-test-token' }),
        body: JSON.stringify({ userName: 'owner', password: 'private-password' }),
      }),
    )
  })

  it('does not persist the session in web storage', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await authApi.login('owner', 'private-password')

    expect(localStorageSpy).not.toHaveBeenCalled()
  })
})

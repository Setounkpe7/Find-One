import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'
import { useAuthStore } from '../stores/authStore'

const signUp = vi.fn()
const resend = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: (...args: unknown[]) => signUp(...args),
      resend: (...args: unknown[]) => resend(...args),
    },
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null })
    signUp.mockReset()
    resend.mockReset()
  })

  it('starts with no user', () => {
    const { user } = useAuthStore.getState()
    expect(user).toBeNull()
  })

  it('logout clears user and session', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com' } as Partial<User> as User,
      session: { access_token: 'tok' } as Partial<Session> as Session,
    })
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('register flags needsEmailConfirmation when session is null', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1' } as Partial<User>, session: null },
      error: null,
    })
    const result = await useAuthStore
      .getState()
      .register('a@b.com', 'TestPass123!')
    expect(result.needsEmailConfirmation).toBe(true)
  })

  it('register marks confirmation unneeded when session is returned', async () => {
    signUp.mockResolvedValue({
      data: {
        user: { id: 'u2' } as Partial<User>,
        session: { access_token: 'tok' } as Partial<Session>,
      },
      error: null,
    })
    const result = await useAuthStore
      .getState()
      .register('a@b.com', 'TestPass123!')
    expect(result.needsEmailConfirmation).toBe(false)
  })

  it('register surfaces Supabase errors', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('signup_blocked'),
    })
    await expect(
      useAuthStore.getState().register('a@b.com', 'TestPass123!'),
    ).rejects.toThrow('signup_blocked')
  })

  it('resendConfirmation calls supabase.auth.resend with signup type', async () => {
    resend.mockResolvedValue({ error: null })
    await useAuthStore.getState().resendConfirmation('a@b.com')
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.com' })
  })

  it('resendConfirmation surfaces errors', async () => {
    resend.mockResolvedValue({ error: new Error('rate_limited') })
    await expect(
      useAuthStore.getState().resendConfirmation('a@b.com'),
    ).rejects.toThrow('rate_limited')
  })
})

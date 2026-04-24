import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'
import { useAuthStore } from '../stores/authStore'

const signUp = vi.fn()
const resend = vi.fn()
const getSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: (...args: unknown[]) => signUp(...args),
      resend: (...args: unknown[]) => resend(...args),
      getSession: (...args: unknown[]) => getSession(...args),
    },
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, initialized: false })
    signUp.mockReset()
    resend.mockReset()
    getSession.mockReset()
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

  it('resendConfirmation calls supabase.auth.resend with signup type and emailRedirectTo', async () => {
    resend.mockResolvedValue({ error: null })
    await useAuthStore.getState().resendConfirmation('a@b.com')
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.com',
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
  })

  it('register forwards emailRedirectTo pointing at the current origin', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u3' } as Partial<User>, session: null },
      error: null,
    })
    await useAuthStore.getState().register('a@b.com', 'TestPass123!')
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'TestPass123!',
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
  })

  it('resendConfirmation surfaces errors', async () => {
    resend.mockResolvedValue({ error: new Error('rate_limited') })
    await expect(
      useAuthStore.getState().resendConfirmation('a@b.com'),
    ).rejects.toThrow('rate_limited')
  })

  it('loadSession flips initialized=true on success', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'tok',
          user: { id: 'u1', email: 'a@b.com' } as Partial<User>,
        } as Partial<Session>,
      },
      error: null,
    })
    expect(useAuthStore.getState().initialized).toBe(false)
    await useAuthStore.getState().loadSession()
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(useAuthStore.getState().session?.access_token).toBe('tok')
  })

  it('loadSession flips initialized=true even when getSession rejects', async () => {
    getSession.mockRejectedValue(new Error('network'))
    await expect(useAuthStore.getState().loadSession()).rejects.toThrow(
      'network',
    )
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(useAuthStore.getState().session).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../stores/authStore'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null })
  })

  it('starts with no user', () => {
    const { user } = useAuthStore.getState()
    expect(user).toBeNull()
  })

  it('logout clears user and session', async () => {
    useAuthStore.setState({ user: { id: '1', email: 'a@b.com' }, session: { access_token: 'tok' } as any })
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })
})

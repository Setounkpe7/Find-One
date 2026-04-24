import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface RegisterResult {
  needsEmailConfirmation: boolean
}

interface AuthState {
  user: User | null
  session: Session | null
  initialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<RegisterResult>
  resendConfirmation: (email: string) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user, session: data.session })
  },

  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
    set({ user: data.user ?? null, session: data.session ?? null })
    return { needsEmailConfirmation: data.session === null }
  },

  resendConfirmation: async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  loadSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      set({
        user: data.session?.user ?? null,
        session: data.session ?? null,
      })
    } finally {
      set({ initialized: true })
    }
  },
}))

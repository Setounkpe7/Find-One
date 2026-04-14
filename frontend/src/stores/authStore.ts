import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user, session: data.session })
  },

  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    set({ user: data.user ?? null, session: data.session ?? null })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  loadSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    set({
      user: data.session?.user ?? null,
      session: data.session ?? null,
    })
  },
}))

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

import { resolveApiBase } from '../lib/api'

function setOrigin(origin: string) {
  Object.defineProperty(window, 'location', {
    value: { origin },
    writable: true,
    configurable: true,
  })
}

describe('resolveApiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back to same-origin /server when deployed with a localhost VITE_API_URL (the prod bug)', () => {
    setOrigin('https://find-one-chi.vercel.app')
    vi.stubEnv('VITE_API_URL', 'http://localhost:9999')
    expect(resolveApiBase()).toBe('https://find-one-chi.vercel.app/server')
  })

  it('falls back to same-origin /server when deployed with no VITE_API_URL', () => {
    setOrigin('https://find-one-chi.vercel.app')
    vi.stubEnv('VITE_API_URL', '')
    expect(resolveApiBase()).toBe('https://find-one-chi.vercel.app/server')
  })

  it('honours a real configured API URL when deployed', () => {
    setOrigin('https://find-one-chi.vercel.app')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    expect(resolveApiBase()).toBe('https://api.example.com')
  })

  it('keeps the localhost dev default when running on localhost', () => {
    setOrigin('http://localhost:5173')
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
    expect(resolveApiBase()).toBe('http://localhost:8000')
  })
})

import { supabase } from './supabase'

const LOCALHOST_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i

/**
 * Resolve the backend base URL.
 *
 * In a deployed (non-localhost) context we never trust a localhost VITE_API_URL:
 * the backend ships on the same origin under `/server` (see vercel.json), so we
 * fall back to `${origin}/server`. This keeps production working even when the
 * Vercel `VITE_API_URL` build var is missing or misconfigured to a dev value.
 */
export function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  const inBrowser = typeof window !== 'undefined'
  const originIsLocalhost = inBrowser && LOCALHOST_RE.test(window.location.origin)
  const configIsLocalhostOrEmpty = !configured || LOCALHOST_RE.test(configured)

  if (inBrowser && !originIsLocalhost && configIsLocalhostOrEmpty) {
    return `${window.location.origin}/server`
  }

  return configured || 'http://localhost:8000'
}

export const API_BASE = resolveApiBase()

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`)
  }

  return response
}

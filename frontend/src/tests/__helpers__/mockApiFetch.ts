import { vi } from 'vitest'

export type MockRoute = {
  path: string | RegExp
  method?: string
  body: unknown
  status?: number
}

/**
 * Build a mock `apiFetch` implementation that matches incoming requests
 * against a list of routes and returns a Response-like object whose
 * `.json()` resolves to the configured `body`.
 *
 * Unmatched calls throw loudly so tests fail with a clear message
 * instead of silently returning undefined.
 */
export function buildApiFetchMock(routes: MockRoute[]) {
  return vi.fn(async (path: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase()
    const route = routes.find((r) => {
      if (r.method && r.method.toUpperCase() !== method) return false
      return typeof r.path === 'string' ? r.path === path : r.path.test(path)
    })
    if (!route) {
      throw new Error(`[mockApiFetch] no route for ${method} ${path}`)
    }
    return {
      ok: true,
      status: route.status ?? 200,
      json: async () => route.body,
    } as unknown as Response
  })
}

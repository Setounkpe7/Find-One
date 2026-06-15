import { describe, it, expect } from 'vitest'
import { AuthError } from '@supabase/supabase-js'
import { authErrorMessage } from '../lib/authErrors'

describe('authErrorMessage', () => {
  it('maps a network TypeError to "service indisponible", never to invalid credentials', () => {
    const msg = authErrorMessage(new TypeError('Failed to fetch'), 'login')
    expect(msg).toMatch(/indisponible/i)
    expect(msg).not.toMatch(/identifiants invalides/i)
  })

  it('maps invalid_credentials to "Identifiants invalides"', () => {
    const err = new AuthError('Invalid login credentials', 400, 'invalid_credentials')
    expect(authErrorMessage(err, 'login')).toBe('Identifiants invalides')
  })

  it('maps email_not_confirmed to a confirmation message', () => {
    const err = new AuthError('Email not confirmed', 400, 'email_not_confirmed')
    expect(authErrorMessage(err, 'login')).toMatch(/pas encore confirmée/i)
  })

  it('maps a 429 to a rate-limit message', () => {
    const err = new AuthError('Too many requests', 429, undefined)
    expect(authErrorMessage(err, 'login')).toMatch(/tentatives/i)
  })

  it('maps a 5xx (e.g. SMTP failure on signup) to "service indisponible"', () => {
    const err = new AuthError('Error sending confirmation email', 500, 'unexpected_failure')
    expect(authErrorMessage(err, 'register')).toMatch(/indisponible/i)
  })

  it('maps user_already_exists to a duplicate-account message', () => {
    const err = new AuthError('User already registered', 422, 'user_already_exists')
    expect(authErrorMessage(err, 'register')).toMatch(/existe déjà/i)
  })

  it('falls back to a generic message for unknown errors, never lying about credentials', () => {
    expect(authErrorMessage(new Error('weird'), 'login')).toMatch(/une erreur est survenue/i)
    expect(authErrorMessage(undefined, 'register')).toMatch(/inscription impossible/i)
    expect(authErrorMessage(new Error('weird'), 'login')).not.toMatch(/identifiants invalides/i)
  })
})

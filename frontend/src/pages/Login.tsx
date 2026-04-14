import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authStyles as s } from './authStyles'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await useAuthStore.getState().login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.root}>
      <div style={s.panel}>
        <div style={s.brand}>
          <span style={s.brandMark}>Find·One</span>
          <h1 style={s.heading}>Sign in</h1>
          <p style={s.sub}>Track every application. Miss nothing.</p>
        </div>

        <hr style={s.divider} />

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label htmlFor="email" style={s.label}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={{ ...s.input, ...(focusedField === 'email' ? s.inputFocus : {}) }}
              placeholder="you@example.com"
            />
          </div>

          <div style={s.fieldGroup}>
            <label htmlFor="password" style={s.label}>Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={{ ...s.input, ...(focusedField === 'password' ? s.inputFocus : {}) }}
              placeholder="••••••••"
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.submit, ...(loading ? s.submitDisabled : {}) }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <p style={s.footer}>
          No account?{' '}
          <Link to="/register" style={s.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

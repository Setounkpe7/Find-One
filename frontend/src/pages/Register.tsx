import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authStyles as s } from './authStyles'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const passwordMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await useAuthStore.getState().register(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.root}>
      <div style={s.panel}>
        <div style={s.brand}>
          <span style={s.brandMark}>Find·One</span>
          <h1 style={s.heading}>Create account</h1>
          <p style={s.sub}>Start tracking your job search today.</p>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={{ ...s.input, ...(focusedField === 'password' ? s.inputFocus : {}) }}
              placeholder="••••••••"
            />
          </div>

          <div style={s.fieldGroup}>
            <label htmlFor="confirm" style={s.label}>Confirm password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...s.input,
                ...(focusedField === 'confirm' ? s.inputFocus : {}),
                ...(passwordMismatch ? s.inputError : {}),
              }}
              placeholder="••••••••"
            />
            {passwordMismatch && <span style={s.hint}>Passwords do not match</span>}
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || passwordMismatch}
            style={{ ...s.submit, ...(loading || passwordMismatch ? s.submitDisabled : {}) }}
          >
            {loading ? 'Creating account...' : 'Create account →'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

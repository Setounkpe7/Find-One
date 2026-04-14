import React, { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface ProfileData {
  generation_instructions: string
  preferred_language: string
}

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
]

export default function Profile() {
  const [form, setForm] = useState<ProfileData>({
    generation_instructions: '',
    preferred_language: 'fr',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/profile')
      .then((res) => res.json())
      .then((data: ProfileData) =>
        setForm({
          generation_instructions: data.generation_instructions ?? '',
          preferred_language: data.preferred_language ?? 'fr',
        })
      )
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement du profil.')
      )
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    ...s.input,
    ...(focusedInput === name ? s.inputFocus : {}),
  })

  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes savedSlide { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div style={s.inner}>
        {/* Header */}
        <div style={s.pageHeader}>
          <p style={s.eyebrow}>Compte</p>
          <h1 style={s.pageTitle}>Profil</h1>
        </div>

        {loading && (
          <div style={s.loadingState}>
            <div style={s.spinnerRing} />
            <p style={s.loadingText}>Chargement…</p>
          </div>
        )}

        {!loading && (
          <div style={{ animation: 'fadeIn 0.18s ease' }}>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#c8a96e' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <p style={s.cardTitle}>Préférences de génération</p>
              </div>

              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.fieldGroup}>
                  <label style={s.label} htmlFor="pf-instructions">Instructions de génération</label>
                  <p style={s.fieldHint}>Ces instructions guident la génération de vos CV et lettres de motivation.</p>
                  <textarea
                    id="pf-instructions"
                    value={form.generation_instructions}
                    onChange={(e) => setForm((prev) => ({ ...prev, generation_instructions: e.target.value }))}
                    onFocus={() => setFocusedInput('instructions')}
                    onBlur={() => setFocusedInput(null)}
                    style={{
                      ...inputStyle('instructions'),
                      minHeight: '140px',
                      resize: 'vertical',
                      padding: '12px 14px',
                      lineHeight: 1.6,
                    }}
                    placeholder="Ex: Mets en avant mon expérience en React et Node.js. Utilise un ton professionnel mais accessible. Limite à 1 page pour le CV."
                    disabled={saving}
                  />
                </div>

                <div style={s.fieldGroup}>
                  <label style={s.label} htmlFor="pf-language">Langue préférée</label>
                  <select
                    id="pf-language"
                    value={form.preferred_language}
                    onChange={(e) => setForm((prev) => ({ ...prev, preferred_language: e.target.value }))}
                    onFocus={() => setFocusedInput('language')}
                    onBlur={() => setFocusedInput(null)}
                    style={{ ...inputStyle('language'), padding: '9px 12px', appearance: 'none' as const, cursor: 'pointer' }}
                    disabled={saving}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div style={s.errorBox}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                <div style={s.formFooter}>
                  {saved && (
                    <div style={s.savedMsg}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Sauvegardé ✓
                    </div>
                  )}
                  <button
                    type="submit"
                    style={{ ...s.primaryBtn, ...(saving ? s.btnDisabled : {}) }}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span style={s.spinnerSmall} />
                        Sauvegarde…
                      </>
                    ) : (
                      'Enregistrer →'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#0a0908',
    color: '#f0ede8',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  inner: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 24px 80px',
  },
  pageHeader: {
    marginBottom: '32px',
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: '#c8a96e',
    margin: '0 0 8px',
    fontWeight: 500,
  },
  pageTitle: {
    fontFamily: "'DM Serif Display', 'Georgia', serif",
    fontSize: '32px',
    fontWeight: 400,
    color: '#f0ede8',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '32px 0',
  },
  spinnerRing: {
    width: '20px',
    height: '20px',
    border: '2px solid #2a2520',
    borderTop: '2px solid #c8a96e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  loadingText: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: '#5a5550',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  card: {
    backgroundColor: '#141412',
    border: '1px solid #1e1c18',
    borderRadius: '10px',
    padding: '28px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    marginBottom: '22px',
    paddingBottom: '18px',
    borderBottom: '1px solid #1a1816',
  },
  cardTitle: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#c8a96e',
    margin: 0,
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#78716c',
    fontWeight: 500,
  },
  fieldHint: {
    fontSize: '12px',
    color: '#5a5550',
    margin: '0 0 2px',
    lineHeight: 1.5,
  },
  input: {
    backgroundColor: '#0d0c0a',
    border: '1px solid #252320',
    borderRadius: '5px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#f0ede8',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 2px rgba(200,169,110,0.1)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '6px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '14px',
    paddingTop: '6px',
  },
  savedMsg: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: '#10b981',
    animation: 'savedSlide 0.2s ease',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: '#c8a96e',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 22px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#0d0d0d',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  spinnerSmall: {
    width: '11px',
    height: '11px',
    border: '2px solid rgba(13,13,13,0.25)',
    borderTop: '2px solid #0d0d0d',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  },
}

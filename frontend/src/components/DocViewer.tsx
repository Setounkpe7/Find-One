import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Template {
  id: string
  user_id: string
  name: string
  job_type: string
  file_path: string
  file_type: 'pdf' | 'docx'
}

interface DocViewerProps {
  jobOfferId: string
  templates: Template[]
}

const DOC_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'cover_letter', label: 'Lettre de motivation' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
]

export function DocViewer({ jobOfferId, templates }: DocViewerProps) {
  const [docType, setDocType] = useState('cv')
  const [language, setLanguage] = useState('fr')
  const [templateId, setTemplateId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setOutput('')

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const body: Record<string, string> = {
        job_offer_id: jobOfferId,
        doc_type: docType,
        language,
      }
      if (templateId) body.template_id = templateId

      const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/documents/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Impossible de lire le flux de réponse.')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        if (accumulated.includes('[DONE]')) {
          const cleanText = accumulated.replaceAll('[DONE]', '')
          setOutput(cleanText)
          break
        } else {
          setOutput(accumulated)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération.')
    } finally {
      setGenerating(false)
    }
  }

  const selectStyle = (name: string): React.CSSProperties => ({
    ...s.select,
    ...(focusedInput === name ? s.selectFocus : {}),
  })

  return (
    <div style={s.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#c8a96e', flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p style={s.headerTitle}>Générer un document</p>
      </div>

      <div style={s.controls}>
        <div style={s.controlRow}>
          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="dv-doctype">Type de document</label>
            <select
              id="dv-doctype"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              onFocus={() => setFocusedInput('doctype')}
              onBlur={() => setFocusedInput(null)}
              style={selectStyle('doctype')}
              disabled={generating}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="dv-language">Langue</label>
            <select
              id="dv-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              onFocus={() => setFocusedInput('language')}
              onBlur={() => setFocusedInput(null)}
              style={selectStyle('language')}
              disabled={generating}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="dv-template">Template</label>
            <select
              id="dv-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              onFocus={() => setFocusedInput('template')}
              onBlur={() => setFocusedInput(null)}
              style={selectStyle('template')}
              disabled={generating}
            >
              <option value="">Aucun</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.file_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          style={{ ...s.generateBtn, ...(generating ? s.btnDisabled : {}) }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <span style={s.spinner} />
              Génération en cours…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Générer
            </>
          )}
        </button>
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

      {output !== null && (
        <div style={s.outputWrap}>
          <div style={s.outputHeader}>
            <p style={s.outputLabel}>
              {generating ? (
                <>
                  <span style={s.spinnerGold} />
                  Génération en cours…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#10b981' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Document généré
                </>
              )}
            </p>
          </div>
          <pre style={s.outputPre}>{output}</pre>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: {
    marginTop: '32px',
    backgroundColor: '#141412',
    border: '1px solid #1e1c18',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '18px 22px',
    borderBottom: '1px solid #1a1816',
    backgroundColor: '#111110',
  },
  headerTitle: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#c8a96e',
    margin: 0,
    fontWeight: 600,
  },
  controls: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  controlRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  label: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#78716c',
    fontWeight: 500,
  },
  select: {
    backgroundColor: '#0d0c0a',
    border: '1px solid #252320',
    borderRadius: '5px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#f0ede8',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
    cursor: 'pointer',
    appearance: 'none' as const,
  },
  selectFocus: {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 2px rgba(200,169,110,0.1)',
  },
  generateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    alignSelf: 'flex-start' as const,
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
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '11px',
    height: '11px',
    border: '2px solid rgba(13,13,13,0.25)',
    borderTop: '2px solid #0d0d0d',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  },
  spinnerGold: {
    width: '11px',
    height: '11px',
    border: '2px solid #2a2520',
    borderTop: '2px solid #c8a96e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 22px 20px',
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '6px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  outputWrap: {
    borderTop: '1px solid #1a1816',
  },
  outputHeader: {
    padding: '12px 22px',
    backgroundColor: '#111110',
    borderBottom: '1px solid #1a1816',
  },
  outputLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#5a5550',
    margin: 0,
  },
  outputPre: {
    backgroundColor: '#0d0c0a',
    border: 'none',
    borderTop: '1px solid #1e1c18',
    borderRadius: 0,
    padding: '20px',
    fontSize: '13px',
    color: '#c8c3bc',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
    margin: 0,
    lineHeight: 1.65,
  },
}

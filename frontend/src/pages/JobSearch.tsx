import React, { useState } from 'react'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import type { JobOffer } from '../lib/types'

interface SearchResult {
  title: string
  company: string
  location?: string
  description?: string
  url?: string
}

type Tab = 'search' | 'url'

export default function JobSearch() {
  const [tab, setTab] = useState<Tab>('search')

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchDone, setSearchDone] = useState(false)

  const [urlInput, setUrlInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [urlResult, setUrlResult] = useState<SearchResult | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<JobOffer> | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setSearchDone(false)
    setResults([])
    try {
      const res = await apiFetch(`/api/search/jobs?query=${encodeURIComponent(query.trim())}`)
      const data: SearchResult[] = await res.json()
      setResults(data)
      setSearchDone(true)
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Erreur lors de la recherche.')
    } finally {
      setSearching(false)
    }
  }

  async function handleImportUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return
    setImporting(true)
    setUrlError(null)
    setUrlResult(null)
    try {
      const res = await apiFetch('/api/search/url', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data: SearchResult = await res.json()
      setUrlResult(data)
      setFormData(data)
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : "Erreur lors de l'import.")
    } finally {
      setImporting(false)
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={s.inner}>
        {/* Header */}
        <div style={s.pageHeader}>
          <p style={s.eyebrow}>Recherche d'offres</p>
          <h1 style={s.pageTitle}>Trouver un poste</h1>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          <button
            style={{ ...s.tabBtn, ...(tab === 'search' ? s.tabActive : {}) }}
            onClick={() => setTab('search')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Recherche
          </button>
          <button
            style={{ ...s.tabBtn, ...(tab === 'url' ? s.tabActive : {}) }}
            onClick={() => setTab('url')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Importer une URL
          </button>
        </div>

        {/* Search Tab */}
        {tab === 'search' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <form onSubmit={handleSearch} style={s.searchForm}>
              <div style={s.searchRow}>
                <div style={s.searchInputWrap}>
                  <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocusedInput('query')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Développeur React, Data Scientist, Product Manager…"
                    style={inputStyle('query')}
                    disabled={searching}
                  />
                </div>
                <button
                  type="submit"
                  style={{ ...s.primaryBtn, ...(searching ? s.btnDisabled : {}) }}
                  disabled={searching || !query.trim()}
                >
                  {searching ? (
                    <>
                      <span style={s.spinnerSmall} />
                      Recherche…
                    </>
                  ) : (
                    'Rechercher →'
                  )}
                </button>
              </div>
            </form>

            {searchError && <div style={s.errorBox}>{searchError}</div>}

            {searchDone && results.length === 0 && !searching && (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>Aucun résultat</p>
                <p style={s.emptyText}>Essayez d'autres mots-clés.</p>
              </div>
            )}

            {results.length > 0 && (
              <div style={s.resultsList}>
                <p style={s.resultsCount}>
                  {results.length} résultat{results.length > 1 ? 's' : ''}
                </p>
                {results.map((r, i) => (
                  <div
                    key={i}
                    style={{ ...s.resultCard, animationDelay: `${i * 0.04}s` }}
                  >
                    <div style={s.resultCardBody}>
                      <div style={s.resultCardLeft}>
                        <p style={s.resultTitle}>{r.title}</p>
                        <p style={s.resultCompany}>{r.company}</p>
                        {r.location && <p style={s.resultLocation}>{r.location}</p>}
                      </div>
                      <button
                        style={s.addBtn}
                        onClick={() => setFormData(r)}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c8a96e'
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#c8a96e'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2820'
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#8a857d'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Ajouter au tracker
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* URL Tab */}
        {tab === 'url' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <form onSubmit={handleImportUrl} style={s.searchForm}>
              <div style={s.searchRow}>
                <div style={s.searchInputWrap}>
                  <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onFocus={() => setFocusedInput('url')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="https://www.linkedin.com/jobs/view/…"
                    style={inputStyle('url')}
                    disabled={importing}
                  />
                </div>
                <button
                  type="submit"
                  style={{ ...s.primaryBtn, ...(importing ? s.btnDisabled : {}) }}
                  disabled={importing || !urlInput.trim()}
                >
                  {importing ? (
                    <>
                      <span style={s.spinnerSmall} />
                      Import…
                    </>
                  ) : (
                    'Importer →'
                  )}
                </button>
              </div>
            </form>

            {urlError && <div style={s.errorBox}>{urlError}</div>}

            {urlResult && (
              <div style={{ ...s.resultCard, animation: 'fadeIn 0.2s ease' }}>
                <div style={s.urlResultHeader}>
                  <p style={s.eyebrowSmall}>Offre extraite</p>
                </div>
                <div style={s.resultCardBody}>
                  <div style={s.resultCardLeft}>
                    <p style={s.resultTitle}>{urlResult.title}</p>
                    <p style={s.resultCompany}>{urlResult.company}</p>
                    {urlResult.location && <p style={s.resultLocation}>{urlResult.location}</p>}
                    {urlResult.description && (
                      <p style={s.resultDescription}>{urlResult.description.slice(0, 200)}{urlResult.description.length > 200 ? '…' : ''}</p>
                    )}
                  </div>
                  <button
                    style={s.addBtn}
                    onClick={() => setFormData(urlResult)}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c8a96e'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#c8a96e'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2820'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#8a857d'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Ajouter au tracker
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {formData !== null && (
        <JobForm
          initialData={formData}
          onSave={() => setFormData(null)}
          onClose={() => setFormData(null)}
        />
      )}
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
    maxWidth: '760px',
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
  eyebrowSmall: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#c8a96e',
    margin: '0 0 12px',
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
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '28px',
    borderBottom: '1px solid #1a1816',
    paddingBottom: '0',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px',
    marginBottom: '-1px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#5a5550',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    fontWeight: 500,
  },
  tabActive: {
    color: '#c8a96e',
    borderBottomColor: '#c8a96e',
  },
  searchForm: {
    marginBottom: '24px',
  },
  searchRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'stretch',
  },
  searchInputWrap: {
    position: 'relative' as const,
    flex: 1,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#5a5550',
    pointerEvents: 'none' as const,
  },
  input: {
    width: '100%',
    backgroundColor: '#0d0c0a',
    border: '1px solid #252320',
    borderRadius: '5px',
    padding: '10px 12px 10px 36px',
    fontSize: '14px',
    color: '#f0ede8',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 2px rgba(200,169,110,0.1)',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: '#c8a96e',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 20px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#0d0d0d',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.55,
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
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '6px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 0',
  },
  emptyTitle: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '13px',
    color: '#5a5550',
    margin: '0 0 6px',
    letterSpacing: '0.05em',
  },
  emptyText: {
    fontSize: '13px',
    color: '#3a3530',
    margin: 0,
  },
  resultsCount: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#5a5550',
    margin: '0 0 14px',
    fontWeight: 500,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  resultCard: {
    backgroundColor: '#141412',
    border: '1px solid #1e1c18',
    borderRadius: '8px',
    padding: '18px 20px',
    animation: 'cardIn 0.2s ease both',
    transition: 'border-color 0.15s',
  },
  urlResultHeader: {
    borderBottom: '1px solid #1a1816',
    paddingBottom: '10px',
    marginBottom: '14px',
  },
  resultCardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  resultCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: '15px',
    fontWeight: 600,
    color: '#f0ede8',
    margin: '0 0 4px',
  },
  resultCompany: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '12px',
    color: '#8a857d',
    margin: '0 0 4px',
    letterSpacing: '0.03em',
  },
  resultLocation: {
    fontSize: '12px',
    color: '#5a5550',
    margin: 0,
  },
  resultDescription: {
    fontSize: '13px',
    color: '#78716c',
    margin: '8px 0 0',
    lineHeight: 1.55,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2820',
    borderRadius: '5px',
    padding: '7px 14px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#8a857d',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'border-color 0.15s, color 0.15s',
  },
}

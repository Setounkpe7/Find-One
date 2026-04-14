import React, { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Template {
  id: string
  user_id: string
  name: string
  job_type: string
  file_path: string
  file_type: 'pdf' | 'docx'
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload form
  const [uploadName, setUploadName] = useState('')
  const [uploadJobType, setUploadJobType] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/templates')
      .then((res) => res.json())
      .then((data: Template[]) => setTemplates(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      )
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiFetch(`/api/templates/${id}`, { method: 'DELETE' })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadName.trim() || !uploadJobType.trim() || !uploadFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('name', uploadName.trim())
      formData.append('job_type', uploadJobType.trim())
      formData.append('file', uploadFile)

      const res = await apiFetch('/api/templates', { method: 'POST', body: formData })
      const newTemplate: Template = await res.json()
      setTemplates((prev) => [...prev, newTemplate])
      setUploadName('')
      setUploadJobType('')
      setUploadFile(null)
      const fileInput = document.getElementById('template-file') as HTMLInputElement | null
      if (fileInput) fileInput.value = ''
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erreur lors de l'import.")
    } finally {
      setUploading(false)
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
      `}</style>

      <div style={s.inner}>
        {/* Header */}
        <div style={s.pageHeader}>
          <p style={s.eyebrow}>Documents</p>
          <h1 style={s.pageTitle}>Templates</h1>
        </div>

        {/* Error banner */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Loading */}
        {loading && (
          <div style={s.loadingState}>
            <div style={s.spinnerRing} />
            <p style={s.loadingText}>Chargement…</p>
          </div>
        )}

        {/* Templates list */}
        {!loading && (
          <div style={s.section}>
            {templates.length === 0 ? (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>Aucun template</p>
                <p style={s.emptyText}>Importez votre premier template ci-dessous.</p>
              </div>
            ) : (
              <div style={s.templateList}>
                {templates.map((t) => (
                  <div key={t.id} style={s.templateRow}>
                    <div style={s.templateLeft}>
                      <div style={{ ...s.fileTypeBadge, ...(t.file_type === 'pdf' ? s.pdfBadge : s.docxBadge) }}>
                        {t.file_type.toUpperCase()}
                      </div>
                      <div>
                        <p style={s.templateName}>{t.name}</p>
                        <p style={s.templateMeta}>{t.job_type}</p>
                      </div>
                    </div>
                    <button
                      style={{
                        ...s.deleteBtn,
                        ...(deletingId === t.id ? s.deletingBtn : {}),
                      }}
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      onMouseEnter={(e) => {
                        if (deletingId !== t.id) {
                          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.35)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'
                      }}
                    >
                      {deletingId === t.id ? (
                        <>
                          <span style={{ ...s.spinnerTiny, borderTop: '2px solid #ef4444' }} />
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                          Supprimer
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload section */}
        <div style={s.uploadSection}>
          <div style={s.uploadHeader}>
            <div style={s.uploadHeaderLeft}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#c8a96e' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={s.uploadTitle}>Importer un template</p>
            </div>
          </div>

          <form onSubmit={handleUpload} style={s.uploadForm}>
            <div style={s.uploadRow}>
              <div style={s.fieldGroup}>
                <label style={s.label} htmlFor="template-name">Nom <span style={s.required}>*</span></label>
                <input
                  id="template-name"
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  style={inputStyle('name')}
                  placeholder="CV Senior Dev"
                  disabled={uploading}
                />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label} htmlFor="template-jobtype">Type de poste <span style={s.required}>*</span></label>
                <input
                  id="template-jobtype"
                  type="text"
                  value={uploadJobType}
                  onChange={(e) => setUploadJobType(e.target.value)}
                  onFocus={() => setFocusedInput('jobtype')}
                  onBlur={() => setFocusedInput(null)}
                  style={inputStyle('jobtype')}
                  placeholder="Développeur, Data, Design…"
                  disabled={uploading}
                />
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="template-file">Fichier <span style={s.required}>*</span></label>
              <div
                style={{
                  ...s.fileInputWrap,
                  ...(focusedInput === 'file' ? s.fileInputFocus : {}),
                }}
              >
                <input
                  id="template-file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  onFocus={() => setFocusedInput('file')}
                  onBlur={() => setFocusedInput(null)}
                  style={s.fileInputNative}
                  disabled={uploading}
                />
                <div style={s.fileInputDisplay}>
                  {uploadFile ? (
                    <span style={s.fileSelectedName}>{uploadFile.name}</span>
                  ) : (
                    <span style={s.fileInputPlaceholder}>Sélectionner un fichier .pdf ou .docx</span>
                  )}
                  <span style={s.fileInputBtn}>Parcourir</span>
                </div>
              </div>
            </div>

            {uploadError && <div style={s.errorBox}>{uploadError}</div>}

            <div style={s.uploadActions}>
              <button
                type="submit"
                style={{ ...s.primaryBtn, ...(uploading ? s.btnDisabled : {}) }}
                disabled={uploading || !uploadName.trim() || !uploadJobType.trim() || !uploadFile}
              >
                {uploading ? (
                  <>
                    <span style={s.spinnerSmall} />
                    Import en cours…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Importer le template →
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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
    maxWidth: '720px',
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
  section: {
    marginBottom: '32px',
  },
  emptyState: {
    backgroundColor: '#0d0c0a',
    border: '1px dashed #252320',
    borderRadius: '8px',
    padding: '36px 24px',
    textAlign: 'center' as const,
  },
  emptyTitle: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '12px',
    color: '#5a5550',
    margin: '0 0 6px',
    letterSpacing: '0.05em',
  },
  emptyText: {
    fontSize: '13px',
    color: '#3a3530',
    margin: 0,
  },
  templateList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  templateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141412',
    border: '1px solid #1e1c18',
    borderRadius: '7px',
    padding: '14px 18px',
    gap: '16px',
  },
  templateLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  fileTypeBadge: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  pdfBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.25)',
  },
  docxBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.25)',
  },
  templateName: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    color: '#f0ede8',
    margin: '0 0 2px',
  },
  templateMeta: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    color: '#5a5550',
    margin: 0,
    letterSpacing: '0.04em',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '5px',
    padding: '6px 12px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#ef4444',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  deletingBtn: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinnerTiny: {
    width: '11px',
    height: '11px',
    border: '2px solid rgba(239,68,68,0.2)',
    borderTop: '2px solid #ef4444',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  uploadSection: {
    backgroundColor: '#141412',
    border: '1px solid #1e1c18',
    borderRadius: '10px',
    padding: '24px',
  },
  uploadHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #1a1816',
  },
  uploadHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
  },
  uploadTitle: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#c8a96e',
    margin: 0,
    fontWeight: 600,
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  uploadRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
  required: {
    color: '#c8a96e',
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
  fileInputWrap: {
    position: 'relative' as const,
    backgroundColor: '#0d0c0a',
    border: '1px solid #252320',
    borderRadius: '5px',
    overflow: 'hidden',
    transition: 'border-color 0.15s',
    cursor: 'pointer',
  },
  fileInputFocus: {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 2px rgba(200,169,110,0.1)',
  },
  fileInputNative: {
    position: 'absolute' as const,
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  fileInputDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    pointerEvents: 'none' as const,
  },
  fileInputPlaceholder: {
    fontSize: '14px',
    color: '#3a3530',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  fileSelectedName: {
    fontSize: '14px',
    color: '#c8c3bc',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '70%',
  },
  fileInputBtn: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#8a857d',
    border: '1px solid #2a2820',
    borderRadius: '3px',
    padding: '3px 9px',
    flexShrink: 0,
  },
  uploadActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '4px',
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
  },
  btnDisabled: {
    opacity: 0.45,
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

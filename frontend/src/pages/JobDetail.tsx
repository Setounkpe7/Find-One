import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import { STATUS_LABELS, getStatusColor } from '../lib/types'
import type { JobOffer } from '../lib/types'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div style={fieldRowStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value}</span>
    </div>
  )
}

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '16px',
  padding: '10px 0',
  borderBottom: '1px solid #1a1816',
}
const fieldLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#5a5550',
  flexShrink: 0,
  fontWeight: 500,
}
const fieldValueStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  fontSize: '14px',
  color: '#c8c3bc',
  textAlign: 'right',
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [offer, setOffer] = useState<JobOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/jobs/${id}`)
      .then((res) => res.json())
      .then((data: JobOffer) => setOffer(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      )
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!id || !window.confirm('Supprimer cette offre ?')) return
    setDeleting(true)
    try {
      await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' })
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.')
      setDeleting(false)
    }
  }

  function handleSave(updated: JobOffer) {
    setOffer(updated)
    setShowEdit(false)
  }

  const accentColor = offer ? getStatusColor(offer.status) : '#c8a96e'

  return (
    <div style={styles.root}>
      <div style={styles.inner}>
        <Link to="/" style={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Toutes les offres
        </Link>

        {loading && (
          <div style={styles.centeredState}>
            <div style={{ ...styles.spinnerRing, borderTop: `2px solid ${accentColor}` }} />
            <p style={styles.stateText}>Chargement…</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && offer && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{ ...styles.titleSection, borderLeft: `3px solid ${accentColor}` }}>
              <div style={styles.titleMeta}>
                <span
                  style={{
                    ...styles.statusPill,
                    color: accentColor,
                    backgroundColor: `${accentColor}18`,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  {STATUS_LABELS[offer.status] ?? offer.status}
                </span>
                {offer.contract_type && (
                  <span style={styles.contractChip}>{offer.contract_type}</span>
                )}
              </div>
              <h1 style={styles.offerTitle}>{offer.title}</h1>
              <p style={styles.companyName}>{offer.company}</p>
            </div>

            <div style={styles.actions}>
              <button
                style={styles.editBtn}
                onClick={() => setShowEdit(true)}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c8a96e'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#c8a96e'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2820'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#8a857d'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Modifier
              </button>
              <button
                style={{ ...styles.deleteBtn, ...(deleting ? styles.deletingBtn : {}) }}
                onClick={handleDelete}
                disabled={deleting}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.12)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)'
                }}
              >
                {deleting ? (
                  <>
                    <span style={{ ...styles.spinnerSmall, borderTop: '2px solid #ef4444' }} />
                    Suppression…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Supprimer
                  </>
                )}
              </button>
            </div>

            <div style={styles.divider} />

            <div style={styles.fieldsSection}>
              <div style={styles.fieldsList}>
                {offer.url && (
                  <div style={fieldRowStyle}>
                    <span style={fieldLabelStyle}>URL</span>
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...fieldValueStyle, color: '#c8a96e', textDecoration: 'none' }}
                    >
                      Voir l'offre ↗
                    </a>
                  </div>
                )}
                <FieldRow label="Lieu" value={offer.location} />
                <FieldRow label="Salaire" value={offer.salary} />
                <FieldRow label="Recruteur" value={offer.recruiter_name} />
                <FieldRow label="Candidature envoyée" value={offer.applied_at ? formatDate(offer.applied_at) : undefined} />
                <FieldRow label="Relance prévue" value={offer.followup_date ? formatDate(offer.followup_date) : undefined} />
                <FieldRow label="Entretien" value={offer.interview_date ? formatDate(offer.interview_date) : undefined} />
              </div>

              {offer.notes && (
                <div style={styles.notesBlock}>
                  <p style={styles.notesLabel}>Notes</p>
                  <p style={styles.notesText}>{offer.notes}</p>
                </div>
              )}
            </div>

            {/* DocViewer goes here - Task 17 */}
          </div>
        )}
      </div>

      {showEdit && offer && (
        <JobForm
          initialData={offer}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#5a5550',
    textDecoration: 'none',
    marginBottom: '36px',
    transition: 'color 0.15s',
  },
  centeredState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '80px 0',
  },
  spinnerRing: {
    width: '28px',
    height: '28px',
    border: '2px solid #2a2520',
    borderTop: '2px solid #c8a96e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerSmall: {
    width: '11px',
    height: '11px',
    border: '2px solid rgba(239,68,68,0.25)',
    borderTop: '2px solid #ef4444',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  stateText: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: '#5a5550',
    textTransform: 'uppercase',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '6px',
    padding: '14px 18px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  titleSection: {
    paddingLeft: '16px',
    marginBottom: '24px',
  },
  titleMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  statusPill: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    padding: '3px 10px',
    borderRadius: '4px',
  },
  contractChip: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    padding: '3px 10px',
    borderRadius: '4px',
    backgroundColor: '#1a1816',
    color: '#78716c',
    border: '1px solid #252320',
  },
  offerTitle: {
    fontFamily: "'DM Serif Display', 'Georgia', serif",
    fontSize: '28px',
    fontWeight: 400,
    color: '#f0ede8',
    margin: '0 0 6px',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  companyName: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '13px',
    color: '#8a857d',
    margin: 0,
    letterSpacing: '0.04em',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2820',
    borderRadius: '5px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#8a857d',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '5px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#ef4444',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  deletingBtn: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  divider: {
    borderTop: '1px solid #1a1816',
    marginBottom: '24px',
  },
  fieldsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  notesBlock: {
    backgroundColor: '#0d0c0a',
    border: '1px solid #1e1c18',
    borderRadius: '8px',
    padding: '18px 20px',
  },
  notesLabel: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#5a5550',
    margin: '0 0 10px',
    fontWeight: 500,
  },
  notesText: {
    fontSize: '14px',
    color: '#a8a29e',
    lineHeight: 1.65,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
}

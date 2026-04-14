import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { JobCard } from '../components/JobCard'
import { JobForm } from '../components/JobForm'
import type { JobOffer } from '../lib/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    apiFetch('/api/jobs')
      .then((res) => res.json())
      .then((data: JobOffer[]) => setOffers(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur de chargement.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSave(newOffer: JobOffer) {
    setOffers((prev) => [newOffer, ...prev])
    setShowForm(false)
  }

  return (
    <div style={styles.root}>
      <div style={styles.noiseOverlay} />

      <div style={styles.inner}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Find·One</p>
            <h1 style={styles.heading}>Mes candidatures</h1>
          </div>
          <button
            style={styles.addBtn}
            onClick={() => setShowForm(true)}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#d4b87a'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c8a96e'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter une offre
          </button>
        </header>

        <div style={styles.divider} />

        {loading && (
          <div style={styles.centeredState}>
            <div style={styles.spinnerRing} />
            <p style={styles.stateText}>Chargement…</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3a3530"
                strokeWidth="1.5"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <p style={styles.emptyTitle}>Aucune offre pour l'instant.</p>
            <p style={styles.emptyHint}>
              Commencez par ajouter votre première candidature.
            </p>
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <>
            <p style={styles.count}>
              {offers.length} offre{offers.length > 1 ? 's' : ''}
            </p>
            <div style={styles.grid}>
              {offers.map((offer) => (
                <JobCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => navigate(`/jobs/${offer.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <JobForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
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
    position: 'relative',
  },
  noiseOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
    pointerEvents: 'none',
    opacity: 0.4,
    zIndex: 0,
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '20px',
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#c8a96e',
    margin: '0 0 8px',
    fontWeight: 500,
  },
  heading: {
    fontFamily: "'DM Serif Display', 'Georgia', serif",
    fontSize: '34px',
    fontWeight: 400,
    color: '#f0ede8',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: '#c8a96e',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    flexShrink: 0,
  },
  divider: {
    borderTop: '1px solid #1a1816',
    marginBottom: '32px',
  },
  centeredState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '80px 0',
  },
  spinnerRing: {
    width: '32px',
    height: '32px',
    border: '2px solid #2a2520',
    borderTop: '2px solid #c8a96e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  stateText: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '12px',
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '80px 0',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: '#141210',
    border: '1px solid #1e1c18',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontFamily: "'DM Serif Display', 'Georgia', serif",
    fontSize: '18px',
    fontWeight: 400,
    color: '#5a5550',
    margin: 0,
  },
  emptyHint: {
    fontSize: '13px',
    color: '#3a3530',
    margin: 0,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.02em',
  },
  count: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#5a5550',
    marginBottom: '16px',
    marginTop: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '12px',
    animation: 'fadeIn 0.25s ease',
  },
}

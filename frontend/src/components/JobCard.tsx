import React from 'react'
import { StatusBadge } from './StatusBadge'

interface JobOffer {
  id: string
  title: string
  company: string
  status: string
  location?: string
  salary?: string
  followup_date?: string | null
  interview_date?: string | null
}

interface JobCardProps {
  offer: JobOffer
  onClick: () => void
}

const STATUS_LABELS: Record<string, string> = {
  applied: 'Candidature envoyée',
  interview_scheduled: 'Entretien planifié',
  offer_received: 'Offre reçue',
  rejected: 'Refusé',
  withdrawn: 'Retiré',
  saved: 'Sauvegardé',
}

const STATUS_ACCENT: Record<string, string> = {
  applied: '#3b82f6',
  interview_scheduled: '#8b5cf6',
  offer_received: '#10b981',
  rejected: '#6b7280',
  withdrawn: '#6b7280',
  saved: '#f59e0b',
}

function getAccentColor(status: string): string {
  return STATUS_ACCENT[status] ?? '#4b5563'
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const cardStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: '#1c1917',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px',
  padding: '18px 20px 16px 24px',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  fontFamily: 'system-ui, sans-serif',
}

const accentBarStyle = (color: string): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: '3px',
  backgroundColor: color,
  borderRadius: '10px 0 0 10px',
})

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: '#f5f0eb',
  lineHeight: 1.3,
  fontFamily: "'DM Serif Display', 'Georgia', serif",
  letterSpacing: '-0.01em',
}

const companyStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '12px',
  color: '#a8a29e',
  fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
  fontWeight: 400,
  letterSpacing: '0.02em',
}

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '10px',
  alignItems: 'center',
}

const metaChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  color: '#78716c',
  fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
  letterSpacing: '0.02em',
}

const statusLabelStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color,
  fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
  padding: '2px 8px',
  borderRadius: '4px',
  backgroundColor: `${color}18`,
  border: `1px solid ${color}30`,
})


export function JobCard({ offer, onClick }: JobCardProps) {
  const accentColor = getAccentColor(offer.status)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = 'translateY(-2px)'
    el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}30`
    el.style.borderColor = `${accentColor}40`
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = 'none'
    el.style.borderColor = 'rgba(255,255,255,0.07)'
  }

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div style={accentBarStyle(accentColor)} />

      <h3 style={titleStyle}>{offer.title}</h3>
      <p style={companyStyle}>{offer.company}</p>

      <div style={metaRowStyle}>
        {offer.location && (
          <span style={metaChipStyle}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            {offer.location}
          </span>
        )}
        {offer.salary && (
          <span style={metaChipStyle}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            {offer.salary}
          </span>
        )}
        <span style={statusLabelStyle(accentColor)}>
          {getStatusLabel(offer.status)}
        </span>
      </div>

      <StatusBadge
        status={offer.status}
        followup_date={offer.followup_date ?? null}
        interview_date={offer.interview_date ?? null}
      />
    </div>
  )
}

export default JobCard

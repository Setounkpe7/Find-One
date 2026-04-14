import React from 'react'

interface StatusBadgeProps {
  status: string
  followup_date: string | null
  interview_date: string | null
}

function isFollowupDue(followup_date: string | null, status: string): boolean {
  if (!followup_date || status !== 'applied') return false
  const today = new Date().toISOString().split('T')[0]
  return followup_date <= today
}

function isInterviewSoon(interview_date: string | null): boolean {
  if (!interview_date) return false
  const now = Date.now()
  const interviewTime = new Date(interview_date + 'T00:00:00').getTime()
  return interviewTime >= now && interviewTime <= now + 48 * 60 * 60 * 1000
}

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 10px 3px 7px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
  lineHeight: 1.4,
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
}

const followupStyle: React.CSSProperties = {
  ...badgeBase,
  backgroundColor: 'rgba(249, 115, 22, 0.15)',
  color: '#f97316',
  border: '1px solid rgba(249, 115, 22, 0.35)',
  boxShadow: '0 0 8px rgba(249, 115, 22, 0.2)',
}

const interviewStyle: React.CSSProperties = {
  ...badgeBase,
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: '#ef4444',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)',
}

const dotBase: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
}

export function StatusBadge({ status, followup_date, interview_date }: StatusBadgeProps) {
  const showFollowup = isFollowupDue(followup_date, status)
  const showInterview = isInterviewSoon(interview_date)

  if (!showFollowup && !showInterview) return null

  return (
    <span style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
      {showFollowup && (
        <span data-testid="followup-badge" style={followupStyle}>
          <span style={{ ...dotBase, backgroundColor: '#f97316' }} />
          Relance due
        </span>
      )}
      {showInterview && (
        <span data-testid="interview-badge" style={interviewStyle}>
          <span style={{ ...dotBase, backgroundColor: '#ef4444' }} />
          Entretien proche
        </span>
      )}
    </span>
  )
}

export default StatusBadge

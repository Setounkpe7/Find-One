import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('shows orange badge when followup_date is today and status is applied', () => {
    const today = new Date().toISOString().split('T')[0]
    render(<StatusBadge status="applied" followup_date={today} interview_date={null} />)
    expect(screen.getByTestId('followup-badge')).toBeInTheDocument()
  })

  it('shows red badge when interview is within 48 hours', () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    render(<StatusBadge status="interview_scheduled" followup_date={null} interview_date={soon} />)
    expect(screen.getByTestId('interview-badge')).toBeInTheDocument()
  })

  it('shows no badge when no alerts are due', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    render(<StatusBadge status="applied" followup_date={future} interview_date={null} />)
    expect(screen.queryByTestId('followup-badge')).toBeNull()
  })
})

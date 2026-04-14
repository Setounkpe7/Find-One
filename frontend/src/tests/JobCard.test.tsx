import { render, screen } from '@testing-library/react'
import { JobCard } from '../components/JobCard'

const sampleOffer = {
  id: '1',
  title: 'Frontend Developer',
  company: 'Acme Corp',
  status: 'applied',
  location: 'Paris',
  salary: '50k',
  followup_date: null,
  interview_date: null,
}

describe('JobCard', () => {
  it('renders the job title', () => {
    render(<JobCard offer={sampleOffer} onClick={() => {}} />)
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
  })

  it('renders the company name', () => {
    render(<JobCard offer={sampleOffer} onClick={() => {}} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders location when provided', () => {
    render(<JobCard offer={sampleOffer} onClick={() => {}} />)
    expect(screen.getByText('Paris')).toBeInTheDocument()
  })

  it('renders salary when provided', () => {
    render(<JobCard offer={sampleOffer} onClick={() => {}} />)
    expect(screen.getByText('50k')).toBeInTheDocument()
  })
})

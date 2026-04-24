import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs/job-42',
    method: 'GET',
    body: {
      id: 'job-42',
      title: 'Staff Platform Engineer',
      company: 'Contoso',
      url: 'https://contoso.example/careers/42',
      location: 'Paris, France',
      salary: '85-110k€',
      contract_type: 'CDI',
      recruiter_name: 'Marie Dupont',
      status: 'applied',
      applied_at: '2026-04-10',
      followup_date: '2026-04-20',
      interview_date: '2026-04-30',
      notes: 'Équipe Platform. Contact via LinkedIn.',
    },
  },
  {
    path: '/api/templates',
    method: 'GET',
    body: [],
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

// DocViewer has its own API calls — stub so JobDetail's test is hermetic.
vi.mock('../components/DocViewer', () => ({
  DocViewer: () => <div data-testid="docviewer-stub" />,
}))

// JobForm is only rendered after clicking "Modifier"; stub to avoid mounting its modal.
vi.mock('../components/JobForm', () => ({
  JobForm: () => null,
}))

import JobDetail from '../pages/JobDetail'

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/jobs/job-42']}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('JobDetail (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title, company, status label from JobOffer', async () => {
    renderDetail()
    expect(await screen.findByText('Staff Platform Engineer')).toBeInTheDocument()
    expect(screen.getByText('Contoso')).toBeInTheDocument()
    expect(screen.getByTestId('job-status-badge')).toHaveTextContent('Candidature envoyée')
  })

  it('renders location, contract_type, salary in subtitle', async () => {
    renderDetail()
    await screen.findByText('Staff Platform Engineer')
    // They are joined with " · ".
    expect(screen.getByText(/Paris, France/)).toBeInTheDocument()
    expect(screen.getByText(/CDI/)).toBeInTheDocument()
    expect(screen.getByText(/85-110k€/)).toBeInTheDocument()
  })

  it('renders url, recruiter_name, applied_at, followup_date, interview_date, notes', async () => {
    renderDetail()
    await screen.findByText('Staff Platform Engineer')
    expect(screen.getByText('https://contoso.example/careers/42')).toBeInTheDocument()
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    expect(screen.getByText('2026-04-10')).toBeInTheDocument()
    expect(screen.getByText('2026-04-20')).toBeInTheDocument()
    expect(screen.getByText('2026-04-30')).toBeInTheDocument()
    expect(screen.getByText(/Équipe Platform/)).toBeInTheDocument()
  })
})

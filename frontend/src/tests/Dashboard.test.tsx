import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs',
    method: 'GET',
    body: [
      {
        id: 'job-1',
        title: 'Staff Engineer',
        company: 'Acme Corp',
        status: 'applied',
      },
      {
        id: 'job-2',
        title: 'Backend Lead',
        company: 'Globex',
        status: 'interview_scheduled',
      },
      {
        id: 'job-3',
        title: 'Principal Engineer',
        company: 'Initech',
        status: 'offer_received',
      },
    ],
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'alice@example.com' } }),
}))

import Dashboard from '../pages/Dashboard'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title + company for each JobOffer from GET /api/jobs', async () => {
    renderDashboard()
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Backend Lead')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
  })

  it('counts interview_scheduled + offer_received from status field', async () => {
    renderDashboard()
    await screen.findByText('Staff Engineer')

    expect(screen.getByTestId('stat-card-interviews').textContent).toMatch(/1/)
    expect(screen.getByTestId('stat-card-offers').textContent).toMatch(/1/)
  })

  it('derives the greeting name from the authenticated user email', async () => {
    renderDashboard()
    expect(await screen.findByText(/Alice/)).toBeInTheDocument()
  })
})

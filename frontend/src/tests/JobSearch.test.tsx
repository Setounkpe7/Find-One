import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: /^\/api\/search\/jobs\?/,
    method: 'GET',
    body: [
      {
        title: 'Senior Backend Engineer',
        company: 'OpenPayments',
        location: 'Remote EU',
        description: 'Build the payment rail.',
        url: 'https://example.com/openpay-1',
      },
    ],
  },
  {
    path: '/api/search/url',
    method: 'POST',
    body: {
      title: 'Scraped Role',
      company: 'ScrapedCo',
      location: 'Lyon',
      description: 'Imported description.',
      url: 'https://scraped.example/role',
    },
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

vi.mock('../components/JobForm', () => ({
  JobForm: () => null,
}))

import JobSearch from '../pages/JobSearch'

describe('JobSearch (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title, company, location from /api/search/jobs results', async () => {
    const user = userEvent.setup()
    render(<JobSearch />)

    await user.type(screen.getByPlaceholderText(/Développeur full-stack/i), 'backend')
    // Two "Rechercher" buttons exist (the tab + the submit); target the submit one.
    const rechercherButtons = screen.getAllByRole('button', { name: /Rechercher$/i })
    const submitSearch = rechercherButtons.find((b) => b.getAttribute('type') === 'submit')!
    await user.click(submitSearch)

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument()
    // Company + location are joined with " · " in the same subtitle element.
    expect(screen.getByText(/OpenPayments/)).toBeInTheDocument()
    expect(screen.getByText(/Remote EU/)).toBeInTheDocument()
  })

  it('renders title, company, location from /api/search/url result', async () => {
    const user = userEvent.setup()
    render(<JobSearch />)

    // Switch to the "Importer une URL" tab.
    await user.click(screen.getByRole('button', { name: /Importer une URL/i }))
    await user.type(screen.getByLabelText(/URL de l'offre/i), 'https://scraped.example/role')
    await user.click(screen.getByRole('button', { name: /Extraire$/i }))

    await waitFor(() =>
      expect(screen.getByText('Scraped Role')).toBeInTheDocument()
    )
    expect(screen.getByText(/ScrapedCo/)).toBeInTheDocument()
    expect(screen.getByText(/Lyon/)).toBeInTheDocument()
  })
})

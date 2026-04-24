import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const createResponse = {
  id: 'created-1',
  title: 'Staff Engineer',
  company: 'Acme',
  status: 'to_apply',
}

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs',
    method: 'POST',
    body: createResponse,
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

import { JobForm } from '../components/JobForm'

describe('JobForm (round-trip contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('populates every input from initialData (JobOffer shape)', () => {
    const initial = {
      id: 'j-1',
      title: 'Senior Dev',
      company: 'Contoso',
      url: 'https://contoso.example',
      location: 'Paris',
      salary: '70k€',
      contract_type: 'cdi',
      recruiter_name: 'M. Dupont',
      status: 'applied',
      applied_at: '2026-04-01',
      followup_date: '2026-04-10',
      interview_date: '2026-04-20',
      notes: 'Great team.',
    }

    render(<JobForm initialData={initial} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText(/Poste/i)).toHaveValue('Senior Dev')
    expect(screen.getByLabelText(/Entreprise/i)).toHaveValue('Contoso')
    expect(screen.getByLabelText(/URL de l'offre/i)).toHaveValue('https://contoso.example')
    expect(screen.getByLabelText(/Lieu/i)).toHaveValue('Paris')
    expect(screen.getByLabelText(/Salaire/i)).toHaveValue('70k€')
    expect(screen.getByLabelText(/Type de contrat/i)).toHaveValue('cdi')
    expect(screen.getByLabelText(/Recruteur/i)).toHaveValue('M. Dupont')
    expect(screen.getByLabelText(/^Statut$/i)).toHaveValue('applied')
    expect(screen.getByLabelText(/Date de candidature/i)).toHaveValue('2026-04-01')
    expect(screen.getByLabelText(/Date de relance/i)).toHaveValue('2026-04-10')
    expect(screen.getByLabelText(/Date d'entretien/i)).toHaveValue('2026-04-20')
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Great team.')
  })

  it('forwards the POST /api/jobs response to onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<JobForm onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/Poste/i), 'Staff Engineer')
    await user.type(screen.getByLabelText(/Entreprise/i), 'Acme')
    await user.click(screen.getByRole('button', { name: /Ajouter l'offre/i }))

    // Wait for the async submit to resolve.
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(createResponse)
  })
})

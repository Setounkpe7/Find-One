import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/profile',
    method: 'GET',
    body: {
      generation_instructions: 'Mettez en avant mes 8 ans en backend.',
      preferred_language: 'en',
    },
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

// Import AFTER vi.mock so the module picks up the mock.
import Profile from '../pages/Profile'

describe('Profile (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders generation_instructions from GET /api/profile', async () => {
    render(<Profile />)
    const textarea = await screen.findByLabelText(/Instructions personnelles/i)
    expect(textarea).toHaveValue('Mettez en avant mes 8 ans en backend.')
  })

  it('renders preferred_language from GET /api/profile', async () => {
    render(<Profile />)
    const select = await screen.findByLabelText(/Langue des documents/i)
    await waitFor(() => expect(select).toHaveValue('en'))
  })
})

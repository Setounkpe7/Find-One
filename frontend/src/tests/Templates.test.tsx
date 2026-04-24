import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/templates',
    method: 'GET',
    body: [
      {
        id: 'tpl-1',
        name: 'CV senior full-stack',
        job_type: 'Développeur',
        file_type: 'pdf',
        created_at: '2026-03-01T12:00:00Z',
      },
      {
        id: 'tpl-2',
        name: 'Lettre de motivation',
        job_type: null,
        file_type: 'docx',
        created_at: '2026-03-02T12:00:00Z',
      },
    ],
  },
])

vi.mock('../lib/api', () => ({
  get apiFetch() {
    return apiFetchMock
  },
}))

import Templates from '../pages/Templates'

describe('Templates (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders name + job_type + file_type for each template', async () => {
    render(<Templates />)
    expect(await screen.findByText('CV senior full-stack')).toBeInTheDocument()
    expect(screen.getByText('Développeur')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()

    expect(screen.getByText('Lettre de motivation')).toBeInTheDocument()
    expect(screen.getByText('DOCX')).toBeInTheDocument()
  })

  it('falls back to "Type non spécifié" when job_type is null', async () => {
    render(<Templates />)
    await screen.findByText('Lettre de motivation')
    expect(screen.getByText('Type non spécifié')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from '../pages/NotFound'

describe('NotFound', () => {
  it('renders the 404 page with a link back to home instead of a blank screen', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByText(/erreur 404/i)).toBeInTheDocument()
    expect(screen.getByText(/égaré/i)).toBeInTheDocument()
    const home = screen.getByRole('link', { name: /retour à l'accueil/i })
    expect(home).toHaveAttribute('href', '/')
  })
})

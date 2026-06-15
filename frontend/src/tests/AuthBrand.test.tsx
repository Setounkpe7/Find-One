import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'

describe('AuthBrand', () => {
  it('renders the logo, footer and child content', () => {
    const { container } = render(
      <AuthBrand footer="© 2026 Find-One">
        <AuthBrandStatement
          quote={<span>Une page</span>}
          eyebrowTitle="Find-One"
          eyebrowSub="Le compagnon"
        />
      </AuthBrand>,
    )
    expect(container.querySelector('.brand-logo')).toBeInTheDocument()
    expect(screen.getByText('© 2026 Find-One')).toBeInTheDocument()
    expect(screen.getByText('Une page')).toBeInTheDocument()
    expect(screen.getByText('Find-One')).toBeInTheDocument()
    expect(screen.getByText('Le compagnon')).toBeInTheDocument()
  })

  it('defaults the footer to "© 2026 Find-One"', () => {
    render(
      <AuthBrand>
        <span>child</span>
      </AuthBrand>,
    )
    expect(screen.getByText('© 2026 Find-One')).toBeInTheDocument()
  })

  it('adds the right-aligned modifier class when align="right"', () => {
    const { container } = render(
      <AuthBrand align="right">
        <span>child</span>
      </AuthBrand>,
    )
    expect(container.querySelector('.auth-brand-right')).toBeInTheDocument()
  })
})

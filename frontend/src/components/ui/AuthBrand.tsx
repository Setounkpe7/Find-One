import { ReactNode } from 'react'

interface AuthBrandProps {
  children: ReactNode
  align?: 'left' | 'right'
  footer?: ReactNode
}

/**
 * Shared sidebar panel for the auth/404 split layouts: brand logo on top,
 * arbitrary middle content, footer at the bottom. The "paper-trail" editorial
 * look lives in paper-trail.css (.auth-brand, .brand-logo, .brand-footer).
 */
export function AuthBrand({
  children,
  align = 'left',
  footer = '© 2026 Find-One',
}: AuthBrandProps) {
  return (
    <div className={`auth-brand${align === 'right' ? ' auth-brand-right' : ''}`}>
      <div className="brand-head">
        <div className="brand-logo">
          Find<span>·</span>One
        </div>
        <div className="brand-logo-sub">Votre parcours, votre récit</div>
      </div>

      {children}

      <div className="brand-footer">
        <span>{footer}</span>
      </div>
    </div>
  )
}

interface AuthBrandStatementProps {
  quote: ReactNode
  eyebrowTitle: string
  eyebrowSub: string
}

/**
 * The big italic statement + eyebrow block shared by Login and NotFound.
 */
export function AuthBrandStatement({
  quote,
  eyebrowTitle,
  eyebrowSub,
}: AuthBrandStatementProps) {
  return (
    <div className="brand-statement-block">
      <div className="brand-statement">{quote}</div>
      <div className="brand-eyebrow-block">
        <strong>{eyebrowTitle}</strong>
        {eyebrowSub}
      </div>
    </div>
  )
}

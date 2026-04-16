import { ReactNode } from 'react'

type Props = {
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, hint, error, htmlFor, children }: Props) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

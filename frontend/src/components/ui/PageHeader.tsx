import { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">
          {title}
          {subtitle && <span>{subtitle}</span>}
        </h1>
      </div>
      {actions && <div className="row gap-2 center">{actions}</div>}
    </div>
  )
}

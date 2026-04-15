import { HTMLAttributes } from 'react'

export type BadgeVariant =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'pending'
  | 'rejected'

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant, className = '', children, ...rest }: Props) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...rest}>
      {children}
    </span>
  )
}

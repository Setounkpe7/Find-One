import { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...rest }: Props) {
  return <div className={`card ${className}`.trim()} {...rest} />
}

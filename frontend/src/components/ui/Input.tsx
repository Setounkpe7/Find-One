import { InputHTMLAttributes, forwardRef } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = '', ...rest }, ref) => (
    <input ref={ref} className={`input ${className}`.trim()} {...rest} />
  )
)
Input.displayName = 'Input'

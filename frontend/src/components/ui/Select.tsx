import { SelectHTMLAttributes, forwardRef } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`select ${className}`.trim()} {...rest}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'

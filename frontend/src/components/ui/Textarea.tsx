import { TextareaHTMLAttributes, forwardRef } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className = '', ...rest }, ref) => (
    <textarea ref={ref} className={`textarea ${className}`.trim()} {...rest} />
  )
)
Textarea.displayName = 'Textarea'

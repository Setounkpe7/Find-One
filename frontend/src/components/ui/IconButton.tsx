import { ButtonHTMLAttributes, forwardRef } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'md' | 'sm'
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ size = 'md', className = '', children, ...rest }, ref) => {
    const cls = ['btn-icon', size === 'sm' && 'btn-icon-sm', className]
      .filter(Boolean)
      .join(' ')
    return (
      <button ref={ref} className={cls} {...rest}>
        {children}
      </button>
    )
  }
)
IconButton.displayName = 'IconButton'

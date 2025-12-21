'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'font-semibold transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-gradient-to-r from-poe-gold-dark via-poe-gold to-poe-gold-dark text-poe-darker hover:from-poe-gold hover:via-poe-gold-light hover:to-poe-gold shadow-poe hover:shadow-poe-hover',
      secondary: 'bg-poe-card border border-poe-border text-poe-text hover:border-poe-gold hover:text-poe-gold',
      ghost: 'bg-transparent text-poe-text-muted hover:text-poe-gold hover:bg-poe-card/50',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button


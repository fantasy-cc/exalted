'use client'

import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'highlight'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const baseStyles = 'bg-poe-card border rounded-lg p-6'
    
    const variants = {
      default: 'border-poe-border shadow-poe',
      hover: 'border-poe-border shadow-poe transition-all duration-300 hover:shadow-poe-hover hover:border-poe-gold/30',
      highlight: 'border-poe-gold shadow-poe-hover',
    }
    
    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card


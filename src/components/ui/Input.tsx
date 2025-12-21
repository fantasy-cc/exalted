'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-poe-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 rounded-lg transition-all duration-300
            bg-poe-darker border text-poe-text
            focus:outline-none focus:ring-1
            placeholder:text-poe-text-muted
            ${error 
              ? 'border-poe-red focus:border-poe-red focus:ring-poe-red/50' 
              : 'border-poe-border focus:border-poe-gold focus:ring-poe-gold/50'}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-poe-text-muted">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-poe-red">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input


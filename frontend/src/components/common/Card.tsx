import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'elevated' | 'gradient' | 'outlined'
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = {
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
}

const variants = {
  default: 'bg-stash-card border border-stash-border/70 shadow-card',
  elevated: 'bg-stash-card border border-stash-border/70 shadow-elevated',
  gradient: 'bg-stash-card border border-stash-border/70 bg-gradient-to-br from-stash-accent/4 via-transparent to-stash-primary/4 shadow-card',
  outlined: 'border border-stash-border/70 bg-transparent hover:border-stash-border-hover',
}

export default function Card({
  children,
  className = '',
  onClick,
  variant = 'default',
  hover = true,
  padding = 'md',
}: CardProps) {
  const Component = onClick ? motion.button : motion.div
  return (
    <Component
      onClick={onClick}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      className={`${variants[variant]} rounded-2xl ${paddings[padding]} text-left w-full shadow-card ${
        onClick ? 'cursor-pointer' : ''
      } ${hover ? 'transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 hover:border-stash-border-hover' : 'transition-colors duration-300'} ${className}`}
    >
      {children}
    </Component>
  )
}

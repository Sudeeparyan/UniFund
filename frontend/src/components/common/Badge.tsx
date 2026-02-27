interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent'
  className?: string
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantClasses = {
  primary: 'bg-stash-primary/10 text-stash-primary border-stash-primary/20',
  success: 'bg-stash-success/10 text-stash-success border-stash-success/20',
  warning: 'bg-stash-warning/10 text-stash-warning border-stash-warning/20',
  danger: 'bg-stash-danger/10 text-stash-danger border-stash-danger/20',
  neutral: 'bg-stash-elevated text-stash-text-secondary border-stash-border',
  info: 'bg-stash-info/10 text-stash-info border-stash-info/20',
  accent: 'bg-stash-accent/10 text-stash-accent border-stash-accent/20',
}

const dotColors = {
  primary: 'bg-stash-primary',
  success: 'bg-stash-success',
  warning: 'bg-stash-warning',
  danger: 'bg-stash-danger',
  neutral: 'bg-stash-text-muted',
  info: 'bg-stash-info',
  accent: 'bg-stash-accent',
}

export default function Badge({ children, variant = 'neutral', className = '', size = 'md', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-semibold tracking-wide border ${
      size === 'sm' ? 'px-2 py-0.5 text-[9px] uppercase' : 'px-2.5 py-1 text-[10px] uppercase'
    } ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

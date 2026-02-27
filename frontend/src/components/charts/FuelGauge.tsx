import { motion } from 'framer-motion'

interface FuelGaugeProps {
  value: number  // 0-1 percentage
  label: string
  sublabel: string
}

export default function FuelGauge({ value, label, sublabel }: FuelGaugeProps) {
  const percentage = Math.max(0, Math.min(1, value))
  const rotation = -90 + percentage * 180
  const dashOffset = 251 - 251 * percentage

  const color =
    percentage > 0.5 ? 'var(--color-stash-success)' : percentage > 0.25 ? 'var(--color-stash-warning)' : 'var(--color-stash-danger)'

  return (
    <div className="flex flex-col items-center py-2">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-stash-danger)" />
            <stop offset="50%" stopColor="var(--color-stash-warning)" />
            <stop offset="100%" stopColor="var(--color-stash-success)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background Arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-stash-elevated)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Filled Arc */}
        <motion.path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="251"
          filter="url(#glow)"
          initial={{ strokeDashoffset: 251 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Needle */}
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="38"
            stroke="var(--color-stash-text)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <circle cx="100" cy="100" r="7" fill="var(--color-stash-primary)" opacity="0.9" />
          <circle cx="100" cy="100" r="2.5" fill="var(--color-stash-text)" />
        </motion.g>
        {/* Labels */}
        <text x="20" y="118" fill="var(--color-stash-text-muted)" fontSize="9" textAnchor="start" fontWeight="500" fontFamily="Inter, sans-serif">
          EMPTY
        </text>
        <text x="180" y="118" fill="var(--color-stash-text-muted)" fontSize="9" textAnchor="end" fontWeight="500" fontFamily="Inter, sans-serif">
          FULL
        </text>
      </svg>
      <div className="text-center -mt-2">
        <motion.div
          className="text-3xl font-bold tracking-tight"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          {label}
        </motion.div>
        <div className="text-sm text-stash-text-secondary mt-0.5">{sublabel}</div>
      </div>
    </div>
  )
}

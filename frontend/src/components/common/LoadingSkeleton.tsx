import { motion } from 'framer-motion'

const skeletonVariants = [
  { widths: ['w-3/5', 'w-2/5', 'w-4/5'] },
  { widths: ['w-2/3', 'w-1/3', 'w-3/5'] },
  { widths: ['w-1/2', 'w-3/4', 'w-2/5'] },
]

export default function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {Array.from({ length: count }).map((_, i) => {
        const variant = skeletonVariants[i % skeletonVariants.length]
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-stash-card border border-stash-border rounded-2xl p-5"
          >
            <div className={`h-4 bg-stash-elevated rounded-lg ${variant.widths[0]} mb-3.5 shimmer`} />
            <div className={`h-3 bg-stash-elevated/60 rounded-lg ${variant.widths[1]} mb-2.5 shimmer`} />
            <div className={`h-3 bg-stash-elevated/40 rounded-lg ${variant.widths[2]} shimmer`} />
          </motion.div>
        )
      })}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Gift, Store, Compass,
} from 'lucide-react'
import Card from '../components/common/Card'

const links = [
  { to: '/squad', icon: Users, label: 'Squad', desc: 'Split bills & track IOUs', color: 'text-stash-primary' },
  { to: '/perks', icon: Gift, label: 'Perks', desc: 'Student discounts & offers', color: 'text-stash-accent' },
  { to: '/market', icon: Store, label: 'Market', desc: 'Secondhand deals & barter', color: 'text-stash-success' },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }

export default function MoreMenu() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3.5 max-w-3xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display mb-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stash-accent/15 to-stash-gold/10 flex items-center justify-center ring-1 ring-stash-accent/15">
            <Compass size={18} className="text-stash-accent" />
          </div>
          Explore More
        </h1>
        <p className="text-sm text-stash-text-secondary">Additional tools & features</p>
      </motion.div>

      <div className="grid gap-3">
        {links.map(({ to, icon: Icon, label, desc, color }) => (
          <motion.div key={to} variants={item}>
            <Link to={to}>
              <Card className="card-shine flex items-center gap-4 hover:border-stash-accent/20 transition-all group">
                <div className={`w-11 h-11 rounded-xl bg-stash-elevated/40 flex items-center justify-center ring-1 ring-stash-border/50 group-hover:ring-stash-accent/20 transition-all ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-stash-text-muted">{desc}</div>
                </div>
                <span className="text-stash-text-muted/40 text-lg group-hover:text-stash-accent transition-colors">›</span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

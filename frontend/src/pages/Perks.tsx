import { useCallback, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Search, MapPin, Train, Bike, ExternalLink, Sparkles, Copy, Check, Flame, Lightbulb } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getPerks } from '../services/api'
import type { Perk } from '../types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }
const categories = ['All', 'Food', 'Shopping', 'Entertainment', 'Tech', 'Transport']

// Mock transport optimizer data
const transportOptimizer = {
  current: { mode: 'Luas', monthlySpend: 80, emoji: '🚃' },
  suggestion: { mode: 'Dublin Bikes', annualCost: 35, monthlyCost: 2.92, emoji: '🚲' },
  savingsPerMonth: 77.08,
}

// Mock nearby deals
const nearbyDeals = [
  { brand: 'Tesco Express', distance: '200m', deal: '10% off with Clubcard', emoji: '🛒' },
  { brand: 'Insomnia Coffee', distance: '350m', deal: 'Student price €2.50', emoji: '☕' },
  { brand: "Supermac's", distance: '500m', deal: 'Meal deal €6.99', emoji: '🍔' },
]

// Aggregator sources
const aggregators = [
  { name: 'UNiDAYS', emoji: '🎓', deals: 47, url: 'https://www.myunidays.com' },
  { name: 'Student Beans', emoji: '🫘', deals: 32, url: 'https://www.studentbeans.com' },
  { name: 'TCD SU', emoji: '🏫', deals: 12, url: '#' },
]

export default function Perks() {
  const fetcher = useCallback(() => getPerks(), [])
  const { data, loading } = useApi(fetcher)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    let result = data as Perk[]
    if (filter !== 'All') result = result.filter((p) => p.category === filter)
    if (search) result = result.filter((p) => p.brand.toLowerCase().includes(search.toLowerCase()) || p.deal.toLowerCase().includes(search.toLowerCase()))
    return result
  }, [data, filter, search])

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading || !data) return <LoadingSkeleton count={4} />

  const allPerks = data as Perk[]
  const hotCount = allPerks.filter((p) => p.isHot).length
  const nearCount = allPerks.filter((p) => p.nearYou).length

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stash-warning/10 flex items-center justify-center">
              <Gift size={18} className="text-stash-warning" />
            </div>
            Student Perks
          </h1>
          <p className="text-xs text-stash-text-secondary mt-1">{allPerks.length} deals active · {hotCount} hot · {nearCount} near you</p>
        </div>
        <Card className="py-2 px-3">
          <div className="text-xs text-stash-text-muted">Saved this month</div>
          <div className="text-lg font-bold text-stash-success">€24.50</div>
        </Card>
      </motion.div>

      {/* AI Perks Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="perks" accentColor="stash-warning" compact />
      </motion.div>

      {/* Transport Mode Optimizer */}
      <motion.div variants={item}>
        <Card variant="gradient">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-stash-primary/15 flex items-center justify-center">
              <Train size={14} className="text-stash-primary" />
            </div>
            <span className="text-sm font-semibold">Transport Mode Optimizer</span>
            <Badge variant="primary"><Lightbulb size={10} className="mr-0.5" /> Insight</Badge>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 text-center p-2.5 bg-stash-danger/8 rounded-xl border border-stash-danger/15">
              <div className="text-2xl">{transportOptimizer.current.emoji}</div>
              <div className="text-xs text-stash-text-muted mt-1">Current</div>
              <div className="text-sm font-bold text-stash-danger tabular-nums">€{transportOptimizer.current.monthlySpend}/mo</div>
            </div>
            <div className="text-stash-text-muted">→</div>
            <div className="flex-1 text-center p-2.5 bg-stash-success/8 rounded-xl border border-stash-success/15">
              <div className="text-2xl">{transportOptimizer.suggestion.emoji}</div>
              <div className="text-xs text-stash-text-muted mt-1">Switch to</div>
              <div className="text-sm font-bold text-stash-success tabular-nums">€{transportOptimizer.suggestion.monthlyCost}/mo</div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-stash-elevated/50 rounded-xl p-3 border border-stash-border">
            <span className="text-xs text-stash-text-secondary">
              You spent €{transportOptimizer.current.monthlySpend} on {transportOptimizer.current.mode} — switch to{' '}
              <strong className="text-stash-success">{transportOptimizer.suggestion.mode}</strong> for just €{transportOptimizer.suggestion.annualCost}/year
            </span>
            <span className="text-xs font-bold text-stash-success whitespace-nowrap ml-2">
              Save €{transportOptimizer.savingsPerMonth.toFixed(0)}/mo
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Nearby Deals (mock GPS) */}
      <motion.div variants={item}>
        <Card>
          <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-stash-danger/15 flex items-center justify-center">
                <MapPin size={14} className="text-stash-danger" />
              </div>
            <span className="text-sm font-semibold">Near You</span>
            <span className="text-[10px] bg-stash-danger/20 text-stash-danger px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-stash-danger animate-pulse" /> LIVE</span>
          </div>
          <div className="space-y-2">
            {nearbyDeals.map((deal, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-stash-elevated/50 rounded-xl border border-stash-border">
                <span className="text-xl">{deal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{deal.brand}</div>
                  <div className="text-xs text-stash-text-secondary">{deal.deal}</div>
                </div>
                <div className="text-xs text-stash-text-muted">{deal.distance}</div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Aggregator Sources */}
      <motion.div variants={item}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {aggregators.map((agg) => (
            <a
              key={agg.name}
              href={agg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-stash-elevated/50 rounded-xl text-xs font-medium whitespace-nowrap hover:border-stash-primary/30 border border-stash-border transition-all shrink-0"
            >
              <span>{agg.emoji}</span>
              <span>{agg.name}</span>
              <span className="text-stash-text-muted">({agg.deals})</span>
              <ExternalLink size={10} className="text-stash-text-muted" />
            </a>
          ))}
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item}>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stash-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for discounts..."
            className="w-full bg-stash-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-all"
          />
        </div>
      </motion.div>

      {/* Category Filters */}
      <motion.div variants={item}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filter === c ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20' : 'bg-stash-elevated/60 text-stash-text-secondary border border-stash-border hover:border-stash-primary/30'
              }`}
            >
              {c}
              {c !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({allPerks.filter((p) => p.category === c).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Perk Cards */}
      {filtered.map((perk: Perk) => (
        <motion.div key={perk.id} variants={item}>
          <Card className={`flex items-center gap-4 ${perk.isHot ? 'ring-1 ring-stash-warning/20 border border-stash-warning/15' : ''}`}>
            <span className="text-3xl">{perk.logo}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{perk.brand}</span>
                {perk.isHot && <Badge variant="warning"><Flame size={10} className="mr-0.5" /> Hot</Badge>}
                {perk.nearYou && <Badge variant="primary"><MapPin size={10} className="mr-0.5" /> Near You</Badge>}
              </div>
              <div className="text-xs text-stash-text-secondary mt-0.5">{perk.deal}</div>
              {perk.code && (
                <button
                  onClick={() => handleCopy(perk.code)}
                  className="inline-flex items-center gap-1 mt-1 text-xs text-stash-primary hover:text-stash-secondary transition-colors"
                >
                  {copiedCode === perk.code ? (
                    <>
                      <Check size={10} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={10} /> {perk.code}
                    </>
                  )}
                </button>
              )}
            </div>
            <button className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border ${
              perk.isActive
                ? 'bg-stash-success/15 text-stash-success border-stash-success/20'
                : 'bg-stash-primary/15 text-stash-primary border-stash-primary/20 hover:bg-stash-primary/25'
            }`}>
              {perk.isActive ? <><Check size={10} className="mr-0.5" /> Active</> : perk.code ? <><Copy size={10} className="mr-0.5" /> Copy</> : <><ExternalLink size={10} className="mr-0.5" /> Get</>}
            </button>
          </Card>
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stash-text-muted">
          <Gift size={40} className="mx-auto mb-3 opacity-30" />
          <p>No deals found</p>
          <p className="text-xs mt-1">Try a different category or search term</p>
        </div>
      )}

      {/* Tip */}
      <motion.div variants={item}>
        <Card className="text-center bg-stash-primary/5 border border-stash-primary/10">
          <Sparkles size={16} className="mx-auto mb-1 text-stash-primary" />
          <div className="text-sm text-stash-text-secondary">
            Open Stash <strong className="text-stash-text">before</strong> you buy to check for discounts!
          </div>
          <div className="text-xs text-stash-text-muted mt-1">
            Ask our <strong>AI Chat</strong> — "Any deals near me?" for personalized suggestions.
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

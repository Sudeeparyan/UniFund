import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins, Gift, ShoppingBag, Sparkles, Tag, Clock, CheckCircle,
  ArrowUpRight, ArrowDownRight, Filter, ChevronRight,
} from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getRewardsShop, getCoins, purchaseReward } from '../services/api'
import type { RewardsShopData, CoinsData } from '../types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
}

const categoryFilters = [
  { value: 'all', label: 'All Rewards', icon: Gift },
  { value: 'coupon', label: 'Coupons', icon: Tag },
  { value: 'app', label: 'App Perks', icon: Sparkles },
  { value: 'badge', label: 'Badges', icon: ShoppingBag },
]

export default function Rewards() {
  const shopFetcher = useCallback(() => getRewardsShop(), [])
  const { data: shopData, loading: shopLoading, refetch: refetchShop } = useApi<RewardsShopData>(shopFetcher)
  const coinsFetcher = useCallback(() => getCoins(), [])
  const { data: coinsData, loading: coinsLoading, refetch: refetchCoins } = useApi<CoinsData>(coinsFetcher)
  const [activeFilter, setActiveFilter] = useState('all')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const handlePurchase = async (rewardId: string) => {
    setPurchasing(rewardId)
    try {
      const result = await purchaseReward(rewardId)
      if (result.success) {
        setToast({ message: result.message, type: 'success' })
        refetchShop()
        refetchCoins()
      } else {
        setToast({ message: result.message, type: 'error' })
      }
    } catch {
      setToast({ message: 'Something went wrong', type: 'error' })
    } finally {
      setPurchasing(null)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (shopLoading || coinsLoading || !shopData || !coinsData) return <LoadingSkeleton count={6} />

  const filteredRewards = activeFilter === 'all'
    ? shopData.rewards
    : shopData.rewards.filter(r => r.category === activeFilter)

  const purchasedCount = shopData.rewards.filter(r => r.purchased).length

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-3xl mx-auto"
    >
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border shadow-luxury backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-stash-success/15 border-stash-success/20 text-stash-success'
                : 'bg-stash-danger/15 border-stash-danger/20 text-stash-danger'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {toast.type === 'success' ? <CheckCircle size={16} /> : <span>⚠️</span>}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Rewards Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="rewards" accentColor="stash-accent" compact />
      </motion.div>

      {/* ── Header: Coin Balance ── */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stash-card via-stash-card to-stash-elevated/80 border border-stash-border/70 shadow-luxury p-6 md:p-8">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-stash-accent/6 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-stash-gold/5 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stash-accent to-stash-gold flex items-center justify-center shadow-glow-accent">
                  <Coins size={22} className="text-stash-dark" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-display">Rewards Shop</h1>
                  <p className="text-xs text-stash-text-muted font-medium">Earn coins, redeem rewards</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stash-elevated/40 border border-stash-border/60 hover:border-stash-border-hover text-xs font-bold text-stash-text-muted hover:text-stash-text transition-all"
              >
                <Clock size={13} />
                History
              </button>
            </div>

            {/* Balance display */}
            <div className="text-center mb-6">
              <div className="text-[10px] text-stash-text-muted uppercase tracking-[0.25em] font-bold mb-2">Your Balance</div>
              <div className="flex items-baseline justify-center gap-2">
                <motion.span
                  className="text-5xl md:text-6xl font-extrabold tracking-tighter gradient-text-gold font-display"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.1 }}
                >
                  {coinsData.balance}
                </motion.span>
                <span className="text-lg text-stash-accent font-bold">coins</span>
              </div>
              <p className="text-xs text-stash-text-muted mt-1">
                {coinsData.lifetime} coins earned all time
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-stash-elevated/30 border border-stash-border/60">
                <div className="text-base font-bold text-stash-accent tabular-nums">{coinsData.lifetime}</div>
                <div className="text-[9px] text-stash-text-muted font-bold uppercase tracking-wider">Total Earned</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-stash-elevated/30 border border-stash-border/60">
                <div className="text-base font-bold text-stash-text tabular-nums">{coinsData.lifetime - coinsData.balance}</div>
                <div className="text-[9px] text-stash-text-muted font-bold uppercase tracking-wider">Spent</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-stash-elevated/30 border border-stash-border/60">
                <div className="text-base font-bold text-stash-success tabular-nums">{purchasedCount}</div>
                <div className="text-[9px] text-stash-text-muted font-bold uppercase tracking-wider">Redeemed</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Coin History (collapsible) ── */}
      <AnimatePresence>
        {showHistory && coinsData.history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="card-shine">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-stash-text-muted" />
                <span className="text-sm font-bold">Recent Activity</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                {coinsData.history.slice(0, 15).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stash-elevated/30 transition-colors border border-transparent hover:border-stash-border/40"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      entry.type === 'earned'
                        ? 'bg-stash-success/8 text-stash-success'
                        : 'bg-stash-danger/8 text-stash-danger'
                    }`}>
                      {entry.type === 'earned' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{entry.label}</div>
                      <div className="text-[10px] text-stash-text-muted">{entry.date} · {entry.source}</div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      entry.type === 'earned' ? 'text-stash-success' : 'text-stash-danger'
                    }`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── How to Earn ── */}
      <motion.div variants={item}>
        <Card className="card-shine">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-stash-accent/8 flex items-center justify-center ring-1 ring-stash-accent/10">
              <Sparkles size={14} className="text-stash-accent" />
            </div>
            <div>
              <span className="text-sm font-bold block">How to Earn Coins</span>
              <span className="text-[10px] text-stash-text-muted font-medium">Complete tasks to fill your wallet</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { icon: '🎯', title: 'Daily Missions', desc: 'Complete daily saving challenges', coins: '15-50 per mission' },
              { icon: '🔥', title: 'Streak Milestones', desc: 'Keep your budget streak alive', coins: '50-600 per milestone' },
              { icon: '🏆', title: 'Achievements', desc: 'Unlock special accomplishments', coins: 'Bonus rewards' },
            ].map((way) => (
              <div key={way.title} className="p-3.5 rounded-xl bg-stash-elevated/30 border border-stash-border/60 hover:border-stash-accent/15 transition-all group">
                <span className="text-xl block mb-2">{way.icon}</span>
                <div className="text-xs font-bold mb-0.5">{way.title}</div>
                <div className="text-[10px] text-stash-text-muted mb-2">{way.desc}</div>
                <div className="flex items-center gap-1">
                  <Coins size={10} className="text-stash-accent" />
                  <span className="text-[10px] text-stash-accent font-bold">{way.coins}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Category Filters ── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Filter size={14} className="text-stash-text-muted shrink-0" />
          {categoryFilters.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveFilter(cat.value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeFilter === cat.value
                  ? 'bg-stash-accent/10 border-stash-accent/20 text-stash-accent shadow-glow-accent'
                  : 'bg-stash-elevated/30 border-stash-border/60 text-stash-text-muted hover:text-stash-text hover:border-stash-border-hover'
              }`}
            >
              <cat.icon size={12} />
              {cat.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Rewards Grid ── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredRewards.map((reward) => {
            const canAfford = coinsData.balance >= reward.cost
            const isOutOfStock = reward.stock !== null && reward.stock <= 0
            const isPurchased = reward.purchased
            const disabled = isPurchased || isOutOfStock || !canAfford || purchasing === reward.id

            return (
              <motion.div
                key={reward.id}
                whileHover={{ y: -2 }}
                className={`relative overflow-hidden rounded-2xl bg-stash-card border transition-all duration-300 ${
                  isPurchased
                    ? 'border-stash-success/20 bg-stash-success/3'
                    : canAfford
                    ? 'border-stash-border/70 hover:border-stash-accent/25 hover:shadow-glow-accent card-shine'
                    : 'border-stash-border/50 opacity-60'
                }`}
              >
                <div className="p-5">
                  {/* Top row: emoji + badges */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{reward.emoji}</span>
                    <div className="flex items-center gap-1.5">
                      {isPurchased && (
                        <Badge variant="success" size="sm">
                          <CheckCircle size={10} className="mr-0.5" /> Owned
                        </Badge>
                      )}
                      {isOutOfStock && !isPurchased && (
                        <Badge variant="danger" size="sm">Sold Out</Badge>
                      )}
                      {reward.stock !== null && reward.stock > 0 && !isPurchased && (
                        <Badge variant="warning" size="sm">{reward.stock} left</Badge>
                      )}
                      <Badge
                        variant={reward.category === 'coupon' ? 'accent' : reward.category === 'app' ? 'info' : 'neutral'}
                        size="sm"
                      >
                        {reward.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Name & description */}
                  <h3 className="text-sm font-bold mb-1">{reward.name}</h3>
                  <p className="text-[11px] text-stash-text-muted leading-relaxed mb-4">{reward.description}</p>

                  {/* Price & action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins size={14} className="text-stash-accent" />
                      <span className="text-lg font-extrabold text-stash-accent tabular-nums">{reward.cost}</span>
                      <span className="text-[10px] text-stash-text-muted font-bold uppercase tracking-wider">coins</span>
                    </div>
                    <button
                      onClick={() => handlePurchase(reward.id)}
                      disabled={disabled}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isPurchased
                          ? 'bg-stash-success/10 text-stash-success border border-stash-success/15 cursor-default'
                          : disabled
                          ? 'bg-stash-elevated/40 text-stash-text-muted border border-stash-border/50 cursor-not-allowed'
                          : 'btn-premium cursor-pointer'
                      } ${purchasing === reward.id ? 'opacity-50' : ''}`}
                    >
                      {isPurchased ? (
                        <>
                          <CheckCircle size={12} /> Redeemed
                        </>
                      ) : purchasing === reward.id ? (
                        'Purchasing...'
                      ) : !canAfford ? (
                        <>Need {reward.cost - coinsData.balance} more</>
                      ) : (
                        <>
                          <ShoppingBag size={12} /> Redeem
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Purchased overlay shimmer */}
                {isPurchased && (
                  <div className="absolute top-0 right-0 w-24 h-24 -translate-y-6 translate-x-6 bg-stash-success/5 rounded-full blur-2xl pointer-events-none" />
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {filteredRewards.length === 0 && (
        <motion.div variants={item} className="text-center py-12">
          <Gift size={32} className="text-stash-text-muted mx-auto mb-3" />
          <p className="text-sm text-stash-text-muted font-medium">No rewards in this category yet</p>
        </motion.div>
      )}
    </motion.div>
  )
}

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BarChart3, Lock, Ghost, Flame, Zap, Trophy, Target,
  ChevronRight, Wallet, Sparkles, Wrench, CheckCircle,
  ArrowUpRight, ArrowDownRight, Shield, Clock, TrendingUp, Calendar, Coins,
} from 'lucide-react'
import Card from '../components/common/Card'
import FuelGauge from '../components/charts/FuelGauge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import Badge from '../components/common/Badge'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getDashboard, getStreaks, getSurvivalMissions, toggleMission } from '../services/api'
import { timeUntilReset } from '../utils'
import type { StreakData, SurvivalMission } from '../types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const fetcher = useCallback(() => getDashboard(), [])
  const { data, loading } = useApi(fetcher)
  const streaksFetcher = useCallback(() => getStreaks(), [])
  const { data: streaksFull } = useApi<StreakData>(streaksFetcher)
  const missionsFetcher = useCallback(() => getSurvivalMissions(), [])
  const { data: missions, refetch: refetchMissions } = useApi<SurvivalMission[]>(missionsFetcher)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [togglingMission, setTogglingMission] = useState<string | null>(null)
  const [coinToast, setCoinToast] = useState<{ amount: number; label: string } | null>(null)

  const handleToggleMission = async (missionId: string) => {
    setTogglingMission(missionId)
    try {
      const result = await toggleMission(missionId)
      refetchMissions()
      // Show coin toast when completing a mission
      if (result.coinsEarned > 0) {
        setCoinToast({ amount: result.coinsEarned, label: 'Mission complete!' })
        setTimeout(() => setCoinToast(null), 2500)
      }
    } finally {
      setTogglingMission(null)
    }
  }

  if (loading || !data) return <LoadingSkeleton count={5} />

  const { budget, runway, vibe, streak, greeting, coins: coinBalance } = data
  const totalLocked = runway.lockedTotal
  const safeToSpend = runway.safeToSpend
  const maxSafe = budget.totalBalance - totalLocked
  const gaugePercent = maxSafe > 0 ? safeToSpend / maxSafe : 0
  const burnPercent = budget.dailyBudget > 0
    ? ((budget.dailyBudget - budget.spentToday) / budget.dailyBudget) * 100
    : 0
  const remaining = budget.dailyBudget - budget.spentToday
  const vibeVariant = vibe.percentRemaining > 50 ? 'success' : vibe.percentRemaining > 25 ? 'warning' : 'danger'

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-3xl mx-auto"
    >
      {/* Coin earned toast */}
      <AnimatePresence>
        {coinToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl bg-stash-accent/15 border border-stash-accent/25 shadow-glow-accent backdrop-blur-xl"
          >
            <Coins size={18} className="text-stash-accent" />
            <span className="text-sm font-bold text-stash-accent">+{coinToast.amount} coins</span>
            <span className="text-xs text-stash-text-secondary">{coinToast.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════
          HERO: Greeting + Balance Overview
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stash-card via-stash-card to-stash-elevated/80 border border-stash-border/70 shadow-luxury p-6 md:p-8">
          {/* Ambient decorative glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-stash-accent/6 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-stash-primary/5 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Greeting + Streak row */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <motion.h1
                  className="text-xl md:text-2xl font-bold font-display text-stash-text tracking-tight"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  {greeting}
                </motion.h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={vibeVariant} dot size="sm">{vibe.status}</Badge>
                </div>
              </div>
              <button
                onClick={() => navigate('/streaks')}
                className="flex items-center gap-1.5 bg-stash-accent/8 px-3.5 py-2 rounded-xl border border-stash-accent/15 hover:bg-stash-accent/15 hover:border-stash-accent/25 transition-all duration-300 cursor-pointer group"
              >
                <Flame size={14} className="text-stash-accent group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stash-accent tabular-nums">{streak.days}</span>
                <span className="text-[10px] text-stash-text-muted font-medium">day streak</span>
              </button>
            </div>

            {/* Central balance display */}
            <div className="text-center mb-8">
              <div className="text-[10px] text-stash-text-muted uppercase tracking-[0.25em] font-bold mb-3 flex items-center justify-center gap-1.5">
                <Clock size={10} />
                Today's Budget
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-stash-text-muted text-3xl font-extralight font-display">€</span>
                <motion.span
                  className="text-6xl md:text-7xl font-extrabold tracking-tighter text-stash-text font-display"
                  initial={{ scale: 0.6, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.15 }}
                >
                  {remaining.toFixed(2)}
                </motion.span>
              </div>
              <p className="text-[13px] text-stash-text-secondary mt-2 font-medium">
                {vibe.insight}
              </p>
            </div>

            {/* Budget progress */}
            <div className="max-w-sm mx-auto">
              <div className="flex justify-between text-[10px] text-stash-text-muted mb-2.5 font-bold uppercase tracking-[0.15em]">
                <span>€{budget.spentToday.toFixed(2)} spent</span>
                <span>{timeUntilReset()}</span>
              </div>
              <div className="relative h-2 bg-stash-elevated/80 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: burnPercent > 50
                      ? 'linear-gradient(90deg, var(--color-stash-success), var(--color-stash-accent))'
                      : burnPercent > 25
                      ? 'linear-gradient(90deg, var(--color-stash-warning), var(--color-stash-accent))'
                      : 'linear-gradient(90deg, var(--color-stash-danger), var(--color-stash-warning))',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${burnPercent}%` }}
                  transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                />
                {/* Glow effect on progress tip */}
                <motion.div
                  className="absolute top-0 h-full w-3 rounded-full blur-sm"
                  style={{
                    background: burnPercent > 50
                      ? 'var(--color-stash-accent)'
                      : burnPercent > 25
                      ? 'var(--color-stash-warning)'
                      : 'var(--color-stash-danger)',
                    opacity: 0.6,
                  }}
                  initial={{ left: 0 }}
                  animate={{ left: `calc(${burnPercent}% - 6px)` }}
                  transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                />
              </div>
            </div>

            {/* Gold divider */}
            <div className="divider-gold my-6" />

            {/* Key metrics row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-[10px] text-stash-text-muted uppercase tracking-wider font-bold mb-1">Runway</div>
                <div className="text-xl font-bold text-stash-text tabular-nums font-display">{runway.daysLeft}d</div>
                <div className="text-[10px] text-stash-text-muted mt-0.5">until broke</div>
              </div>
              <div className="text-center border-x border-stash-border/50">
                <div className="text-[10px] text-stash-text-muted uppercase tracking-wider font-bold mb-1">Safe Money</div>
                <div className="text-xl font-bold text-stash-accent tabular-nums font-display">€{Math.round(safeToSpend)}</div>
                <div className="text-[10px] text-stash-text-muted mt-0.5">after bills</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-stash-text-muted uppercase tracking-wider font-bold mb-1">
                  {runway.savedVsAvg >= 0 ? 'Saved' : 'Over'}
                </div>
                <div className={`text-xl font-bold tabular-nums font-display ${runway.savedVsAvg >= 0 ? 'text-stash-success' : 'text-stash-danger'}`}>
                  {runway.savedVsAvg >= 0 ? '+' : ''}€{Math.abs(runway.savedVsAvg).toFixed(0)}
                </div>
                <div className="text-[10px] text-stash-text-muted mt-0.5">vs daily avg</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════
          QUICK ACTIONS — Premium buttons
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/feed')}
            className="group bg-stash-card border border-stash-border/70 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:border-stash-accent/25 transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-0.5 card-shine"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-stash-accent to-stash-gold flex items-center justify-center group-hover:shadow-glow-accent transition-all duration-300">
              <Plus size={18} className="text-stash-dark" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">Log Expense</span>
              <span className="text-[10px] text-stash-text-muted">Track spending</span>
            </div>
          </button>
          <button
            onClick={() => navigate('/feed')}
            className="group bg-stash-card border border-stash-border/70 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:border-stash-primary/25 transition-all duration-300 hover:shadow-glow-primary hover:-translate-y-0.5 card-shine"
          >
            <div className="w-11 h-11 rounded-xl bg-stash-elevated border border-stash-border/70 flex items-center justify-center group-hover:border-stash-primary/30 transition-all duration-300">
              <BarChart3 size={18} className="text-stash-text-secondary group-hover:text-stash-primary transition-colors" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">Analytics</span>
              <span className="text-[10px] text-stash-text-muted">View insights</span>
            </div>
          </button>
          <button
            onClick={() => navigate('/grocery')}
            className="group bg-stash-card border border-stash-border/70 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:border-stash-success/25 transition-all duration-300 hover:shadow-glow-success hover:-translate-y-0.5 card-shine"
          >
            <div className="w-11 h-11 rounded-xl bg-stash-elevated border border-stash-border/70 flex items-center justify-center group-hover:border-stash-success/30 transition-all duration-300">
              <TrendingUp size={18} className="text-stash-text-secondary group-hover:text-stash-success transition-colors" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">Optimise</span>
              <span className="text-[10px] text-stash-text-muted">Save more</span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* ════════════════════════════════════
          AI INSIGHTS — Smart Suggestions
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <AiInsightCard feature="dashboard" accentColor="stash-accent" />
      </motion.div>

      {/* ════════════════════════════════════
          FUEL GAUGE — Safe-to-Spend
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className="card-shine">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stash-accent/15 to-stash-gold/10 flex items-center justify-center ring-1 ring-stash-accent/10">
                <Wallet size={15} className="text-stash-accent" />
              </div>
              <div>
                <span className="text-sm font-bold block">Safe-to-Spend</span>
                <span className="text-[10px] text-stash-text-muted font-medium">After locked funds & bills</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-stash-elevated/60 px-2.5 py-1 rounded-lg border border-stash-border/60">
              <Shield size={11} className="text-stash-accent" />
              <span className="text-[10px] font-bold text-stash-text-muted uppercase tracking-wider">Protected</span>
            </div>
          </div>
          <FuelGauge
            value={gaugePercent}
            label={`€${Math.round(safeToSpend)}`}
            sublabel="available this month"
          />
        </Card>
      </motion.div>

      {/* ════════════════════════════════════
          RUNWAY PREDICTION — Crystal Ball
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className={`relative overflow-hidden border-l-[3px] ${runway.gapDays > 0 ? 'border-l-stash-danger' : 'border-l-stash-success'}`}>
          {/* Subtle background gradient */}
          <div className={`absolute inset-0 opacity-[0.03] ${runway.gapDays > 0 ? 'bg-gradient-to-r from-stash-danger to-transparent' : 'bg-gradient-to-r from-stash-success to-transparent'}`} />

          <div className="relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-stash-secondary/15 to-stash-primary/10 flex items-center justify-center shrink-0 ring-1 ring-stash-secondary/10">
                <Sparkles size={18} className="text-stash-secondary" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="font-bold text-sm">Runway Prediction</div>
                  <Badge variant={runway.gapDays > 0 ? 'danger' : 'success'} size="sm">
                    {runway.daysLeft} days left
                  </Badge>
                </div>
                <p className="text-[13px] text-stash-text-secondary leading-relaxed">
                  At current pace → <strong className="text-stash-text">{runway.brokeDate}</strong>
                </p>
                {runway.gapDays > 0 ? (
                  <div className="flex items-center gap-2 mt-2.5 bg-stash-danger/6 px-3 py-2 rounded-lg border border-stash-danger/12">
                    <ArrowDownRight size={14} className="text-stash-danger shrink-0" />
                    <p className="text-[12px] text-stash-danger font-semibold">
                      {runway.gapDays} days short of next loan ({runway.nextLoanDate})
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2.5 bg-stash-success/6 px-3 py-2 rounded-lg border border-stash-success/12">
                    <ArrowUpRight size={14} className="text-stash-success shrink-0" />
                    <p className="text-[12px] text-stash-success font-semibold">
                      You'll make it to your next loan comfortably
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="shrink-0 px-3.5 py-2 btn-premium text-xs rounded-xl"
              >
                <Wrench size={12} className="mr-1 inline" /> Fix It
              </button>
            </div>

            {showSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-5 space-y-1.5 border-t border-stash-border/60 pt-4"
              >
                <div className="text-[10px] text-stash-text-muted uppercase tracking-[0.15em] font-bold mb-3">Smart Suggestions</div>
                {[
                  { icon: '☕', title: 'Skip 3 coffees this week', savings: 18 },
                  { icon: '🚗', title: 'Take the bus instead of Uber', savings: 25 },
                  { icon: '🍕', title: 'Cook 2 more meals at home', savings: 20 },
                  { icon: '🎓', title: 'Use student discounts everywhere', savings: 15 },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stash-elevated/40 transition-colors cursor-pointer group"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-stash-success font-bold">Save ~€{s.savings}.00</div>
                    </div>
                    <ChevronRight size={14} className="text-stash-text-muted group-hover:text-stash-accent transition-colors" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════
          DAILY BURN RATE — Analytics
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className="card-shine">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stash-danger/8 flex items-center justify-center ring-1 ring-stash-danger/10">
                <Zap size={14} className="text-stash-danger" />
              </div>
              <span className="text-sm font-bold">Spending Velocity</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stash-elevated/60 px-2.5 py-1 rounded-lg border border-stash-border/60">
              <Clock size={11} className="text-stash-text-muted" />
              <span className="text-[10px] text-stash-text-muted font-bold uppercase tracking-wider">{timeUntilReset()}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-stash-elevated/60 rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-stash-accent via-stash-primary to-stash-success"
              initial={{ width: 0 }}
              animate={{ width: `${burnPercent}%` }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-stash-text-muted mb-5 font-bold uppercase tracking-[0.12em]">
            <span>€0</span>
            <span>€{budget.dailyBudget.toFixed(2)} budget</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: `€${budget.spentToday.toFixed(2)}`, label: 'Spent Today', color: '', icon: ArrowDownRight },
              { value: `€${runway.avgBurnPerHour}/hr`, label: 'Burn Rate', color: '', icon: Zap },
              {
                value: `${runway.savedVsAvg >= 0 ? '+' : ''}€${runway.savedVsAvg.toFixed(2)}`,
                label: 'vs Average',
                color: runway.savedVsAvg >= 0 ? 'text-stash-success' : 'text-stash-danger',
                icon: runway.savedVsAvg >= 0 ? ArrowUpRight : ArrowDownRight,
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3.5 rounded-xl bg-stash-elevated/30 border border-stash-border/60">
                <stat.icon size={13} className={`mx-auto mb-1.5 ${stat.color || 'text-stash-text-muted'}`} />
                <div className={`text-base font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-stash-text-muted mt-0.5 font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════
          TWO-COLUMN: Locked Funds + Ghost
          ════════════════════════════════════ */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Locked Funds */}
        <Card className="card-shine">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stash-primary/8 flex items-center justify-center ring-1 ring-stash-primary/10">
                <Lock size={14} className="text-stash-primary" />
              </div>
              <span className="text-sm font-bold">Protected Funds</span>
            </div>
            <button
              onClick={() => navigate('/more')}
              className="text-[10px] text-stash-accent hover:text-stash-accent-light font-bold uppercase tracking-wider bg-stash-accent/6 px-2.5 py-1 rounded-lg border border-stash-accent/15 transition-colors"
            >Edit</button>
          </div>
          <div className="space-y-1.5">
            {budget.lockedFunds.map((fund, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stash-elevated/30 transition-colors group border border-transparent hover:border-stash-border/40">
                <span className="text-lg">{fund.emoji}</span>
                <span className="flex-1 text-sm font-medium group-hover:text-stash-text transition-colors">{fund.name}</span>
                <span className="text-sm font-bold tabular-nums">€{fund.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="divider-gold my-3" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-stash-text-muted font-bold uppercase tracking-[0.12em]">Total locked</span>
            <span className="text-sm font-bold text-stash-accent">€{totalLocked.toFixed(2)}</span>
          </div>
        </Card>

        {/* Ghost Budget + Streak */}
        <div className="space-y-4">
          <Card className="group cursor-pointer card-shine" onClick={() => navigate('/more')}>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-stash-elevated/60 border border-stash-border/60 flex items-center justify-center shrink-0 group-hover:border-stash-border-hover transition-all duration-300">
                <Ghost size={20} className="text-stash-text-muted group-hover:text-stash-secondary transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Ghost Budget</div>
                <div className="text-[11px] text-stash-text-muted font-medium">Hidden from yourself</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-stash-text tabular-nums">€{runway.ghostTotal}</div>
                <div className="text-[9px] text-stash-text-muted font-bold uppercase tracking-wider">tucked away</div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden cursor-pointer group" onClick={() => navigate('/streaks')}>
            <div className="absolute inset-0 bg-gradient-to-r from-stash-accent/6 via-stash-gold/4 to-stash-accent/6 group-hover:from-stash-accent/10 group-hover:to-stash-accent/10 transition-all duration-500" />
            <div className="relative z-10 flex items-center justify-center gap-3 py-3">
              <Flame size={22} className="text-stash-accent" />
              <div className="text-center">
                <span className="text-2xl font-extrabold text-stash-text font-display tabular-nums">{streak.days}</span>
                <span className="text-sm font-bold text-stash-text ml-1">day streak</span>
              </div>
              <div className="flex gap-0.5">
                {[...Array(Math.min(streak.days, 5))].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-4 rounded-full bg-gradient-to-t from-stash-accent to-stash-gold"
                    initial={{ height: 0 }}
                    animate={{ height: 16 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ════════════════════════════════════
          STREAK MILESTONES
          ════════════════════════════════════ */}
      {streaksFull && (
        <motion.div variants={item}>
          <Card className="card-shine">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-stash-accent/15 to-stash-gold/10 flex items-center justify-center ring-1 ring-stash-accent/10">
                <Trophy size={13} className="text-stash-accent" />
              </div>
              <span className="text-sm font-bold">Milestones</span>
              <button
                onClick={() => navigate('/streaks')}
                className="text-[10px] text-stash-accent hover:text-stash-accent-light font-bold ml-auto flex items-center gap-1 transition-colors"
              >
                Best: {streaksFull.longestStreak}d <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {streaksFull.milestones.map((m) => (
                <div
                  key={m.days}
                  className={`text-center p-2.5 rounded-xl transition-all border ${
                    m.achieved
                      ? 'bg-stash-accent/6 border-stash-accent/15 shadow-glow-accent'
                      : 'bg-stash-elevated/30 border-stash-border/50 opacity-40'
                  }`}
                >
                  <div className="text-lg">{m.emoji}</div>
                  <div className="text-[10px] font-bold mt-0.5 tabular-nums">{m.days}d</div>
                  <div className="text-[9px] text-stash-text-muted font-medium">{m.label}</div>
                  {m.coins && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Coins size={8} className="text-stash-accent" />
                      <span className="text-[8px] text-stash-accent font-bold">{m.coins}</span>
                    </div>
                  )}
                  {m.achieved && <Badge variant="accent" size="sm" className="mt-1">&#10003;</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ════════════════════════════════════
          COINS CTA — Rewards Shop
          ════════════════════════════════════ */}
      <motion.div variants={item}>
        <button
          onClick={() => navigate('/rewards')}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-stash-accent/6 via-stash-gold/8 to-stash-accent/6 border border-stash-accent/15 hover:border-stash-accent/30 p-4 flex items-center gap-4 transition-all duration-300 hover:shadow-glow-accent cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-stash-accent to-stash-gold flex items-center justify-center shadow-glow-accent shrink-0">
            <Coins size={18} className="text-stash-dark" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-bold">
              You have <span className="gradient-text-gold">{coinBalance} coins</span>
            </div>
            <div className="text-[11px] text-stash-text-muted font-medium">Complete missions & streaks to earn more — redeem for rewards!</div>
          </div>
          <ChevronRight size={16} className="text-stash-accent group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* ════════════════════════════════════
          DAILY MISSIONS
          ════════════════════════════════════ */}
      {missions && missions.length > 0 && (
        <motion.div variants={item}>
          <Card className="card-shine">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-stash-primary/8 flex items-center justify-center ring-1 ring-stash-primary/10">
                <Target size={13} className="text-stash-primary" />
              </div>
              <div>
                <span className="text-sm font-bold block">Daily Missions</span>
                <span className="text-[10px] text-stash-text-muted font-medium">
                  {missions.filter(m => m.completed).length}/{missions.length} completed
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1 bg-stash-accent/6 px-2.5 py-1 rounded-lg border border-stash-accent/12">
                <Coins size={11} className="text-stash-accent" />
                <span className="text-[10px] text-stash-accent font-bold tabular-nums">
                  {missions.reduce((acc, m) => acc + (m.completed ? (m.coins ?? m.xp) : 0), 0)} earned
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => handleToggleMission(mission.id)}
                  disabled={togglingMission === mission.id}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all border cursor-pointer ${
                    mission.completed
                      ? 'bg-stash-success/4 border-stash-success/12'
                      : 'bg-stash-elevated/20 border-stash-border/50 hover:bg-stash-elevated/40 hover:border-stash-border-hover'
                  } ${togglingMission === mission.id ? 'opacity-50' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    mission.completed
                      ? 'bg-stash-success text-white shadow-glow-success'
                      : 'border-2 border-stash-text-muted/20 hover:border-stash-accent/40'
                  }`}>
                    {mission.completed ? <CheckCircle size={14} /> : ''}
                  </div>
                  <span className={`flex-1 text-sm text-left font-medium ${mission.completed ? 'line-through text-stash-text-muted' : ''}`}>
                    {mission.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={mission.completed ? 'success' : 'accent'} size="sm">
                      <Coins size={9} className="mr-0.5" />
                      {mission.coins ?? mission.xp}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  Flame,
  Trophy,
  TrendingUp,
  Wallet,
  BarChart3,
  ShoppingCart,
  Bell,
  FileText,
  Zap,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  CreditCard,
} from 'lucide-react'
import Card from '../components/common/Card'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getProfile } from '../services/api'
import type { ProfileData } from '../types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function Profile() {
  const navigate = useNavigate()
  const fetcher = useCallback(() => getProfile(), [])
  const { data, loading } = useApi<ProfileData>(fetcher)

  if (loading || !data) return <LoadingSkeleton count={6} />

  const joinDate = new Date(data.joinedDate).toLocaleDateString('en-IE', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto space-y-5 pb-8"
    >
      {/* ── Back button (mobile) ── */}
      <motion.div variants={item} className="md:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-stash-text-secondary hover:text-stash-text transition-colors text-sm"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </motion.div>

      {/* AI Profile Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="profile" accentColor="stash-primary" />
      </motion.div>

      {/* ── Hero Card ── */}
      <motion.div variants={item}>
        <Card variant="gradient" padding="lg" className="relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-stash-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-stash-accent/8 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl shadow-stash-primary/20 ring-4 ring-stash-border">
                {data.initials}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-stash-text truncate">{data.name}</h1>
                <p className="text-sm text-stash-text-muted mt-0.5">{data.bio}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stash-primary/10 text-stash-primary text-xs font-medium">
                  <GraduationCap size={12} />
                  {data.course}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stash-accent/10 text-stash-accent text-xs font-medium">
                  <MapPin size={12} />
                  {data.location}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stash-warning/10 text-stash-warning text-xs font-medium">
                  <Calendar size={12} />
                  Since {joinDate}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Quick Stats Grid ── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Wallet size={18} className="text-stash-primary" />}
            label="Balance"
            value={`€${data.balance.toLocaleString()}`}
            bg="bg-stash-primary/10"
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-stash-success" />}
            label="Saved"
            value={`€${data.stats.totalSaved}`}
            bg="bg-stash-success/10"
          />
          <StatCard
            icon={<Flame size={18} className="text-stash-warning" />}
            label="Streak"
            value={`${data.currentStreak}d`}
            bg="bg-stash-warning/10"
          />
          <StatCard
            icon={<Trophy size={18} className="text-stash-accent" />}
            label="Hit Rate"
            value={`${data.stats.budgetHitRate}%`}
            bg="bg-stash-accent/10"
          />
        </div>
      </motion.div>

      {/* ── Detailed Stats ── */}
      <motion.div variants={item}>
        <Card>
          <h2 className="text-sm font-semibold text-stash-text mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-stash-primary" />
            Statistics
          </h2>
          <div className="space-y-3">
            <StatRow label="Avg. Daily Spend" value={`€${data.stats.avgDailySpend}`} />
            <StatRow label="Monthly Budget" value={`€${data.monthlyBudget}`} />
            <StatRow label="Safe to Spend" value={`€${data.safeToSpend}`} />
            <StatRow label="Total Transactions" value={String(data.stats.transactionCount)} />
            <StatRow label="Top Category" value={data.stats.topCategory} />
            <StatRow label="Longest Streak" value={`${data.stats.longestStreak} days`} />
          </div>
        </Card>
      </motion.div>

      {/* ── Achievements ── */}
      <motion.div variants={item}>
        <Card>
          <h2 className="text-sm font-semibold text-stash-text mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-stash-accent" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {data.achievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-stash-elevated/60 border border-stash-border hover:border-stash-border-hover transition-colors"
              >
                <span className="text-xl">{a.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stash-text truncate">{a.label}</p>
                  <p className="text-[10px] text-stash-text-muted">
                    {new Date(a.date).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Contact / Account ── */}
      <motion.div variants={item}>
        <Card>
          <h2 className="text-sm font-semibold text-stash-text mb-4 flex items-center gap-2">
            <Shield size={16} className="text-stash-info" />
            Account Details
          </h2>
          <div className="space-y-3">
            <InfoRow icon={<Mail size={15} />} label="Email" value={data.email} />
            <InfoRow icon={<Phone size={15} />} label="Phone" value={data.phone} />
            <InfoRow icon={<GraduationCap size={15} />} label="University" value={data.university} />
            <InfoRow icon={<CreditCard size={15} />} label="Student ID" value={data.studentId} />
            <InfoRow icon={<MapPin size={15} />} label="Location" value={data.location} />
          </div>
        </Card>
      </motion.div>

      {/* ── Preferences ── */}
      <motion.div variants={item}>
        <Card>
          <h2 className="text-sm font-semibold text-stash-text mb-4 flex items-center gap-2">
            <Settings size={16} className="text-stash-text-secondary" />
            Preferences
          </h2>
          <div className="space-y-1">
            <SettingRow
              icon={<Bell size={15} />}
              label="Notifications"
              value={data.preferences.notifications ? 'On' : 'Off'}
            />
            <SettingRow
              icon={<FileText size={15} />}
              label="Weekly Report"
              value={data.preferences.weeklyReport ? 'Enabled' : 'Disabled'}
            />
            <SettingRow
              icon={<Zap size={15} />}
              label="AI Roast Level"
              value={data.preferences.roastLevel.charAt(0).toUpperCase() + data.preferences.roastLevel.slice(1)}
            />
            <SettingRow
              icon={<Wallet size={15} />}
              label="Display Currency"
              value={data.preferences.currency}
            />
          </div>
        </Card>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div variants={item} className="space-y-2">
        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-stash-card border border-stash-border hover:border-stash-border-hover transition-colors group">
          <span className="flex items-center gap-3 text-sm font-medium text-stash-text">
            <Settings size={18} className="text-stash-text-secondary group-hover:text-stash-primary transition-colors" />
            Edit Profile
          </span>
          <ChevronRight size={16} className="text-stash-text-muted" />
        </button>
        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-stash-card border border-stash-border hover:border-stash-danger/30 transition-colors group">
          <span className="flex items-center gap-3 text-sm font-medium text-stash-danger">
            <LogOut size={18} />
            Sign Out
          </span>
          <ChevronRight size={16} className="text-stash-text-muted" />
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ── Sub-components ── */

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-stash-card border border-stash-border">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-stash-text leading-tight">{value}</p>
        <p className="text-[11px] text-stash-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stash-border/50 last:border-0">
      <span className="text-xs text-stash-text-muted">{label}</span>
      <span className="text-sm font-semibold text-stash-text">{value}</span>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-stash-border/50 last:border-0">
      <span className="text-stash-text-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span className="text-xs text-stash-text-muted shrink-0">{label}</span>
        <span className="text-sm text-stash-text truncate text-right">{value}</span>
      </div>
    </div>
  )
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-stash-border/50 last:border-0">
      <span className="text-stash-text-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span className="text-sm text-stash-text">{label}</span>
        <span className="text-xs text-stash-text-secondary font-medium px-2 py-0.5 rounded-md bg-stash-elevated">
          {value}
        </span>
      </div>
    </div>
  )
}

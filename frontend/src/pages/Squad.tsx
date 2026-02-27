import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Trophy, Share2, Plus, X, Send, Bell, CheckCircle2, Zap } from 'lucide-react'
import Card from '../components/common/Card'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getSquad, splitExpense, nudgeMember, settleDebt } from '../services/api'
import type { SquadMember, SquadActivity } from '../types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }

export default function Squad() {
  const fetcher = useCallback(() => getSquad(), [])
  const { data, loading, refetch } = useApi(fetcher)
  const [showSplit, setShowSplit] = useState(false)
  const [splitAmount, setSplitAmount] = useState('')
  const [splitDesc, setSplitDesc] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [nudging, setNudging] = useState<string | null>(null)
  const [settling, setSettling] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSplit = async () => {
    if (!splitAmount || selectedMembers.length === 0) return
    try {
      const res = await splitExpense({ description: splitDesc || 'Split expense', total_amount: parseFloat(splitAmount), member_ids: selectedMembers })
      showToast(`€${splitAmount} split ${selectedMembers.length + 1} ways — €${res.perPerson?.toFixed(2) || (parseFloat(splitAmount) / (selectedMembers.length + 1)).toFixed(2)} each`)
      setShowSplit(false)
      setSplitAmount('')
      setSplitDesc('')
      setSelectedMembers([])
      refetch()
    } catch { showToast('Split failed') }
  }

  const handleNudge = async (memberId: string, name: string) => {
    setNudging(memberId)
    try {
      await nudgeMember(memberId)
      showToast(`Nudged ${name} — they'll feel the shame!`)
    } catch { showToast('Nudge failed') }
    finally { setNudging(null) }
  }

  const handleSettle = async (memberId: string, name: string) => {
    setSettling(memberId)
    try {
      await settleDebt(memberId, 0)
      showToast(`Settled up with ${name}!`)
      refetch()
    } catch { showToast('Settle failed') }
    finally { setSettling(null) }
  }

  const handleShare = () => {
    if (!data) return
    const owedToYou = data.members.filter((m: SquadMember) => m.direction === 'owes-you').reduce((s: number, m: SquadMember) => s + m.amount, 0)
    const debtors = data.members
      .filter((m: SquadMember) => m.direction === 'owes-you')
      .map((m: SquadMember) => `• ${m.name}: €${m.amount.toFixed(2)}`)
      .join('\n')
    const msg = `Stash Deadbeat Leaderboard\n\nTotal owed: €${owedToYou.toFixed(2)}\n${debtors}\n\nPay up!`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  if (loading || !data) return <LoadingSkeleton count={4} />

  const owedToYou = data.members.filter((m: SquadMember) => m.direction === 'owes-you').reduce((s: number, m: SquadMember) => s + m.amount, 0)
  const youOwe = data.members.filter((m: SquadMember) => m.direction === 'you-owe').reduce((s: number, m: SquadMember) => s + m.amount, 0)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-strong border border-stash-border px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stash-primary/10 flex items-center justify-center">
            <Users size={18} className="text-stash-primary" />
          </div>
          The Squad
        </h1>
        <button
          onClick={() => setShowSplit(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stash-primary text-white text-xs font-medium hover:bg-stash-primary/80 transition-colors shadow-lg shadow-stash-primary/20"
        >
          <Plus size={14} /> Split Expense
        </button>
      </motion.div>

      {/* AI Squad Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="squad" accentColor="stash-primary" compact />
      </motion.div>

      {/* Split Expense Modal */}
      <AnimatePresence>
        {showSplit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border border-stash-primary/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Split an Expense</h3>
                <button onClick={() => setShowSplit(false)} className="w-7 h-7 rounded-lg bg-stash-elevated/60 flex items-center justify-center text-stash-text-muted hover:text-stash-text transition-colors"><X size={14} /></button>
              </div>
              <input
                type="text"
                value={splitDesc}
                onChange={(e) => setSplitDesc(e.target.value)}
                placeholder="What's it for? (e.g. Tesco groceries)"
                className="w-full bg-stash-elevated/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-colors"
              />
              <input
                type="number"
                value={splitAmount}
                onChange={(e) => setSplitAmount(e.target.value)}
                placeholder="Total amount (€)"
                className="w-full bg-stash-elevated/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-colors"
              />
              <div>
                <div className="text-xs text-stash-text-muted mb-2">Split with:</div>
                <div className="flex flex-wrap gap-2">
                  {data.members.map((m: SquadMember) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        setSelectedMembers((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedMembers.includes(m.id)
                          ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20'
                          : 'bg-stash-elevated/50 text-stash-text-secondary border border-stash-border hover:border-stash-primary/30'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-stash-elevated/60 flex items-center justify-center text-[10px]">{m.initials}</span>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              {splitAmount && selectedMembers.length > 0 && (
                <div className="text-xs text-stash-text-secondary bg-stash-elevated/50 rounded-xl p-3 border border-stash-border">
                  €{splitAmount} ÷ {selectedMembers.length + 1} people = <span className="text-stash-success font-bold">€{(parseFloat(splitAmount) / (selectedMembers.length + 1)).toFixed(2)}</span> each
                </div>
              )}
              <button
                onClick={handleSplit}
                disabled={!splitAmount || selectedMembers.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-stash-primary to-stash-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                <Send size={14} /> Split It
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Summary */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3.5">
        <Card className="text-center bg-stash-success/5 border border-stash-success/10">
          <div className="text-xs text-stash-text-muted mb-1">You're Owed</div>
          <div className="text-2xl font-bold text-stash-success tabular-nums">€{owedToYou.toFixed(2)}</div>
        </Card>
        <Card className="text-center bg-stash-danger/5 border border-stash-danger/10">
          <div className="text-xs text-stash-text-muted mb-1">You Owe</div>
          <div className="text-2xl font-bold text-stash-danger tabular-nums">€{youOwe.toFixed(2)}</div>
        </Card>
      </motion.div>

      {/* Net Balance */}
      <motion.div variants={item}>
        <Card className={`text-center ${owedToYou - youOwe >= 0 ? 'bg-stash-success/5 border border-stash-success/10' : 'bg-stash-danger/5 border border-stash-danger/10'}`}>
          <div className="text-xs text-stash-text-muted mb-1">Net Balance</div>
          <div className={`text-xl font-bold ${owedToYou - youOwe >= 0 ? 'text-stash-success' : 'text-stash-danger'}`}>
            {owedToYou - youOwe >= 0 ? '+' : ''}€{(owedToYou - youOwe).toFixed(2)}
          </div>
        </Card>
      </motion.div>

      {/* Members */}
      <motion.div variants={item}>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-stash-primary/15 flex items-center justify-center">
            <Users size={12} className="text-stash-primary" />
          </div>
          Members
        </h2>
      </motion.div>
      {data.members.map((m: SquadMember) => (
        <motion.div key={m.id} variants={item}>
          <Card className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                m.direction === 'owes-you' ? 'bg-stash-success/20 text-stash-success' : 'bg-stash-danger/20 text-stash-danger'
              }`}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-stash-text-muted truncate">{m.reason}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${m.direction === 'owes-you' ? 'text-stash-success' : 'text-stash-danger'}`}>
                  {m.direction === 'you-owe' ? '-' : '+'}€{m.amount.toFixed(2)}
                </div>
                <div className="text-[10px] text-stash-text-muted">{m.daysSince}d ago</div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              {m.direction === 'owes-you' ? (
                <button
                  onClick={() => handleNudge(m.id, m.name)}
                  disabled={nudging === m.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stash-warning/15 text-stash-warning hover:bg-stash-warning/25 transition-colors border border-stash-warning/20 disabled:opacity-50"
                >
                  <Bell size={12} /> {nudging === m.id ? 'Nudging...' : 'Nudge'}
                </button>
              ) : (
                <button
                  onClick={() => handleSettle(m.id, m.name)}
                  disabled={settling === m.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stash-success/15 text-stash-success hover:bg-stash-success/25 transition-colors border border-stash-success/20 disabled:opacity-50"
                >
                  <CheckCircle2 size={12} /> {settling === m.id ? 'Settling...' : 'Settle Up'}
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Activity */}
      <motion.div variants={item}>
        <Card>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-stash-primary/15 flex items-center justify-center">
              <Zap size={12} className="text-stash-primary" />
            </div>
            Recent Activity
          </h3>
          <div className="space-y-2">
            {data.activity.map((a: SquadActivity) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span>{a.emoji}</span>
                <span className="flex-1 text-stash-text-secondary">{a.text}</span>
                <span className="text-xs text-stash-text-muted">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Deadbeat Leaderboard */}
      <motion.div variants={item}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Trophy size={16} className="text-stash-warning" /> Deadbeat Leaderboard
            </h3>
          </div>
          {data.members
            .filter((m: SquadMember) => m.direction === 'owes-you')
            .sort((a: SquadMember, b: SquadMember) => b.amount - a.amount)
            .map((m: SquadMember, i: number) => {
              const medals = ['🥇', '🥈', '🥉']
              const badges = ['👑 King of Debt', '💸 Big Spender', '🐢 Slow Payer']
              return (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{medals[i] || '•'}</span>
                  <div className="w-8 h-8 rounded-full bg-stash-elevated/60 flex items-center justify-center text-xs font-bold">{m.initials}</div>
                  <span className="flex-1 text-sm">{m.name}</span>
                  <span className="text-sm font-bold">€{m.amount.toFixed(2)}</span>
                  <span className="text-xs text-stash-text-muted hidden sm:inline">{badges[i] || ''}</span>
                </div>
              )
            })}
          <button
            onClick={handleShare}
            className="w-full mt-3 py-2.5 rounded-xl bg-stash-elevated/50 text-xs text-stash-text-secondary hover:bg-stash-elevated border border-stash-border transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={14} /> Share to WhatsApp
          </button>
        </Card>
      </motion.div>
    </motion.div>
  )
}

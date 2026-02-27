import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Trophy, Target, Gift, Zap, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getStreaks, getSurvivalMissions, getRewards, toggleMission, claimReward } from '../services/api'
import type { StreakData, SurvivalMission } from '../types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }

interface Reward {
  id: string
  milestone: string
  emoji: string
  reward: string
  days: number
  claimed: boolean
}

export default function Streaks() {
  const streaksFetcher = useCallback(() => getStreaks(), [])
  const { data: streaks, loading: streaksLoading } = useApi<StreakData>(streaksFetcher)
  const missionsFetcher = useCallback(() => getSurvivalMissions(), [])
  const { data: missions, loading: missionsLoading, refetch: refetchMissions } = useApi<SurvivalMission[]>(missionsFetcher)
  const rewardsFetcher = useCallback(() => getRewards(), [])
  const { data: rewards, refetch: refetchRewards } = useApi<Reward[]>(rewardsFetcher)
  const [togglingMission, setTogglingMission] = useState<string | null>(null)
  const [claimingReward, setClaimingReward] = useState<string | null>(null)
  const [claimedToast, setClaimedToast] = useState<string | null>(null)

  if (streaksLoading || missionsLoading || !streaks || !missions) return <LoadingSkeleton count={5} />

  const completedMissions = missions.filter((m) => m.completed).length
  const totalXP = missions.filter((m) => m.completed).reduce((s, m) => s + m.xp, 0)

  const handleToggleMission = async (id: string) => {
    setTogglingMission(id)
    try {
      await toggleMission(id)
      refetchMissions()
    } catch { /* ignore */ }
    finally { setTogglingMission(null) }
  }

  const handleClaimReward = async (rewardId: string, rewardName: string) => {
    setClaimingReward(rewardId)
    try {
      await claimReward(rewardId)
      setClaimedToast(rewardName)
      refetchRewards()
      setTimeout(() => setClaimedToast(null), 3000)
    } catch { /* ignore */ }
    finally { setClaimingReward(null) }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stash-warning/10 flex items-center justify-center">
            <Flame size={18} className="text-stash-warning" />
          </div>
          Streaks & Rewards
        </h1>
        <p className="text-sm text-stash-text-secondary mt-1">Stay under budget, earn rewards!</p>
      </motion.div>

      {/* Streak Hero */}
      <motion.div variants={item}>
        <Card variant="gradient" className="text-center py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,0.1),transparent_70%)]" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="text-7xl mb-3"
            >
              🔥
            </motion.div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              className="text-5xl font-extrabold mb-1"
            >
              {streaks.currentStreak}
            </motion.div>
            <div className="text-sm text-stash-text-secondary">day streak</div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div>
                <div className="text-lg font-bold">{streaks.longestStreak}</div>
                <div className="text-xs text-stash-text-muted">Best Streak</div>
              </div>
              <div className="w-px h-8 bg-stash-border" />
              <div>
                <div className="text-lg font-bold text-stash-success">{streaks.todayUnderBudget ? <CheckCircle size={22} className="text-stash-success mx-auto" /> : <XCircle size={22} className="text-stash-danger mx-auto" />}</div>
                <div className="text-xs text-stash-text-muted">Today's Status</div>
              </div>
              <div className="w-px h-8 bg-stash-border" />
              <div>
                <div className="text-lg font-bold text-stash-primary">{totalXP}</div>
                <div className="text-xs text-stash-text-muted">XP Earned</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI Streak Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="streaks" accentColor="stash-warning" compact />
      </motion.div>

      {/* Milestones Progress */}
      <motion.div variants={item}>
        <Card>
          <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-stash-warning/15 flex items-center justify-center">
                <Trophy size={14} className="text-stash-warning" />
              </div>
            <span className="text-sm font-semibold">Milestones</span>
          </div>
          <div className="space-y-3">
            {streaks.milestones.map((m) => {
              const progress = Math.min(100, (streaks.currentStreak / m.days) * 100)
              return (
                  <div key={m.days} className={`p-3.5 rounded-xl transition-all ${m.achieved ? 'bg-stash-success/5 ring-1 ring-stash-success/15 border border-stash-success/10' : 'bg-stash-elevated/50 border border-stash-border'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{m.label}</span>
                        {m.achieved && <Badge variant="success">✓ Done</Badge>}
                      </div>
                      <div className="text-xs text-stash-text-muted mt-0.5">{m.reward}</div>
                      {!m.achieved && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-stash-text-muted mb-1">
                            <span>{streaks.currentStreak}/{m.days} days</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 bg-stash-elevated rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-stash-primary to-stash-accent"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${m.achieved ? 'text-stash-success' : 'text-stash-text-muted'}`}>
                        {m.days}d
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Daily Missions */}
      <motion.div variants={item}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-stash-primary/15 flex items-center justify-center">
                <Target size={14} className="text-stash-primary" />
              </div>
              <span className="text-sm font-semibold">Daily Missions</span>
            </div>
            <Badge variant={completedMissions === missions.length ? 'success' : 'neutral'}>
              {completedMissions}/{missions.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {missions.map((mission) => (
              <button
                key={mission.id}
                onClick={() => handleToggleMission(mission.id)}
                disabled={togglingMission === mission.id}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all ${
                  mission.completed
                    ? 'bg-stash-success/8 ring-1 ring-stash-success/15 border border-stash-success/10'
                    : 'bg-stash-elevated/50 border border-stash-border hover:border-stash-primary/30'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  mission.completed ? 'bg-stash-success text-white' : 'border-2 border-stash-text-muted'
                }`}>
                  {mission.completed ? <CheckCircle size={16} /> : null}
                </div>
                <span className={`flex-1 text-left text-sm ${mission.completed ? 'line-through text-stash-text-muted' : ''}`}>
                  {mission.title}
                </span>
                <div className="flex items-center gap-1">
                  <Zap size={12} className={mission.completed ? 'text-stash-success' : 'text-stash-warning'} />
                  <span className={`text-xs font-bold ${mission.completed ? 'text-stash-success' : 'text-stash-warning'}`}>
                    {mission.xp} XP
                  </span>
                </div>
              </button>
            ))}
          </div>
          {completedMissions === missions.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-stash-success/10 text-center"
            >
              <p className="text-sm text-stash-success font-semibold mt-1">All missions complete!</p>
              <p className="text-xs text-stash-text-muted">+{totalXP} XP earned today</p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Earned Rewards / Coupons */}
      {rewards && rewards.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-stash-accent/15 flex items-center justify-center">
                <Gift size={14} className="text-stash-accent" />
              </div>
              <span className="text-sm font-semibold">Your Rewards</span>
            </div>
            <div className="space-y-2">
              {rewards.map((r: Reward) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl transition-all ${
                    r.claimed
                      ? 'bg-stash-elevated/50 opacity-60 border border-stash-border'
                      : 'bg-gradient-to-r from-stash-primary/5 to-stash-accent/5 ring-1 ring-stash-primary/15 border border-stash-primary/10'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.reward}</div>
                    <div className="text-xs text-stash-text-muted">
                      {r.milestone} ({r.days} day streak)
                    </div>
                  </div>
                  {r.claimed ? (
                    <Badge variant="neutral">Claimed</Badge>
                  ) : (
                    <button
                      onClick={() => handleClaimReward(r.id, r.reward)}
                      disabled={claimingReward === r.id}
                      className="px-3 py-1.5 rounded-xl bg-stash-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg shadow-stash-primary/20"
                    >
                      {claimingReward === r.id ? '...' : 'Claim'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Tips */}
      <motion.div variants={item}>
        <Card className="bg-stash-primary/5 border border-stash-primary/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-stash-primary/15 flex items-center justify-center shrink-0">
              <Lightbulb size={16} className="text-stash-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Streak Tips</div>
              <ul className="text-xs text-stash-text-secondary mt-1 space-y-1">
                <li>• Stay under your daily budget of €35 to maintain your streak</li>
                <li>• Complete all 5 daily missions for bonus XP</li>
                <li>• Hit 30 days for a €10 Amazon gift card reward!</li>
                <li>• Your longest streak was {streaks.longestStreak} days — can you beat it?</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Claimed Toast */}
      {claimedToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-stash-success text-white px-6 py-3 rounded-xl shadow-2xl z-50"
        >
          Claimed: {claimedToast}
        </motion.div>
      )}
    </motion.div>
  )
}

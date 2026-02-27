import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, MessageSquare } from 'lucide-react'
import { getAiInsights } from '../../services/api'
import type { AiInsight } from '../../services/api'
import { useNavigate } from 'react-router-dom'

interface AiInsightCardProps {
  feature: string
  /** Accent color class — e.g. 'stash-primary', 'stash-accent', 'stash-success' */
  accentColor?: string
  /** Whether to start expanded */
  defaultExpanded?: boolean
  /** Compact mode — smaller card */
  compact?: boolean
}

export default function AiInsightCard({
  feature,
  accentColor = 'stash-primary',
  defaultExpanded = true,
  compact = false,
}: AiInsightCardProps) {
  const navigate = useNavigate()
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = useCallback(async () => {
    try {
      const data = await getAiInsights(feature)
      setInsights(data.insights || [])
      setSource(data.source || '')
    } catch (err) {
      setInsights([
        {
          emoji: '🤖',
          title: 'AI unavailable',
          text: 'Could not load insights right now. Try refreshing!',
        },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [feature])

  useEffect(() => {
    setLoading(true)
    fetchInsights()
  }, [fetchInsights])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInsights()
  }

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-${accentColor}/5 via-stash-card to-${accentColor}/5 border border-${accentColor}/15 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-${accentColor} to-${accentColor}/70 flex items-center justify-center shadow-lg shadow-${accentColor}/20`}>
            <Sparkles size={14} className="text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-24 bg-stash-elevated rounded animate-pulse mb-1.5" />
            <div className="h-2 w-40 bg-stash-elevated/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-stash-card via-stash-card to-stash-elevated/50 border border-stash-border/70 shadow-card ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-stash-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-stash-primary to-stash-accent flex items-center justify-center shadow-lg shadow-stash-primary/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-stash-text flex items-center gap-1.5">
              Stash AI Insights
              <span className="text-[9px] font-medium text-stash-primary bg-stash-primary/10 px-1.5 py-0.5 rounded-full">
                SMART
              </span>
            </div>
            {source && (
              <div className="text-[10px] text-stash-text-muted">{source}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/chat')}
            className="p-1.5 rounded-lg hover:bg-stash-elevated/80 transition-colors text-stash-text-muted hover:text-stash-primary"
            title="Ask AI more"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-stash-elevated/80 transition-colors text-stash-text-muted hover:text-stash-primary disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-stash-elevated/80 transition-colors text-stash-text-muted"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Insights list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`space-y-2.5 ${compact ? 'mt-2.5' : 'mt-3.5'}`}>
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="flex gap-3 p-2.5 rounded-xl bg-stash-elevated/40 border border-stash-border/50 hover:bg-stash-elevated/60 transition-colors"
                >
                  <span className="text-lg shrink-0 mt-0.5">{insight.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-stash-text mb-0.5">{insight.title}</div>
                    <div className="text-[11px] text-stash-text-secondary leading-relaxed">{insight.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

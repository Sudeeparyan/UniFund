import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, ArrowRightLeft, Bell, TrendingDown, BarChart2, Clock } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getFXRates } from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
}

export default function FXRates() {
  const fetcher = useCallback(() => getFXRates(), [])
  const { data, loading } = useApi(fetcher)
  const [inrAmount, setInrAmount] = useState('10000')

  if (loading || !data) return <LoadingSkeleton count={4} />

  const eurAmount = (parseFloat(inrAmount || '0') * data.currentRate).toFixed(2)

  // Compute percentage change from historical data
  const rates = data.historicalRates
  const oldRate = rates.length > 0 ? rates[0].rate : data.currentRate
  const rateChange = oldRate > 0 ? ((data.currentRate - oldRate) / oldRate) * 100 : 0

  const chartData = data.historicalRates.map((r) => ({
    date: r.date.slice(5), // MM-DD
    rate: r.rate,
  }))

  const alertVariant = (type: string) => {
    if (type === 'good') return 'success' as const
    if (type === 'bad') return 'danger' as const
    return 'neutral' as const
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-3xl mx-auto"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stash-primary/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-stash-primary" />
          </div>
          FX Rates
        </h1>
        <p className="text-sm text-stash-text-secondary mt-1">INR → EUR exchange rates & alerts</p>
      </motion.div>

      {/* Current Rate Card */}
      <motion.div variants={item}>
        <Card variant="gradient">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-stash-text-muted uppercase tracking-wider font-medium">Current Rate</div>
              <div className="text-3xl font-extrabold mt-1 tabular-nums">₹1 = €{data.currentRate.toFixed(4)}</div>
            </div>
            <Badge variant={rateChange >= 0 ? 'success' : 'danger'}>
              <TrendingUp size={12} className="mr-1" /> {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(1)}%
            </Badge>
          </div>
          <div className="text-xs text-stash-text-muted">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        </Card>
      </motion.div>

      {/* Converter */}
      <motion.div variants={item}>
        <Card>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-stash-primary/15 flex items-center justify-center">
              <ArrowRightLeft size={14} className="text-stash-primary" />
            </div>
            Quick Convert
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-stash-text-muted mb-1 block">INR (₹)</label>
              <input
                type="number"
                value={inrAmount}
                onChange={(e) => setInrAmount(e.target.value)}
                className="w-full bg-stash-elevated/50 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-stash-primary/50 border border-stash-border focus:border-stash-primary/40 transition-all"
              />
            </div>
            <ArrowRightLeft size={20} className="text-stash-text-muted mt-5 shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-stash-text-muted mb-1 block">EUR (€)</label>
              <div className="w-full bg-stash-elevated/50 rounded-xl px-4 py-3 text-lg font-bold text-stash-success tabular-nums border border-stash-border">
                €{eurAmount}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Historical Chart */}
      <motion.div variants={item}>
        <Card>
          <div className="text-sm font-semibold mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-stash-primary/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-stash-primary" />
            </div>
            30-Day Rate History
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-stash-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-stash-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#606070' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#606070' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toFixed(4)}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-stash-card)',
                    border: '1px solid var(--color-stash-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'var(--color-stash-text-muted)' }}
                  formatter={(value: number | undefined) => [`₹1 = €${(value ?? 0).toFixed(4)}`, 'Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-stash-primary)"
                  strokeWidth={2}
                  fill="url(#rateGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Best Time Alert */}
      <motion.div variants={item}>
        <Card className="border-l-4 border-l-stash-success">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-stash-success/10 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-stash-success" />
            </div>
            <div>
              <div className="text-sm font-semibold">Best Time to Transfer</div>
              <p className="text-sm text-stash-text-secondary mt-1">{data.bestTimeToTransfer}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI FX Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="fx" accentColor="stash-primary" />
      </motion.div>

      {/* AI Alert Cards */}
      <motion.div variants={item}>
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-stash-primary/15 flex items-center justify-center">
            <Bell size={14} className="text-stash-primary" />
          </div>
          Rate Alerts
        </div>
        <div className="space-y-3.5">
          {data.alerts.map((alert, i) => (
            <Card key={i} className="flex items-start gap-3">
              <Badge variant={alertVariant(alert.type)}>
                {alert.type === 'good' ? <TrendingUp size={12} /> : alert.type === 'bad' ? <TrendingDown size={12} /> : <BarChart2 size={12} />}
              </Badge>
              <p className="text-sm text-stash-text-secondary flex-1">{alert.message}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

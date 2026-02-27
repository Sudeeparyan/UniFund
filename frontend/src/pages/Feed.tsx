import { useCallback, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, Camera, Plus, Users, FileText, X, ChevronRight, Sparkles, ImageIcon, CheckCircle2, AlertCircle, Pencil, Trash2, PlusCircle } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getTransactions, addExpense, scanReceipt } from '../services/api'
import { formatDate } from '../utils'
import type { Transaction } from '../types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

const categoryIcons: Record<string, string> = {
  coffee: '☕', food: '🍕', groceries: '🛒', transport: '🚗',
  shopping: '🛍️', entertainment: '🎮', school: '📚',
}

const categories = ['All', 'coffee', 'food', 'groceries', 'transport', 'shopping', 'entertainment']

// Group transactions by date label
function groupByDate(txs: Transaction[]): { label: string; transactions: Transaction[] }[] {
  const groups: Map<string, Transaction[]> = new Map()
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  for (const tx of txs) {
    const d = new Date(tx.date).toDateString()
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : formatDate(tx.date)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(tx)
  }
  return Array.from(groups, ([label, transactions]) => ({ label, transactions }))
}

export default function Feed() {
  const fetcher = useCallback(() => getTransactions(), [])
  const { data, loading, refetch } = useApi(fetcher)
  const [filter, setFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanResult, setShowScanResult] = useState(false)
  const [scanData, setScanData] = useState<any>(null)
  const [scanMethod, setScanMethod] = useState('')
  const [scanning, setScanning] = useState(false)
  const [editData, setEditData] = useState<{ merchant: string; date: string; items: { name: string; price: number }[]; total: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    if (filter === 'All') return data
    return data.filter((tx: Transaction) => tx.category === filter)
  }, [data, filter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  // Spending summary
  const todayTotal = useMemo(() => {
    if (!data) return 0
    const today = new Date().toDateString()
    return data
      .filter((tx: Transaction) => new Date(tx.date).toDateString() === today)
      .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0)
  }, [data])

  const weekTotal = useMemo(() => {
    if (!data) return 0
    const weekAgo = Date.now() - 7 * 86400000
    return data
      .filter((tx: Transaction) => new Date(tx.date).getTime() > weekAgo)
      .reduce((sum: number, tx: Transaction) => sum + Math.abs(tx.amount), 0)
  }, [data])

  const [scanError, setScanError] = useState('')

  const handleScanFile = async (file: File) => {
    setScanning(true)
    setScanError('')
    try {
      const result = await scanReceipt(file)
      if (result.success && result.parsed) {
        setScanData(result.parsed)
        setScanMethod(result.method)
        // Initialize editable copy
        setEditData({
          merchant: result.parsed.merchant || '',
          date: result.parsed.date || '',
          items: (result.parsed.items || []).map((itm: any) => ({ name: itm.name, price: itm.price })),
          total: result.parsed.total || 0,
        })
        setIsEditing(false)
        setShowScanResult(true)
      } else {
        setScanError(result.message || 'Could not read receipt. Try a clearer image.')
      }
    } catch {
      setScanError('Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  if (loading || !data) return <LoadingSkeleton count={5} />

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 max-w-3xl mx-auto"
    >
      {/* Header + Summary */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl md:text-2xl font-bold font-display flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stash-primary/10 flex items-center justify-center">
              <Receipt size={17} className="text-stash-primary" />
            </div>
            Transactions
          </h1>
          <div className="text-right">
            <div className="text-[10px] text-stash-text-muted uppercase tracking-wider font-semibold">Today</div>
            <div className="text-lg font-bold tabular-nums text-stash-text">€{todayTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-stash-card/60 border border-stash-border/40 rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-stash-text-muted font-medium">This Week</div>
            <div className="text-sm font-bold tabular-nums">€{weekTotal.toFixed(2)}</div>
          </div>
          <div className="flex-1 bg-stash-card/60 border border-stash-border/40 rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-stash-text-muted font-medium">Transactions</div>
            <div className="text-sm font-bold tabular-nums">{data.length}</div>
          </div>
          <div className="flex-1 bg-stash-card/60 border border-stash-border/40 rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-stash-text-muted font-medium">Top Category</div>
            <div className="text-sm font-bold capitalize">{
              data.length > 0
                ? Object.entries(
                    data.reduce((acc: Record<string, number>, tx: Transaction) => {
                      acc[tx.category] = (acc[tx.category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
                : '—'
            }</div>
          </div>
        </div>
      </motion.div>

      {/* Category Pills */}
      <motion.div variants={item}>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                filter === cat
                  ? 'bg-stash-accent text-stash-dark shadow-md shadow-stash-accent/20'
                  : 'bg-stash-elevated/40 text-stash-text-secondary hover:bg-stash-elevated border border-stash-border/40'
              }`}
            >
              {cat === 'All' ? '✦ All' : `${categoryIcons[cat] || ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={item}>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 bg-gradient-to-r from-stash-accent/8 to-stash-gold/6 border border-stash-accent/20 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:border-stash-accent/40 hover:shadow-glow-accent transition-all text-sm font-semibold group"
          >
            <Plus size={16} className="text-stash-accent group-hover:scale-110 transition-transform" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="bg-stash-card/60 border border-stash-border/40 rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:border-stash-primary/30 hover:shadow-elevated transition-all text-sm font-semibold group disabled:opacity-50"
          >
            {scanning ? (
              <>
                <div className="w-4 h-4 border-2 border-stash-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-stash-primary">Scanning...</span>
              </>
            ) : (
              <>
                <Camera size={16} className="text-stash-text-secondary group-hover:text-stash-primary transition-colors" />
                <span>Scan</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleScanFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {scanError && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-xl bg-stash-danger/8 border border-stash-danger/15 text-xs text-stash-danger">
            <AlertCircle size={14} />
            <span>{scanError}</span>
            <button onClick={() => setScanError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}
      </motion.div>

      {/* AI Insights — Compact */}
      <motion.div variants={item}>
        <AiInsightCard feature="feed" accentColor="stash-primary" compact />
      </motion.div>

      {/* Transaction List — Grouped by Date */}
      {grouped.map((group) => (
        <div key={group.label}>
          {/* Date Header */}
          <motion.div variants={item} className="flex items-center gap-2 mb-2 mt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stash-text-muted/70">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-stash-border/40" />
            <span className="text-[11px] font-semibold tabular-nums text-stash-text-muted">
              €{group.transactions.reduce((s, tx) => s + Math.abs(tx.amount), 0).toFixed(2)}
            </span>
          </motion.div>

          {/* Compact Transaction Cards */}
          <div className="space-y-1.5">
            {group.transactions.map((tx: Transaction) => {
              const isExpanded = expandedTx === tx.id
              return (
                <motion.div
                  key={tx.id}
                  variants={item}
                  layout
                >
                  <div
                    className={`bg-stash-card/60 border rounded-xl transition-all duration-250 cursor-pointer ${
                      isExpanded
                        ? 'border-stash-accent/20 shadow-card'
                        : 'border-stash-border/30 hover:border-stash-border/60'
                    }`}
                    onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                  >
                    {/* Main Row — Always Visible */}
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <span className="text-xl w-8 text-center shrink-0">{tx.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">{tx.merchant}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="neutral" size="sm">{tx.category}</Badge>
                          <span className="text-[10px] text-stash-text-muted">
                            {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-stash-danger tabular-nums">
                          €{Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-stash-text-muted/40 transition-transform duration-200 shrink-0 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-3 space-y-2.5">
                            {/* AI Comment */}
                            {tx.aiRoast && (
                              <div className="flex items-start gap-2 bg-stash-elevated/40 rounded-lg p-2.5">
                                <span className="text-sm mt-0.5">{tx.roastEmoji}</span>
                                <p className="text-[12px] text-stash-text-secondary leading-relaxed">{tx.aiRoast}</p>
                              </div>
                            )}

                            {/* Perk Missed */}
                            {tx.perkMissed && (
                              <div className="flex items-center gap-2 bg-stash-primary/6 rounded-lg p-2.5 border border-stash-primary/10">
                                <span className="text-sm">🎓</span>
                                <p className="text-[12px] text-stash-text-secondary flex-1">
                                  Missed <strong className="text-stash-text">{tx.perkMissed.discount}</strong> discount — could've saved €{tx.perkMissed.savedAmount.toFixed(2)}
                                </p>
                                <button className="px-2 py-1 bg-stash-primary/12 text-stash-primary text-[10px] rounded-md font-semibold">
                                  Get Code
                                </button>
                              </div>
                            )}

                            {/* Quick Actions */}
                            <div className="flex gap-1.5">
                              <button className="flex-1 py-2 rounded-lg bg-stash-elevated/30 text-[11px] text-stash-text-muted hover:bg-stash-elevated/60 font-medium transition-colors">
                                {tx.type === 'roast' ? 'Needed it' : 'Dismiss'}
                              </button>
                              <button className="flex-1 py-2 rounded-lg bg-stash-elevated/30 text-[11px] text-stash-text-muted hover:bg-stash-elevated/60 font-medium transition-colors flex items-center justify-center gap-1">
                                <Users size={10} /> Split
                              </button>
                              <button className="flex-1 py-2 rounded-lg bg-stash-elevated/30 text-[11px] text-stash-text-muted hover:bg-stash-elevated/60 font-medium transition-colors flex items-center justify-center gap-1">
                                <FileText size={10} /> Note
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <motion.div variants={item} className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stash-elevated/30 flex items-center justify-center">
            <Receipt size={28} className="text-stash-text-muted/40" />
          </div>
          <p className="text-sm text-stash-text-muted font-medium">No transactions found</p>
          <p className="text-xs text-stash-text-muted/60 mt-1">Try a different category filter</p>
        </motion.div>
      )}

      {/* ─── Add Expense Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-strong rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md border border-stash-border shadow-luxury"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold font-display">Log Expense</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-stash-elevated/60 flex items-center justify-center text-stash-text-muted hover:text-stash-text transition-colors"><X size={16} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-stash-text-muted block mb-1.5 font-medium">Amount</label>
                  <div className="flex items-center bg-stash-elevated/50 rounded-xl px-4 border border-stash-border focus-within:border-stash-accent/40 transition-colors">
                    <span className="text-stash-text-muted mr-2 text-lg">€</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="flex-1 bg-transparent py-3.5 outline-none text-2xl font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stash-text-muted block mb-2 font-medium">Category</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: '☕ Coffee', value: 'coffee' },
                      { label: '🍕 Food', value: 'food' },
                      { label: '🚗 Transport', value: 'transport' },
                      { label: '🛒 Groceries', value: 'groceries' },
                      { label: '🎮 Fun', value: 'entertainment' },
                      { label: '📚 School', value: 'school' },
                    ].map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setExpenseCategory(c.value)}
                        className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                          expenseCategory === c.value
                            ? 'bg-stash-accent/15 text-stash-accent ring-1 ring-stash-accent/40 shadow-md shadow-stash-accent/10'
                            : 'bg-stash-elevated/50 border border-stash-border hover:border-stash-accent/30 hover:text-stash-accent'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  disabled={!expenseAmount || !expenseCategory || submitting}
                  onClick={async () => {
                    setSubmitting(true)
                    try {
                      await addExpense({ amount: parseFloat(expenseAmount), category: expenseCategory })
                      setShowAddModal(false)
                      setExpenseAmount('')
                      setExpenseCategory('')
                      refetch()
                    } catch { /* ignore */ }
                    finally { setSubmitting(false) }
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-stash-accent to-stash-gold font-semibold text-sm text-stash-dark hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {submitting ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Scan Receipt Result Modal (Editable) ─── */}
      <AnimatePresence>
        {showScanResult && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowScanResult(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-strong rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md border border-stash-border shadow-luxury max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stash-success/15 to-stash-primary/10 flex items-center justify-center ring-1 ring-stash-success/20">
                    <CheckCircle2 size={18} className="text-stash-success" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display">Receipt Scanned</h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanMethod === 'ai' ? 'bg-stash-success' : scanMethod === 'ocr' ? 'bg-stash-primary' : 'bg-stash-warning'}`} />
                      <span className="text-[10px] text-stash-text-muted font-medium">
                        {scanMethod === 'ai' ? 'AI Vision' : scanMethod === 'ocr' ? 'Local OCR' : 'Demo Mode'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isEditing
                        ? 'bg-stash-accent/15 text-stash-accent ring-1 ring-stash-accent/30'
                        : 'bg-stash-elevated/60 text-stash-text-muted hover:text-stash-text'
                    }`}
                    title={isEditing ? 'Done editing' : 'Edit receipt'}
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setShowScanResult(false)} className="w-8 h-8 rounded-lg bg-stash-elevated/60 flex items-center justify-center text-stash-text-muted hover:text-stash-text transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Receipt Content */}
              <div className="overflow-y-auto flex-1 -mx-1 px-1 scrollbar-hide">
                <div className="bg-stash-elevated/30 rounded-xl border border-stash-border/40 overflow-hidden mb-4">
                  {/* Store Info */}
                  <div className="px-4 py-3 border-b border-stash-border/30">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editData.merchant}
                          onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
                          className="w-full bg-stash-elevated/50 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none border border-stash-border/40 focus:border-stash-accent/40 transition-colors"
                          placeholder="Store name"
                        />
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          className="w-full bg-stash-elevated/50 rounded-lg px-2.5 py-1.5 text-[11px] text-stash-text-muted outline-none border border-stash-border/40 focus:border-stash-accent/40 transition-colors"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-bold">{editData.merchant}</div>
                        <div className="text-[11px] text-stash-text-muted">{editData.date}</div>
                      </>
                    )}
                  </div>

                  {/* Items */}
                  <div className="px-4 py-2.5 space-y-1.5">
                    {editData.items.map((itm, i) => (
                      <div key={i} className={`flex items-center gap-2 ${isEditing ? 'py-1' : ''}`}>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={itm.name}
                              onChange={(e) => {
                                const updated = [...editData.items]
                                updated[i] = { ...updated[i], name: e.target.value }
                                setEditData({ ...editData, items: updated })
                              }}
                              className="flex-1 min-w-0 bg-stash-elevated/50 rounded-lg px-2.5 py-1.5 text-[13px] outline-none border border-stash-border/40 focus:border-stash-accent/40 transition-colors"
                              placeholder="Item name"
                            />
                            <div className="flex items-center bg-stash-elevated/50 rounded-lg border border-stash-border/40 focus-within:border-stash-accent/40 transition-colors shrink-0">
                              <span className="text-[11px] text-stash-text-muted pl-2">€</span>
                              <input
                                type="number"
                                step="0.01"
                                value={itm.price}
                                onChange={(e) => {
                                  const updated = [...editData.items]
                                  updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 }
                                  const newTotal = updated.reduce((s, x) => s + x.price, 0)
                                  setEditData({ ...editData, items: updated, total: Math.round(newTotal * 100) / 100 })
                                }}
                                className="w-16 bg-transparent py-1.5 pr-2 pl-0.5 text-[13px] font-medium tabular-nums outline-none text-right"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const updated = editData.items.filter((_, j) => j !== i)
                                const newTotal = updated.reduce((s, x) => s + x.price, 0)
                                setEditData({ ...editData, items: updated, total: Math.round(newTotal * 100) / 100 })
                              }}
                              className="w-7 h-7 rounded-lg bg-stash-danger/8 flex items-center justify-center text-stash-danger/60 hover:text-stash-danger hover:bg-stash-danger/15 transition-colors shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[13px] text-stash-text-secondary flex-1 min-w-0 truncate">{itm.name}</span>
                            <span className="text-[13px] tabular-nums font-medium ml-2 shrink-0">€{itm.price.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add Item Button (edit mode) */}
                    {isEditing && (
                      <button
                        onClick={() => {
                          setEditData({
                            ...editData,
                            items: [...editData.items, { name: '', price: 0 }],
                          })
                        }}
                        className="w-full py-2 rounded-lg border border-dashed border-stash-border/50 text-[12px] text-stash-text-muted hover:border-stash-accent/40 hover:text-stash-accent flex items-center justify-center gap-1.5 transition-colors mt-1"
                      >
                        <PlusCircle size={13} />
                        Add Item
                      </button>
                    )}
                  </div>

                  {/* Total */}
                  <div className="px-4 py-3 border-t border-stash-border/30 flex justify-between items-center bg-stash-card/50">
                    <span className="text-sm font-bold">Total</span>
                    {isEditing ? (
                      <div className="flex items-center bg-stash-elevated/50 rounded-lg border border-stash-border/40 focus-within:border-stash-accent/40 transition-colors">
                        <span className="text-sm text-stash-text-muted pl-2">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editData.total}
                          onChange={(e) => setEditData({ ...editData, total: parseFloat(e.target.value) || 0 })}
                          className="w-20 bg-transparent py-1 pr-2 pl-0.5 text-base font-bold tabular-nums outline-none text-right text-stash-success"
                        />
                      </div>
                    ) : (
                      <span className="text-base font-bold text-stash-success tabular-nums">€{editData.total.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 pt-2">
                {isEditing && (
                  <button
                    onClick={() => {
                      const recalc = editData.items.reduce((s, x) => s + x.price, 0)
                      setEditData({ ...editData, total: Math.round(recalc * 100) / 100 })
                    }}
                    className="w-full py-2.5 rounded-xl bg-stash-elevated/50 border border-stash-border/40 text-[12px] font-medium text-stash-text-secondary hover:border-stash-accent/30 transition-colors mb-2 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} className="text-stash-accent" />
                    Recalculate Total from Items
                  </button>
                )}
                <button
                  onClick={async () => {
                    setSubmitting(true)
                    try {
                      await addExpense({ amount: editData.total, category: 'groceries', merchant: editData.merchant })
                      setShowScanResult(false)
                      setIsEditing(false)
                      refetch()
                    } catch { /* ignore */ }
                    finally { setSubmitting(false) }
                  }}
                  disabled={submitting || editData.items.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-stash-accent to-stash-gold font-semibold text-sm text-stash-dark hover:opacity-90 transition-opacity mb-2 disabled:opacity-40"
                >
                  {submitting ? 'Adding...' : `Add €${editData.total.toFixed(2)} to Expenses`}
                </button>

                {scanMethod === 'ocr' && (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <Sparkles size={11} className="text-stash-primary/50" />
                    <span className="text-[10px] text-stash-text-muted/50">
                      Scanned with local OCR — set OPENAI_API_KEY for enhanced AI vision
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

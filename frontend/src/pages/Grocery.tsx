import { useCallback, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Search, Tag } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getGroceryItems } from '../services/api'
import type { GroceryItem } from '../types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
}

export default function Grocery() {
  const fetcher = useCallback(() => getGroceryItems(), [])
  const { data, loading } = useApi(fetcher)
  const [search, setSearch] = useState('')
  const [basket, setBasket] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search) return data
    return data.filter((g: GroceryItem) =>
      g.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [data, search])

  const toggleBasket = (id: string) => {
    setBasket((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Calculate cheapest basket per store
  const basketTotals = useMemo(() => {
    if (!data || basket.size === 0) return null
    const items = data.filter((g: GroceryItem) => basket.has(g.id))
    const stores = ['Tesco', 'Lidl', 'Aldi']
    return stores.map((store) => ({
      store,
      total: items.reduce((sum: number, g: GroceryItem) => {
        const sp = g.stores.find((s) => s.store === store)
        return sum + (sp?.price || 0)
      }, 0),
    })).sort((a, b) => a.total - b.total)
  }, [data, basket])

  if (loading || !data) return <LoadingSkeleton count={5} />

  const cheapestStore = basketTotals?.[0]
  const mostExpensive = basketTotals?.[basketTotals.length - 1]
  const savings = cheapestStore && mostExpensive
    ? (mostExpensive.total - cheapestStore.total).toFixed(2)
    : null

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-3xl mx-auto"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stash-success/10 flex items-center justify-center">
            <ShoppingCart size={18} className="text-stash-success" />
          </div>
          Grocery Comparison
        </h1>
        <p className="text-sm text-stash-text-secondary mt-1">Compare prices across Dublin stores</p>
      </motion.div>

      {/* Search */}
      <motion.div variants={item}>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stash-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items (milk, bread, rice...)"
            className="w-full bg-stash-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-all"
          />
        </div>
      </motion.div>

      {/* Basket Summary */}
      {basketTotals && basketTotals.length > 0 && (
        <motion.div variants={item}>
          <Card variant="gradient">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-stash-success/15 flex items-center justify-center">
                <Tag size={14} className="text-stash-success" />
              </div>
              <span className="text-sm font-semibold">Your Basket ({basket.size} items)</span>
              {savings && parseFloat(savings) > 0 && (
                <Badge variant="success">Save €{savings} at {cheapestStore?.store}</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {basketTotals.map((bt, i) => (
                <div
                  key={bt.store}
                  className={`text-center p-3 rounded-xl transition-all ${
                    i === 0 ? 'bg-stash-success/10 ring-1 ring-stash-success/20' : 'bg-stash-elevated/50 border border-stash-border'
                  }`}
                >
                  <div className="text-xs text-stash-text-muted">{bt.store}</div>
                  <div className={`text-lg font-bold ${i === 0 ? 'text-stash-success' : ''}`}>
                    €{bt.total.toFixed(2)}
                  </div>
                  {i === 0 && <div className="text-[10px] text-stash-success">Cheapest!</div>}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* AI Grocery Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="grocery" accentColor="stash-success" compact />
      </motion.div>

      {/* Item List */}
      <div className="space-y-3.5">
        {filtered.map((g: GroceryItem) => {
          const cheapest = [...g.stores].sort((a, b) => a.price - b.price)[0]
          const inBasket = basket.has(g.id)

          return (
            <motion.div key={g.id} variants={item}>
              <Card
                onClick={() => toggleBasket(g.id)}
                className={`${inBasket ? 'ring-1 ring-stash-primary/40' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-xs text-stash-text-muted">{g.category}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    inBasket
                      ? 'bg-stash-primary border-stash-primary'
                      : 'border-stash-text-muted'
                  }`}>
                    {inBasket && <span className="text-xs text-white">✓</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {g.stores.map((sp) => {
                    const isCheapest = sp.store === cheapest.store
                    return (
                      <div
                        key={sp.store}
                        className={`text-center p-2.5 rounded-xl transition-all ${
                          isCheapest ? 'bg-stash-success/10 border border-stash-success/20' : 'bg-stash-elevated/50 border border-stash-border'
                        }`}
                      >
                        <div className="text-xs text-stash-text-muted">{sp.store}</div>
                        <div className={`text-sm font-bold ${isCheapest ? 'text-stash-success' : ''}`}>
                          €{sp.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-stash-text-muted">{sp.unit}</div>
                        {sp.onSale && (
                          <Badge variant="warning" className="mt-1 text-[9px]">SALE</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stash-text-muted">
          <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
          <p>No items found matching "{search}"</p>
        </div>
      )}
    </motion.div>
  )
}

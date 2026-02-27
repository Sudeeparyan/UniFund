import { useCallback, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Store, Star, Search, Grid3X3, List, Package, Repeat, ShoppingBag } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import AiInsightCard from '../components/common/AiInsightCard'
import { useApi } from '../hooks/useApi'
import { getMarketListings } from '../services/api'
import type { MarketListing } from '../types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } }

const typeTabs = [
  { key: 'all', label: 'All', icon: Store },
  { key: 'secondhand', label: 'Secondhand', icon: ShoppingBag },
  { key: 'starter-kit', label: 'Starter Kits', icon: Package },
  { key: 'barter', label: 'Skill Barter', icon: Repeat },
]

const categoryFilters = ['All', 'Furniture', 'Electronics', 'Starter Kit', 'Tutoring', 'Food', 'Books', 'Bikes']

export default function Market() {
  const fetcher = useCallback(() => getMarketListings(), [])
  const { data, loading } = useApi(fetcher)
  const [activeTab, setActiveTab] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    if (!data) return []
    let listings = data as MarketListing[]
    if (activeTab !== 'all') listings = listings.filter((l) => l.type === activeTab)
    if (categoryFilter !== 'All') listings = listings.filter((l) => l.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      listings = listings.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      )
    }
    return listings
  }, [data, activeTab, categoryFilter, search])

  if (loading || !data) return <LoadingSkeleton count={4} />

  const allListings = data as MarketListing[]
  const totalSavings = allListings
    .filter((l) => l.originalPrice && l.price > 0)
    .reduce((sum, l) => sum + ((l.originalPrice || 0) - l.price), 0)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stash-primary/10 flex items-center justify-center">
              <Store size={18} className="text-stash-primary" />
            </div>
            Student Market
          </h1>
          <p className="text-sm text-stash-text-secondary mt-1">Secondhand deals, starter kits & skill barter</p>
        </div>
        <Card className="py-2 px-3">
          <div className="text-xs text-stash-text-muted">Potential savings</div>
          <div className="text-lg font-bold text-stash-success">€{totalSavings}</div>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div variants={item}>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stash-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, kits, or skills..."
            className="w-full bg-stash-elevated/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stash-primary/50 placeholder-stash-text-muted border border-stash-border focus:border-stash-primary/40 transition-all"
          />
        </div>
      </motion.div>

      {/* AI Market Insights */}
      <motion.div variants={item}>
        <AiInsightCard feature="market" accentColor="stash-primary" compact />
      </motion.div>

      {/* Type Tabs */}
      <motion.div variants={item}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCategoryFilter('All') }}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20'
                  : 'bg-stash-elevated/60 text-stash-text-secondary border border-stash-border hover:border-stash-primary/30'
              }`}
            >
              <tab.icon size={13} className="shrink-0" /> {tab.label}
              <span className="ml-1 opacity-60">
                ({activeTab === 'all' && tab.key === 'all'
                  ? allListings.length
                  : tab.key === 'all'
                    ? allListings.length
                    : allListings.filter((l) => l.type === tab.key).length})
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Category filter + View toggle */}
      <motion.div variants={item} className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-stash-accent/15 text-stash-accent shadow-sm'
                  : 'bg-stash-elevated/50 text-stash-text-muted border border-stash-border hover:border-stash-primary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20' : 'text-stash-text-muted hover:bg-stash-elevated'}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-stash-primary text-white shadow-lg shadow-stash-primary/20' : 'text-stash-text-muted hover:bg-stash-elevated'}`}
          >
            <List size={16} />
          </button>
        </div>
      </motion.div>

      {/* Starter Kit Highlight (when on starter-kit tab) */}
      {activeTab === 'starter-kit' && (
        <motion.div variants={item}>
          <Card className="bg-gradient-to-r from-stash-success/8 to-stash-primary/5 border border-stash-success/15">
            <div className="flex items-start gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <div className="text-sm font-semibold">Seniors' Starter Kit Handover</div>
                <p className="text-xs text-stash-text-secondary mt-1">
                  Graduating students leaving Ireland bundle their entire room setup — desk, bedding, 
                  kitchen essentials — and sell it as a single heavily discounted package to incoming freshers.
                </p>
                <div className="text-xs text-stash-success mt-1 font-medium">Save up to 60% vs buying new!</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Skill Barter Info (when on barter tab) */}
      {activeTab === 'barter' && (
        <motion.div variants={item}>
          <Card className="bg-gradient-to-r from-stash-warning/8 to-stash-accent/5 border border-stash-warning/15">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🔄</span>
              <div>
                <div className="text-sm font-semibold">Skill Barter Board</div>
                <p className="text-xs text-stash-text-secondary mt-1">
                  Trade favors instead of money! Swap coding help for a home-cooked meal, 
                  language practice for moving help, or tutoring for photography.
                </p>
                <div className="text-xs text-stash-warning mt-1 font-medium">Zero money spent — just trade skills!</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Listings */}
      <div className={viewMode === 'grid' ? 'grid gap-3.5 sm:grid-cols-2' : 'space-y-3.5'}>
        {filtered.map((listing) => (
          <motion.div key={listing.id} variants={item}>
            {viewMode === 'grid' ? (
              <Card className="h-full hover:ring-1 hover:ring-stash-primary/30 transition-all cursor-pointer group border border-transparent hover:border-stash-primary/20">
                {/* Image placeholder */}
                <div className="relative h-32 bg-stash-elevated/50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-stash-border">
                  <span className="text-4xl opacity-40">
                    {listing.type === 'barter' ? '🤝' : listing.type === 'starter-kit' ? '📦' : '🏷️'}
                  </span>
                  <div className="absolute top-2 left-2">
                    <Badge variant={listing.type === 'barter' ? 'warning' : listing.type === 'starter-kit' ? 'success' : 'neutral'}>
                      {listing.type === 'barter' ? 'Barter' : listing.type === 'starter-kit' ? 'Kit' : 'Used'}
                    </Badge>
                  </div>
                  {listing.originalPrice && listing.price > 0 && (
                    <div className="absolute top-2 right-2 bg-stash-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      -{Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)}%
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-semibold mb-1 group-hover:text-stash-primary transition-colors">{listing.title}</h3>
                <p className="text-xs text-stash-text-secondary mb-3 line-clamp-2">{listing.description}</p>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    {listing.price > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-stash-success">€{listing.price}</span>
                        {listing.originalPrice && (
                          <span className="text-xs text-stash-text-muted line-through">€{listing.originalPrice}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-stash-warning">Free / Trade</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-stash-text-muted">
                    <Star size={12} className="text-stash-warning fill-stash-warning" />
                    {listing.sellerRating}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stash-border/60">
                  <span className="text-xs text-stash-text-muted">{listing.seller}</span>
                  <span className="text-xs text-stash-text-muted">{listing.distance}</span>
                </div>
              </Card>
            ) : (
              <Card className="flex gap-4 hover:ring-1 hover:ring-stash-primary/30 transition-all cursor-pointer group border border-transparent hover:border-stash-primary/20">
                {/* Image placeholder */}
                <div className="w-20 h-20 bg-stash-elevated/50 rounded-xl flex items-center justify-center shrink-0 border border-stash-border">
                  <span className="text-2xl opacity-40">
                    {listing.type === 'barter' ? '🤝' : listing.type === 'starter-kit' ? '📦' : '🏷️'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold group-hover:text-stash-primary transition-colors">{listing.title}</h3>
                      <p className="text-xs text-stash-text-secondary mt-0.5 line-clamp-1">{listing.description}</p>
                    </div>
                    <Badge variant={listing.type === 'barter' ? 'warning' : listing.type === 'starter-kit' ? 'success' : 'neutral'}>
                      {listing.type === 'barter' ? 'Barter' : listing.type === 'starter-kit' ? 'Kit' : 'Used'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {listing.price > 0 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-stash-success">€{listing.price}</span>
                          {listing.originalPrice && (
                            <span className="text-xs text-stash-text-muted line-through">€{listing.originalPrice}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-stash-warning">Free / Trade</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stash-text-muted">
                      <span className="flex items-center gap-1">
                        <Star size={10} className="text-stash-warning fill-stash-warning" />
                        {listing.sellerRating}
                      </span>
                      <span>{listing.distance}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stash-text-muted">
          <Store size={40} className="mx-auto mb-3 opacity-30" />
          <p>No listings found</p>
          <p className="text-xs mt-1">Try a different category or search term</p>
        </div>
      )}
    </motion.div>
  )
}

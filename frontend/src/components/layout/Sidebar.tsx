import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Home,
  Receipt,
  Users,
  Gift,
  TrendingUp,
  ShoppingCart,
  Store,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Coins,
} from 'lucide-react'

const navSections = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/feed', icon: Receipt, label: 'Transactions' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/grocery', icon: ShoppingCart, label: 'Grocery' },
      { to: '/fx', icon: TrendingUp, label: 'FX Advisor' },
    ],
  },
  {
    title: 'Social',
    items: [
      { to: '/community', icon: Users, label: 'Community' },
      { to: '/streaks', icon: Flame, label: 'Streaks' },
      { to: '/rewards', icon: Coins, label: 'Rewards' },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/squad', icon: Users, label: 'Squad' },
      { to: '/perks', icon: Gift, label: 'Perks' },
      { to: '/market', icon: Store, label: 'Market' },
    ],
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <aside
      className={`hidden md:flex flex-col bg-stash-card/50 backdrop-blur-2xl border-r border-stash-border/60 h-full transition-all duration-300 ease-out z-50 ${
        collapsed ? 'w-[72px]' : 'w-[256px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-stash-border/60 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stash-gold via-stash-accent to-stash-gold-dark flex items-center justify-center text-base shrink-0 shadow-luxury ring-1 ring-stash-accent/20">
          <span className="text-stash-dark font-extrabold text-sm tracking-tight">UF</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-base font-bold gradient-text-gold tracking-tight leading-tight font-display">UniFund</span>
            <span className="text-[9px] text-stash-text-muted font-semibold tracking-[0.2em] uppercase">Student Finance</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 overflow-y-auto scrollbar-hide">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-5 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stash-text-muted/70">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-0.5 px-3">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `nav-active-indicator ${isActive ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-250 group relative ${
                      isActive
                        ? 'bg-stash-accent/8 text-stash-text'
                        : 'text-stash-text-secondary hover:bg-stash-elevated/40 hover:text-stash-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-250 ${
                        isActive
                          ? 'bg-gradient-to-br from-stash-accent to-stash-gold text-stash-dark shadow-glow-accent'
                          : 'bg-stash-elevated/40 text-stash-text-muted group-hover:bg-stash-elevated/60 group-hover:text-stash-text-secondary'
                      }`}>
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                      </div>
                      {!collapsed && (
                        <span className={`text-[13px] transition-colors ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-stash-accent shadow-glow-accent" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            {sIdx < navSections.length - 1 && (
              <div className="mx-5 mt-4 divider-gold" />
            )}
          </div>
        ))}
      </nav>

      {/* AI Assistant CTA — opens floating chat */}
      {!collapsed && (
        <div className="mx-3 mb-3">
          <button
            onClick={() => {
              // Dispatch custom event to open the floating chat
              window.dispatchEvent(new CustomEvent('open-floating-chat'))
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-stash-accent/6 to-stash-gold/8 border border-stash-accent/15 hover:border-stash-accent/30 transition-all duration-300 group hover:shadow-glow-accent cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-stash-accent/15 to-stash-gold/10 flex items-center justify-center ring-1 ring-stash-accent/10">
              <Sparkles size={15} className="text-stash-accent group-hover:text-stash-gold transition-colors" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-semibold text-stash-text">AI Assistant</div>
              <div className="text-[10px] text-stash-text-muted">Powered by UniFund</div>
            </div>
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3.5 border-t border-stash-border text-stash-text-muted hover:text-stash-text hover:bg-stash-elevated/40 transition-all duration-250"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}

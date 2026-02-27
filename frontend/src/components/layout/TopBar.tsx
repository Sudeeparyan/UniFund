import { Search, Sun, Moon, Coins } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { getCoinBalance } from '../../services/api'

interface TopBarProps {
  userName?: string
  initials?: string
}

export default function TopBar({ userName = 'JD', initials = 'JD' }: TopBarProps) {
  const { toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const balanceFetcher = useCallback(() => getCoinBalance(), [])
  const { data: coinData } = useApi<{ balance: number }>(balanceFetcher)

  return (
    <header className="relative flex items-center justify-between px-4 py-3.5 md:px-8 lg:px-10 border-b border-stash-border/60 bg-stash-dark/50 backdrop-blur-2xl sticky top-0 z-40 transition-colors duration-400">

      {/* Logo (mobile only) */}
      <div className="flex items-center gap-2.5 md:hidden cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stash-gold via-stash-accent to-stash-gold-dark flex items-center justify-center shadow-glow-accent ring-1 ring-stash-accent/20">
          <span className="text-stash-dark font-extrabold text-[10px] tracking-tight">UF</span>
        </div>
        <span className="text-base font-bold gradient-text-gold tracking-tight font-display">UniFund</span>
      </div>

      {/* Search (desktop) */}
      <div className="hidden md:flex items-center gap-2.5 bg-stash-elevated/30 rounded-xl px-4 py-2.5 flex-1 max-w-md border border-stash-border/60 hover:border-stash-border-hover transition-all duration-250 group focus-within:border-stash-accent/20 focus-within:shadow-glow-accent">
        <Search size={15} className="text-stash-text-muted group-focus-within:text-stash-accent transition-colors" />
        <input
          type="text"
          placeholder="Search anything..."
          className="bg-transparent border-none outline-none text-sm text-stash-text placeholder-stash-text-muted flex-1"
        />
        <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-stash-text-muted bg-stash-dark/50 px-1.5 py-0.5 rounded border border-stash-border/60 font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Coin Balance */}
        <button
          onClick={() => navigate('/rewards')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stash-accent/8 border border-stash-accent/15 hover:bg-stash-accent/15 hover:border-stash-accent/25 transition-all duration-250 group cursor-pointer"
        >
          <Coins size={15} className="text-stash-accent group-hover:text-stash-gold transition-colors" />
          <span className="text-xs font-bold text-stash-accent tabular-nums">{coinData?.balance ?? '—'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-xl bg-stash-elevated/40 hover:bg-stash-elevated border border-stash-border hover:border-stash-border-hover transition-all duration-250 group"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={16} className="text-stash-text-muted group-hover:text-stash-accent transition-colors" />
          ) : (
            <Moon size={16} className="text-stash-text-muted group-hover:text-stash-primary transition-colors" />
          )}
        </button>

        {/* Avatar */}
        <button className="relative ml-1.5 group" onClick={() => navigate('/profile')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stash-accent to-stash-gold flex items-center justify-center text-xs font-bold text-stash-dark shadow-glow-accent ring-1 ring-stash-accent/20 group-hover:ring-stash-accent/40 transition-all duration-250">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-stash-success rounded-full ring-2 ring-stash-dark" />
        </button>
      </div>
    </header>
  )
}

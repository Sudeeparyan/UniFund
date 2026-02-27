import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Store, Plus, Users, MoreHorizontal } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/market', icon: Store, label: 'Market' },
  { to: '/feed', icon: Plus, label: 'Add', isCenter: true },
  { to: '/community', icon: Users, label: 'Social' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="glass-strong rounded-2xl bottom-nav-safe">
        <div className="flex items-center justify-around py-2.5 px-2 max-w-md mx-auto">
          {tabs.map(({ to, icon: Icon, label, isCenter }) =>
            isCenter ? (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center -mt-7"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-13 h-13 rounded-xl bg-gradient-to-br from-stash-accent via-stash-gold to-stash-accent-light flex items-center justify-center shadow-glow-gold ring-4 ring-stash-dark"
                >
                  <Icon size={22} className="text-stash-dark" />
                </motion.div>
                <span className="text-[10px] mt-1 font-semibold text-stash-accent tracking-wide">{label}</span>
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center py-1.5 px-3 transition-all duration-250 ${
                    isActive ? 'text-stash-accent' : 'text-stash-text-muted hover:text-stash-text-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className={`text-[10px] mt-1 tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-gradient-to-r from-stash-accent to-stash-gold"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ),
          )}
        </div>
      </div>
    </nav>
  )
}

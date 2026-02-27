import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import FloatingChat from '../common/FloatingChat'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
}

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen bg-stash-dark overflow-hidden transition-colors duration-400">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Subtle gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none z-0" />

        <TopBar />

        <main className="relative flex-1 overflow-y-auto pb-24 md:pb-6 px-4 md:px-8 lg:px-10 py-6 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Floating AI Chat */}
      <FloatingChat />
    </div>
  )
}

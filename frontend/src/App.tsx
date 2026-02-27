import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Feed from './pages/Feed'
import FXRates from './pages/FXRates'
import Grocery from './pages/Grocery'
import Community from './pages/Community'
import Squad from './pages/Squad'
import Perks from './pages/Perks'
import Market from './pages/Market'
import Streaks from './pages/Streaks'
import Rewards from './pages/Rewards'
import MoreMenu from './pages/MoreMenu'
import Profile from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/fx" element={<FXRates />} />
        <Route path="/grocery" element={<Grocery />} />
        <Route path="/community" element={<Community />} />
        <Route path="/squad" element={<Squad />} />
        <Route path="/perks" element={<Perks />} />
        <Route path="/market" element={<Market />} />
        <Route path="/streaks" element={<Streaks />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/more" element={<MoreMenu />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

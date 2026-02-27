// ====== User ======
export interface UserProfile {
  name: string
  initials: string
  avatar: string
  homeCurrency: string
  hostCurrency: string
  monthlyBudget: number
  loanDate: string
  university: string
}

export interface ProfileAchievement {
  id: string
  emoji: string
  label: string
  date: string
}

export interface ProfileStats {
  totalSaved: number
  avgDailySpend: number
  budgetHitRate: number
  longestStreak: number
  transactionCount: number
  topCategory: string
}

export interface ProfilePreferences {
  notifications: boolean
  weeklyReport: boolean
  roastLevel: string
  currency: string
}

export interface ProfileData {
  name: string
  initials: string
  avatar: string
  email: string
  phone: string
  homeCurrency: string
  hostCurrency: string
  monthlyBudget: number
  loanDate: string
  university: string
  course: string
  studentId: string
  yearOfStudy: number
  bio: string
  joinedDate: string
  location: string
  balance: number
  safeToSpend: number
  currentStreak: number
  longestStreak: number
  achievements: ProfileAchievement[]
  stats: ProfileStats
  preferences: ProfilePreferences
}

// ====== Budget / Dashboard ======
export interface LockedFund {
  name: string
  emoji: string
  amount: number
}

export interface GhostItem {
  purpose: string
  emoji: string
  amount: number
  unlockDate: string
  lockType: 'date' | 'phrase' | 'buddy'
}

export interface Budget {
  totalBalance: number
  lockedFunds: LockedFund[]
  dailyBudget: number
  spentToday: number
  ghostItems: GhostItem[]
}

export interface DashboardData {
  user: UserProfile
  budget: Budget
  greeting: string
  coins: number
  runway: {
    daysLeft: number
    brokeDate: string
    nextLoanDate: string
    gapDays: number
    dailyAvgSpend: number
    safeToSpend: number
    lockedTotal: number
    ghostTotal: number
    avgBurnPerHour: number
    savedVsAvg: number
    weeklySaved: number
  }
  vibe: {
    emoji: string
    status: string
    insight: string
    percentRemaining: number
  }
  streak: {
    days: number
    label: string
  }
}

// ====== Transactions ======
export interface Transaction {
  id: string
  merchant: string
  icon: string
  category: string
  amount: number
  currency: string
  date: string
  aiRoast: string
  roastEmoji: string
  type: 'roast' | 'neutral' | 'praise' | 'warning' | 'perk-available'
  perkMissed?: {
    discount: string
    brand: string
    code: string
    savedAmount: number
  }
}

// ====== Community ======
export interface CommunityPost {
  id: string
  author: string
  avatar: string
  content: string
  tags: string[]
  intent: 'OFFERING' | 'SEEKING' | 'GENERAL'
  aiMatch?: string
  upvotes: number
  comments: CommunityComment[]
  createdAt: string
}

export interface CommunityComment {
  id: string
  author: string
  avatar: string
  content: string
  isAI?: boolean
  createdAt: string
}

// ====== Squad ======
export interface SquadMember {
  id: string
  name: string
  initials: string
  amount: number
  direction: 'owes-you' | 'you-owe'
  reason: string
  daysSince: number
}

export interface SquadActivity {
  id: string
  emoji: string
  text: string
  time: string
}

// ====== Perks ======
export interface Perk {
  id: string
  brand: string
  logo: string
  deal: string
  code: string
  category: 'Food' | 'Shopping' | 'Entertainment' | 'Tech' | 'Transport'
  isActive?: boolean
  isHot?: boolean
  expiryDate?: string
  nearYou?: boolean
}

// ====== Grocery ======
export interface StorePrice {
  store: string
  price: number
  unit: string
  onSale: boolean
}

export interface GroceryItem {
  id: string
  name: string
  category: string
  emoji: string
  stores: StorePrice[]
}

// ====== FX Rates ======
export interface HistoricalRate {
  date: string
  rate: number
}

export interface FXAlert {
  type: 'good' | 'bad' | 'neutral'
  message: string
  threshold: number
}

export interface FXData {
  baseCurrency: string
  targetCurrency: string
  currentRate: number
  historicalRates: HistoricalRate[]
  alerts: FXAlert[]
  bestTimeToTransfer: string
  lastUpdated: string
}

// ====== Market ======
export interface MarketListing {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number
  category: string
  image: string
  seller: string
  sellerRating: number
  distance: string
  type: 'secondhand' | 'starter-kit' | 'barter'
}

// ====== Streaks ======
export interface StreakData {
  currentStreak: number
  longestStreak: number
  todayUnderBudget: boolean
  milestones: StreakMilestone[]
}

export interface StreakMilestone {
  days: number
  label: string
  emoji: string
  reward: string
  achieved: boolean
  coins?: number
}

export interface SurvivalMission {
  id: string
  title: string
  xp: number
  coins?: number
  completed: boolean
}

// ====== Coins & Rewards ======
export interface CoinHistory {
  id: string
  type: 'earned' | 'spent'
  amount: number
  source: string
  label: string
  date: string
}

export interface CoinsData {
  balance: number
  lifetime: number
  history: CoinHistory[]
}

export interface ShopReward {
  id: string
  name: string
  description: string
  emoji: string
  cost: number
  category: 'coupon' | 'app' | 'badge'
  stock: number | null
  purchased: boolean
  purchasedAt: string | null
}

export interface RewardsShopData {
  balance: number
  rewards: ShopReward[]
}

import axios from 'axios'
import type {
  DashboardData,
  Transaction,
  CommunityPost,
  SquadMember,
  SquadActivity,
  Perk,
  GroceryItem,
  FXData,
  MarketListing,
  StreakData,
  SurvivalMission,
  ProfileData,
  CoinsData,
  RewardsShopData,
} from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Dashboard
export const getDashboard = () =>
  api.get<DashboardData>('/dashboard').then((r) => r.data)

// Transactions
export const getTransactions = () =>
  api.get<Transaction[]>('/transactions').then((r) => r.data)

// Community
export const getCommunityPosts = (intent?: string) =>
  api.get<CommunityPost[]>('/community', { params: intent ? { intent } : {} }).then((r) => r.data)

export const createCommunityPost = (post: Partial<CommunityPost>) =>
  api.post<CommunityPost>('/community', post).then((r) => r.data)

export const addCommunityComment = (postId: string, comment: { author: string; content: string }) =>
  api.post(`/community/${postId}/comment`, comment).then((r) => r.data)

export const voteCommunityPost = (postId: string, direction: 'up' | 'down') =>
  api.post(`/community/${postId}/vote`, { direction }).then((r) => r.data)

// Squad
export const getSquad = () =>
  api.get<{ members: SquadMember[]; activity: SquadActivity[] }>('/squad').then((r) => r.data)

export const splitExpense = (data: { description: string; total_amount: number; member_ids: string[]; paid_by?: string }) =>
  api.post('/squad/split', data).then((r) => r.data)

export const nudgeMember = (memberId: string) =>
  api.post('/squad/nudge', { member_id: memberId }).then((r) => r.data)

export const settleDebt = (memberId: string, amount: number) =>
  api.post('/squad/settle', { member_id: memberId, amount }).then((r) => r.data)

// Perks
export const getPerks = (category?: string) =>
  api.get<Perk[]>('/perks', { params: { category } }).then((r) => r.data)

// Grocery
export const getGroceryItems = (item?: string) =>
  api.get<GroceryItem[]>('/grocery', { params: { item } }).then((r) => r.data)

// FX Rates
export const getFXRates = () =>
  api.get<FXData>('/fx').then((r) => r.data)

// Market
export const getMarketListings = (type?: string) =>
  api.get<MarketListing[]>('/market', { params: { type } }).then((r) => r.data)

// Streaks
export const getStreaks = () =>
  api.get<StreakData>('/streaks').then((r) => r.data)

export const getSurvivalMissions = () =>
  api.get<SurvivalMission[]>('/survival-missions').then((r) => r.data)

export const toggleMission = (missionId: string) =>
  api.post('/survival-missions/toggle', { mission_id: missionId }).then((r) => r.data)

export const getRewards = () =>
  api.get('/streaks/rewards').then((r) => r.data)

export const claimReward = (rewardId: string) =>
  api.post(`/streaks/rewards/${rewardId}/claim`).then((r) => r.data)

// Coins & Rewards
export const getCoins = () =>
  api.get<CoinsData>('/coins').then((r) => r.data)

export const getCoinBalance = () =>
  api.get<{ balance: number }>('/coins/balance').then((r) => r.data)

export const getRewardsShop = () =>
  api.get<RewardsShopData>('/rewards-shop').then((r) => r.data)

export const purchaseReward = (rewardId: string) =>
  api.post<{ success: boolean; reward: any; newBalance: number; message: string }>('/rewards-shop/purchase', { reward_id: rewardId }).then((r) => r.data)

// Add expense
export const addExpense = (expense: { amount: number; category: string; merchant?: string }) =>
  api.post<Transaction>('/transactions', expense).then((r) => r.data)

// Scan receipt — sends actual image file for OCR
export const scanReceipt = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post<{
      success: boolean
      parsed: {
        merchant: string
        date: string
        items: { name: string; price: number }[]
        total: number
        currency: string
      }
      message: string
      method: string
    }>('/expense/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

// Profile
export const getProfile = () =>
  api.get<ProfileData>('/profile').then((r) => r.data)

// Chat
export const sendChatMessage = (message: string) =>
  api.post<{ response: string; sources: string[] }>('/chat', { message }).then((r) => r.data)

// AI Insights
export interface AiInsight {
  emoji: string
  title: string
  text: string
}

export interface AiInsightsResponse {
  insights: AiInsight[]
  source: string
  feature: string
}

export const getAiInsights = (feature: string) =>
  api.get<AiInsightsResponse>('/ai/insights', { params: { feature } }).then((r) => r.data)

export default api

export function formatCurrency(amount: number, currency = 'EUR'): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    INR: '₹',
    USD: '$',
    GBP: '£',
  }
  const symbol = symbols[currency] || currency
  return `${symbol}${Math.abs(amount).toFixed(2)}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  } else if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function timeUntilReset(): string {
  const now = new Date()
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const msLeft = endOfDay.getTime() - now.getTime()
  const h = Math.floor(msLeft / (1000 * 60 * 60))
  const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))
  return `${h}h ${m}m until reset`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

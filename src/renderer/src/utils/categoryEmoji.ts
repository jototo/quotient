const CATEGORY_EMOJI: Record<string, string> = {
  groceries: '🛒',
  'food & dining': '🍽️',
  dining: '🍽️',
  restaurants: '🍽️',
  coffee: '☕',
  transportation: '🚗',
  gas: '⛽',
  'auto & gas': '⛽',
  housing: '🏠',
  mortgage: '🏠',
  rent: '🏠',
  utilities: '⚡',
  subscriptions: '📱',
  entertainment: '🎬',
  health: '💊',
  fitness: '🏃',
  shopping: '🛍️',
  travel: '✈️',
  income: '💼',
  paycheck: '💼',
  savings: '🏦',
  investment: '📈',
  insurance: '🛡️',
  education: '📚',
  gifts: '🎁',
  pets: '🐾',
  personal: '👤',
  fees: '💳',
}

export function getCategoryEmoji(categoryName?: string | null): string {
  if (!categoryName) return '💳'
  const key = categoryName.toLowerCase()
  return CATEGORY_EMOJI[key] ?? '💳'
}

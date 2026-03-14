import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'checking' | 'savings' | 'credit_card' | 'investment' | 'real_estate' | 'vehicle' | 'loan' | 'other'
  institution: text('institution'),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  color: text('color'),
  isHidden: integer('is_hidden', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  originalDescription: text('original_description'),
  amount: real('amount').notNull(), // negative = debit, positive = credit
  categoryId: text('category_id').references(() => categories.id),
  notes: text('notes'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  isPending: integer('is_pending', { mode: 'boolean' }).default(false),
  importHash: text('import_hash'), // for dedup
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  color: text('color'),
  icon: text('icon'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
})

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  amount: real('amount').notNull(),
  period: text('period').notNull().default('monthly'), // 'monthly' | 'yearly'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const recurringItems = sqliteTable('recurring_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  frequency: text('frequency').notNull(), // 'monthly' | 'weekly' | 'yearly' | 'quarterly'
  nextDueDate: integer('next_due_date', { mode: 'timestamp' }),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  type: text('type').notNull().default('bill'), // 'bill' | 'subscription' | 'income'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  icon: text('icon'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'savings' | 'debt_paydown' | 'purchase'
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  accountId: text('account_id').references(() => accounts.id),
  color: text('color'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const netWorthHistory = sqliteTable('net_worth_history', {
  id: text('id').primaryKey(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  totalAssets: real('total_assets').notNull(),
  totalLiabilities: real('total_liabilities').notNull(),
  netWorth: real('net_worth').notNull(),
})

export const investmentHoldings = sqliteTable('investment_holdings', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  ticker: text('ticker').notNull(),
  name: text('name'),
  shares: real('shares').notNull(),
  costBasis: real('cost_basis'),
  currentPrice: real('current_price'),
  assetType: text('asset_type'), // 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond'
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  pgEnum
} from 'drizzle-orm/pg-core'
import { companies, users } from './core'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'past_due',
  'canceled',
  'expired',
  'lifetime'
])
export const planIntervalEnum = pgEnum('plan_interval', ['trial', 'month', 'year', 'lifetime'])
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded'
])

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  interval: planIntervalEnum('interval').notNull().default('month'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('SAR'),
  features: text('features').array(),
  featuresAr: text('features_ar').array(),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => plans.id),
  status: subscriptionStatusEnum('status').notNull().default('trial'),
  trialStart: timestamp('trial_start', { withTimezone: true }).defaultNow(),
  trialEnd: timestamp('trial_end', { withTimezone: true }).notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  planId: uuid('plan_id').references(() => plans.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('SAR'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethod: text('payment_method'),
  paymentProvider: text('payment_provider'),
  providerPaymentId: text('provider_payment_id'),
  invoiceUrl: text('invoice_url'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

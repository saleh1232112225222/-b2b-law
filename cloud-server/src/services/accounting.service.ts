import type { PoolClient } from 'pg'

export async function applyAccountMovement(
  client: PoolClient,
  companyId: string,
  accountId: string | null | undefined,
  movement: 'receipt' | 'payment',
  amount: number
): Promise<void> {
  if (!accountId) {
    throw Object.assign(new Error('الحساب المالي مطلوب لتسجيل السند'), { status: 400 })
  }
  const accountResult = await client.query(
    'SELECT id, type, balance FROM accounts WHERE id = $1 AND company_id = $2 FOR UPDATE',
    [accountId, companyId]
  )
  if (!accountResult.rows.length) {
    throw Object.assign(new Error('الحساب المالي غير موجود'), { status: 400 })
  }
  const account = accountResult.rows[0]
  const increases = movement === 'receipt'
    ? account.type === 'asset' || account.type === 'revenue'
    : account.type === 'expense' || account.type === 'liability'
  const delta = increases ? amount : -amount
  const newBalance = Math.round((Number(account.balance || 0) + delta) * 100) / 100
  await client.query(
    'UPDATE accounts SET balance = $1 WHERE id = $2 AND company_id = $3',
    [newBalance, accountId, companyId]
  )
}

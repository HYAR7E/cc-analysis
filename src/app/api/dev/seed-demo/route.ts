import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { categorizeAll, loadRules } from '@/lib/categorizer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_MERCHANTS = [
  'UBER EATS',
  'STARBUCKS',
  'WHOLE FOODS MARKET',
  "TRADER JOE'S",
  'SHELL OIL',
  'UBER',
  'LYFT',
  'NETFLIX.COM',
  'SPOTIFY',
  'AMAZON.COM',
  'AMZN MKTP',
  'CHIPOTLE',
  'AIRBNB',
  'DELTA AIR LINES',
  'AWS',
  'VERCEL INC',
  'GITHUB',
  'PG&E',
  'COMCAST',
  'CVS PHARMACY',
  'TARGET',
  'ACE HARDWARE',
  'RANDOM LOCAL DINER',
]

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomDateInLastNMonths(months: number): Date {
  const now = Date.now()
  const span = months * 30 * 24 * 60 * 60 * 1000
  return new Date(now - Math.random() * span)
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Disabled in production' },
      { status: 403 },
    )
  }

  const rules = await loadRules()
  const count = 80

  const raw = Array.from({ length: count }, () => {
    const merchant =
      DEMO_MERCHANTS[Math.floor(Math.random() * DEMO_MERCHANTS.length)]
    return {
      date: randomDateInLastNMonths(6),
      merchant,
      description: null as string | null,
      amount: Number(randomBetween(2, 250).toFixed(2)),
      rawLine: null as string | null,
    }
  })

  const categorized = categorizeAll(raw, rules)
  const fileHash = `demo-${crypto.randomBytes(8).toString('hex')}`

  const statement = await prisma.statement.create({
    data: {
      fileName: `demo-${new Date().toISOString().slice(0, 10)}.pdf`,
      fileHash,
      transactions: {
        create: categorized.map((t) => ({
          date: t.date,
          merchant: t.merchant,
          description: t.description,
          amount: t.amount,
          category: t.category,
          rawLine: t.rawLine,
        })),
      },
    },
    include: { transactions: true },
  })

  return NextResponse.json({
    statementId: statement.id,
    transactionsInserted: statement.transactions.length,
  })
}

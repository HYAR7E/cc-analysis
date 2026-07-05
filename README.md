# PDF CC Tracker

Solo Next.js app that ingests credit card statement PDFs, rule-categorizes the transactions, stores them in Postgres, and shows monthly spending analytics by category.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4**
- **Postgres 16** via Docker Compose
- **Prisma 6** ORM
- **Recharts** for charts, **react-dropzone** for upload
- **Zod** for transaction validation
- **pdf-parse v2** (`PDFParse` class) — extracts text from password-protected PDFs. Wired with a BCP-specific row parser.

All Node, no Python.

## Architecture

```
PDF upload (UI)
   │
   ▼
POST /api/upload
   │
   ▼
extractText() ──► parseStatement() ──► categorize() ──► Prisma
                  (stub for now)        (rules from DB)     │
                                                            ▼
                                                    Postgres (Statement
                                                              + Transaction
                                                              + CategoryRule)
                                                            │
                          /api/analytics + /api/transactions │
                                       │                    │
                                       ▼                    │
                                   Dashboard ◄──────────────┘
                                   (Recharts)
```

Pipeline is pure functions: `pdfBuffer → text → RawTxn[] → categorized → DB`.

## Prerequisites

- **Node 20+** (Tailwind v4 oxide native binding requires it). `.nvmrc` is set to `20`.
- **Docker** (for Postgres via `docker compose`).

```bash
nvm use
```

## Setup

```bash
# 1. install
npm install

# 2. start Postgres
npm run db:up

# 3. migrate + seed default category rules
npm run db:migrate     # first run will apply existing init migration
npm run db:seed

# 4. run dev server
npm run dev
```

Open http://localhost:3000.

`.env` is created with defaults pointing at the local container:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pdf_cc_tracker?schema=public"
```

## Uploading a statement

Real BCP credit card PDF uploads are supported. Drop a PDF in the `/upload` page (or hit the API):

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@samples/bcp-marzo.PDF" \
  -F "password=YOUR_PDF_PASSWORD"
```

PEN/USD are detected per row (PE country code → PEN, otherwise USD). Same file re-upload is deduped via SHA-256.

## Demo data (no PDF needed)

```bash
curl -X POST http://localhost:3000/api/dev/seed-demo
```

Creates one fake `Statement` with ~80 randomized transactions across the last 6 months, run through the real categorizer. Disabled when `NODE_ENV=production`.

## Scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Next dev server                      |
| `npm run build`    | Production build                     |
| `npm run start`    | Run built app                        |
| `npm run lint`     | ESLint                               |
| `npm run db:up`    | Start Postgres container             |
| `npm run db:down`  | Stop + remove container              |
| `npm run db:migrate` | `prisma migrate dev`               |
| `npm run db:seed`  | Seed default category rules          |
| `npm run db:studio` | Open Prisma Studio                  |

## Data model

- **Statement** — one per uploaded PDF. `fileHash` (sha256 of bytes) is unique, so re-uploads dedupe.
- **Transaction** — belongs to a `Statement`. `category` defaults to `"uncategorized"`.
- **CategoryRule** — pattern → category. Seeded with ~60 common merchants. Lower `priority` wins. New rules are also created automatically when you edit a category inline in the table (see API).

## API

| Route                          | Method | Purpose                                         |
| ------------------------------ | ------ | ----------------------------------------------- |
| `/api/upload`                  | POST   | Upload a PDF (`multipart/form-data`, `file`)    |
| `/api/transactions`            | GET    | List transactions (filters: `category`, `from`, `to`, `limit`, `cursor`) |
| `/api/transactions/[id]`       | PATCH  | Update category (`{ category, createRule? }`)   |
| `/api/analytics`               | GET    | Aggregates (`?months=6`)                        |
| `/api/dev/seed-demo`           | POST   | Dev-only: insert ~80 fake transactions          |

## Dashboard

- KPI cards: this month, last month, top category
- Pie: spend per category (current month)
- Stacked bar: monthly spend by category (last 6 months)
- Recent transactions table with inline category edit (auto-creates a `CategoryRule` for the merchant)

## Adding support for another bank

The parser in `src/lib/pdf/parser.ts` is BCP-specific. To add another issuer:

1. Drop a sample PDF in `samples/` (git-ignored).
2. Run `npx tsx scripts/test-parser.mts` against it (or write a new inspect script) to see the extracted text.
3. Add a new row regex and currency/country detection. Keep the output shape (`RawTxn[]`) compatible with `src/lib/pdf/types.ts`.

## Known limitations

- BCP rows without an explicit country code (`PGO CCE LINEA PAGO`, `COM P. CCE LIN CARGO`) default to PEN. When such a row is actually USD (e.g. a USD payment), it gets classified as PEN. Edit the category inline; future improvement could use the table's column geometry to pin currency.
- Year for transaction dates is inferred from the statement period in the header (`DD/MM/YY ... DD/MM/YY`), anchored to the period end year. If a row date falls outside the period (common on Dec/Jan statements), the parser tries ±1 year until the date lands within `periodStart`–`periodEnd`.

## Roadmap (out of scope right now)

- Auth / multi-user
- LLM-based fallback categorization
- Background workers for very large statements
- Cloud deploy config
- Tests

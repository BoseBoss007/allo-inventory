# Allo Inventory — Take-Home Exercise

A **Next.js** inventory reservation platform that solves the checkout race condition: units are held for 10 minutes when a customer proceeds to checkout, then released automatically if payment isn't completed.

**Live demo:** _[Deploy to Vercel to get the URL]_

---

## How to run locally

### 1. Prerequisites

- Node.js ≥ 18
- A [Neon](https://neon.tech) (or Supabase) Postgres instance
- An [Upstash](https://upstash.com) Redis instance

### 2. Clone & install

```bash
git clone <repo-url>
cd allo-inventory
npm install
```

### 3. Environment variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → Connection → Pooled connection string |
| `DIRECT_URL` | Neon → Connection → Direct connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash → Redis → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → Redis → REST Token |
| `CRON_SECRET` | Any random string, e.g. `openssl rand -hex 32` |

### 4. Migrate & seed

```bash
# Apply schema
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed with sample products, warehouses, and inventory
npm run db:seed
```

### 5. Start dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## API Reference

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/products` | List products with available stock per warehouse |
| `GET` | `/api/warehouses` | List all warehouses |
| `POST` | `/api/reservations` | Reserve units. Returns `409` if insufficient stock |
| `GET` | `/api/reservations/:id` | Get a single reservation |
| `POST` | `/api/reservations/:id/confirm` | Confirm purchase. Returns `410` if expired |
| `POST` | `/api/reservations/:id/release` | Release early (cancel / payment failure) |
| `GET` | `/api/cron/expire-reservations` | Batch-release expired reservations (cron only) |

All mutating endpoints support the **`Idempotency-Key`** header (see below).

---

## Concurrency strategy — how race conditions are prevented

The core challenge: if two requests arrive simultaneously for the last unit of a SKU, exactly one must succeed.

**Solution: `SELECT FOR UPDATE` in a Postgres transaction.**

```sql
BEGIN;
  -- 1. Lazy-release any already-expired reservations for this row
  UPDATE reservations SET status='RELEASED' WHERE inventoryId=$1 AND status='PENDING' AND expiresAt < now();

  -- 2. Acquire an exclusive row lock on the inventory record
  SELECT id, "totalUnits" FROM inventories WHERE id = $1 FOR UPDATE;

  -- 3. Count currently-active reservations
  SELECT SUM(quantity) FROM reservations WHERE inventoryId=$1 AND status='PENDING';

  -- 4a. If available >= requested quantity: INSERT reservation
  -- 4b. Otherwise: raise error -> caller returns HTTP 409
COMMIT;
```

`FOR UPDATE` holds an exclusive row lock until the transaction commits. A concurrent transaction trying to lock the same row **blocks** until the first commits. When it unblocks, it sees the freshly-inserted reservation in step 3 and correctly rejects if stock is now depleted.

This is simpler and more correct than Redis-based locking for this use case because:
- The lock scope matches the data scope (one inventory row = one lock).
- There's no possibility of a Redis lock expiring mid-transaction.
- No split-brain between lock store and database.

> **Trade-off:** Under extreme concurrency (thousands of req/s for the same SKU), row-level locking creates queuing. For that scale, a Redis atomic counter (`DECRBY` with a floor check) could be used as a fast pre-check before the DB transaction, turning most losing requests away before they touch Postgres.

---

## Reservation expiry mechanism

Expired reservations are cleaned up via **two complementary strategies**:

### 1. Lazy cleanup on read (always active)

Every call to `GET /api/products` or `POST /api/reservations` first runs:

```sql
UPDATE reservations
SET status='RELEASED', releasedAt=now()
WHERE status='PENDING' AND expiresAt < now();
```

This ensures available stock counts are always accurate at the moment of a read.

### 2. Vercel Cron (production)

`vercel.json` schedules `GET /api/cron/expire-reservations` every **5 minutes**. The endpoint requires a `CRON_SECRET` bearer token.

This matters when traffic is low — lazy cleanup only fires when someone makes a request, so without the cron, a 2am reservation on a quiet store might stay `PENDING` until the next shopper loads the page.

> **Why not a long-running background worker?** Vercel's serverless runtime doesn't support persistent processes. A dedicated worker (e.g., BullMQ on Railway) would be more precise but adds infrastructure complexity. Cron + lazy cleanup covers all correctness requirements for this exercise.

---

## Idempotency (bonus)

All mutating endpoints honour the `Idempotency-Key` request header.

**Implementation:**

1. **First request** with key `K`: execute the action, store `(K, statusCode, responseBody, expiresAt=now+24h)` in the `idempotency_records` Postgres table.
2. **Retry** with the same key `K`: skip the action entirely, return the stored response with header `X-Idempotent-Replay: true`.
3. Records expire after 24 hours (cleaned lazily on read).

The frontend generates a fresh UUID v4 for each new action and reuses it on network-level retries.

> **Alternative:** Redis `SETEX` would be faster and self-cleaning. Postgres was chosen here to keep infrastructure minimal.

---

## Data model

```
Warehouse     1 ──< Inventory >── 1     Product
                         |
                         └──< Reservation
```

- **Inventory** links a product to a warehouse and holds `totalUnits`.
- `availableUnits` is computed at query time: `totalUnits - SUM(quantity WHERE status='PENDING')`.
- `totalUnits` is permanently decremented only on `CONFIRMED`, so expired/cancelled reservations need no stock-counter rollback.

---

## Trade-offs and what I'd do differently

| Area | What I did | With more time |
|---|---|---|
| **Expiry precision** | Cron every 5 min + lazy cleanup | BullMQ delayed job per reservation for exact-to-the-second release |
| **Idempotency store** | Postgres table | Redis SETEX — faster and auto-evicts |
| **Stock counter** | Decrement totalUnits on confirm | Separate confirmedUnits column for easier refund/reversal |
| **Auth** | None | NextAuth.js session tied to reservations |
| **Tests** | Not included | Integration tests for the race-condition path with concurrent requests |
| **Observability** | console.log | Structured logging + Sentry |

---

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Prisma 7** + **Neon** (hosted Postgres)
- **Upstash Redis** (distributed lock support)
- **Zod** — shared request validation
- **shadcn/ui** + **Tailwind CSS v4**
- **Sonner** — toast notifications
- **Vercel** — hosting + cron

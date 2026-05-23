# allo-inventory

Inventory reservation system built for the Allo take-home. Solves the checkout race condition: hold stock for 10 minutes when a user starts checkout, release it automatically if they don't pay.

Live demo: _[add after deploy]_

---

## Running locally

You'll need a Postgres instance (I used Neon free tier) and a Redis instance (Upstash free tier).

```bash
npm install
cp .env.example .env   # fill in the five values
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
npm run dev
```

`.env` variables:

| Key | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → pooled connection string |
| `DIRECT_URL` | Neon → direct connection string (for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash → Redis → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → Redis → REST Token |
| `CRON_SECRET` | any string, e.g. `openssl rand -hex 32` |

---

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/products` | products + live available stock per warehouse |
| GET | `/api/warehouses` | warehouse list |
| POST | `/api/reservations` | create reservation; 409 if stock is gone |
| GET | `/api/reservations/:id` | fetch a reservation |
| POST | `/api/reservations/:id/confirm` | confirm (simulate payment success); 410 if expired |
| POST | `/api/reservations/:id/release` | release early (cancel / payment failure) |
| GET | `/api/cron/expire-reservations` | batch-release expired reservations |

All POST endpoints support `Idempotency-Key` header.

---

## How the race condition is prevented

Two concurrent requests for the last unit of a SKU — one wins, one gets 409. This is done with `SELECT FOR UPDATE` inside a Postgres transaction:

```sql
BEGIN;
  -- release any stale holds first
  UPDATE reservations SET status='RELEASED' WHERE inventoryId=$1 AND status='PENDING' AND expiresAt < now();

  -- exclusive row lock — second request blocks here until we commit
  SELECT id, "totalUnits" FROM inventories WHERE id = $1 FOR UPDATE;

  -- count active holds
  SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE inventoryId=$1 AND status='PENDING';

  -- insert if available >= requested, otherwise throw
COMMIT;
```

The row lock means the second request sees the freshly inserted reservation when it unblocks, so the stock check is always accurate. Redis-based locking would work too but adds a split-brain risk between the lock store and the DB — using the DB itself as the lock is simpler and harder to mess up.

---

## Expiry

Two layers:

1. **Lazy** — every `GET /api/products` and `POST /api/reservations` sweeps `WHERE status='PENDING' AND expiresAt < now()` and flips them to RELEASED. Stock counts are always fresh at query time.

2. **Cron** — `vercel.json` runs `/api/cron/expire-reservations` every 5 minutes. This matters at night when there's no traffic and lazy cleanup wouldn't fire.

---

## Idempotency

Pass an `Idempotency-Key: <uuid>` header on any POST. First call executes and stores `(key, status, body)` in the `idempotency_records` table with a 24h TTL. Retries get the stored response back with `X-Idempotent-Replay: true`.

I used Postgres for this rather than Redis to avoid adding another moving part. Redis `SETEX` would be a cleaner choice in production.

---

## Trade-offs / things I'd do differently

- **Expiry precision** — the cron fires every 5 min so a reservation that expires at 2:01 might not be visibly released until 2:05. A BullMQ delayed job per reservation would be exact. Not worth the infra complexity here.
- **Stock counter** — I decrement `totalUnits` on confirm. A separate `confirmedUnits` column would make refunds/reversals easier without having to recalculate from reservation history.
- **Auth** — there's none. In a real system you'd tie reservations to user sessions so you can't reserve on someone else's behalf.
- **Tests** — I didn't write any. The race condition logic is the thing that most needs a test: spin up two concurrent requests for the same last unit and assert exactly one 201 + one 409. Would add that next.
- **Error granularity** — right now a 500 is just a 500. Structured error codes + Sentry would help in production.

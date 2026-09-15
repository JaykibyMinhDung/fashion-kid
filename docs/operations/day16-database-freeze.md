# Day 16 — Database Model, Integrity and Migration Freeze

## Frozen database contract

- PostgreSQL is the source of truth for persisted state.
- Prisma schema and committed migrations must remain aligned.
- Monetary fields use `BigInt`; timestamps use timezone-aware PostgreSQL timestamps.
- Historical order and order-item snapshots are immutable audit data; product changes must not rewrite completed order history.
- Foreign keys use restrictive deletion where business history must survive and cascade only for owned dependent records.
- Business uniqueness and idempotency are enforced by database indexes/constraints, not only application checks.

## Required integrity checks

- Exactly 26 frozen business tables plus `_prisma_migrations`.
- Canonical address/order shipping codes are non-null.
- `OrderItem.variant_id` is required for product identity and inventory traceability.
- Shipping tracking/provider payment and payment-attempt identifiers have unique indexes.
- Daily order counter allocates monotonic values under concurrent upsert.
- Duplicate provider/payment attempts are rejected by database constraints.
- Inventory concurrency preserves stock and ledger invariants.
- Auth/session concurrency preserves refresh-token family invalidation.

## Migration policy

1. Review schema and migration SQL together.
2. Never edit an applied migration.
3. Add a forward migration for changes.
4. Run `prisma validate`, `prisma generate`, `prisma migrate deploy` on an empty database, then seed.
5. Run database integrity and concurrency suites against an isolated database.
6. Record migration name and verification result in the release evidence.
7. Do not use `prisma migrate reset` outside disposable local/test databases.

## Verification evidence

The Day 16 database alignment suite covers table freeze, required columns, idempotency indexes, order-counter concurrency and provider uniqueness. The full database suite additionally covers auth, checkout, inventory, order lifecycle and session concurrency.

A push-ready branch must have a clean working tree after all checks, no generated Prisma output tracked, and no environment secrets committed.

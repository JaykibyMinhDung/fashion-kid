# Day 17 — NestJS Backend Boundaries and API Contract Freeze

## Module boundaries

- Controllers own transport concerns: route, DTO binding, authentication metadata and response shape.
- Services own business rules, state transitions and transaction orchestration.
- Repositories own Prisma persistence access and transaction-compatible queries.
- DTOs are the input/output contract; clients cannot provide authoritative totals, status transitions or audit fields.
- Common auth, errors, serialization and configuration are shared infrastructure, not feature-module business logic.

## Cross-cutting rules

- Global `ValidationPipe` uses whitelist/transform and rejects unknown input fields.
- Global exception filtering maps `ApiException`, Nest HTTP exceptions and unknown errors to the stable API envelope.
- Request IDs are attached to requests and error responses.
- BigInt serialization is handled centrally; feature controllers must not stringify money inconsistently.
- Permission guards are explicit at controller boundaries. Public endpoints are explicitly marked.
- Database writes that update multiple aggregates use Prisma transactions and preserve idempotency constraints.

## Frozen endpoint responsibilities

- Auth: identity, credentials, access/refresh session lifecycle.
- Catalog: public reads and admin product/master-data mutations.
- Cart/Checkout: server-side pricing, stock reservation and order creation.
- Orders: customer query plus operational transition commands; no generic status update.
- Inventory: stock queries and named adjustment/receive operations; ledger required.
- Promotions: customer coupon validation and admin coupon lifecycle.
- Reviews: verified purchase submission and admin moderation.
- Audit: read-only admin log query.
- Reporting: read-only KPI/report queries with `REPORT_READ`.
- Health: public liveness/readiness only.

## Acceptance gates

- DTO validation rejects unknown or malformed fields.
- Authentication and permission denial are covered by tests.
- Error responses preserve status, code and request ID.
- Money responses survive BigInt serialization.
- Transaction and concurrency suites pass against an isolated PostgreSQL database.
- API build/lint/unit/E2E/database checks pass before merge.

## Push handoff

A branch is push-ready only after the complete verification command set passes and `git status --short` is empty. Push must be explicit, non-forced, and followed by remote SHA verification. A clean local branch cannot grant GitHub write permission; a remote `403` is an external credential/authorization blocker.

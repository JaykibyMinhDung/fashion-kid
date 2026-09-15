# Day 15 — Final Consistency Audit

## Source of truth

Implementation authority, in descending order:

1. Prisma schema/migrations and executable application code.
2. API DTOs/controllers/services and authorization guards.
3. Automated unit, E2E and database tests.
4. CI workflows and deployment runbook.
5. Historical planning/reference notes.

When an old document conflicts with the running schema or code, the code contract wins until an explicit migration/spec change is approved.

## Audited contracts

| Area | Final contract | Evidence |
|---|---|---|
| Money | BigInt in persistence and reporting; no client-authoritative totals | Prisma schema, checkout, reporting, BigInt serializer tests |
| Orders | Explicit transition service; invalid transitions return `ApiException` with HTTP 409 | Order transition service/specs, concurrency suite |
| Inventory | Reserve/release/sale are ledger-backed; no generic stock patch | Inventory service/specs, inventory concurrency suite |
| Coupons | Server-side calculation; max one coupon/order; preview does not consume usage; checkout revalidates under row lock | Promotions and checkout services |
| Reviews | Completed verified purchase; public visibility is `PUBLISHED`; moderation is audited | Review service/module |
| Audit | Read-only admin API with `AUDIT_READ`; sensitive old/new values are not exposed | Audit controller/service/DTO |
| Reporting | Read-only; `REPORT_READ`; completed-order realized revenue; `[from,to)`; UTC+7 business timezone | Reporting controller/service/range tests |
| Auth | Role/permission guards; refresh/session invalidation; no public admin mutation | Auth, authorization and session tests |
| Health | Public liveness and database readiness probes | Health controller/service tests |

## Final verification gates

A branch is push-ready only when all are true:

- `git status --short` is empty.
- `git diff --check` passes.
- Prisma validation and client generation pass.
- API lint, unit tests and build pass.
- API database suite runs in an isolated database with all suites passing.
- Web lint, typecheck, tests and production build pass.
- Docker Compose configuration validates.
- API Docker image builds from the locked dependency graph.
- No secrets, `.env` files, generated clients or build output are tracked.

## Known non-blocking warnings

- `pg` may emit a deprecation warning when a query is started while another query is executing; the database suite still completes successfully. This should be cleaned up in a future driver/concurrency maintenance pass.
- Docker build uses a non-connectivity placeholder `DATABASE_URL` only for Prisma client generation. Runtime deployment must supply the real secret through the platform environment.
- Remote push authorization is external to the repository. A clean local branch proves readiness, not GitHub write permission.

## Push handoff

Current branch: `day11-20`.

Before pushing, inspect the remote and confirm the authenticated GitHub identity has write permission. Do not rewrite history or force-push. Push the branch explicitly and verify the remote branch SHA afterward.

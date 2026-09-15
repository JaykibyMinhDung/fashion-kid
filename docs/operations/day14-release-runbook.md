# Day 14 — Deployment, CI/CD and Production Readiness

## Runtime topology

- Web and API are separate deployable services.
- PostgreSQL is stateful and must use a managed/replicated volume in production.
- API exposes `/api/v1/health/live` for liveness and `/api/v1/health/ready` for readiness.
- Only the API process serves application traffic; migrations run as a separate release step.
- Business timezone: `Asia/Ho_Chi_Minh`.

## Required production configuration

Never use `.env.example` values in production. Provide secrets through the platform secret store:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET` (at least 32 random bytes)
- `DEMO_PASSWORD` is not required for production and demo seeding must be disabled.
- `WEB_ORIGIN`
- `COOKIE_SECURE=true`
- `NODE_ENV=production`

Validate configuration before starting the API. Fail closed on missing secrets.

## Release flow

1. CI installs with `pnpm install --frozen-lockfile`.
2. Run Prisma validation and generate the client.
3. Run lint, unit tests, E2E tests, database tests, and build.
4. Build an immutable API image from `apps/api/Dockerfile`.
5. Back up PostgreSQL and verify the backup can be listed/restored in a staging database.
6. Deploy the image and run `prisma migrate deploy` as a one-shot migration job.
7. Start/roll the API only after migration succeeds.
8. Wait for `/health/ready`; then run smoke checks for auth, catalog, cart and checkout preview.
9. Monitor error rate, latency, database connections and payment/inventory failures.

## Rollback

- Application rollback: redeploy the previous immutable image.
- Database rollback: do not delete or rewrite applied migrations. Use a forward corrective migration, or restore a verified backup during an approved incident procedure.
- If migration fails, stop rollout and keep the previous application version running when schema compatibility allows.
- Never run `prisma migrate reset` in production.

## Backup and recovery minimum

- Automated PostgreSQL backups with retention defined by the hosting platform.
- Periodic restore rehearsal in an isolated database.
- Record backup timestamp, schema migration, checksum and restore result.
- Recovery objective must be agreed before production launch; this capstone does not claim a production RPO/RTO.

## Security and observability checklist

- TLS terminates at the edge; API is not exposed directly without network controls.
- CORS is restricted to `WEB_ORIGIN`.
- Cookies use `HttpOnly`, `SameSite` and `Secure` in production.
- Request IDs are present in logs and error responses.
- Do not log tokens, passwords, payment secrets or full personal addresses.
- Health endpoints are public but reveal only service/database status.
- Alerts cover readiness failures, 5xx rate, migration failure, database saturation and disk usage.

## Promotion gate

A release is promotable only when all CI jobs pass, the migration job succeeds, readiness is healthy, and smoke tests pass. A green build alone is not proof of backup recoverability or payment-provider readiness.

# Day 20 — Implementation Order, Acceptance Gates and Demo Readiness Freeze

## Objective

Day 20 converts the frozen database, backend, frontend and cross-layer contracts from Days 16–19 into an executable delivery sequence. It does not introduce new business scope; it defines the order in which the existing system is implemented, tested and demonstrated.

## Implementation order and dependency gates

1. **Foundation gate** — environment validation, Prisma generation, migration deployment and seed complete before application checks.
2. **Backend gate** — API lint, unit tests and build pass before frontend integration is considered valid.
3. **Frontend gate** — web lint, tests, typecheck and production build pass against the frozen API contracts.
4. **Integration gate** — authenticated flows, authoritative pricing, order transitions, inventory effects, idempotency and error envelopes are verified end to end.
5. **Release gate** — database suites, regression suites, whitespace checks and repository hygiene pass; only then is the named branch eligible for push.

A failed prerequisite stops downstream promotion. No scope expansion or contract change is smuggled into a gate fix.

## Acceptance checklist

- [ ] Prisma schema validates and migrations apply to an empty PostgreSQL database.
- [ ] Seed is deterministic and does not create duplicate demo identities.
- [ ] API lint, unit tests, e2e tests and build pass.
- [ ] Web lint, tests, typecheck and production build pass.
- [ ] Money, order status, inventory, coupon and audit state remain server-authoritative.
- [ ] Duplicate checkout/provider requests are safe under the documented idempotency keys.
- [ ] Failed transactions leave no partial business state.
- [ ] Unauthorized and invalid requests return the stable error envelope and request ID.
- [ ] The release verification command is reproducible from a clean checkout.

## Demo readiness and scope cut

The demo-critical path is catalog → cart → checkout → order history, plus the admin order/inventory view. Reporting, promotion management, review moderation and provider adapters remain demonstrable only when their existing acceptance gates are green; they must not block a focused core-flow demo when explicitly cut from scope. A scope cut must be recorded, visible in the checklist and must not weaken authorization, transaction integrity, pricing correctness or auditability.

## Push-readiness protocol

Before reporting `PUSH-READY`, verify all of the following from the repository itself:

```text
git branch --show-current
git status --short
git diff --check
git log -1 --oneline
git remote -v
```

The working tree must be clean after the Day 20 commit, `git diff --check` must have no output, and the branch must be the intended non-default working branch. Confirm whether the remote contains the commit with `git ls-remote origin refs/heads/<branch>`; if no push is requested, do not perform one. A remote 403 is an authorization failure and must not be represented as a code or quality failure.

## Implementation freeze

Day 20 is complete when this document is committed together with passing quality evidence. Subsequent work must use a new day/commit and must not silently alter the frozen contracts.

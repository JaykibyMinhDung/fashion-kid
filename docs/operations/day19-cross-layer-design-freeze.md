# Day 19 — Cross-Layer Contracts, Recovery and Traceability Freeze

## Request/response flow

1. Next.js screen or client submits a typed request.
2. API client preserves credentials, request ID and backend error envelope.
3. NestJS controller authenticates, validates DTO and delegates to the feature service.
4. Service applies business rules and opens the required Prisma transaction.
5. Repository reads/writes through the transaction client and database constraints.
6. Response is serialized centrally, including `BigInt` monetary values.
7. UI updates only from the authoritative response or a deliberate refetch.

No layer bypasses the layer below it to mutate business state. Reporting and audit remain read-only projections.

## Failure recovery and idempotency

- Checkout and payment/provider callbacks use stable idempotency/provider references.
- Database unique constraints are the final duplicate-write barrier.
- Safe reads may retry with bounded backoff; non-idempotent mutations must not be blindly retried.
- A failed transaction rolls back all owned writes; callers receive a stable error code and request ID.
- Inventory, order, payment and coupon usage changes commit atomically where they represent one business operation.
- Coupon preview never consumes usage; checkout revalidates under the coupon row lock.
- Cache invalidation, when introduced, happens after a successful commit and never becomes the source of truth.

## Cross-layer traceability

| Use case | Frontend | API boundary | Transaction/state owner |
|---|---|---|---|
| Login/session | Auth forms/provider | Auth controller | Auth service/session repository |
| Cart/checkout | Cart and checkout features | Cart/checkout controllers | Checkout transaction |
| Order lifecycle | Customer/admin order screens | Explicit transition commands | Order transition service |
| Inventory adjustment | Admin/warehouse screens | Named inventory commands | Inventory ledger transaction |
| Coupon | Checkout/admin promotion UI | Promotion endpoints | Coupon lock and usage transaction |
| Review/moderation | Review/admin UI | Review endpoints | Review + moderation audit transaction |
| Reporting | Dashboard screens | Read-only reporting endpoints | Reporting query service |

## Integration acceptance matrix

- DTO validation, authentication and permission denial remain consistent across callers.
- Error status/code/request ID survive API client mapping and UI rendering.
- Server-calculated money remains precise through database, JSON serialization and UI formatting.
- A successful order transition is reflected in order history, inventory/payment effects and subsequent reads.
- Duplicate checkout/provider requests do not create duplicate business records.
- Failed mutations leave no partial order, stock, coupon usage or audit state.
- Frontend refetches authoritative state after successful mutation instead of maintaining divergent local truth.

## Release gate

Run API lint, unit/build checks, frontend test/lint/typecheck/build, and isolated PostgreSQL database suites. Then run `git diff --check` and require an empty `git status --short`. Push only the named branch without force; verify the remote branch SHA after a successful push. A prior GitHub HTTP 403 remains an authorization issue, not evidence of a code failure.

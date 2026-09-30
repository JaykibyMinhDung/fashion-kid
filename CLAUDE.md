# CLAUDE.md

> Project rules, architecture constraints, coding conventions, and implementation guardrails for the Kids Fashion E-commerce graduation project.

## 1. Project Scope

This project is a children’s clothing e-commerce and sales-management system.

Core scope:
- Public catalog with product variants (SKU/size/color).
- Persistent authenticated customer cart.
- Concurrency-safe checkout and inventory reservation.
- Order lifecycle/state machine.
- Sales and warehouse operational workflows.
- COD baseline payment; VNPay optional.
- Shipping abstraction with GHN/fallback.
- Reporting/dashboard.
- Security, observability, testing, and deployability.

Engineering priority:

```text
Correctness
→ Security
→ Data integrity
→ Stable performance
→ Scalability / polish
```

Never trade correctness or data integrity for convenience or speed.

---

## 2. Canonical Tech Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Zustand for shared mutable client UI state

### Backend
- NestJS
- TypeScript
- REST API
- Swagger / OpenAPI
- class-validator / DTO validation

### Database
- PostgreSQL
- Prisma ORM

### Auth
- JWT access token
- Refresh token with server-side revocation/rotation policy
- Centralized RBAC
- Ownership policies for user-owned resources

### Deployment baseline
- Frontend: Vercel
- Backend: Railway / Render
- Database: managed PostgreSQL

Optional infrastructure such as Redis/BullMQ/Socket.IO/MinIO must not be added without a real requirement.

---

## 3. Source-of-Truth Priority

When specifications conflict, use this order:

1. `CLAUDE.md` for current coding conventions and explicit corrections.
2. Day 25+ final contract/correction decisions.
3. Day 15 Final System Specification.
4. Day 16 Database / Prisma Specification.
5. Day 17 Backend Specification.
6. Day 18 Frontend Specification.
7. Day 19 Cross-layer Integration Specification.
8. Day 20+ specialized execution/security/performance/operations docs.
9. Older domain documents.

If a conflict is discovered:
- do not silently invent behavior;
- prefer the newest explicit frozen decision;
- record a correction if implementation is affected.

---

## 4. Architecture

### Backend style

Use **Modular Monolith + Feature-first + Layered/Clean-lite**.

Canonical request flow:

```text
Request
→ Authentication Guard
→ Permission Guard
→ Ownership Policy if required
→ Controller
→ Application Service
→ Domain Rule / State Machine
→ Repository
→ Prisma
→ PostgreSQL
```

Rules:
- Controllers are thin.
- Business rules live in services/domain logic.
- Decorators only attach metadata; no DB/business logic inside decorators.
- Guards enforce authentication/permission.
- Ownership is checked separately from RBAC.
- Do not duplicate the same domain into `admin-orders`, `sales-orders`, `warehouse-orders` modules.
- One domain may expose audience-specific controllers.

Expected backend modules:

```text
apps/api/src/
├ common/
├ config/
├ database/prisma/
├ authorization/
└ modules/
  ├ auth/
  ├ users/
  ├ catalog/
  ├ inventory/
  ├ cart/
  ├ orders/
  ├ shipping/
  ├ payment/
  ├ promotions/
  ├ reviews/
  ├ reporting/
  └ audit/
```

### Frontend style

Use **Feature-based Architecture + Route-based Composition**.

```text
apps/web/src/
├ app/
├ features/
├ components/
│  ├ ui/
│  └ shared/
├ lib/
│  ├ api/
│  ├ auth/
│  ├ format/
│  └ utils/
├ hooks/
├ types/
└ config/
```

Rules:
- `app/` owns routing/layout/loading/error composition.
- `features/` owns use-case logic.
- `components/ui` contains generic UI primitives only.
- Pages must be thin.
- Do not duplicate order logic across customer/sales/warehouse/admin screens.

---

## 5. Frontend State Ownership

Do not use one state tool for everything.

```text
Server state            → TanStack Query / Server fetch
URL-shareable state     → URLSearchParams / route params
Form state              → React Hook Form + Zod
Local UI state          → useState
Shared mutable UI state → Zustand
```

Zustand is appropriate for:
- sidebar/drawer state;
- modal orchestration;
- checkout wizard step;
- temporary cross-component selections.

Zustand must **not** become the source of truth for:
- cart items;
- inventory;
- order status;
- payment status;
- coupon usage;
- permissions;
- `allowedActions`;
- backend pricing.

Avoid duplicate authority like:

```text
PostgreSQL ↔ TanStack Query ↔ Zustand ↔ UI
```

for the same business data.

---

## 6. Naming Conventions

### TypeScript
- Classes: `PascalCase`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Files
Use `kebab-case`.

Examples:

```text
order-transition.service.ts
operational-orders.controller.ts
create-order.dto.ts
product-card.tsx
use-order-query.ts
checkout-store.ts
```

### Database
- Prisma models: `PascalCase`
- PostgreSQL tables/columns: `snake_case`

Example:

```prisma
model ProductVariant {
  productId String @map("product_id")
  @@map("product_variants")
}
```

---

## 7. Canonical API Rules

Base path:

```text
/api/v1
```

Canonical operational order namespace:

```text
/api/v1/operational/orders
```

Never use the obsolete path:

```text
/api/v1/operations/orders
```

Operational endpoints:

```text
GET  /api/v1/operational/orders
GET  /api/v1/operational/orders/:id
POST /api/v1/operational/orders/:id/confirm
POST /api/v1/operational/orders/:id/cancel
POST /api/v1/operational/orders/:id/start-packing
POST /api/v1/operational/orders/:id/ship
POST /api/v1/operational/orders/:id/deliver
POST /api/v1/operational/orders/:id/complete
```

Never implement:

```text
PATCH /orders/:id/status
```

Each transition must be an explicit command because permission, precondition, and side effects differ.

---

## 8. Product / Variant Rules

A Product is not the sellable stock unit.

```text
Product
→ ProductVariant
  → SKU
  → Size
  → Color
  → Price
  → Inventory
```

Never store `size`, `color`, or stock quantity directly on Product.

SKU rules:
- globally unique;
- normalized uppercase;
- immutable after creation unless explicitly migrated.

Public product availability is derived from active variants; public APIs do not expose exact internal stock quantity by default.

---

## 9. Inventory Rules

Inventory identity:

```text
Warehouse + ProductVariant
```

Core fields:

```text
onHand
reserved
available = onHand - reserved
```

Invariant:

```text
onHand >= reserved >= 0
```

`available` is derived.

Lifecycle:

```text
Cart                 → no reservation
Checkout success     → reserved += qty
Cancel before ship   → reserved -= qty
Ship                 → onHand -= qty; reserved -= qty
```

Every mutation must append an `InventoryTransaction`.

Transaction types:

```text
IMPORT
ADJUSTMENT
RESERVE
RELEASE
SALE
```

Inventory adjustment API accepts:

```text
targetOnHand + reason
```

Never expose a generic PATCH for `reserved`, `available`, or raw inventory state.

---

## 10. Checkout Transaction

Checkout is a critical atomic transaction.

Resolve/validate external shipping quote **before** holding critical stock locks where possible.

Canonical flow:

```text
Validate auth/customer/cart/address/payment
→ resolve shipping quote
→ BEGIN
→ lock Cart
→ lock Inventory rows in deterministic order
→ revalidate ProductVariant ACTIVE
→ validate available stock
→ recalculate prices on server
→ lock/revalidate Coupon if present
→ generate concurrency-safe orderNumber
→ create Order
→ create OrderItem snapshots
→ reserve Inventory
→ append InventoryTransaction RESERVE
→ create Payment PENDING
→ append PAYMENT_CREATED
→ append OrderStatusHistory NULL → PENDING
→ create CouponUsage if applicable
→ clear Cart
→ COMMIT
```

If anything fails before commit:

```text
0 orphan Order
0 orphan reservation
0 orphan Payment
0 orphan history
0 orphan CouponUsage
Cart remains
```

Never trust client totals, price, discount, shipping authority, stock, or order status.

---

## 11. Order Number

Internal ID: UUID.

Human-readable order number:

```text
ORD-YYYYMMDD-######
```

Example:

```text
ORD-20260909-000123
```

Use a concurrency-safe counter table. Never use `count(orders) + 1`.

---

## 12. Order State Machine

Canonical lifecycle:

```text
PENDING
→ CONFIRMED
→ PACKING
→ SHIPPING
→ DELIVERED
→ COMPLETED
```

Cancel transitions:

```text
PENDING   → CANCELLED
CONFIRMED → CANCELLED
```

Terminal states:

```text
COMPLETED
CANCELLED
```

No cancel after `PACKING` in P0.

Admin never bypasses the state machine.

---

## 13. Order Permissions

### Customer
Own order only:

```text
PENDING   → CANCELLED
CONFIRMED → CANCELLED
```

Paid online order cannot be cancelled in baseline because refund is not implemented.

### Sales
Allowed:
- confirm;
- operational cancel.

Not allowed:
- pack;
- ship;
- deliver.

### Warehouse
Allowed:
- start packing;
- ship;
- inventory operational actions.

Not allowed:
- confirm;
- deliver.

### Admin
Broad permissions are allowed, but Admin still obeys state/integrity rules.

### SYSTEM
Internal actor for trusted provider/system transitions.

Example:

```text
verified GHN delivery event
→ SYSTEM requests SHIPPING → DELIVERED
```

---

## 14. DELIVER Rule

Canonical endpoint:

```text
POST /api/v1/operational/orders/:id/deliver
```

Permission:

```text
ORDER_DELIVER
```

Allowed:

```text
ADMIN  ✅
SYSTEM ✅
```

Not allowed:

```text
WAREHOUSE_STAFF ❌
SALES_STAFF     ❌
CUSTOMER        ❌
```

Do not create a duplicate role-specific `/admin/orders/:id/deliver` endpoint unless a later explicit contract supersedes this rule.

---

## 15. Cancel Reason

Customer cancel:

```text
reason: optional
plain text
trim
max 500 chars
```

Operational cancel by Sales/Admin:

```text
reason: required
plain text
trim
1..500 chars
```

No HTML/rich text.

---

## 16. Order Notes

`customerNote`:

```text
nullable
plain text
trim
max 500 chars
```

Recommended DB type:

```text
VARCHAR(500)
```

It is a checkout snapshot and immutable after order creation in P0.

Do not reuse `customerNote` for staff/internal notes.

---

## 17. Order List Pagination

Global offset pagination baseline:

```text
page default = 1
limit default = 20
max limit = 100
```

Customer orders:

```text
GET /api/v1/orders
sort = createdAt DESC
filter = status
```

Operational orders:

```text
GET /api/v1/operational/orders
sort = createdAt DESC
filter = status
search = orderNumber
```

Do not add arbitrary PII search across phone/address/email in P0 without an explicit requirement.

---

## 18. Cart Rules

One persistent active cart per authenticated customer.

Cart item identity:

```text
Cart + ProductVariant
```

Re-adding the same variant increases quantity.

Cart does not reserve stock.

After checkout success:

```text
invalidate ['cart']
invalidate ['orders']
```

After checkout failure:

```text
DO NOT clear cart
```

TanStack Query remains the server-state cache; Zustand must not mirror cart authority.

---

## 19. Payment Rules

### COD
Baseline method.

Checkout:

```text
Payment = PENDING
```

On Order `COMPLETED`:

```text
Payment PENDING → PAID
append COD_COLLECTED
```

### VNPay (optional/P1)
- Return URL is UX-only.
- IPN is authoritative.
- Verify signature/checksum.
- Verify amount and reference.
- Lock payment before mutation.
- Process idempotently.
- `PAID` is monotonic.
- Duplicate valid IPN must not duplicate economic effect.
- URL generation failure must not delete a committed Order.

---

## 20. Shipping Rules

Use an adapter boundary:

```text
ShippingService
→ ShippingProvider
→ GhnShippingAdapter
```

Provider shipping status is not `OrderStatus`.

Do not perform provider network calls while holding long inventory/order locks.

Stable GHN client order code:

```text
clientOrderCode = orderNumber
```

For ambiguous create timeout:

```text
reconcile by clientOrderCode
→ retry create only if shipment does not exist
```

Fallback shipping fee:

```text
SHIPPING_FALLBACK_FEE_VND=30000
```

Fallback must return/record:

```text
quoteSource = FALLBACK
```

Never present fallback as a live GHN quote.

---

## 21. Image / Object Storage

Do not store image binaries in PostgreSQL.

Do not persist product images on ephemeral backend local disk.

Use an object-storage abstraction:

```text
ObjectStoragePort
→ CloudinaryAdapter
→ optional MinioStorageAdapter / S3-compatible adapter
```

Current recommended strategy:

```text
STAGING / DEMO → Cloudinary
LOCAL          → Cloudinary dev, mock storage, or optional MinIO
```

MinIO is optional local infrastructure, not a required production dependency.

`ProductImage` should keep metadata such as:

```text
id
productId
url
storageKey/publicId
altText?
isPrimary
sortOrder
createdAt
```

At most one primary image per Product.

Frontend must never receive storage-provider secrets.

Frontend image rendering:
- use `next/image` for local/static images and configured first-party image hosts;
- API-provided external image URLs must render through the shared safe-image boundary (including cart/checkout thumbnails);
- external images use `unoptimized` unless their host is explicitly configured in `next.config.ts`;
- failed external images fall back to the local catalog placeholder;
- do not add a wildcard remote host to `next.config.ts` merely to silence a runtime error.

---

## 22. Address Rules

Canonical address fields:

```text
receiverName
phone
addressLine
wardCode
wardName
provinceCode
provinceName
note?
isDefault
```

No canonical `district` field.

Orders store shipping-address snapshots. Editing an Address must not mutate historical Orders.

---

## 23. DTO / Mass-Assignment Rules

Request DTOs contain only client-authoritative input.

Never pass an arbitrary request object directly to Prisma.

Forbidden client-owned fields include:

```text
role
userStatus
actorUserId
orderStatus
paymentStatus
unitPrice
discountTotal
shippingFee authority
orderTotal
reserved
inventory state
coupon usage counters
```

NestJS validation baseline:

```text
whitelist = true
forbidNonWhitelisted = true recommended
transform = controlled
```

Validate UUID/path/query values explicitly.

---

## 24. API Response / Error Convention

Do not return Prisma models directly.

Use explicit response DTOs/projections.

Error envelope:

```json
{
  "statusCode": 409,
  "code": "INVALID_ORDER_TRANSITION",
  "message": "...",
  "details": {},
  "requestId": "..."
}
```

Frontend branches on `error.code`, not message text.

Stable error examples:

```text
INVALID_CREDENTIALS
USER_DISABLED
RESOURCE_NOT_FOUND
FORBIDDEN
VALIDATION_ERROR
CART_EMPTY
VARIANT_NOT_AVAILABLE
INSUFFICIENT_AVAILABLE_STOCK
COUPON_INVALID
COUPON_USAGE_LIMIT_REACHED
SHIPPING_QUOTE_UNAVAILABLE
SHIPPING_QUOTE_INVALID
SHIPMENT_NOT_READY
INVALID_ORDER_TRANSITION
ORDER_TRANSITION_CONFLICT
PAID_ORDER_CANNOT_CANCEL
STOCK_RESERVATION_INCONSISTENT
PAYMENT_SIGNATURE_INVALID
PAYMENT_AMOUNT_MISMATCH
REVIEW_NOT_ELIGIBLE
RATE_LIMITED
PROVIDER_UNAVAILABLE
INTERNAL_ERROR
```

Do not return `200 { success: false }` for normal business errors.

### Frontend API client and error UX

Frontend API transport is centralized under:

```text
apps/web/src/lib/api/
```

Rules:
- use `lib/api/api-client.ts` as the single HTTP request entry point;
- keep shared response/error contracts in `lib/api/contracts.ts`;
- do not create feature-local API clients or duplicate fetch wrappers;
- branch mutation behavior on stable `error.code`, never on backend message text;
- keep the error-code-to-UX mapping centralized in `lib/api/error-ux.ts`;
- every new stable backend error code must define its expected UX action/message and have a focused test;
- order mutations must explicitly handle at least `INVALID_ORDER_TRANSITION` and `PAID_ORDER_CANNOT_CANCEL`;
- a `409` conflict must normally trigger server-state refetch/invalidation; do not force a local business-state transition.

---

## 25. Money / Time Conventions

Money:

```text
PostgreSQL = BIGINT
API        = decimal string preferred
currency   = integer VND
```

Example:

```json
{
  "totalAmount": "350000",
  "shippingFee": "30000"
}
```

Do not use floating-point currency calculations.

Time:

```text
DB timestamps  = TIMESTAMPTZ
API timestamps = ISO 8601 UTC
Business TZ    = Asia/Ho_Chi_Minh (UTC+7)
Report ranges  = [from, to)
```

Never depend on host-machine timezone.

---

## 26. Reporting Rules

Reporting is read-only.

Revenue definition:

```text
SUM(Order.totalAmount)
for COMPLETED orders
using completion timestamp
```

Do not use `createdAt` as revenue recognition time.

AOV:

```text
grossRevenue / completedOrders
```

Aggregate in PostgreSQL with `SUM`, `COUNT`, `GROUP BY`; do not load large raw sets and reduce them in Node.js.

---

## 27. Security Rules

Backend owns:
- authentication;
- permission;
- ownership;
- price;
- stock;
- coupon validity;
- shipping authority;
- payment state;
- order state;
- `allowedActions`.

Authorization layers:

```text
Authentication
→ Permission
→ Ownership
→ State / Business Preconditions
```

Use safe 404 behavior for protected cross-user resources where anti-IDOR policy applies.

Never log:

```text
password
Authorization header
access token
refresh token
cookies
GHN token
VNPay secret
HMAC secret
```

Use exact CORS allow-list and security headers. Frontend route guards are UX only; backend remains authority.

---

## 28. Session Rules

Passwords must use adaptive hashing.

Refresh tokens stored server-side must be hashed.

Revoke relevant refresh sessions on:

```text
logout
password change
user disable
```

Do not treat frontend role/Zustand state as authorization authority.

---

## 29. Concurrency / Prisma Rules

Critical operations must use PostgreSQL transaction semantics.

Lock/recheck where required:
- Cart during checkout;
- Inventory during reserve/release/sale;
- Order during transitions;
- Coupon during consumption;
- Payment during IPN processing.

Lock inventory rows in deterministic order.

Use one `PrismaClient` per app process. Never instantiate per request.

Raw SQL is allowed only when justified, e.g.:
- `SELECT ... FOR UPDATE`;
- concurrency-safe order counter;
- advanced reporting.

All raw SQL must be parameterized. Never interpolate user-provided sort/filter strings into SQL.

---

## 30. Database Constraints / History

Prefer DB constraints for invariants that must never break.

Examples:
- unique SKU;
- unique warehouse + variant inventory;
- unique user + orderItem review;
- one payment per order;
- partial unique default address;
- partial unique primary image;
- non-negative inventory checks.

Do not hard-delete important historical records referenced by:
- Orders;
- InventoryTransaction;
- PaymentTransaction;
- OrderStatusHistory;
- AuditLog.

Historical snapshots must remain readable after catalog/address changes.

---

## 31. Swagger Rules

Swagger/OpenAPI is part of the runtime contract.

Each critical endpoint documents:
- tag;
- audience;
- authentication;
- permission;
- ownership;
- path/query/body DTO;
- response DTO;
- state preconditions;
- transaction side effects;
- relevant error codes;
- examples.

Never put provider secrets in Swagger examples.

Breaking API changes must update in one change-set:

```text
DTO
Controller
Swagger
Frontend API types
Tests
Docs
```

---

## 32. Performance Rules

Every P0 list endpoint is bounded.

```text
page = 1
limit = 20
max = 100
```

Avoid:

```text
findMany() without limit
include all relations
query inside loop
N+1 per table row
```

Separate list and detail projections.

Optimize in this order:

```text
Measure
→ fix N+1/payload
→ improve query shape
→ EXPLAIN / EXPLAIN ANALYZE
→ add/fix index
→ benchmark again
→ cache only if still needed
```

Do not long-cache authority state such as stock, payment, coupon remaining usage, or `allowedActions`.

---

## 33. Frontend Mutation / Query Rules

Critical economic mutations are not optimistic:
- checkout;
- cancel;
- ship;
- inventory adjust;
- completion/payment-affecting transition.

Pattern:

```text
mutation
→ wait for backend success
→ invalidate/refetch affected queries
→ render new state
```

For `409`, refetch server state instead of forcing local status.

Suggested query keys:

```text
['me']
['cart']
['orders', params]
['order', id]
['operational-orders', params]
['inventory', params]
['inventory', id]
['reporting', metric, range]
```

Do not replace Query with ad-hoc `useEffect` fetch chains.

---

## 34. Forms

Use React Hook Form + Zod.

Form implementation rules:
- every user-editable form uses `react-hook-form` with a Zod schema through `zodResolver`;
- define the schema and inferred form type next to the feature form contract (for example `features/<feature>/forms.ts`);
- do not manage form fields with individual `useState` values;
- do not parse submitted fields with native `new FormData()` as the form-state mechanism;
- use `formState.isSubmitting`, field errors, and `root.server`/equivalent form-level errors for submission state;
- keep `useState` for local UI state only, such as modal visibility, filters, loading unrelated to form submission, or transient presentation state;
- frontend schemas validate UX-level constraints; the backend remains the final authority.

Frontend validates UX-level concerns such as:
- required fields;
- max length;
- basic format;
- enum input.

Backend remains final authority for:
- stock;
- price;
- coupon eligibility;
- ownership;
- order transition;
- payment state.

---

## 35. Testing Rules

Priority:

```text
Business rules
→ Transactions
→ Authorization/Ownership
→ Concurrency
→ Provider idempotency
→ UI behavior
→ Visual polish
```

Critical integration tests use real PostgreSQL.

Mandatory critical coverage includes:
- auth negative cases;
- disabled user;
- RBAC;
- cross-user IDOR;
- product activation rules;
- inventory invariants;
- cart no-reservation;
- checkout happy path;
- forced rollback;
- forged totals;
- double checkout same cart;
- last-stock race;
- cancel;
- cancel-vs-packing race;
- double ship;
- exactly one SALE;
- COD complete → PAID;
- VNPay checksum/duplicate IPN if enabled;
- reporting fixture;
- empty-DB migrations;
- deterministic seed;
- health endpoints;
- golden E2E.

Concurrency tests use:

```text
real PostgreSQL + barrier/latch
```

Do not use arbitrary `sleep()` to coordinate race tests.

Assert DB side effects, not only HTTP status.

---

## 36. Logging / Observability

Every request should have a request/correlation ID.

Structured logs may include safe context such as:

```text
requestId
route
method
statusCode
duration
actorId if safe
orderNumber if relevant
errorCode
provider operation
```

Operational logs are different from domain/audit ledgers:
- `AuditLog`
- `InventoryTransaction`
- `OrderStatusHistory`
- `PaymentTransaction`

Do not substitute one for another.

---

## 37. Health / Deployment

Canonical health endpoints:

```text
GET /api/v1/health/live
GET /api/v1/health/ready
```

Staging/production migration command:

```text
prisma migrate deploy
```

Never use:

```text
prisma db push
```

for staging/production recovery.

Deployment order:

```text
backup evidence
→ validate env/secrets
→ build
→ migrate deploy
→ deploy API
→ live health
→ ready health
→ API smoke
→ deploy Web
→ golden browser smoke
```

Provider outage must not necessarily make core readiness fail when COD/fallback still works.

---

## 38. Release Candidate Rules

Before RC:

```text
0 unresolved S0
0 unresolved S1
```

S0 examples:
- data corruption;
- serious security/authz defect;
- payment/stock integrity break.

S1 examples:
- checkout/order core unusable;
- widespread auth failure;
- duplicate economic effect.

After RC selection, do not add major features.

Allowed changes:
- S0/S1 fixes;
- contract consistency fixes;
- demo-blocking S2 fixes;
- documentation/evidence corrections.

---

## 39. Feature Priority

P0 — never cut:
- Auth/RBAC;
- Profile/Address;
- Catalog/Variant;
- Inventory + ledger;
- Persistent cart;
- Shipping abstraction/fallback;
- Atomic COD checkout;
- Order state machine;
- Sales/Warehouse operations;
- COD completion/payment;
- Core reporting;
- critical tests;
- seed;
- health/deploy.

P1 — optional if stable:
- coupon;
- reviews;
- VNPay;
- advanced GHN sync/webhook;
- audit UI;
- richer reporting.

P2 — cut first:
- wishlist;
- notifications;
- advanced refunds/returns;
- advanced recommendation;
- realtime;
- export/polish;
- advanced multiwarehouse UI.

Never keep a half-implemented unsafe feature.

---

## 40. Git / Change Discipline

Keep changes scoped.

Do not silently change business rules while fixing unrelated code.

Do not change schema without migration.

Do not rewrite applied shared-environment migrations.

Do not “fix” frontend by working around a broken backend contract.

When API/DTO changes, update backend, Swagger, frontend types, tests, and relevant docs together.

---

## 41. Before Writing Code

Before implementing any feature, answer:

```text
Who is the actor?
What permission is required?
Is ownership required?
What is client-authoritative?
What is server-authoritative?
What state precondition exists?
What transaction is required?
What rows must be locked?
What ledger/history is written?
What errors are expected?
What cache/query is invalidated?
What tests prove correctness?
```

If the specification does not answer these questions, do not invent behavior. Check the source-of-truth docs first.

---

## 42. Open Questions Sweep

Before finalizing a field or endpoint, resolve:

```text
default?
nullable?
min/max?
trim/normalize?
enum?
authority?
immutable?
pagination?
default sort?
filter/search?
cache invalidation?
retry?
idempotency?
timeout?
fallback?
feature flag?
timezone?
error code?
logging/redaction?
```

Do not leave hidden implementation decisions to individual developers or coding agents.

---

## 43. Forbidden Patterns

Do **not**:

```text
- use generic PATCH order status
- trust frontend price/total/stock
- reserve stock in cart
- mutate reserved directly from UI
- call providers while holding long stock locks
- put business logic in decorators
- put business authority in frontend
- use Zustand as server-state authority
- store product image binary in PostgreSQL
- persist product images on ephemeral server disk
- expose provider secrets to frontend
- create PrismaClient per request
- use raw SQL string interpolation
- generate orderNumber with count + 1
- use sleep-based concurrency tests
- use prisma db push in staging/production
- hard-delete important historical records
- let ADMIN bypass the state machine
- expose Prisma models directly as API DTOs
- branch frontend behavior by backend message text
```

---

## 44. Coding-Agent Behavior

When acting as a coding agent in this repository:

1. Read this file before modifying code.
2. Follow existing patterns before introducing new abstractions.
3. Do not invent business rules.
4. Do not casually rename canonical routes.
5. Preserve transaction/concurrency semantics.
6. Add/update tests for critical domain changes.
7. Update Swagger when API behavior changes.
8. Keep frontend/backend contracts synchronized.
9. Raise a clear TODO/question only when the specification is genuinely unresolved.
10. Never weaken security or integrity merely to make a test/demo pass.
11. If an optional feature is unsafe/incomplete, disable or cut it instead of faking success.

---

## 45. Final Engineering Principle

Prefer:

```text
one domain
one source of truth
one clear state owner
one explicit transition
one transaction owner
one documented API contract
```

over duplicated abstractions or clever shortcuts.

When choosing between a simpler design that preserves correctness and a more complex design with no proven benefit, choose the simpler correct design.

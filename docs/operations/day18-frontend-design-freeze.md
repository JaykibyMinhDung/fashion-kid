# Day 18 — Next.js Frontend Architecture and Design Freeze

## Frontend boundaries

- `src/app` owns route composition, layouts and framework-level error/not-found states.
- Feature UI and data access stay separated from route composition.
- `src/config` contains navigation and other static application configuration.
- `src/lib` contains framework-independent utilities and shared client helpers.
- `src/types` contains shared API/domain types; monetary values must preserve server precision.
- Server/API authority remains in the backend: the browser never calculates authoritative totals, discounts, stock or order status.

## Session and API rules

- Access/refresh session behavior is centralized; components do not duplicate token or cookie policy.
- Forms validate user input before submission, while the API remains the final validator.
- Loading, empty, error and unauthorized states are explicit UI states.
- API errors preserve the backend error code and request ID for actionable feedback.
- Retry is bounded and must not duplicate non-idempotent mutations.

## Screen-to-API mapping

- Public catalog/product screens use read-only catalog endpoints.
- Cart and checkout render server-calculated pricing and availability.
- Customer order/review screens use authenticated customer endpoints.
- Admin screens are role/permission-aware and hide unavailable actions, while the API enforces authorization.
- Reporting and audit screens are read-only and require their corresponding permissions.

## Acceptance and release gates

- Responsive route shell, error and not-found states build successfully.
- Frontend unit tests, lint, typecheck and production build pass.
- No secret is bundled into client code.
- Environment configuration is explicit and production values are not copied from example/local files.
- `git status --short` and `git diff --check` are clean after verification.
- Push is explicit, non-forced, and must be followed by remote SHA verification; local push-ready status does not imply GitHub write permission.

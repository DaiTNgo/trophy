# Admin Auth With Better Auth Proposal

## Why

The admin app currently uses client-side demo credentials and local storage, which is enough for UI iteration but does not protect internal operations. The team needs real admin authentication with per-user accounts so former employees can be blocked immediately without affecting storefront scope.

## What Changes

- Add Better Auth-backed admin authentication to the backend.
- Replace the admin app's local demo auth with real session-based login using `username + password`.
- Introduce exactly two admin roles: `super-admin` and `admin`.
- Reserve bootstrap/seed creation for the first `super-admin`, then let `super-admin` accounts create and manage `admin` accounts.
- Add account lifecycle rules for active and disabled admins.
- Add a manual password reset path for internal operations instead of forgot-password flows.
- Hard-block destructive `super-admin` lifecycle actions in day-to-day operations:
  - a `super-admin` cannot disable themself
  - a `super-admin` cannot disable another `super-admin`
  - a `super-admin` cannot demote themself
  - a `super-admin` cannot demote another `super-admin`
  - a `super-admin` can still reset another `super-admin` password and revoke that account's sessions for account recovery

## Auth Flow

- First access uses a one-time bootstrap or seed flow to create the first `super-admin`.
- Normal sign-in uses `username + password`; email is not used as a login identifier.
- `admin` and `super-admin` can access the admin panel.
- Only `super-admin` can manage accounts.
- Forgot-password is intentionally omitted in v1.
- If both `super-admin` accounts lose access, developers use a break-glass reset flow to restore them.

## Impact

- Admin access moves from mock-only behavior to server-enforced sessions.
- The backend gains auth tables, session checks, bootstrap/seed behavior, and account-management safety rules.
- The admin frontend gains real login, logout, change-password, and super-admin-only team-management flows.
- Storefront remains unchanged.

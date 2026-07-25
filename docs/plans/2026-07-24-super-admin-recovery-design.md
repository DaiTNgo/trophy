# Super-admin recovery design

## Decision

The system has at most two super-admin accounts. They have equal day-to-day access.
Each account has one password. A special, unlinked recovery page lets either
authenticated super-admin replace the other super-admin's password.

This intentionally creates reciprocal recovery authority: a super-admin who
knows the recovery URL can recover the other account. The URL is not treated as
an authorization boundary. Server-side session and role checks are the boundary.

The developer will retain one super-admin account and the customer will retain
the other. The developer account is an operational recovery root, but the
application does not encode a developer/customer distinction.

## User flows

### Onboarding

1. With zero super-admin accounts, `/onboarding` creates the first account.
2. With one super-admin account, it creates the second account.
3. With two super-admin accounts, the frontend redirects to `/login` and the
   backend rejects creation, including concurrent requests that would exceed the
   limit.

### Team

Only a super-admin can open Team. The page lists only regular `admin` accounts.
It supports creating, disabling/reactivating, and resetting a regular admin
password. Super-admin accounts are neither returned nor displayed, and Team
actions reject a super-admin target on the server.

### Super-admin recovery

1. An authenticated super-admin opens the unlinked route
   `/super-admin/recovery`.
2. They enter their own current password plus the new password for the other
   super-admin.
3. The server identifies the actor from the session and identifies the target
   as the single other super-admin. The client never submits or receives a
   target username or ID.
4. The server verifies the actor password, replaces the target password, and
   revokes the target's existing sessions.
5. The response is neutral and does not identify the target account.

The existing Settings password-change screen remains self-service: it changes
only the authenticated user's password.

## Backend contracts

New or changed Hono RPC routes under `/api/admin`:

- `GET /onboarding/status`: returns whether onboarding can create a
  super-admin; it must not disclose account identities.
- `POST /bootstrap`: creates a super-admin only while the count is below two;
  returns a typed conflict when onboarding is closed.
- `GET /accounts`: returns regular admins only.
- Existing regular-admin lifecycle routes are server-guarded so their target
  must have role `admin`.
- `POST /super-admin/recovery`: requires an authenticated super-admin session,
  validates the actor's current password and the replacement password, finds
  the other super-admin, replaces that account's password, and revokes that
  target's sessions.

The admin frontend will use `hc<AppType>()` for these routes. It must no longer
call Better Auth client admin APIs directly for Team lifecycle operations,
because those endpoints can otherwise bypass the target-role rules. Better
Auth admin permissions exposed at its public auth handler must be restricted so
they cannot ban, reset, or otherwise manage a super-admin outside these guarded
routes.

## Data and security constraints

- No multiple-password credential model and no recovery-code model are added.
- The two-account limit is enforced transactionally at the backend boundary.
- The recovery target is derived only on the server; if the target count is not
  exactly one, the request fails safely.
- Reauthentication with the actor's current password is required before
  recovery. This reduces the impact of a stolen browser session.
- Password values and hashes never appear in API responses, logs, audit text,
  or UI state after submission.
- Replacing a super-admin password revokes that target's sessions. The actor's
  sessions remain valid.
- Team and recovery routes return explicit typed JSON errors for unauthenticated,
  unauthorized, invalid, and invariant-failure states.

## Verification

- API contract tests cover onboarding counts 0, 1, and 2; the closed-onboarding
  redirect contract; and concurrent-limit protection where practical.
- Team API tests prove only admins are listed and that any lifecycle action on a
  super-admin target is rejected.
- Recovery API tests cover no session, regular-admin session, invalid actor
  password, invalid replacement password, missing/ambiguous target, successful
  password replacement, and target-session revocation.
- UI tests cover the Team filter, `/onboarding` redirect after two accounts,
  unlinked recovery page protection, and form validation/error states.
- Run backend tests, backend typecheck/build, admin build, and `./init.sh`.

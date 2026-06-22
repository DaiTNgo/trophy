1. Add Better Auth configuration to `apps/backend` with D1-backed user, account, session, and verification tables plus username fields and the two-role model `super-admin/admin`.
2. Mount Better Auth handlers in the backend and add admin session guards that admit `admin` and `super-admin` while rejecting disabled accounts.
3. Add bootstrap and seed support that creates only the first `super-admin`, then closes the one-time path.
4. Add backend admin account management flows for listing admins, creating `admin` accounts, disabling `admin` accounts, and manually resetting passwords, while hard-blocking self-disable and any disable/demotion of `super-admin` accounts in normal operations.
5. Replace the admin app's local demo auth with Better Auth username/password login, logout, session loading, super-admin-only team management, and signed-in change-password behavior.
6. Keep forgot-password out of scope, document the developer break-glass reset path for two locked-out `super-admin` accounts, update session artifacts, and rerun repo verification.

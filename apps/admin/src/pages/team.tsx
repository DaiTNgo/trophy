import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
import { PageHeader, SectionCard, EmptyState } from "../components/ui/medusa";
import { useAuth } from "../hooks/use-auth";
import { authClient, createAdminAccount } from "../lib/auth-client";
import { isSuperAdmin, getAuthErrorMessage } from "../lib/auth-utils";
import { validateTeamInvite } from "../lib/validation";
import type { AdminUserRecord, TeamInviteFormValues, TeamInviteFormErrors } from "../types";

export function TeamPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteValues, setInviteValues] = useState<TeamInviteFormValues>({
    username: "",
    password: "",
  });
  const [inviteErrors, setInviteErrors] = useState<TeamInviteFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPasswordByUserId, setResetPasswordByUserId] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isSuperAdmin(auth.user?.role)) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Team"
          title="Restricted"
          description="Only super-admin accounts can create users, disable accounts, or reset someone else's password."
        />
        <SectionCard
          title="Super-admin only"
          description="Use a super-admin account for account lifecycle operations. Regular admins can still use the rest of the admin workspace."
        >
          <EmptyState message="This page is available only to super-admin accounts." />
        </SectionCard>
      </section>
    );
  }

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    const { data, error: nextError } = await authClient.admin.listUsers({
      query: {
        limit: 100,
        sortBy: "name",
        sortDirection: "asc",
      },
    });

    if (nextError) {
      setError(getAuthErrorMessage(nextError, "Unable to load admin accounts."));
      setIsLoading(false);
      return;
    }

    setUsers((data?.users ?? []) as AdminUserRecord[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTeamInvite(inviteValues);
    if (Object.keys(nextErrors).length > 0) {
      setInviteErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      await createAdminAccount(inviteValues);
      setInviteErrors({});
      setInviteValues({ username: "", password: "" });
      setActionMessage("Admin account created.");
      await loadUsers();
    } catch (err) {
      setInviteErrors({
        form: err instanceof Error ? err.message : "Unable to create admin account.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBanToggle(account: AdminUserRecord) {
    setActionMessage(null);

    if (account.id === auth.user?.id) {
      setError("Use another admin account to disable this account.");
      return;
    }

    if (account.banned) {
      const { error: nextError } = await authClient.admin.unbanUser({
        userId: account.id,
      });

      if (nextError) {
        setError(getAuthErrorMessage(nextError, "Unable to reactivate this account."));
        return;
      }

      setActionMessage(`Reactivated ${account.username ?? account.name}.`);
    } else {
      const { error: nextError } = await authClient.admin.banUser({
        userId: account.id,
        banReason: "Disabled by admin",
      });

      if (nextError) {
        setError(getAuthErrorMessage(nextError, "Unable to disable this account."));
        return;
      }

      setActionMessage(`Disabled ${account.username ?? account.name} and revoked its sessions.`);
    }

    await loadUsers();
  }

  async function handleResetPassword(account: AdminUserRecord) {
    const nextPassword = resetPasswordByUserId[account.id]?.trim();
    if (!nextPassword || nextPassword.length < 8) {
      setError("Temporary passwords must be at least 8 characters.");
      return;
    }

    setActionMessage(null);
    const { error: nextError } = await authClient.admin.setUserPassword({
      userId: account.id,
      newPassword: nextPassword,
    });

    if (nextError) {
      setError(getAuthErrorMessage(nextError, "Unable to reset this password."));
      return;
    }

    const revokeResult = await authClient.admin.revokeUserSessions({
      userId: account.id,
    });

    if (revokeResult.error) {
      setError(getAuthErrorMessage(revokeResult.error, "Password changed, but session revocation failed."));
      return;
    }

    setResetPasswordByUserId((current) => ({ ...current, [account.id]: "" }));
    setActionMessage(`Password reset for ${account.username ?? account.name}. Existing sessions were revoked.`);
    await loadUsers();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Admin access"
        description="Create admin accounts, disable people who should no longer access the workspace, and reset passwords manually."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SectionCard
            title="Add admin"
            description="Create a regular admin account with a username and temporary password."
          >
            <form className="space-y-4" onSubmit={handleCreateUser} noValidate>
              <TextField
                label="Username"
                name="team-username"
                value={inviteValues.username}
                error={inviteErrors.username}
                onChange={(value) => setInviteValues((current) => ({ ...current, username: value }))}
              />
              <TextField
                label="Temporary password"
                name="team-password"
                type="password"
                value={inviteValues.password}
                error={inviteErrors.password}
                onChange={(value) => setInviteValues((current) => ({ ...current, password: value }))}
              />
              {inviteErrors.form ? <InlineError message={inviteErrors.form} /> : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Creating..." : "Create admin account"}
              </button>
            </form>
          </SectionCard>
        </div>

        <SectionCard
          title="Current admins"
          description="Disable accounts instead of deleting them so session revocation and identity history stay intact."
        >
          {error ? <InlineError message={error} /> : null}
          {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
          {isLoading ? (
            <EmptyState message="Loading admin accounts..." />
          ) : users.length === 0 ? (
            <EmptyState message="No admin accounts found." />
          ) : (
            <div className="space-y-4">
              {users.map((account) => (
                <div key={account.id} className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{account.name}</h3>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            account.banned ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}
                        >
                          {account.banned ? "Disabled" : "Active"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{account.username ?? account.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{account.role ?? "admin"}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleBanToggle(account)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-medium transition",
                          account.banned
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                        ].join(" ")}
                      >
                        {account.banned ? "Reactivate" : "Disable"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <TextField
                      label="Temporary password"
                      name={`reset-password-${account.id}`}
                      type="password"
                      value={resetPasswordByUserId[account.id] ?? ""}
                      hint="Set a new temporary password, then share it directly with the admin."
                      onChange={(value) =>
                        setResetPasswordByUserId((current) => ({
                          ...current,
                          [account.id]: value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void handleResetPassword(account)}
                      className="self-end rounded-2xl border border-stone-300 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}

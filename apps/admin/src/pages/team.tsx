import { useEffect, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
} from "@medusajs/ui";
import {
  KeyRound,
  Plus,
  ShieldBan,
  UserPlus,
  Users,
} from "lucide-react";
import { TextField } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
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
      <div className="flex flex-col gap-y-6">
        <Container>
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
              Team
            </Text>
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">Restricted</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Only super-admin accounts can create users, disable accounts, or reset someone
                else's password.
              </Text>
            </div>
          </div>
        </Container>
        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-y-1">
              <Heading level="h3">Super-admin only</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Use a super-admin account for account lifecycle operations. Regular admins can still
                use the rest of the admin workspace.
              </Text>
            </div>
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                This page is available only to super-admin accounts.
              </Text>
            </div>
          </div>
        </Container>
      </div>
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
      setError(
        getAuthErrorMessage(revokeResult.error, "Password changed, but session revocation failed."),
      );
      return;
    }

    setResetPasswordByUserId((current) => ({ ...current, [account.id]: "" }));
    setActionMessage(
      `Password reset for ${account.username ?? account.name}. Existing sessions were revoked.`,
    );
    await loadUsers();
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Team
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Admin access</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Create admin accounts, disable people who should no longer access the workspace, and
              reset passwords manually.
            </Text>
          </div>
        </div>
      </Container>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-y-6">
          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <UserPlus className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Add admin
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Create a regular admin account with a username and temporary password.
                </Text>
              </div>
              <form className="flex flex-col gap-y-4" onSubmit={handleCreateUser} noValidate>
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
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Plus className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create admin account"}
                </Button>
              </form>
            </div>
          </Container>
        </div>

        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-y-1">
              <Heading level="h3">
                <Users className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                Current admins
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Disable accounts instead of deleting them so session revocation and identity history
                stay intact.
              </Text>
            </div>
            {error ? <InlineError message={error} /> : null}
            {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Text size="small" className="text-ui-fg-muted">
                  Loading admin accounts...
                </Text>
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Text size="small" className="text-ui-fg-muted">
                  No admin accounts found.
                </Text>
              </div>
            ) : (
              <div className="flex flex-col gap-y-3">
                {users.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-col gap-y-1">
                        <div className="flex items-center gap-2">
                          <Text size="base" className="text-ui-fg-base font-medium">
                            {account.name}
                          </Text>
                          <Badge
                            color={account.banned ? "red" : "green"}
                            size="xsmall"
                            rounded="full"
                          >
                            {account.banned ? "Disabled" : "Active"}
                          </Badge>
                        </div>
                        <Text size="small" className="text-ui-fg-muted">
                          {account.username ?? account.name}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider">
                          {account.role ?? "admin"}
                        </Text>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => void handleBanToggle(account)}
                        >
                          <ShieldBan className="h-4 w-4" />
                          {account.banned ? "Reactivate" : "Disable"}
                        </Button>
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
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => void handleResetPassword(account)}
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset password
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}

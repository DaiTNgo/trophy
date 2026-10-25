import { Container, Heading, Text } from "@medusajs/ui";
import { KeyRound } from "lucide-react";
import {
  PasswordChangeForm,
  type PasswordChangeResult,
} from "../components/auth/password-change-form";
import { useAuth } from "../hooks/use-auth";
import { recoverOtherSuperAdmin } from "../lib/auth-client";
import { isSuperAdmin } from "../lib/auth-utils";

async function recover(currentPassword: string, newPassword: string): Promise<PasswordChangeResult> {
  try {
    await recoverOtherSuperAdmin(currentPassword, newPassword);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to recover super-admin access.",
    };
  }
}

export function SuperAdminRecoveryPage() {
  const auth = useAuth();
  if (!isSuperAdmin(auth.user?.role)) {
    return (
      <Container>
        <Heading level="h2">Restricted</Heading>
        <Text size="small" className="mt-2 text-ui-fg-subtle">
          Only super-admin accounts can recover the other super-admin account.
        </Text>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Super-admin recovery
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Replace the other password</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Confirm your password before replacing the other super-admin password. Their active sessions will be revoked.
            </Text>
          </div>
        </div>
      </Container>

      <Container className="max-w-2xl">
        <PasswordChangeForm
          idPrefix="recovery-"
          labels={{
            currentPassword: "Your current password",
            newPassword: "New password for the other super-admin",
            confirmPassword: "Confirm new password",
          }}
          submitIcon={<KeyRound className="h-4 w-4" />}
          submitLabel="Replace other super-admin password"
          submittingLabel="Replacing..."
          successMessage="The other super-admin password was replaced and their sessions were revoked."
          onSubmit={recover}
        />
      </Container>
    </div>
  );
}

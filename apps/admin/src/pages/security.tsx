import { Container, Heading, Text } from "@medusajs/ui";
import { KeyRound, Save, User } from "lucide-react";
import { PasswordChangeForm } from "../components/auth/password-change-form";
import { useAuth } from "../hooks/use-auth";

export function SecurityPage() {
  const auth = useAuth();
  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Security
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Password and session hygiene</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Change your password while signed in. This revokes your other sessions so old devices
              stop working.
            </Text>
          </div>
        </div>
      </Container>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-y-1">
              <Heading level="h3">
                <User className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                Current account
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Use a unique password and rotate it whenever admin access changes.
              </Text>
            </div>
            <dl className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Name
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  {auth.user?.name ?? "Unknown"}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Username
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  {auth.user?.username ?? auth.user?.name ?? "Unknown"}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Role
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  {auth.user?.role ?? "admin"}
                </Text>
              </div>
            </dl>
          </div>
        </Container>

        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-y-1">
              <Heading level="h3">
                <KeyRound className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                Change password
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                You must know the current password. Forgot-password is intentionally omitted in v1.
              </Text>
            </div>
            <PasswordChangeForm
              idPrefix=""
              labels={{
                currentPassword: "Current password",
                newPassword: "New password",
                confirmPassword: "Confirm new password",
              }}
              labelWeight="plus"
              submitIcon={<Save className="h-4 w-4" />}
              submitLabel="Change password"
              submittingLabel="Updating..."
              successMessage="Password changed. Other sessions were revoked."
              onSubmit={auth.changePassword}
            />
          </div>
        </Container>
      </div>
    </div>
  );
}

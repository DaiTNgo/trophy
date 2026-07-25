import { useState, type FormEvent } from "react";
import { Button, Container, Heading, Input, Label, Text } from "@medusajs/ui";
import { KeyRound } from "lucide-react";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
import { useAuth } from "../hooks/use-auth";
import { recoverOtherSuperAdmin } from "../lib/auth-client";
import { isSuperAdmin } from "../lib/auth-utils";
import { validateChangePassword } from "../lib/validation";
import type { ChangePasswordFormErrors, ChangePasswordFormValues } from "../types";

export function SuperAdminRecoveryPage() {
  const auth = useAuth();
  const [values, setValues] = useState<ChangePasswordFormValues>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateChangePassword(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await recoverOtherSuperAdmin(values.currentPassword, values.newPassword);
      setErrors({});
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("The other super-admin password was replaced and their sessions were revoked.");
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Unable to recover super-admin access." });
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <form className="flex flex-col gap-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="recovery-current-password">Your current password</Label>
            <Input
              id="recovery-current-password"
              type="password"
              value={values.currentPassword}
              onChange={(event) => setValues((current) => ({ ...current, currentPassword: event.target.value }))}
            />
            {errors.currentPassword ? <Text size="small" className="text-rose-700">{errors.currentPassword}</Text> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-new-password">New password for the other super-admin</Label>
            <Input
              id="recovery-new-password"
              type="password"
              value={values.newPassword}
              onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
            />
            {errors.newPassword ? <Text size="small" className="text-rose-700">{errors.newPassword}</Text> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-confirm-password">Confirm new password</Label>
            <Input
              id="recovery-confirm-password"
              type="password"
              value={values.confirmPassword}
              onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
            {errors.confirmPassword ? <Text size="small" className="text-rose-700">{errors.confirmPassword}</Text> : null}
          </div>
          {errors.form ? <InlineError message={errors.form} /> : null}
          {message ? <SuccessMessage message={message} /> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            <KeyRound className="h-4 w-4" />
            {isSubmitting ? "Replacing..." : "Replace other super-admin password"}
          </Button>
        </form>
      </Container>
    </div>
  );
}

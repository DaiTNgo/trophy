import { useState, type FormEvent } from "react";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui";
import { KeyRound, Save, User } from "lucide-react";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
import { useAuth } from "../hooks/use-auth";
import { validateChangePassword } from "../lib/validation";
import type { ChangePasswordFormValues, ChangePasswordFormErrors } from "../types";

export function SecurityPage() {
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
    const result = await auth.changePassword(values.currentPassword, values.newPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }

    setErrors({});
    setValues({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setMessage("Password changed. Other sessions were revoked.");
  }

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
            <form className="flex flex-col gap-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="current-password" weight="plus">Current password</Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  value={values.currentPassword}
                  onChange={(event) => setValues((current) => ({ ...current, currentPassword: event.target.value }))}
                />
                {errors.currentPassword ? <Text size="small" className="text-rose-700">{errors.currentPassword}</Text> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" weight="plus">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  value={values.newPassword}
                  onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
                />
                {errors.newPassword ? <Text size="small" className="text-rose-700">{errors.newPassword}</Text> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" weight="plus">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={values.confirmPassword}
                  onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
                {errors.confirmPassword ? <Text size="small" className="text-rose-700">{errors.confirmPassword}</Text> : null}
              </div>

              {errors.form ? <InlineError message={errors.form} /> : null}
              {message ? <SuccessMessage message={message} /> : null}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                <Save className="h-4 w-4" />
                {isSubmitting ? "Updating..." : "Change password"}
              </Button>
            </form>
          </div>
        </Container>
      </div>
    </div>
  );
}

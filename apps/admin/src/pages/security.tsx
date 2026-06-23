import { useState, type FormEvent } from "react";
import { TextField } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
import { PageHeader, SectionCard, SummaryRow } from "../components/ui/medusa";
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
    <section className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Password and session hygiene"
        description="Change your password while signed in. This revokes your other sessions so old devices stop working."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Current account"
          description="Use a unique password and rotate it whenever admin access changes."
        >
          <dl className="space-y-3">
            <SummaryRow label="Name" value={auth.user?.name ?? "Unknown"} />
            <SummaryRow label="Username" value={auth.user?.username ?? auth.user?.name ?? "Unknown"} />
            <SummaryRow label="Role" value={auth.user?.role ?? "admin"} />
          </dl>
        </SectionCard>

        <SectionCard
          title="Change password"
          description="You must know the current password. Forgot-password is intentionally omitted in v1."
        >
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Current password"
              name="currentPassword"
              type="password"
              value={values.currentPassword}
              error={errors.currentPassword}
              onChange={(value) => setValues((current) => ({ ...current, currentPassword: value }))}
            />
            <TextField
              label="New password"
              name="newPassword"
              type="password"
              value={values.newPassword}
              error={errors.newPassword}
              onChange={(value) => setValues((current) => ({ ...current, newPassword: value }))}
            />
            <TextField
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              onChange={(value) => setValues((current) => ({ ...current, confirmPassword: value }))}
            />

            {errors.form ? <InlineError message={errors.form} /> : null}
            {message ? <SuccessMessage message={message} /> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Updating..." : "Change password"}
            </button>
          </form>
        </SectionCard>
      </div>
    </section>
  );
}

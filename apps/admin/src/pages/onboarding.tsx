import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { TextField } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { SuccessMessage } from "../components/ui/medusa/success-message";
import { bootstrapFirstAdmin } from "../lib/auth-client";
import { validateOnboarding } from "../lib/validation";
import type { OnboardingFormValues, OnboardingFormErrors } from "../types";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<OnboardingFormValues>({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<OnboardingFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateOnboarding(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await bootstrapFirstAdmin(values);
      setErrors({});
      setMessage("Super-admin account created. Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Unable to create super-admin.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fef3c7,transparent_30%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-[32px] bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20 sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Setup</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Create super-admin</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create the first super-admin account to get started.
          </p>

          {message ? <SuccessMessage message={message} /> : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Username"
              name="username"
              value={values.username}
              error={errors.username}
              onChange={(value) => setValues((current) => ({ ...current, username: value }))}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={values.password}
              error={errors.password}
              onChange={(value) => setValues((current) => ({ ...current, password: value }))}
            />

            {errors.form ? <InlineError message={errors.form} /> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creating..." : "Create super-admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

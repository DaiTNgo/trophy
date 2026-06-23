import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui";
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
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm space-y-8">
        <Heading level="h1">Setup</Heading>

        {message ? <SuccessMessage message={message} /> : null}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="onboarding-username">Username</Label>
            <Input
              id="onboarding-username"
              value={values.username}
              onChange={(event) => setValues((current) => ({ ...current, username: event.target.value }))}
            />
            {errors.username ? <Text size="small" className="text-rose-700">{errors.username}</Text> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-password">Password</Label>
            <Input
              id="onboarding-password"
              type="password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            />
            {errors.password ? <Text size="small" className="text-rose-700">{errors.password}</Text> : null}
          </div>

          {errors.form ? <InlineError message={errors.form} /> : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating..." : "Create super-admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}

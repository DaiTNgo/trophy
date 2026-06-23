import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui";
import { InlineError } from "../components/ui/medusa/inline-error";
import { AuthScreenState } from "../components/ui/medusa/auth-screen-state";
import { useAuth } from "../hooks/use-auth";
import { validateLogin } from "../lib/validation";
import type { LoginFormValues, LoginFormErrors } from "../types";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<LoginFormValues>({ username: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? "/orders";

  if (auth.isLoading) {
    return <AuthScreenState title="Loading session" description="Checking your admin access." />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLogin(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await auth.login(values.username, values.password);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }

    setErrors({});
    navigate(destination, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm space-y-8">
        <Heading level="h1" className="text-center">Sign in</Heading>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              value={values.username}
              onChange={(event) => setValues((current) => ({ ...current, username: event.target.value }))}
            />
            {errors.username ? <Text size="small" className="text-rose-700">{errors.username}</Text> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

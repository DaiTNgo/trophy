import {
  startTransition,
  useState,
  type FormEvent,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { TextField } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { AuthScreenState } from "../components/ui/medusa/auth-screen-state";
import { MetricCard } from "../components/ui/medusa/metric-card";
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
    startTransition(() => {
      navigate(destination, { replace: true });
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_30%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/8 p-8 backdrop-blur sm:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Trophy Commerce</p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Admin pages for orders and products, built to move fast.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
            This round ships a protected admin surface with real login submission, local session state, and mock operational data for teams to iterate on before API integration.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Orders today" value="46" />
            <MetricCard label="Products live" value="128" />
            <MetricCard label="Conversion" value="3.9%" />
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Sign in</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Admin login</h2>
            </div>
          </div>

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
              {isSubmitting ? "Signing in..." : "Sign in to admin"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

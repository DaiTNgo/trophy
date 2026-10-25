import * as v from "valibot";
import type {
  LoginFormValues,
  LoginFormErrors,
  ChangePasswordFormValues,
  ChangePasswordFormErrors,
  TeamInviteFormValues,
  TeamInviteFormErrors,
  OnboardingFormValues,
  OnboardingFormErrors,
} from "../types";

const usernameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty("Username is required."),
  v.minLength(3, "Username must be at least 3 characters."),
);

function passwordSchema(requiredMessage: string) {
  return v.pipe(v.string(), v.nonEmpty(requiredMessage), v.minLength(8, "Password must be at least 8 characters."));
}

const credentialsSchema = v.object({
  username: usernameSchema,
  password: passwordSchema("Password is required."),
});

const changePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty("Current password is required.")),
  newPassword: passwordSchema("New password is required."),
  confirmPassword: v.pipe(v.string(), v.nonEmpty("Confirm your new password.")),
});

const teamInviteSchema = v.object({
  username: usernameSchema,
  password: passwordSchema("Temporary password is required."),
});

/** First issue per field keyed by field name; the first remaining issue goes to `form`. */
function fieldErrors<TErrors extends { form?: string }>(
  schema: v.GenericSchema,
  values: unknown,
): TErrors {
  const result = v.safeParse(schema, values);
  if (result.success) return {} as TErrors;

  return result.issues.reduce<Record<string, string>>((errors, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in errors)) {
      errors[key] = issue.message;
    } else if (!errors.form) {
      errors.form = issue.message;
    }
    return errors;
  }, {}) as TErrors;
}

export function validateLogin(values: LoginFormValues) {
  return fieldErrors<LoginFormErrors>(credentialsSchema, values);
}

export function validateChangePassword(values: ChangePasswordFormValues) {
  const errors = fieldErrors<ChangePasswordFormErrors>(changePasswordSchema, values);

  if (!errors.confirmPassword && values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "New passwords do not match.";
  }

  return errors;
}

export function validateTeamInvite(values: TeamInviteFormValues) {
  return fieldErrors<TeamInviteFormErrors>(teamInviteSchema, values);
}

export function validateOnboarding(values: OnboardingFormValues) {
  return fieldErrors<OnboardingFormErrors>(credentialsSchema, values);
}

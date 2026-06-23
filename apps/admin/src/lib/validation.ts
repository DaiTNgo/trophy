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

export const loginSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty("Username is required."), v.minLength(3, "Username must be at least 3 characters.")),
  password: v.pipe(v.string(), v.nonEmpty("Password is required."), v.minLength(8, "Password must be at least 8 characters.")),
});

export const changePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty("Current password is required.")),
  newPassword: v.pipe(v.string(), v.nonEmpty("New password is required."), v.minLength(8, "Password must be at least 8 characters.")),
  confirmPassword: v.pipe(v.string(), v.nonEmpty("Confirm your new password.")),
});

export const teamInviteSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty("Username is required."), v.minLength(3, "Username must be at least 3 characters.")),
  password: v.pipe(v.string(), v.nonEmpty("Temporary password is required."), v.minLength(8, "Password must be at least 8 characters.")),
});

export const onboardingSchema = v.object({
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Username is required."),
    v.minLength(3, "Username must be at least 3 characters."),
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty("Password is required."),
    v.minLength(8, "Password must be at least 8 characters."),
  ),
});

export function validateLogin(values: LoginFormValues) {
  const result = v.safeParse(loginSchema, values);
  if (result.success) {
    return {};
  }

  return result.issues.reduce<LoginFormErrors>((accumulator, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in accumulator)) {
      accumulator[key as keyof LoginFormValues] = issue.message;
      return accumulator;
    }

    if (!accumulator.form) {
      accumulator.form = issue.message;
    }

    return accumulator;
  }, {});
}

export function validateChangePassword(values: ChangePasswordFormValues) {
  const result = v.safeParse(changePasswordSchema, values);
  const errors = result.success
    ? {}
    : result.issues.reduce<ChangePasswordFormErrors>((accumulator, issue) => {
        const key = issue.path?.[0]?.key;
        if (typeof key === "string" && !(key in accumulator)) {
          accumulator[key as keyof ChangePasswordFormValues] = issue.message;
          return accumulator;
        }

        if (!accumulator.form) {
          accumulator.form = issue.message;
        }

        return accumulator;
      }, {});

  if (!errors.confirmPassword && values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "New passwords do not match.";
  }

  return errors;
}

export function validateTeamInvite(values: TeamInviteFormValues) {
  const result = v.safeParse(teamInviteSchema, values);
  if (result.success) {
    return {};
  }

  return result.issues.reduce<TeamInviteFormErrors>((accumulator, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in accumulator)) {
      accumulator[key as keyof TeamInviteFormValues] = issue.message;
      return accumulator;
    }

    if (!accumulator.form) {
      accumulator.form = issue.message;
    }

    return accumulator;
  }, {});
}

export function validateOnboarding(values: OnboardingFormValues) {
  const result = v.safeParse(onboardingSchema, values);
  if (result.success) return {};

  return result.issues.reduce<OnboardingFormErrors>((acc, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in acc)) {
      acc[key as keyof OnboardingFormValues] = issue.message;
      return acc;
    }
    if (!acc.form) acc.form = issue.message;
    return acc;
  }, {});
}

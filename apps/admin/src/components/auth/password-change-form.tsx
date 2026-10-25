import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Input, Label, Text } from "@medusajs/ui";
import { InlineError } from "../ui/medusa/inline-error";
import { SuccessMessage } from "../ui/medusa/success-message";
import { validateChangePassword } from "../../lib/validation";
import type { ChangePasswordFormErrors, ChangePasswordFormValues } from "../../types";

const EMPTY_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type PasswordField = keyof ChangePasswordFormValues;

export type PasswordChangeResult = { ok: true } | { ok: false; message: string };

/** Current / new / confirm password form with validation, submit state and success feedback. */
export function PasswordChangeForm({
  idPrefix,
  labels,
  labelWeight,
  submitIcon,
  submitLabel,
  submittingLabel,
  successMessage,
  onSubmit,
}: {
  idPrefix: string;
  labels: Record<PasswordField, string>;
  labelWeight?: "regular" | "plus";
  submitIcon: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  successMessage: string;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<PasswordChangeResult>;
}) {
  const [values, setValues] = useState<ChangePasswordFormValues>(EMPTY_VALUES);
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
    const result = await onSubmit(values.currentPassword, values.newPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }

    setErrors({});
    setValues(EMPTY_VALUES);
    setMessage(successMessage);
  }

  const fields: Array<{ name: PasswordField; id: string }> = [
    { name: "currentPassword", id: `${idPrefix}current-password` },
    { name: "newPassword", id: `${idPrefix}new-password` },
    { name: "confirmPassword", id: `${idPrefix}confirm-password` },
  ];

  return (
    <form className="flex flex-col gap-y-4" onSubmit={handleSubmit} noValidate>
      {fields.map(({ name, id }) => (
        <div key={name} className="space-y-2">
          <Label htmlFor={id} weight={labelWeight}>
            {labels[name]}
          </Label>
          <Input
            id={id}
            name={name}
            type="password"
            value={values[name]}
            onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
          />
          {errors[name] ? <Text size="small" className="text-rose-700">{errors[name]}</Text> : null}
        </div>
      ))}

      {errors.form ? <InlineError message={errors.form} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {submitIcon}
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}

import { Input, Label, Text } from "@medusajs/ui";
import type { Dispatch, SetStateAction } from "react";
import type { LoginFormErrors, LoginFormValues } from "../../types";

/** Username and password inputs with per-field errors, shared by sign-in and first-time setup. */
export function UsernamePasswordFields({
  idPrefix,
  values,
  errors,
  onChange,
}: {
  idPrefix: string;
  values: LoginFormValues;
  errors: LoginFormErrors;
  onChange: Dispatch<SetStateAction<LoginFormValues>>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-username`}>Username</Label>
        <Input
          id={`${idPrefix}-username`}
          value={values.username}
          onChange={(event) => onChange((current) => ({ ...current, username: event.target.value }))}
        />
        {errors.username ? <Text size="small" className="text-rose-700">{errors.username}</Text> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-password`}>Password</Label>
        <Input
          id={`${idPrefix}-password`}
          type="password"
          value={values.password}
          onChange={(event) => onChange((current) => ({ ...current, password: event.target.value }))}
        />
        {errors.password ? <Text size="small" className="text-rose-700">{errors.password}</Text> : null}
      </div>
    </>
  );
}

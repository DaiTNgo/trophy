import { validator } from "hono/validator";
import * as v from "valibot";

export const adminPasswordSchema = v.pipe(
  v.string(),
  v.nonEmpty("Password is required."),
  v.minLength(8, "Password must be at least 8 characters."),
);

export const adminCredentialsSchema = v.object({
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Username is required."),
    v.minLength(3, "Username must be at least 3 characters."),
  ),
  password: adminPasswordSchema,
});

/** Better Auth requires an email, so admin accounts get a synthetic one derived from the username. */
export function adminAccountEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

/** JSON body validator answering 400 `{ message, issues }` when the payload fails `schema`. */
export function adminPayloadValidator<TSchema extends v.GenericSchema>(schema: TSchema) {
  return validator("json", (body, c) => {
    const result = v.safeParse(schema, body);
    if (!result.success) {
      return c.json({ message: "Invalid payload.", issues: result.issues }, 400);
    }
    return result.output as v.InferOutput<TSchema>;
  });
}

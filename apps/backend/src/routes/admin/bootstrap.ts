import { Hono } from "hono";
import { validator } from "hono/validator";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { getAuth } from "../../lib/auth";

const bootstrapSchema = v.object({
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

function buildSeedEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

export const adminBootstrapRoute = new Hono<AppEnv>().post(
  "/",
  validator("json", (body, c) => {
    const result = v.safeParse(bootstrapSchema, body);
    if (!result.success) {
      return c.json(
        {
          message: "Invalid payload.",
          issues: result.issues,
        },
        400,
      );
    }
    return result.output;
  }),
  async (c) => {
  const auth = getAuth(c.env);
  const db = getDb(c.env);

  const superAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "super-admin"));

  if (superAdmins.length >= 2) {
    return c.json(
      {
        message: "Super-admin onboarding is closed.",
        code: "SUPER_ADMIN_LIMIT_REACHED",
      },
      409,
    );
  }

  const result = c.req.valid("json");

  try {
    // @ts-ignore
    const created = await auth.api.createUser({
      body: {
        email: buildSeedEmail(result.username),
        name: result.username,
        username: result.username,
        password: result.password,
        role: "super-admin",
        data: {
          displayUsername: result.username,
        },
      } as any,
    });

    await db
      .update(users)
      .set({ username: result.username })
      .where(eq(users.id, created.user.id));

    return c.json(
      {
        user: created.user,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating super-admin user:", error);
    return c.json(
      {
        message: "Failed to create super-admin user.",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
  },
);

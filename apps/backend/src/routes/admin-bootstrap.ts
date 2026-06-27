import { Hono } from "hono";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import type { AppEnv } from "../lib/env";
import { getAuth } from "../lib/auth";

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

export const adminBootstrapRoute = new Hono<AppEnv>();

adminBootstrapRoute.post("/", async (c) => {
  const auth = getAuth(c.env);

  const body = await c.req.json().catch(() => null);
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

  try {
    const created = await auth.api.createUser({
      body: {
        email: buildSeedEmail(result.output.username),
        name: result.output.username,
        username: result.output.username,
        password: result.output.password,
        role: "super-admin",
        data: {
          displayUsername: result.output.username,
        },
      } as any,
    });

    const db = getDb(c.env);
    await db
      .update(users)
      .set({ username: result.output.username })
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
});

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { getAuth } from "../../lib/auth";
import { adminAccountEmail, adminCredentialsSchema, adminPayloadValidator } from "../../lib/admin-credentials";

export const adminBootstrapRoute = new Hono<AppEnv>().post(
  "/",
  adminPayloadValidator(adminCredentialsSchema),
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
        email: adminAccountEmail(result.username),
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

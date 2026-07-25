import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import type { AppEnv } from "../../lib/env";

export const adminOnboardingRoute = new Hono<AppEnv>().get("/status", async (c) => {
  const superAdmins = await getDb(c.env)
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "super-admin"));

  return c.json(
    {
      canCreateSuperAdmin: superAdmins.length < 2,
    },
    200,
  );
});

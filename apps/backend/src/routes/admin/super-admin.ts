import { and, eq, ne } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { accounts, sessions, users } from "../../db/schema";
import { getAuth } from "../../lib/auth";
import { getAdminSession } from "../../lib/admin-session";
import type { AppEnv } from "../../lib/env";

const recoverSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty("Current password is required.")),
  newPassword: v.pipe(
    v.string(),
    v.nonEmpty("New password is required."),
    v.minLength(8, "New password must be at least 8 characters."),
  ),
});

export const superAdminRoute = new Hono<AppEnv>().post("/recovery", async (c) => {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  if (!session?.user || (session.user as { role?: string }).role !== "super-admin") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = v.safeParse(recoverSchema, body);
  if (!parsed.success) {
    return c.json({ message: "Invalid payload.", issues: parsed.issues }, 400);
  }

  const db = getDb(c.env);
  const credential = await db
    .select({ password: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")))
    .get();

  if (!credential?.password || !(await verifyPassword({ hash: credential.password, password: parsed.output.currentPassword }))) {
    return c.json({ message: "Current password is incorrect." }, 400);
  }

  const targets = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "super-admin"), ne(users.id, session.user.id)));

  if (targets.length !== 1) {
    return c.json({ message: "Recovery is unavailable." }, 409);
  }

  // @ts-ignore Better Auth exposes admin APIs at runtime for server-side use.
  await getAuth(c.env).api.setUserPassword({
    body: { userId: targets[0].id, newPassword: parsed.output.newPassword },
    headers: c.req.raw.headers,
  });
  await db.delete(sessions).where(eq(sessions.userId, targets[0].id));

  return c.json({ recovered: true }, 200);
});

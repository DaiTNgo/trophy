import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { sessions, users } from "../../db/schema";
import { getAuth } from "../../lib/auth";
import { getAdminSession } from "../../lib/admin-session";
import { adminAccountEmail, adminCredentialsSchema, adminPasswordSchema, adminPayloadValidator } from "../../lib/admin-credentials";
import type { AppEnv } from "../../lib/env";

const resetPasswordSchema = v.object({ password: adminPasswordSchema });

async function requireSuperAdmin(c: Context<AppEnv>) {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  if (!session?.user || (session.user as { role?: string }).role !== "super-admin") {
    return null;
  }
  return session;
}

async function findRegularAdmin(c: Context<AppEnv>, userId: string) {
  return getDb(c.env)
    .select({ id: users.id, name: users.name, username: users.username, banned: users.banned })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "admin")))
    .get();
}

export const adminAccountsRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const adminUsers = await getDb(c.env)
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        banned: users.banned,
        banReason: users.banReason,
      })
      .from(users)
      .where(eq(users.role, "admin"));

    return c.json(
      {
        users: adminUsers.map((user) => ({ ...user, role: "admin" as const })),
      },
      200,
    );
  })
  .post(
    "/create",
    adminPayloadValidator(adminCredentialsSchema),
    async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const parsed = c.req.valid("json");

    const auth = getAuth(c.env);
    // Better Auth owns credential hashing and account creation.
    // @ts-ignore Better Auth exposes admin APIs at runtime for server-side use.
    const created = await auth.api.createUser({
      body: {
        email: adminAccountEmail(parsed.username),
        name: parsed.username,
        password: parsed.password,
        role: "admin",
        data: { displayUsername: parsed.username },
      },
    });

    await getDb(c.env)
      .update(users)
      .set({ username: parsed.username })
      .where(eq(users.id, created.user.id));

    return c.json(
      {
        user: {
          id: created.user.id,
          name: created.user.name,
          username: parsed.username,
          banned: false,
          banReason: null,
          role: "admin" as const,
        },
      },
      201,
    );
    },
  )
  .post("/:userId/disable", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const account = await findRegularAdmin(c, c.req.param("userId"));
    if (!account) {
      return c.json({ message: "Admin account not found." }, 404);
    }

    await getDb(c.env)
      .update(users)
      .set({ banned: true, banReason: "Disabled by super-admin" })
      .where(eq(users.id, account.id));
    await getDb(c.env).delete(sessions).where(eq(sessions.userId, account.id));

    return c.json({ userId: account.id, banned: true }, 200);
  })
  .post("/:userId/reactivate", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const account = await findRegularAdmin(c, c.req.param("userId"));
    if (!account) {
      return c.json({ message: "Admin account not found." }, 404);
    }

    await getDb(c.env)
      .update(users)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, account.id));

    return c.json({ userId: account.id, banned: false }, 200);
  })
  .post(
    "/:userId/password",
    adminPayloadValidator(resetPasswordSchema),
    async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const parsed = c.req.valid("json");

    const account = await findRegularAdmin(c, c.req.param("userId"));
    if (!account) {
      return c.json({ message: "Admin account not found." }, 404);
    }

    // @ts-ignore Better Auth exposes admin APIs at runtime for server-side use.
    await getAuth(c.env).api.setUserPassword({
      body: { userId: account.id, newPassword: parsed.password },
      headers: c.req.raw.headers,
    });
    await getDb(c.env).delete(sessions).where(eq(sessions.userId, account.id));

    return c.json({ userId: account.id, passwordUpdated: true }, 200);
    },
  );

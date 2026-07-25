import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { sessions, users } from "../../db/schema";
import { getAuth } from "../../lib/auth";
import { getAdminSession } from "../../lib/admin-session";
import type { AppEnv } from "../../lib/env";

const createAccountSchema = v.object({
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

const resetPasswordSchema = v.object({
  password: v.pipe(
    v.string(),
    v.nonEmpty("Password is required."),
    v.minLength(8, "Password must be at least 8 characters."),
  ),
});

function buildEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

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
  .post("/create", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = v.safeParse(createAccountSchema, body);
    if (!parsed.success) {
      return c.json({ message: "Invalid payload.", issues: parsed.issues }, 400);
    }

    const auth = getAuth(c.env);
    // Better Auth owns credential hashing and account creation.
    // @ts-ignore Better Auth exposes admin APIs at runtime for server-side use.
    const created = await auth.api.createUser({
      body: {
        email: buildEmail(parsed.output.username),
        name: parsed.output.username,
        password: parsed.output.password,
        role: "admin",
        data: { displayUsername: parsed.output.username },
      },
    });

    await getDb(c.env)
      .update(users)
      .set({ username: parsed.output.username })
      .where(eq(users.id, created.user.id));

    return c.json(
      {
        user: {
          id: created.user.id,
          name: created.user.name,
          username: parsed.output.username,
          banned: false,
          banReason: null,
          role: "admin" as const,
        },
      },
      201,
    );
  })
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
  .post("/:userId/password", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = v.safeParse(resetPasswordSchema, body);
    if (!parsed.success) {
      return c.json({ message: "Invalid payload.", issues: parsed.issues }, 400);
    }

    const account = await findRegularAdmin(c, c.req.param("userId"));
    if (!account) {
      return c.json({ message: "Admin account not found." }, 404);
    }

    // @ts-ignore Better Auth exposes admin APIs at runtime for server-side use.
    await getAuth(c.env).api.setUserPassword({
      body: { userId: account.id, newPassword: parsed.output.password },
      headers: c.req.raw.headers,
    });
    await getDb(c.env).delete(sessions).where(eq(sessions.userId, account.id));

    return c.json({ userId: account.id, passwordUpdated: true }, 200);
  });

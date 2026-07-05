import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db/client";
import { sessions, users } from "../db/schema";
import type { AppBindings } from "./env";
import { getAuth, type AuthSession } from "./auth";

const ADMIN_ROLES = new Set(["admin", "super-admin"]);

type BearerAdminSession = {
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    role: string | null;
    banned: boolean | null;
  };
};

export type AdminSession = AuthSession | BearerAdminSession;

export function extractBearerToken(headers: Headers) {
  const authorization = headers.get("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function hasAdminSessionAccess(session: AdminSession | null | undefined) {
  const role = session?.user?.role;
  return Boolean(role && ADMIN_ROLES.has(role) && !session?.user?.banned);
}

export async function getAdminSession(bindings: AppBindings, headers: Headers): Promise<AdminSession | null> {
  const auth = getAuth(bindings);
  const cookieSession = await auth.api.getSession({ headers });

  if (hasAdminSessionAccess(cookieSession)) {
    return cookieSession;
  }

  const bearerToken = extractBearerToken(headers);
  if (!bearerToken) {
    return null;
  }

  const row = await getDb(bindings)
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, bearerToken), gt(sessions.expiresAt, new Date())))
    .get();

  if (!row) {
    return null;
  }

  const session: BearerAdminSession = {
    session: {
      id: row.session.id,
      token: row.session.token,
      userId: row.session.userId,
      expiresAt: row.session.expiresAt,
    },
    user: {
      id: row.user.id,
      name: row.user.name,
      username: row.user.username,
      email: row.user.email,
      role: row.user.role,
      banned: row.user.banned,
    },
  };

  return hasAdminSessionAccess(session) ? session : null;
}

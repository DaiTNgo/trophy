import { adminClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { backendFetch, BACKEND_URL } from "./fetch";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  basePath: "/api/admin/auth",
  plugins: [adminClient(), usernameClient()],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => (typeof window !== 'undefined' ? localStorage.getItem("admin_auth_token") || "" : ""),
    }
  },
});

export async function getCurrentAdminUser() {
  const response = await backendFetch("/api/admin/me");
  const body = (await response.json().catch(() => null)) as
    | {
        user?: {
          id: string;
          username?: string;
          email: string;
          name: string;
          role?: string;
          banned?: boolean | null;
        };
        message?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to load the current admin user.");
  }

  return body?.user ?? null;
}

export async function bootstrapFirstAdmin(input: {
  username: string;
  password: string;
}) {
  const response = await backendFetch(`/api/admin/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | { message?: string; user?: { username?: string; name?: string } }
    | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to bootstrap the first admin.");
  }

  return body;
}

export async function createAdminAccount(input: {
  username: string;
  password: string;
}) {
  const response = await backendFetch(`/api/admin/accounts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | { message?: string; user?: { name?: string } }
    | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to create admin account.");
  }

  return body;
}

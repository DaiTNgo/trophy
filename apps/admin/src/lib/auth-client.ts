import { adminClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { backendFetch, BACKEND_URL } from "./fetch";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  basePath: "/api/admin/auth",
  plugins: [adminClient(), usernameClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export async function bootstrapFirstAdmin(input: {
  username: string;
  password: string;
}) {
  const response = await backendFetch(`/api/admin/bootstrap`, {
    method: "POST",
    credentials: "include",
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
    credentials: "include",
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

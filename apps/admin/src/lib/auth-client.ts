import { adminClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { backendFetch, BACKEND_URL } from "./fetch";
import { backendClient } from "./backend-client";

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
  const response = await backendClient.api.admin.bootstrap.$post({ json: input });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to bootstrap the first admin."));
  }

  return response.json();
}

export async function getOnboardingStatus() {
  const response = await backendClient.api.admin.onboarding.status.$get();
  if (!response.ok) {
    throw new Error("Unable to load onboarding status.");
  }

  return response.json();
}

export async function createAdminAccount(input: {
  username: string;
  password: string;
}) {
  const response = await backendClient.api.admin.accounts.create.$post({ json: input });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to create admin account."));
  }

  return response.json();
}

export async function listAdminAccounts() {
  const response = await backendClient.api.admin.accounts.$get();
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to load admin accounts."));
  }
  const body = await response.json();
  return body.users;
}

export async function disableAdminAccount(userId: string) {
  const response = await backendClient.api.admin.accounts[":userId"].disable.$post({
    param: { userId },
  });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to disable this account."));
  }
}

export async function reactivateAdminAccount(userId: string) {
  const response = await backendClient.api.admin.accounts[":userId"].reactivate.$post({
    param: { userId },
  });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to reactivate this account."));
  }
}

export async function resetAdminAccountPassword(userId: string, password: string) {
  const response = await backendClient.api.admin.accounts[":userId"].password.$post({
    param: { userId },
    json: { password },
  });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to reset this password."));
  }
}

export async function recoverOtherSuperAdmin(currentPassword: string, newPassword: string) {
  const response = await backendClient.api.admin["super-admin"].recovery.$post({
    json: { currentPassword, newPassword },
  });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, "Unable to recover super-admin access."));
  }
}

async function getResponseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message || fallback;
}

export function hasAdminAccess(role?: string | null) {
  const roles = role?.split(",").map((value) => value.trim()) ?? [];
  return roles.includes("admin") || roles.includes("super-admin");
}

export function isSuperAdmin(role?: string | null) {
  return role?.split(",").map((value) => value.trim()).includes("super-admin") ?? false;
}

export function getAuthErrorMessage(
  error: { message?: string; status?: number } | null | undefined,
  fallback: string,
) {
  if (!error) {
    return fallback;
  }

  if (typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  if (error.status === 401) {
    return "Your session is no longer valid. Sign in again.";
  }

  if (error.status === 403) {
    return "This account is not allowed to perform that action.";
  }

  return fallback;
}

export function buildAdminEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

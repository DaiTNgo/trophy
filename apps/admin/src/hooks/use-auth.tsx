import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, AuthContextValue } from "../types";
import { authClient, getCurrentAdminUser } from "../lib/auth-client";
import { hasAdminAccess, getAuthErrorMessage, normalizeUsername } from "../lib/auth-utils";

const authContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession() {
    const nextUser = await getCurrentAdminUser().catch(() => null);

    if (!nextUser || !hasAdminAccess(nextUser.role)) {
      setUser(null);
      return;
    }

    setUser({
      id: nextUser.id,
      username: nextUser.username ?? nextUser.email,
      name: nextUser.name,
      role: nextUser.role,
      banned: nextUser.banned,
    });
  }

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const nextUser = await getCurrentAdminUser().catch(() => null);
        if (!active) {
          return;
        }

        if (!nextUser || !hasAdminAccess(nextUser.role)) {
          setUser(null);
          return;
        }

        setUser({
          id: nextUser.id,
          username: nextUser.username ?? nextUser.email,
          name: nextUser.name,
          role: nextUser.role,
          banned: nextUser.banned,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      login: async (username, password) => {
        const { data: signInData, error } = await authClient.signIn.username({
          username: normalizeUsername(username),
          password,
          rememberMe: true,
        });

        if (signInData?.token) {
          localStorage.setItem("admin_auth_token", signInData.token);
        }

        if (error) {
          return {
            ok: false,
            message: getAuthErrorMessage(error, "Unable to sign in."),
          };
        }

        const nextUser = await getCurrentAdminUser().catch(() => null);
        if (!hasAdminAccess(nextUser?.role)) {
          await authClient.signOut();
          localStorage.removeItem("admin_auth_token");
          setUser(null);
          return {
            ok: false,
            message: "This account is not allowed to access the admin workspace.",
          };
        }

        await refreshSession();
        return { ok: true };
      },
      logout: async () => {
        await authClient.signOut();
        localStorage.removeItem("admin_auth_token");
        setUser(null);
      },
      refreshSession: async () => {
        await refreshSession();
      },
      changePassword: async (currentPassword, newPassword) => {
        const { error } = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });

        if (error) {
          return {
            ok: false,
            message: getAuthErrorMessage(error, "Unable to change password."),
          };
        }

        await refreshSession();
        return { ok: true };
      },
    }),
    [isLoading, user],
  );

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}

export function useAuth() {
  const context = useContext(authContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

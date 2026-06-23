import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { Avatar, IconButton, Text } from "@medusajs/ui";
import { Bell, LogOut, MoreHorizontal, PanelLeft } from "lucide-react";
import {
  primarySidebarItems,
  operationsSidebarItems,
  bottomSidebarItems,
} from "../../lib/sidebar-config";
import type { AuthContextValue } from "../../types";
import { isSuperAdmin } from "../../lib/auth-utils";

function NavItem({ item, pathname }: { item: typeof primarySidebarItems[number]; pathname: string }) {
  const active = (item: typeof primarySidebarItems[number]) =>
    item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isActive = active(item);
  const expanded = item.children ? isActive : false;
  const Icon = item.icon;
  return (
    <div>
      <NavLink
        to={item.to}
        className={() =>
          [
            "transition-fg txt-compact-small-plus flex w-full items-center gap-x-1.5 rounded-md px-2 py-1 outline-none",
            isActive
              ? "bg-blue-50/60 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
          ].join(" ")
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </NavLink>
      {item.children && expanded ? (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.label}
                to={child.to}
                className={({ isActive }: { isActive: boolean }) =>
                  [
                    "transition-fg txt-compact-small-plus flex w-full items-center gap-x-1.5 rounded-md px-2 py-1 outline-none",
                    isActive
                      ? "bg-blue-50/60 text-blue-700"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
                  ].join(" ")
                }
              >
                <ChildIcon className="h-4 w-4 shrink-0" />
                {child.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarContent({ pathname, accountLabel, auth, navigate: nav }: {
  pathname: string;
  accountLabel: string;
  auth: AuthContextValue;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Avatar fallback="T" variant="squared" size="xsmall" />
          <Text size="base" weight="plus" className="text-gray-900">
            Trophy
          </Text>
        </div>
        <IconButton variant="transparent">
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {primarySidebarItems.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <Text
          size="xsmall"
          weight="plus"
          className="mb-1 px-3 uppercase tracking-[0.08em] text-gray-400"
        >
          Operations
        </Text>
        <nav className="space-y-0.5">
          {operationsSidebarItems
            .filter((item) => !item.requiresSuperAdmin || isSuperAdmin(auth.user?.role))
            .map((item) => (
              <NavItem key={item.label} item={item} pathname={pathname} />
            ))}
        </nav>
      </div>

      <div className="mt-auto">
        <nav className="space-y-0.5 px-3 py-1">
          {bottomSidebarItems.map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="border-t border-gray-200 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                fallback={accountLabel.charAt(0).toUpperCase()}
                variant="rounded"
                size="xsmall"
              />
              <div className="min-w-0">
                <Text size="small" weight="plus" className="truncate text-gray-800">
                  {accountLabel}
                </Text>
                <Text size="xsmall" className="truncate text-gray-400">
                  {auth.user?.role ?? "admin"}
                </Text>
              </div>
            </div>
            <IconButton
              variant="transparent"
              onClick={async () => {
                await auth.logout();
                nav("/login", { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </>
  );
}

export function DesktopSidebarContainer({ children }: { children: ReactNode }) {
  return (
    <aside className="hidden max-h-screen w-full flex-col overflow-hidden border-b border-gray-200 bg-white lg:flex lg:min-h-screen lg:w-[220px] lg:border-b-0 lg:border-r">
      {children}
    </aside>
  );
}

export function NavigationBar({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <IconButton variant="transparent" onClick={onToggle}>
          <PanelLeft className="h-4 w-4" />
        </IconButton>
        <Text size="base" weight="plus" className="text-gray-900">
          Trophy
        </Text>
      </div>
      <IconButton variant="transparent">
        <Bell className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export function MobileSidebarContainer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return open ? (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-[280px] flex-col overflow-hidden bg-white shadow-xl">
        {children}
      </aside>
    </div>
  ) : null;
}

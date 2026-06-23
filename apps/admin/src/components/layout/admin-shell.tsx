import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { IconButton, Text } from "@medusajs/ui";
import { Bell } from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { shellSections } from "../../lib/sidebar-config";
import {
  Shell,
  MainLayout,
  Topbar,
  Gutter,
} from "./shell";
import {
  NavigationBar,
  MobileSidebarContainer,
  DesktopSidebarContainer,
  SidebarContent,
} from "./sidebar";

export function AdminShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const accountLabel = auth.user?.username ?? auth.user?.name ?? "admin";
  const currentSection =
    shellSections.find((s) =>
      s.prefixes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
    )?.label ?? "Admin";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <Shell>
      <NavigationBar onToggle={() => setMobileSidebarOpen((v) => !v)} />

      <MobileSidebarContainer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}>
        <SidebarContent
          pathname={location.pathname}
          accountLabel={accountLabel}
          auth={auth}
          navigate={navigate}
        />
      </MobileSidebarContainer>

      <DesktopSidebarContainer>
        <SidebarContent
          pathname={location.pathname}
          accountLabel={accountLabel}
          auth={auth}
          navigate={navigate}
        />
      </DesktopSidebarContainer>

      <MainLayout>
        <Topbar>
          <div className="flex items-center gap-2">
            <Text size="small" weight="plus" className="text-gray-500">
              {currentSection}
            </Text>
          </div>
          <IconButton variant="transparent">
            <Bell className="h-4 w-4" />
          </IconButton>
        </Topbar>

        <Gutter>
          <Outlet />
        </Gutter>
      </MainLayout>
    </Shell>
  );
}

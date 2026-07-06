import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { IconButton, Text } from "@medusajs/ui";
import { Bell, PanelLeft } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/use-auth";
import { useBreadcrumbs } from "../../hooks/use-breadcrumbs";
import { shellSections } from "../../lib/sidebar-config";
import {
  Shell,
  MainLayout,
  Topbar,
  Gutter,
} from "./shell";
import {
  MobileSidebarContainer,
  DesktopSidebarContainer,
  SidebarContent,
} from "./sidebar";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 1024,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function AdminShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const accountLabel = auth.user?.username ?? auth.user?.name ?? "admin";
  const { breadcrumbs } = useBreadcrumbs();
  const currentSection =
    shellSections.find((s) =>
      s.prefixes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
    )?.label ?? "Admin";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  }, [isMobile]);

  return (
    <Shell>
      <MobileSidebarContainer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}>
        <SidebarContent
          pathname={location.pathname}
          accountLabel={accountLabel}
          auth={auth}
          navigate={navigate}
        />
      </MobileSidebarContainer>

      <DesktopSidebarContainer collapsed={sidebarCollapsed}>
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
            <IconButton variant="transparent" onClick={handleToggle}>
              <PanelLeft className="h-4 w-4" />
            </IconButton>
            {breadcrumbs.length > 0 ? (
              <div className="flex items-center gap-x-2 text-sm">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-x-2">
                    {idx > 0 && <span className="text-ui-fg-muted">▸</span>}
                    {crumb.path ? (
                      <Link to={crumb.path} className="text-ui-fg-muted hover:text-ui-fg-base transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-ui-fg-base">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <Text size="small" weight="plus" className="text-gray-500">
                {currentSection}
              </Text>
            )}
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

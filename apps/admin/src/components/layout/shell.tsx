import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f4] text-slate-900">
      <div className="flex h-full flex-col lg:flex-row">
        {children}
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}

export function Topbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
      {children}
    </div>
  );
}

export function Gutter({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
  );
}

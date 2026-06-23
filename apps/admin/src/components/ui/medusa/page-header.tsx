import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-[28px] bg-white px-6 py-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-slate-500">{description}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}

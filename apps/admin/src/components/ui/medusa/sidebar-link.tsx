import { NavLink } from "react-router";

export function SidebarLink({
  to,
  label,
  description,
}: {
  to: string;
  label: string;
  description: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-3xl border p-4 text-left transition",
          isActive
            ? "border-amber-300 bg-amber-50 text-slate-950"
            : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700 hover:bg-slate-900",
        ].join(" ")
      }
    >
      <p className="text-base font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-6 text-inherit/75">{description}</p>
    </NavLink>
  );
}

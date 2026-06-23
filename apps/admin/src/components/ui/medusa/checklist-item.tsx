export function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={complete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
        {complete ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

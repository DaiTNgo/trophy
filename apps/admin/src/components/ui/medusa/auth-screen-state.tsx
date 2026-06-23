export function AuthScreenState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="rounded-[28px] border border-stone-200 bg-white px-8 py-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trophy Admin</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function TextField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = "text",
  list,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  list?: string;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        name={name}
        type={type}
        list={list}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "w-full rounded-2xl border bg-stone-50 px-4 py-4 outline-none transition",
          error ? "border-rose-300 ring-4 ring-rose-100" : "border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100",
        ].join(" ")}
      />
      {error ? <span className="mt-2 block text-sm text-rose-700">{error}</span> : null}
      {!error && hint ? <span className="mt-2 block text-sm text-slate-500">{hint}</span> : null}
    </label>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

type TemplateListItem = {
  id: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  name: string;
  revision: number;
  previewUrl: string;
  blockCount: number;
  createdAt: string;
};
import { backendFetch } from "./lib/fetch";

export default function CustomizationTemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await backendFetch(`/api/admin/customizations/templates`);
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        const data = await response.json();
        if (active) {
          setTemplates(data.templates as TemplateListItem[]);
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Failed to load templates.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="space-y-6">
        <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Customization</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Templates</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Loading templates...</p>
        </header>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Customization</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Templates</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{error}</p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Customization</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Templates</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Published customization templates and their block configurations.
            </p>
          </div>
          <Link
            to="/customization-templates?edit=new"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            New template
          </Link>
        </div>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-[32px] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">No templates yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-[32px] border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-t-[32px] bg-stone-100">
                {template.previewUrl ? (
                  <img
                    src={template.previewUrl}
                    alt={template.name}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400">
                    No preview
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{template.productTitle}</p>
                <p className="mt-1 text-xs text-slate-400">/{template.productHandle}</p>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>Rev {template.revision}</span>
                  <span>{template.blockCount} blocks</span>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/customization-templates?edit=${template.productId}`)}
                    className="rounded-full border border-dashed border-slate-400 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Create template
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/customization-templates?edit=${template.id}`)}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

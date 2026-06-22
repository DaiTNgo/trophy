import { Link } from "react-router";
import type { Route } from "./+types/customize";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

type TemplateSummary = {
  id: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  name: string;
  revision: number;
  previewUrl: string;
  zoneCount: number;
  createdAt: string;
};

export async function clientLoader({}: Route.ClientLoaderArgs) {
  const response = await fetch(`${BACKEND_URL}/api/customizations/templates`);
  if (!response.ok) {
    throw new Response("Failed to fetch templates", { status: 500 });
  }
  const data = (await response.json()) as { templates: TemplateSummary[] };
  return data.templates;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Choose a trophy customization template" },
    { name: "description", content: "Browse available customization templates." },
  ];
}

export default function Customize({ loaderData }: Route.ComponentProps) {
  const templates = loaderData;

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[32px] bg-[#13231d] p-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">
            Trophy Studio
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose a template
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/70">
            Select a template below to start customizing your trophy.
          </p>
        </header>

        <div className="mt-8">
          {templates.length === 0 ? (
            <div className="rounded-[28px] border border-black/5 bg-white p-12 text-center shadow-[0_20px_55px_rgba(35,40,36,0.06)]">
              <p className="text-lg font-semibold text-slate-800">No templates available</p>
              <p className="mt-2 text-sm text-slate-500">
                Check back later for new customization templates.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  to={`/customize/${template.id}`}
                  className="group rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_20px_55px_rgba(35,40,36,0.06)] transition hover:shadow-[0_24px_70px_rgba(35,40,36,0.12)]"
                >
                  <div className="overflow-hidden rounded-[20px] bg-stone-100">
                    <img
                      src={template.previewUrl}
                      alt={template.name}
                      className="aspect-square w-full object-contain"
                    />
                  </div>
                  <div className="mt-4 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-800 group-hover:text-[#13231d]">
                      {template.name}
                    </h2>
                    <p className="text-sm text-slate-500">{template.productTitle}</p>
                    <p className="text-xs text-slate-400">
                      {template.zoneCount} zone{template.zoneCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

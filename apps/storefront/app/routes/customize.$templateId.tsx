import type { CustomizationTemplate } from "@trophy/customization";
import CupCustomizer from "../components/CupCustomizer";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

type LoaderData = { 
  template: CustomizationTemplate; 
  dynamicFonts: import("@trophy/customization").DynamicFontFamily[];
};

export async function clientLoader({
  params,
}: {
  params: { templateId: string };
}): Promise<LoaderData> {
  const [templateRes, fontsRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/customizations/templates/${params.templateId}`),
    fetch(`${BACKEND_URL}/api/brand-assets/fonts`)
  ]);

  if (!templateRes.ok) {
    throw new Response("Template not found", { status: 404 });
  }

  const templateData = (await templateRes.json()) as { template: CustomizationTemplate };
  const fontsData = fontsRes.ok ? (await fontsRes.json()) as { fonts: any[] } : { fonts: [] };

  return { 
    template: templateData.template, 
    dynamicFonts: fontsData.fonts.map(f => ({
      id: f.id,
      name: f.name,
      regularAssetId: f.regularAssetId || null,
      boldAssetId: f.boldAssetId || null,
      italicAssetId: f.italicAssetId || null,
      boldItalicAssetId: f.boldItalicAssetId || null,
    }))
  };
}

export function meta({ loaderData }: { loaderData: LoaderData }) {
  return [
    { title: loaderData?.template ? `Customize ${loaderData.template.name}` : "Customize template" },
    { name: "description", content: "Customize your trophy template." },
  ];
}

export default function CustomizeTemplate({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  return <CupCustomizer template={loaderData.template} dynamicFonts={loaderData.dynamicFonts} />;
}

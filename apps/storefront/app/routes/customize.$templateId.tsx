import type { CustomizationTemplate } from "@trophy/customization";
import CupCustomizer from "../components/CupCustomizer";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

type LoaderData = CustomizationTemplate;

export async function clientLoader({
  params,
}: {
  params: { templateId: string };
}): Promise<LoaderData> {
  const response = await fetch(
    `${BACKEND_URL}/api/customizations/templates/${params.templateId}`,
  );
  if (!response.ok) {
    throw new Response("Template not found", { status: 404 });
  }
  const data = (await response.json()) as { template: CustomizationTemplate };
  return data.template;
}

export function meta({ loaderData }: { loaderData: LoaderData }) {
  return [
    { title: loaderData ? `Customize ${loaderData.name}` : "Customize template" },
    { name: "description", content: "Customize your trophy template." },
  ];
}

export default function CustomizeTemplate({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  return <CupCustomizer template={loaderData} />;
}

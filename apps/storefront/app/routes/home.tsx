import type { Route } from "./+types/home";
import CupCustomizer from "../components/CupCustomizer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Customize your trophy cup" },
    { name: "description", content: "Create production-ready trophy cup artwork." },
  ];
}

export default function Home() {
  return <CupCustomizer />;
}

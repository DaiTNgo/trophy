import type { Route } from "./+types/home";
import { useScrollReveal } from "../hooks/useScrollReveal";

import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/home/HeroSection";
import { BestSellersSection } from "../components/home/BestSellersSection";
import { ManufacturerSection } from "../components/home/ManufacturerSection";
import { CategoriesSection } from "../components/home/CategoriesSection";
import { TrustedBrandsSection } from "../components/home/TrustedBrandsSection";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PHÙNG THỊ - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp" },
    { name: "description", content: "Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam." },
  ];
}

export default function Home() {
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <BestSellersSection />
      <ManufacturerSection />
      <CategoriesSection />
      <TrustedBrandsSection />
      <Footer />
    </div>
  );
}

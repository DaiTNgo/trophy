import { useSearchParams } from "react-router";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { FilterChips } from "../components/products/FilterChips";
import { CatalogProductCard } from "../components/products/CatalogProductCard";
import { Pagination } from "../components/shared/Pagination";
import type { Route } from "./+types/products";

// Mock Data Loader
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const activeCategory = url.searchParams.get("category") || "Tất cả";
  const currentPage = Number(url.searchParams.get("page")) || 1;

  const categories = [
    "Tất cả",
    "Cúp Pha Lê",
    "Cúp Hợp Kim",
    "Kỷ Niệm Chương",
    "Bảng Vinh Danh",
    "Quà Tặng Custom"
  ];

  const allProducts = [
    {
      title: "Cúp Hợp Kim KL1",
      category: "Cúp Hợp Kim",
      price: "2.450.000 VNĐ",
      imageAlt: "Cúp Hợp Kim KL1",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYjkEhbe-fEEaHxGsXywDp8MB6pi78G0-1kId6IKN5I9Vjfa7odFudqsVAkKQDh1CVse3GAZv-0a83A5Dv5rIFg13RJRSiIO-L24yleWWtUlbKRoGAjuAoCxnf5U5AS8HlZwgtmXxfA4IyQhIODEnOlJO6tCsxHcv8YqwHJrz2nWNKlJ5EoXcQJNhlPGfmKeduwrDsir1X0LVbosAskXRCb6Iw4yDHjuhCcLVfM8prjv5sKXc997L_"
    },
    {
      title: "Cúp Pha Lê Diamond",
      category: "Pha Lê Cao Cấp",
      price: "1.890.000 VNĐ",
      imageAlt: "Cúp Pha Lê Diamond",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuB82Na8cyLdjyf3RPpEkUKpHNVAPARNtu2tFw8nIT_mUIlg3HUgV8fWn5kqr3W6IZ9M9251la0btt83hVowv5HrBMoy25e8Qh9h2IWTPJFE98li9HY85ooxvguTeXa9cYEnT6EtkalkpTeNbfbqkFwR0mFTvcqMcQZh_fep60AoXHEM1YWAtUGgSWjzylqErckQZyIvW1Xp5nK_o_9Mel935H1RQsqh-7DxPFVykl4uzNFVwQ3_Q5Ip"
    },
    {
      title: "Bảng Vinh Danh GĐ17",
      category: "Bảng Vinh Danh",
      price: "3.200.000 VNĐ",
      imageAlt: "Bảng Vinh Danh GĐ17",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxn1l7GDgE8X-ZseABJhqjf2QVpcKhpmOpBjfOGkWP3dp-hHtGS8_a8mK5gDQkTUc44syd-Yq_UOQhWKq2GyIWbpgM7xImR3NyE-iVNt6hlSWpaeFuZrst-L-rwQs4XJfGhfXHNGrC_EdLIaK5XxM31Tc3AAgRak6hARuTuH2uLbUgN_nS_uCSCzIlgozDn4Lq6sLOsV8wqgTfGPRCInrcHclaAy9jDnnAc62MWGrxJzUssMWxCuNX"
    },
    {
      title: "Victory Flame Alloy",
      category: "Thiết Kế Độc Bản",
      price: "4.500.000 VNĐ",
      imageAlt: "Victory Flame Alloy",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuAuBfe_VElNeiu9vPWjqF8O63AW5YcMnD5BBx88K4Ku3G5QX-oq5OI_5smZycDZVNT6AIkGa_bfTomViywp1AqSyZvr20SGonT1SoC_POetVmqwA71nGie7VMJ0RS51hkZdtfVeby_RrNqvrMpVKhIkolzJ-a-_Flsi1JfY_M3WgQm0XBBKp2z5zl-dMwSe7oP42-xQHOebQ1IrThtBgU4Azfu3T5MZJ9Uq-7J0ZSprEXZyAhux1aTa"
    },
    {
      title: "Circle of Excellence",
      category: "Kỷ Niệm Chương",
      price: "950.000 VNĐ",
      imageAlt: "Circle of Excellence",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuACQUaI-OHZuRmvptM-oiazQgKl7kS1rtmKSFbTXZL41ED-d4ZfG4OhdOxSA36sEwEOyrSXrkAhVOkQg1Od3YzBjNhXlxAnL63bwr_dTwnTs3mxOuN7xjXA-qkvEFGyw8oDPD-sI_-VmZFyyhOGbjwMxi8Hjuhoj8NNsnUBRCCzGEzK0VuPfqOEm8zJcGGOJYvlDCXCkzskQkHGLu4RMWIr3dFd_upve9YM0yiSD-pFdo-g__cYu2Q4"
    },
    {
      title: "Esports Vanguard",
      category: "Quà Tặng Custom",
      price: "5.800.000 VNĐ",
      imageAlt: "Esports Vanguard",
      imageSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnMnGimzovUlLHiAhL4244DFUs9YOPwhX0ogrYKN8QY0jdC_hblNsTcygjRvt6SRO2LsPPvDYL2qI52FJHIUEa5Vc7HX-Hpz1mVMd8Fw6E1PGJw6Lwjf-R2_ZE8TiPlzMt9UMsRLFEmhsiARFc3sT05uDc3PAANtdF3_LHi_4iO0UUIdqizl6e-WNRjwksuTBkI32tzIk_xErKCcxqNvQLEd4a9PPCRigU63VkZ5Zy5q7mVI1FG2BQ"
    }
  ];

  const products = activeCategory === "Tất cả" 
    ? allProducts 
    : allProducts.filter(p => p.category === activeCategory);

  return {
    categories,
    products,
    activeCategory,
    currentPage,
    totalPages: 10
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { categories, products, activeCategory, currentPage, totalPages } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategorySelect = (category: string) => {
    setSearchParams((prev) => {
      prev.set("category", category);
      prev.set("page", "1");
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set("page", page.toString());
      return prev;
    });
  };

  return (
    <div className="bg-background min-h-screen font-body-md text-on-background">
      <Navbar />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-8">
            DANH MỤC SẢN PHẨM
          </h1>
          {/* Quick Filter Chips */}
          <FilterChips 
            categories={categories} 
            activeCategory={activeCategory} 
            onSelect={handleCategorySelect}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
          {products.map((product, index) => (
            <CatalogProductCard key={index} {...product} />
          ))}
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      </main>

      <Footer />
    </div>
  );
}

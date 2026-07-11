import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Menu, Search, ShoppingCart, Package } from "lucide-react";
import { useNavbarScroll } from "@/hooks/useNavbarScroll";
import { useLockBody } from "@/hooks/useLockBody";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useCart } from "@/hooks/use-cart";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Container } from "@/components/container";
import { MegaMenuGrid } from "./navbar/mega-menu-grid";
import { NavbarMobileMenu } from "./navbar/mobile-menu";
import { NavbarSearchDialog } from "./navbar/search-dialog";
import { NavbarMoreDropdown } from "./navbar/more-dropdown";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { LanguageSwitcher } from "./language-switcher";
import type { StorefrontCategory, StorefrontCollection } from "@/lib/api";
import { getLocalized } from "@/lib/translation";

interface NavbarProps {
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  locale?: string;
}

export function Navbar({ categories, collections, locale = "vi" }: NavbarProps) {
  const { itemCount } = useCart();
  useNavbarScroll();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    "products" | "themes" | null
  >(null);

  const dropdownRef = useClickOutside<HTMLDivElement>(() =>
    setActiveDropdown(null),
  );

  useLockBody(isMobileMenuOpen);

  const productMenuItems = categories.map((cat) => ({
    title: getLocalized(cat.name, locale),
    imageUrl: cat.imageUrl,
    href: `/products?category=${encodeURIComponent(cat.handle)}`,
  }));

  const themeMenuItems = collections.map((col) => ({
    title: getLocalized(col.title, locale),
    imageUrl: col.imageUrl,
    href: `/collections/${encodeURIComponent(col.handle)}`,
  }));

  return (
    <div className="shadow-sm">
      <header
        className="w-full bg-white flex flex-col relative transition-all duration-300"
        id="main-nav"
      >
        <div ref={dropdownRef}>
          <Container className="flex items-center justify-between xl:justify-start gap-4 h-20 lg:gap-8 bg-white relative z-20">
            <div className="flex xl:hidden shrink-0 w-10">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-brand-strong"
                aria-label="Mở menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <Link
              to="/"
              className="shrink-0 xl:mr-4 absolute left-1/2 -translate-x-1/2 xl:relative xl:left-0 xl:translate-x-0"
            >
              <img
                alt="PHÙNG THỊ"
                className="h-12 md:h-20 w-auto object-contain"
                src="/logo.png"
              />
            </Link>

            <div className="hidden h-full shrink-0 items-center gap-2 text-[13px] font-bold tracking-wide text-brand-strong xl:flex">
              <div className="h-[40px] flex items-center relative">
                <button
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === "products" ? null : "products",
                    )
                  }
                  className={`flex items-center gap-1 px-4 h-full transition-colors uppercase relative z-[51] hover:text-primary ${activeDropdown === "products" ? "text-primary" : ""}`}
                  style={{
                    marginBottom: activeDropdown === "products" ? "-1px" : "0",
                    borderBottomColor:
                      activeDropdown === "products" ? "white" : "transparent",
                  }}
                >
                  <ChevronDown
                    className={`text-[20px] transition-transform duration-300 ${activeDropdown === "products" ? "rotate-180" : ""}`}
                  />
                  SẢN PHẨM
                </button>
              </div>

              {collections.length > 0 && (
                <div className="h-10 flex items-center relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === "themes" ? null : "themes",
                      )
                    }
                    className={`flex items-center gap-1 px-4 h-full transition-colors uppercase relative z-[51] hover:text-primary ${activeDropdown === "themes" ? "text-primary" : ""}`}
                    style={{
                      marginBottom: activeDropdown === "themes" ? "-1px" : "0",
                      borderBottomColor:
                        activeDropdown === "themes" ? "white" : "transparent",
                    }}
                  >
                    <ChevronDown
                      className={`text-[20px] transition-transform duration-300 ${activeDropdown === "themes" ? "rotate-180" : ""}`}
                    />
                    CHỦ ĐỀ
                  </button>
                </div>
              )}
            </div>

            <NavbarSearchDialog
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
              className="hidden"
            />

            <div className="flex w-10 shrink-0 items-center justify-end gap-4 text-brand-strong xl:w-auto">
              <LanguageSwitcher />
              <NavbarMoreDropdown />

              <Link
                to="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand-strong transition-colors hover:bg-surface-subtle hover:text-brand-support"
              >
                <ShoppingCart className="text-[24px]" />
                <div className="absolute right-0 top-0 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-action-positive px-1 text-[10px] font-bold leading-none text-white">
                  {itemCount}
                </div>
              </Link>
            </div>
          </Container>

          {activeDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 animate-in border-t border-gray-100 bg-white shadow-xl fade-in slide-in-from-top-2">
              <MegaMenuGrid
                items={
                  activeDropdown === "products"
                    ? productMenuItems
                    : themeMenuItems
                }
              />
            </div>
          )}
        </div>

        <Container className="xl:hidden mb-4">
          <NavbarSearchDialog
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
            className="w-full max-w-none"
          />
        </Container>

        <NavbarMobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          categories={categories}
          collections={collections}
          locale={locale}
        />
      </header>

      {categories.length > 0 && (
        <div className="relative z-10 hidden w-full border-y border-gray-100 bg-white sm:block">
          <Container className="relative py-3">
            <Carousel
              opts={{
                align: "start",
                loop: false,
                dragFree: true,
                duration: 5,

              }}
              className="px-8 sm:px-8"
            >
              <CarouselContent className="gap-4 md:gap-8 ml-0">
                {categories.map((cat) => (
                  <CarouselItem
                    key={cat.id}
                    className="pl-0 basis-1/4 md:basis-1/5 lg:basis-auto"
                  >
                    <Link
                      to={`/products?category=${encodeURIComponent(cat.handle)}`}
                      className="block"
                    >
                      <div className="lg:hidden w-[65px] h-[65px] mx-auto rounded-lg overflow-hidden bg-gray-100 mb-1">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={getLocalized(cat.name, locale)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <span className="block text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-brand-strong transition-colors hover:text-brand-support lg:text-left lg:text-[13px] lg:whitespace-nowrap">
                        {getLocalized(cat.name, locale)}
                      </span>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                size={"icon"}
                variant={"default"}
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-10"
                classNameIfDisabled="hidden"
              />
              <CarouselNext
                size={"icon"}
                variant={"default"}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-10"
                classNameIfDisabled="hidden"
              />
            </Carousel>
          </Container>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Search, ShoppingCart, Package } from "lucide-react";
import { useNavbarScroll } from "@/hooks/useNavbarScroll";
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
import { DesktopSearch } from "./navbar/DesktopSearch";
import { NavbarSearchDialog } from "./navbar/search-dialog";
import { NavbarMoreDropdown } from "./navbar/more-dropdown";
import { LanguageSwitcher } from "./language-switcher";
import type { StorefrontCategory, StorefrontCollection } from "@/lib/api";
import { getLocalized } from "@/lib/translation";

interface NavbarProps {
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  locale?: string;
  hideCategoryStripOnMobile?: boolean;
}

export function Navbar({
  categories,
  collections,
  locale = "vi",
  hideCategoryStripOnMobile = false,
}: NavbarProps) {
  const { itemCount } = useCart();
  const { isSticky, slideIn } = useNavbarScroll();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    "products" | "themes" | null
  >(null);
  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false);

  const dropdownRef = useClickOutside<HTMLDivElement>(() =>
    setActiveDropdown(null),
  );

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

  const updateCategoryStripScrollState = useCallback(() => {
    const node = categoryStripRef.current;

    if (!node) {
      setCanScrollCategoriesLeft(false);
      setCanScrollCategoriesRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    setCanScrollCategoriesLeft(hasOverflow && node.scrollLeft > 1);
    setCanScrollCategoriesRight(hasOverflow && node.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const node = categoryStripRef.current;

    if (!node) {
      return;
    }

    updateCategoryStripScrollState();
    node.addEventListener("scroll", updateCategoryStripScrollState, { passive: true });
    window.addEventListener("resize", updateCategoryStripScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateCategoryStripScrollState)
        : null;

    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateCategoryStripScrollState);
      window.removeEventListener("resize", updateCategoryStripScrollState);
      resizeObserver?.disconnect();
    };
  }, [categories.length, updateCategoryStripScrollState]);

  const scrollCategories = useCallback((direction: "left" | "right") => {
    const node = categoryStripRef.current;

    if (!node) return;

    node.scrollBy({
      left: direction === "left" ? -node.clientWidth * 0.75 : node.clientWidth * 0.75,
      behavior: "smooth",
    });
  }, []);

  const hasCategoryStripControls = canScrollCategoriesLeft || canScrollCategoriesRight;

  return (
    <>
    {isSticky && <div className="h-20" />}
    <div
      id="navbar-container"
      className={`
        left-0 right-0 z-50 shadow-sm
        transition-all duration-500 ease-in-out
        ${isSticky ? "fixed top-0" : "relative"}
        ${slideIn ? "translate-y-0" : isSticky ? "-translate-y-full" : ""}
      `}
    >
      <header
        className="w-full bg-white flex flex-col relative transition-all duration-300"
        id="main-nav"
      >
        <div ref={dropdownRef}>
          <Container className="flex items-center justify-between xl:justify-start gap-4 h-20 lg:gap-8 bg-white relative z-20">
            <div className="flex xl:hidden shrink-0 items-center gap-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-brand-strong"
                aria-label="Mở menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <NavbarSearchDialog />
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
              <div></div>
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

            <DesktopSearch />

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

        <NavbarMobileMenu
          isOpen={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
          categories={categories}
          collections={collections}
          locale={locale}
        />
      </header>

      {categories.length > 0 && (
        <div
          className={`relative z-10 w-full border-y border-gray-100 bg-white ${
            hideCategoryStripOnMobile ? "hidden lg:block" : "hidden sm:block"
          }`}
        >
          <Container className="relative py-3">
            <div className="relative">
              {hasCategoryStripControls ? (
                <div className="pointer-events-none absolute inset-y-0 -left-4 -right-4 z-10 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Scroll categories left"
                    className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-opacity ${
                      canScrollCategoriesLeft ? "opacity-100" : "opacity-0"
                    }`}
                    disabled={!canScrollCategoriesLeft}
                    onClick={() => scrollCategories("left")}
                  >
                    <ChevronLeft className="h-5 w-5 stroke-[1.5]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll categories right"
                    className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-opacity ${
                      canScrollCategoriesRight ? "opacity-100" : "opacity-0"
                    }`}
                    disabled={!canScrollCategoriesRight}
                    onClick={() => scrollCategories("right")}
                  >
                    <ChevronRight className="h-5 w-5 stroke-[1.5]" />
                  </button>
                </div>
              ) : null}

              <div
                ref={categoryStripRef}
                className="flex gap-4 overflow-x-auto scroll-smooth md:gap-8"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${encodeURIComponent(cat.handle)}`}
                    className="block shrink-0 basis-1/4 md:basis-1/5 lg:basis-auto"
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
                ))}
              </div>
            </div>
          </Container>
        </div>
      )}
    </div>
    </>
  );
}

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useNavbarScroll } from "../../hooks/useNavbarScroll";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { backendAssetUrl } from "../../lib/api";
import type { StorefrontCategory, StorefrontCollection } from "../../lib/api";
import { useCart } from "../../hooks/use-cart";

interface MegaMenuGridProps {
  items: Array<{
    title: string;
    imageUrl: string | null;
    href: string;
  }>;
}

function MegaMenuGrid({ items }: MegaMenuGridProps) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 border-gray-100">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="flex flex-row items-center justify-start px-8 py-6 bg-white hover:bg-gray-50 transition-colors gap-4 border-r border-b border-gray-100 group [&:nth-child(5n)]:border-r-0 lg:[&:nth-child(5n)]:border-r-0 md:[&:nth-child(4n)]:border-r-0 max-md:[&:nth-child(2n)]:border-r-0"
        >
          <div className="w-[50px] flex-shrink-0 flex items-center justify-center">
            {item.imageUrl ? (
              <img
                src={backendAssetUrl(item.imageUrl)}
                alt={item.title}
                className="max-w-[50px] max-h-[50px] object-contain group-hover:scale-110 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-[50px] h-[50px] bg-gray-100 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-gray-400">
                  category
                </span>
              </div>
            )}
          </div>
          <span className="text-[12px] font-bold text-[#1a2e44] group-hover:text-primary uppercase tracking-wider text-left leading-tight">
            {item.title}
          </span>
        </Link>
      ))}
    </div>
  );
}

interface NavbarProps {
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
}

export function Navbar({ categories, collections }: NavbarProps) {
  const { itemCount } = useCart();
  useNavbarScroll();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isThemesOpen, setIsThemesOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const themesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (
        productsRef.current &&
        !productsRef.current.contains(event.target as Node)
      ) {
        setIsProductsOpen(false);
      }
      if (
        themesRef.current &&
        !themesRef.current.contains(event.target as Node)
      ) {
        setIsThemesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const productMenuItems = categories.map((cat) => ({
    title: cat.name,
    imageUrl: cat.imageUrl,
    href: `/products?category=${encodeURIComponent(cat.handle)}`,
  }));

  const themeMenuItems = collections.map((col) => ({
    title: col.title,
    imageUrl: col.imageUrl,
    href: `/collections/${encodeURIComponent(col.handle)}`,
  }));

  return (
    <header
      className="w-full bg-white flex flex-col z-50 sticky top-0 shadow-sm transition-all duration-300"
      id="main-nav"
    >
      <div className="flex items-center justify-between px-4 md:px-8 h-20 max-w-[1600px] w-full mx-auto gap-4 lg:gap-8 bg-white relative z-20">
        <Link to="/" className="flex-shrink-0">
          <img
            alt="PHÙNG THỊ"
            className="h-12 md:h-14 w-auto object-contain"
            src="/logo.png"
          />
        </Link>

        <div className="hidden xl:flex items-center gap-2 text-[13px] font-bold text-[#1a2e44] tracking-wide shrink-0 h-full">
          <div
            className="h-[40px] flex items-center relative"
            ref={productsRef}
          >
            <button
              onClick={() => {
                setIsProductsOpen(!isProductsOpen);
                setIsThemesOpen(false);
              }}
              className={`flex items-center gap-1 px-4 h-full transition-colors uppercase relative z-[51] hover:text-primary `}
              style={{
                marginBottom: isProductsOpen ? "-1px" : "0",
                borderBottomColor: isProductsOpen ? "white" : "transparent",
              }}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isProductsOpen ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
              SẢN PHẨM
            </button>
          </div>

          {collections.length > 0 && (
            <div className="h-10 flex items-center relative" ref={themesRef}>
              <button
                onClick={() => {
                  setIsThemesOpen(!isThemesOpen);
                  setIsProductsOpen(false);
                }}
                className={`flex items-center gap-1 px-4 h-full transition-colors uppercase relative z-[51] hover:text-primary`}
                style={{
                  marginBottom: isThemesOpen ? "-1px" : "0",
                  borderBottomColor: isThemesOpen ? "white" : "transparent",
                }}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isThemesOpen ? "rotate-180" : ""}`}
                >
                  expand_more
                </span>
                CHỦ ĐỀ
              </button>
            </div>
          )}
        </div>

        {isProductsOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+1px)] bg-white  shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
            <MegaMenuGrid items={productMenuItems} />
          </div>
        )}

        {isThemesOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+1px)] bg-white shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8">
              <MegaMenuGrid items={themeMenuItems} />
            </div>
          </div>
        )}

        <div className="flex-grow hidden md:flex items-center max-w-3xl">
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <div className="relative w-full cursor-text group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[22px]">
                  search
                </span>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-12 pr-4 text-left text-[14px] text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-all">
                  Tìm kiếm sản phẩm, danh mục...
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-none w-screen h-screen m-0 !p-0 rounded-none border-none bg-surface/95 backdrop-blur-md flex flex-col top-0 !translate-y-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 duration-300">
              <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
              <div className="flex flex-col h-full w-full max-w-container-max mx-auto px-margin-desktop py-8">
                <div className="relative w-full max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                  <Input
                    autoFocus
                    className="w-full bg-transparent border-0 border-b-2 border-on-surface-variant/20 rounded-none px-0 pb-4 h-auto text-3xl font-light text-on-surface focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary placeholder:text-on-surface-variant/30"
                    placeholder="Nhập từ khóa tìm kiếm..."
                    type="text"
                  />
                  <span className="material-symbols-outlined absolute right-0 top-1 text-3xl text-on-surface-variant/50">
                    search
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 text-[#1a2e44] shrink-0">
          <div className="relative hidden md:block" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition-colors ${isMoreOpen ? "text-primary" : ""}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                add_circle
              </span>
              THÊM
            </button>

            {isMoreOpen && (
              <div className="absolute top-full right-0 mt-6 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-2 flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
                <Link
                  onClick={() => setIsMoreOpen(false)}
                  to="/news"
                  className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                >
                  Tin tức
                </Link>
                <Link
                  onClick={() => setIsMoreOpen(false)}
                  to="/contact"
                  className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                >
                  Thông tin liên hệ
                </Link>
                <Link
                  onClick={() => setIsMoreOpen(false)}
                  to="/about"
                  className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                >
                  Về chúng tôi
                </Link>
                <Link
                  onClick={() => setIsMoreOpen(false)}
                  to="/order-lookup"
                  className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                >
                  Tra cứu đơn hàng
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/cart"
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors relative text-[#1a2e44] hover:text-primary"
          >
            <span className="material-symbols-outlined text-[24px]">
              shopping_cart
            </span>
            <div className="absolute top-0 right-0 bg-[#e03a3a] text-white text-[10px] font-bold h-[16px] min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white leading-none">
              {itemCount}
            </div>
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="w-full border-t border-b border-gray-100 bg-white relative z-10">
          <div className="flex items-center gap-8 px-4 md:px-8 py-3 max-w-[1600px] w-full mx-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.handle)}`}
                className="text-[13px] font-bold text-[#1a2e44] uppercase tracking-wide whitespace-nowrap hover:text-primary transition-colors flex-shrink-0"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

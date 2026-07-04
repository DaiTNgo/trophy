import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useNavbarScroll } from "../../hooks/useNavbarScroll";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

const categoryLink = (name: string) =>
  name ? `/products?category=${encodeURIComponent(name)}` : "#";

const megaMenuCategories = [
  { name: "CÚP PHA LÊ", icon: "diamond", displayName: "Cúp Pha Lê" },
  { name: "CÚP HỢP KIM", icon: "emoji_events", displayName: "Cúp Hợp Kim" },
  { name: "KỶ NIỆM CHƯƠNG", icon: "workspace_premium", displayName: "Kỷ Niệm Chương" },
  { name: "BẢNG VINH DANH", icon: "assignment", displayName: "Bảng Vinh Danh" },
  { name: "QUÀ TẶNG CUSTOM", icon: "stars", displayName: "Quà Tặng Custom" },
  { name: "VẬT LIỆU", icon: "category", displayName: "" },
  { name: "SẢN PHẨM MỚI", icon: "new_releases", displayName: "Sản Phẩm Mới" },
  { name: "DOANH NGHIỆP", icon: "business", displayName: "" },
  { name: "THỂ THAO", icon: "sports_soccer", displayName: "" },
  { name: "LINH KIỆN", icon: "build", displayName: "" },
].map((cat) => ({
  ...cat,
  path: cat.displayName ? categoryLink(cat.displayName) : "#",
}));

export function Navbar() {
  useNavbarScroll();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  
  const moreRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (productsRef.current && !productsRef.current.contains(event.target as Node)) {
        setIsProductsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white flex flex-col z-50 sticky top-0 shadow-sm transition-all duration-300" id="main-nav">
      {/* Top Row: Brand & Main Actions */}
      <div className="flex items-center justify-between px-4 md:px-8 h-20 max-w-[1600px] w-full mx-auto gap-4 lg:gap-8 bg-white relative z-20">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img
            alt="PHÙNG THỊ"
            className="h-12 md:h-14 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AP1WRLt_BkNiJQjFJY4CxE4PottxdWuCmWJzg7rLdHpcZe0x7phdDTNoC2R3EaHUArVOggks9g7IkasQ64ncnNqtrGRddpN_xEua40141PNlcpHbKGTBf39E0ygc1JUERjRZVkQY46t5vqQF6tvQE6_DRB3sWEn32Xz6JfUiP1cOnyzm_7qPXdKKdZNdAf1GBiFSScC3RVKTzVBTw46Oc_WHLhVtDnv7nAwBQrN1URJH2s405iQCoeuN2tFU9w"
          />
        </Link>

        {/* Top Navigation Dropdowns (Desktop) */}
        <div className="hidden xl:flex items-center gap-6 text-[13px] font-bold text-[#1a2e44] tracking-wide shrink-0 h-full">
          {/* Shop By Product Mega Menu Trigger */}
          <div className="relative h-full flex items-center" ref={productsRef}>
            <button
              onClick={() => setIsProductsOpen(!isProductsOpen)}
              className={`flex items-center gap-1 hover:text-primary transition-colors uppercase h-full ${isProductsOpen ? 'text-primary' : ''}`}
            >
              SẢN PHẨM
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isProductsOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {/* Mega Menu Dropdown */}
            {isProductsOpen && (
              <div className="absolute top-full left-0 mt-0 w-[1000px] -ml-20 bg-white border border-gray-200 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 border-l border-t border-gray-100">
                  {megaMenuCategories.map((cat, i) => (
                    <Link
                      key={i}
                      to={cat.path}
                      onClick={() => setIsProductsOpen(false)}
                      className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 transition-colors gap-3 border-r border-b border-gray-100 group"
                    >
                      <span className="material-symbols-outlined text-[40px] text-gray-700 group-hover:text-primary transition-colors">{cat.icon}</span>
                      <span className="text-[12px] font-bold text-center text-[#1a2e44] group-hover:text-primary uppercase tracking-wider">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="flex items-center gap-1 hover:text-primary transition-colors uppercase h-full">
            CHỦ ĐỀ
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>

        {/* Search Bar (Tablet/Desktop) */}
        <div className="flex-grow hidden md:flex items-center max-w-3xl">
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <div className="relative w-full cursor-text group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[22px]">search</span>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-12 pr-4 text-left text-[14px] text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-all">
                  Tìm kiếm sản phẩm, danh mục...
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-none w-screen h-screen m-0 !p-0 rounded-none border-none bg-surface/95 backdrop-blur-md flex flex-col top-0 !translate-y-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 duration-300">
              <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
              <div className="flex flex-col h-full w-full max-w-container-max mx-auto px-margin-desktop py-8">
                 <div className="relative w-full max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                   <Input autoFocus className="w-full bg-transparent border-0 border-b-2 border-on-surface-variant/20 rounded-none px-0 pb-4 h-auto text-3xl font-light text-on-surface focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary placeholder:text-on-surface-variant/30" placeholder="Nhập từ khóa tìm kiếm..." type="text" />
                   <span className="material-symbols-outlined absolute right-0 top-1 text-3xl text-on-surface-variant/50">search</span>
                 </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 text-[#1a2e44] shrink-0">
          {/* More Dropdown */}
          <div className="relative hidden md:block" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition-colors ${isMoreOpen ? 'text-primary' : ''}`}
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              THÊM
            </button>
            
            {isMoreOpen && (
              <div className="absolute top-full right-0 mt-6 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-2 flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
                <Link onClick={() => setIsMoreOpen(false)} to="/news" className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Tin tức</Link>
                <Link onClick={() => setIsMoreOpen(false)} to="/contact" className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Thông tin liên hệ</Link>
                <Link onClick={() => setIsMoreOpen(false)} to="/about" className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">Về chúng tôi</Link>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <Link to="/cart" className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors relative text-[#1a2e44] hover:text-primary">
            <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
            <div className="absolute top-0 right-0 bg-[#e03a3a] text-white text-[10px] font-bold h-[16px] min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white leading-none">
              0
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Row: Categories */}
      <div className="w-full border-t border-b border-gray-100 bg-white relative z-10">
        <div className="flex items-center gap-8 px-4 md:px-8 py-3 max-w-[1600px] w-full mx-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { name: "CÚP PHA LÊ", displayName: "Cúp Pha Lê" },
            { name: "CÚP HỢP KIM", displayName: "Cúp Hợp Kim" },
            { name: "KỶ NIỆM CHƯƠNG", displayName: "Kỷ Niệm Chương" },
            { name: "BẢNG VINH DANH", displayName: "Bảng Vinh Danh" },
            { name: "QUÀ TẶNG CUSTOM", displayName: "Quà Tặng Custom" },
            { name: "VẬT LIỆU", displayName: "" },
            { name: "SẢN PHẨM MỚI", displayName: "Sản Phẩm Mới" },
          ].map((cat) => ({
            ...cat,
            path: cat.displayName ? categoryLink(cat.displayName) : "#",
          })).map((cat, i) => (
            <Link
              key={i}
              to={cat.path}
              className="text-[13px] font-bold text-[#1a2e44] uppercase tracking-wide whitespace-nowrap hover:text-primary transition-colors flex-shrink-0"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

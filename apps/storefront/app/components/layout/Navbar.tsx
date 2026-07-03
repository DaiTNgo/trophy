import { useState } from "react";
import { useNavbarScroll } from "../../hooks/useNavbarScroll";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "../ui/dialog";

export function Navbar() {
  useNavbarScroll();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-margin-desktop h-20 w-full max-w-container-max mx-auto bg-surface shadow-sm transition-all duration-300" id="main-nav">
      <div className="flex items-center gap-4">
        <img alt="PHÙNG THỊ" className="h-12 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLt_BkNiJQjFJY4CxE4PottxdWuCmWJzg7rLdHpcZe0x7phdDTNoC2R3EaHUArVOggks9g7IkasQ64ncnNqtrGRddpN_xEua40141PNlcpHbKGTBf39E0ygc1JUERjRZVkQY46t5vqQF6tvQE6_DRB3sWEn32Xz6JfUiP1cOnyzm_7qPXdKKdZNdAf1GBiFSScC3RVKTzVBTw46Oc_WHLhVtDnv7nAwBQrN1URJH2s405iQCoeuN2tFU9w" />
      </div>
      <div className="hidden lg:flex items-center gap-8">
        <a className="font-label-md text-label-md uppercase tracking-widest text-primary border-b-2 border-primary pb-1" href="#">Trang Chủ</a>
        <a className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Bộ Sưu Tập</a>
        <a className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Vật Liệu</a>
        <a className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Về Chúng Tôi</a>
        <a className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Liên Hệ</a>
      </div>
      <div className="flex items-center gap-6">
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogTrigger asChild>
            <div className="relative group hidden md:block cursor-text">
              <div className="bg-surface-container-low border-none rounded-full px-6 py-2 w-48 text-left transition-all duration-300 text-body-md text-on-surface-variant/50">
                Tìm kiếm sản phẩm...
              </div>
              <span className="material-symbols-outlined absolute right-4 top-2 text-on-surface-variant">search</span>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-none w-screen h-screen m-0 !p-0 rounded-none border-none bg-surface/95 backdrop-blur-md flex flex-col top-0 !translate-y-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 duration-300">
            <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
            <div className="flex flex-col h-full w-full max-w-container-max mx-auto px-margin-desktop py-8">
               <div className="relative w-full max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                 <input autoFocus className="w-full bg-transparent border-b-2 border-on-surface-variant/20 pb-4 text-3xl font-light text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/30" placeholder="Nhập từ khóa tìm kiếm..." type="text" />
                 <span className="material-symbols-outlined absolute right-0 top-1 text-3xl text-on-surface-variant/50">search</span>
               </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <button className="text-on-surface-variant hover:text-primary transition-colors relative">
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">0</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">person</span>
        </button>
      </div>
    </nav>
  );
}

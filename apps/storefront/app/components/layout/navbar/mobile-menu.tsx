import { Link } from "react-router";
import { Package, X } from "lucide-react";
import { backendAssetUrl } from "@/lib/api";
import type { StorefrontCategory, StorefrontCollection } from "@/lib/api";
import { getLocalized } from "@/lib/translation";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  locale?: string;
}

export function NavbarMobileMenu({ isOpen, onClose, categories, collections, locale = "vi" }: NavbarMobileMenuProps) {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] bg-white flex flex-col xl:hidden animate-in slide-in-from-left duration-300">
      <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-border-subtle px-6 text-brand-strong">
        <Link to="/" className="shrink-0" onClick={onClose}>
          <img
            alt="TrophySmack"
            className="w-[90px] h-auto object-contain"
            src="/logo.png"
          />
        </Link>
        <button onClick={onClose} className="p-2 -mr-2">
          <svg className="w-[31px] h-[30px]" viewBox="0 0 31 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="22.1912" y1="7.13472" x2="7.19116" y2="22.1348" stroke="currentColor" strokeWidth="2"></line>
            <line x1="22.9196" y1="22.1367" x2="7.91952" y2="7.13659" stroke="currentColor" strokeWidth="2"></line>
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 pb-20">
        
        {/* SẢN PHẨM */}
        <details className="group [&_summary::-webkit-details-marker]:hidden border-b border-gray-100 pb-4">
          <summary className="flex cursor-pointer items-center justify-between text-[18px] font-medium uppercase tracking-wide text-brand-strong">
            Sản phẩm
            <span className="transition duration-300 group-open:-rotate-180">
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" viewBox="0 0 10 6">
                <path fillRule="evenodd" clipRule="evenodd" d="M9.354.646a.5.5 0 00-.708 0L5 4.293 1.354.646a.5.5 0 00-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z" fill="currentColor"></path>
              </svg>
            </span>
          </summary>
          <div className="mt-4 -mx-6">
            <div className="grid grid-cols-2 gap-[1px] border-y border-border-subtle bg-border-subtle">
              {productMenuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className="flex flex-col items-center justify-center gap-3 bg-surface-base p-4 text-center"
                >
                  <div className="w-full max-w-[90px] aspect-square flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={backendAssetUrl(item.imageUrl)}
                        alt={item.title}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/50 rounded-md flex items-center justify-center">
                        <Package className="text-gray-400 w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <span className="px-1 text-[13px] font-medium leading-tight text-brand-strong">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </details>

        {/* CHỦ ĐỀ */}
        {themeMenuItems.length > 0 && (
          <details className="group [&_summary::-webkit-details-marker]:hidden border-b border-gray-100 pb-4">
            <summary className="flex cursor-pointer items-center justify-between text-[18px] font-medium uppercase tracking-wide text-brand-strong">
              Chủ đề
              <span className="transition duration-300 group-open:-rotate-180">
                <svg aria-hidden="true" focusable="false" className="w-4 h-4" viewBox="0 0 10 6">
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.354.646a.5.5 0 00-.708 0L5 4.293 1.354.646a.5.5 0 00-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z" fill="currentColor"></path>
                </svg>
              </span>
            </summary>
            <div className="mt-4 -mx-6">
              <div className="grid grid-cols-2 gap-[1px] border-y border-border-subtle bg-border-subtle">
                {themeMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className="flex flex-col items-center justify-center gap-3 bg-surface-base p-4 text-center"
                  >
                    <div className="w-full max-w-[90px] aspect-square flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={backendAssetUrl(item.imageUrl)}
                          alt={item.title}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/50 rounded-md flex items-center justify-center">
                          <Package className="text-gray-400 w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <span className="px-1 text-[13px] font-medium leading-tight text-brand-strong">
                      {item.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* THÔNG TIN */}
        <div className="flex flex-col gap-5 pt-2">
          <Link to="/news" onClick={onClose} className="text-[18px] font-medium uppercase tracking-wide text-brand-strong">
            Tin tức
          </Link>
          <Link to="/contact" onClick={onClose} className="text-[18px] font-medium uppercase tracking-wide text-brand-strong">
            Liên hệ
          </Link>
          <Link to="/about" onClick={onClose} className="text-[18px] font-medium uppercase tracking-wide text-brand-strong">
            Về chúng tôi
          </Link>
          <Link to="/order-lookup" onClick={onClose} className="text-[18px] font-medium uppercase tracking-wide text-brand-strong">
            Tra cứu đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}

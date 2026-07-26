import { Link, useLocation } from "react-router";
import { Package, X } from "lucide-react";
import { backendAssetUrl } from "@/lib/api";
import type { StorefrontCategory, StorefrontCollection } from "@/lib/api";
import {
  getActiveCategoryHandle,
  getCategoryPath,
} from "@/lib/storefront-paths";
import { getLocalized } from "@/lib/translation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  locale?: string;
}

export function NavbarMobileMenu({
  isOpen,
  onOpenChange,
  categories,
  collections,
  locale = "vi",
}: NavbarMobileMenuProps) {
  const { pathname } = useLocation();
  const activeCategoryHandle = getActiveCategoryHandle(pathname);
  const productMenuItems = categories.map((cat) => ({
    title: getLocalized(cat.name, locale),
    imageUrl: cat.imageUrl,
    handle: cat.handle,
    href: getCategoryPath(cat.handle),
  }));

  const themeMenuItems = collections.map((col) => ({
    title: getLocalized(col.title, locale),
    imageUrl: col.imageUrl,
    href: `/collections/${encodeURIComponent(col.handle)}`,
  }));

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="xl:hidden">
        <DrawerTitle className="sr-only">Menu dieu huong</DrawerTitle>
        <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-border-subtle px-6 text-brand-strong">
          <DrawerClose asChild>
            <Link to="/" className="shrink-0">
              <img
                alt="TrophySmack"
                className="h-auto w-[90px] object-contain"
                src="/logo.png"
              />
            </Link>
          </DrawerClose>
          <DrawerClose asChild>
            <button className="p-2 -mr-2" aria-label="Dong menu">
              <X className="h-7 w-7" />
            </button>
          </DrawerClose>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-6 pb-20">
          {/* SẢN PHẨM */}
          <details
            open={Boolean(activeCategoryHandle)}
            className="group border-b border-gray-100 pb-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between text-[18px] font-medium uppercase tracking-wide text-brand-strong">
              Sản phẩm
              <span className="transition duration-300 group-open:-rotate-180">
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-4 w-4"
                  viewBox="0 0 10 6"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.354.646a.5.5 0 00-.708 0L5 4.293 1.354.646a.5.5 0 00-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z"
                    fill="currentColor"
                  ></path>
                </svg>
              </span>
            </summary>
            <div className="mt-4 -mx-6">
              <div className="grid grid-cols-2 gap-[1px] border-y border-border-subtle bg-border-subtle">
                {productMenuItems.map((item) => (
                  <DrawerClose asChild key={item.href}>
                    <Link
                      to={item.href}
                      className="flex flex-col items-center justify-center gap-3 bg-surface-base p-4 text-center"
                    >
                      <div className="flex aspect-square w-full max-w-[90px] items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={backendAssetUrl(item.imageUrl)}
                            alt={item.title}
                            className="h-full w-full object-contain mix-blend-multiply"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-md bg-white/50">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-1 text-[13px] font-medium leading-tight text-brand-strong ${
                          activeCategoryHandle === item.handle
                            ? "underline decoration-2 underline-offset-4"
                            : ""
                        }`}
                      >
                        {item.title}
                      </span>
                    </Link>
                  </DrawerClose>
                ))}
              </div>
            </div>
          </details>

          {/* CHỦ ĐỀ */}
          {themeMenuItems.length > 0 && (
            <details className="group border-b border-gray-100 pb-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-[18px] font-medium uppercase tracking-wide text-brand-strong">
                Chủ đề
                <span className="transition duration-300 group-open:-rotate-180">
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    className="h-4 w-4"
                    viewBox="0 0 10 6"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M9.354.646a.5.5 0 00-.708 0L5 4.293 1.354.646a.5.5 0 00-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </span>
              </summary>
              <div className="mt-4 -mx-6">
                <div className="grid grid-cols-2 gap-[1px] border-y border-border-subtle bg-border-subtle">
                  {themeMenuItems.map((item) => (
                    <DrawerClose asChild key={item.href}>
                      <Link
                        to={item.href}
                        className="flex flex-col items-center justify-center gap-3 bg-surface-base p-4 text-center"
                      >
                        <div className="flex aspect-square w-full max-w-[90px] items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={backendAssetUrl(item.imageUrl)}
                              alt={item.title}
                              className="h-full w-full object-contain mix-blend-multiply"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-md bg-white/50">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <span className="px-1 text-[13px] font-medium leading-tight text-brand-strong">
                          {item.title}
                        </span>
                      </Link>
                    </DrawerClose>
                  ))}
                </div>
              </div>
            </details>
          )}

          {/* THÔNG TIN */}
          <div className="flex flex-col gap-5 pt-2">
            <DrawerClose asChild>
              <Link
                to="/news"
                className="text-[18px] font-medium uppercase tracking-wide text-brand-strong"
              >
                Tin tức
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                to="/contact"
                className="text-[18px] font-medium uppercase tracking-wide text-brand-strong"
              >
                Liên hệ
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                to="/about"
                className="text-[18px] font-medium uppercase tracking-wide text-brand-strong"
              >
                Về chúng tôi
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                to="/order-lookup"
                className="text-[18px] font-medium uppercase tracking-wide text-brand-strong"
              >
                Tra cứu đơn hàng
              </Link>
            </DrawerClose>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-[18px] font-medium uppercase tracking-wide text-brand-strong">
              Đổi ngôn ngữ
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

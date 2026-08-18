import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CirclePlus } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";

export function NavbarMoreDropdown() {
  const { t } = useTranslation("layout");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-[13px] font-bold uppercase tracking-wide hover:text-primary transition-colors ${isOpen ? "text-primary" : ""}`}
      >
        <CirclePlus className="text-[18px]" />
        {t("navbar_more")}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-6 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-2 flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
          <Link
            onClick={() => setIsOpen(false)}
            to="/contact"
            className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("navbar_more_contact")}
          </Link>
          <Link
            onClick={() => setIsOpen(false)}
            to="/about"
            className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("navbar_more_about")}
          </Link>
          {/*<Link
            onClick={() => setIsOpen(false)}
            to="/order-lookup"
            className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
          >
            {t("navbar_more_order_lookup")}
          </Link>*/}
        </div>
      )}
    </div>
  );
}

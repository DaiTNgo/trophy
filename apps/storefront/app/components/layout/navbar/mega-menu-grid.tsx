import { Link } from "react-router";
import { Package } from "lucide-react";
import { backendAssetUrl } from "@/lib/api";

interface MegaMenuGridProps {
  items: Array<{
    title: string;
    imageUrl: string | null;
    href: string;
  }>;
}

export function MegaMenuGrid({ items }: MegaMenuGridProps) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 border-gray-100">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="flex flex-row items-center justify-start px-8 py-6 bg-white transition-colors gap-4 border-r border-b border-gray-100 group [&:nth-child(5n)]:border-r-0 lg:[&:nth-child(5n)]:border-r-0 md:[&:nth-child(4n)]:border-r-0 max-md:[&:nth-child(2n)]:border-r-0"
        >
          <div className="w-[50px] flex-shrink-0 flex items-center justify-center">
            {item.imageUrl ? (
              <img
                src={backendAssetUrl(item.imageUrl)}
                alt={item.title}
                className="max-w-[50px] max-h-[50px] object-contain transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-[50px] h-[50px] bg-gray-100 rounded flex items-center justify-center">
                <Package className="text-[24px] text-gray-400" />
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

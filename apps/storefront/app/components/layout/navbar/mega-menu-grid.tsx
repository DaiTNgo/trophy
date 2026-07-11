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
    <div className="grid grid-cols-2 border-border-subtle md:grid-cols-4 lg:grid-cols-5">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="group flex flex-row items-center justify-start gap-4 border-b border-r border-border-subtle bg-white px-8 py-6 transition-colors [&:nth-child(5n)]:border-r-0 lg:[&:nth-child(5n)]:border-r-0 md:[&:nth-child(4n)]:border-r-0 max-md:[&:nth-child(2n)]:border-r-0"
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
              <div className="flex h-[50px] w-[50px] items-center justify-center rounded bg-surface-subtle">
                <Package className="text-[24px] text-gray-400" />
              </div>
            )}
          </div>
          <span className="text-left text-[12px] font-bold uppercase leading-tight tracking-wider text-brand-strong group-hover:text-primary">
            {item.title}
          </span>
        </Link>
      ))}
    </div>
  );
}

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
    <div className="grid grid-cols-2 gap-px bg-border-subtle p-px md:grid-cols-4 lg:grid-cols-5">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="group flex flex-row items-center justify-start gap-4 bg-white px-8 py-6 transition-colors"
        >
          <div className="relative h-[50px] w-[50px] flex-shrink-0 overflow-hidden">
            {item.imageUrl ? (
              <img
                src={backendAssetUrl(item.imageUrl)}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded bg-surface-subtle">
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

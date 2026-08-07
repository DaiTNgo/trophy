import type { ComponentType } from "react";
import { Boxes, Package, Palette, Settings, ShoppingCart, Tag, Type, Users } from "lucide-react";

export type SidebarNavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  prefixes: string[];
  children?: SidebarNavItem[];
  requiresSuperAdmin?: boolean;
};

export const primarySidebarItems: SidebarNavItem[] = [
  {
    label: "Orders",
    to: "/orders",
    icon: ShoppingCart,
    prefixes: ["/orders"],
  },
  {
    label: "Products",
    to: "/products",
    icon: Package,
    prefixes: ["/products", "/collections", "/categories"],
    children: [
      {
        label: "Collections",
        to: "/collections",
        icon: Tag,
        prefixes: ["/collections"],
      },
      {
        label: "Categories",
        to: "/categories",
        icon: Boxes,
        prefixes: ["/categories"],
      },
    ],
  },
];

export const operationsSidebarItems: SidebarNavItem[] = [
  {
    label: "Customization",
    to: "/customization/clipart",
    icon: Palette,
    prefixes: ["/customization"],
    children: [
      {
        label: "Clipart",
        to: "/customization/clipart",
        icon: Palette,
        prefixes: ["/customization/clipart"],
      },
      {
        label: "Colors",
        to: "/customization/colors",
        icon: Palette,
        prefixes: ["/customization/colors"],
      },
      {
        label: "Fonts",
        to: "/customization/fonts",
        icon: Type,
        prefixes: ["/customization/fonts"],
      },
    ],
  },
  {
    label: "Team",
    to: "/team",
    icon: Users,
    prefixes: ["/team"],
    requiresSuperAdmin: true,
  },
];

export const bottomSidebarItems: SidebarNavItem[] = [
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    prefixes: ["/settings"],
  },
];

export const shellSections = [
  { label: "Orders", prefixes: ["/orders"] },
  { label: "Products", prefixes: ["/products", "/collections", "/categories"] },
  { label: "Customization", prefixes: ["/customization"] },
  { label: "Team", prefixes: ["/team"] },
  { label: "Settings", prefixes: ["/settings"] },
];

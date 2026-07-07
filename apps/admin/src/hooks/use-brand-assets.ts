import { useEffect, useState } from "react";
import { backendFetch } from "../lib/fetch";

export type BrandColor = {
  id: string;
  name: string;
  hexCode: string;
};

export type BrandFont = {
  id: string;
  name: string;
  regularAssetId?: string | null;
  boldAssetId?: string | null;
  italicAssetId?: string | null;
  boldItalicAssetId?: string | null;
};

export type BrandIconAsset = {
  id: string;
  sourceAssetId: string;
  name: string;
  categoryId?: string | null;
  categoryLabel?: string | null;
  tags: string[];
  previewUrl: string;
  mimeType: "image/svg+xml" | "image/png" | "image/webp";
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export function useBrandAssets(refreshKey = 0) {
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<BrandFont[]>([]);
  const [icons, setIcons] = useState<BrandIconAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [colorsRes, fontsRes, iconsRes] = await Promise.all([
          backendFetch("/api/admin/brand-assets/colors"),
          backendFetch("/api/admin/brand-assets/fonts"),
          backendFetch("/api/admin/brand-assets/icons"),
        ]);

        if (mounted) {
          if (colorsRes.ok) {
            const data = await colorsRes.json();
            setColors(data.colors);
          }
          if (fontsRes.ok) {
            const data = await fontsRes.json();
            setFonts(data.fonts);
          }
          if (iconsRes.ok) {
            const data = await iconsRes.json();
            setIcons(data.icons);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  return { colors, fonts, icons, isLoading };
}

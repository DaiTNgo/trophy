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

export type BrandClipartAsset = {
  id: string;
  sourceAssetId: string;
  name: string;
  fileName?: string | null;
  categoryId: string;
  categoryName: string;
  previewUrl: string;
  mimeType: "image/svg+xml" | "image/png" | "image/webp";
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ClipartCategory = {
  id: string;
  name: string;
  active: boolean;
  activeAssetCount?: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export function useBrandAssets(refreshKey = 0) {
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<BrandFont[]>([]);
  const [clipartAssets, setClipartAssets] = useState<BrandClipartAsset[]>([]);
  const [clipartCategories, setClipartCategories] = useState<ClipartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [colorsRes, fontsRes, categoriesRes] = await Promise.all([
          backendFetch("/api/admin/brand-assets/colors"),
          backendFetch("/api/admin/brand-assets/fonts"),
          backendFetch("/api/admin/customization/clipart/categories"),
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
          if (categoriesRes.ok) {
            const data = (await categoriesRes.json()) as { categories: ClipartCategory[] };
            setClipartCategories(data.categories);

            const assetsByCategory = await Promise.all(
              data.categories.map(async (category) => {
                const response = await backendFetch(`/api/admin/customization/clipart/categories/${category.id}/assets`);
                if (!response.ok) {
                  return [] as BrandClipartAsset[];
                }
                const payload = (await response.json()) as {
                  assets: Array<{
                    id: string;
                    categoryId: string;
                    sourceAssetId: string;
                    name: string;
                    fileName?: string | null;
                    previewUrl: string;
                    mimeType: "image/svg+xml" | "image/png" | "image/webp";
                    sourceWidthPx: number | null;
                    sourceHeightPx: number | null;
                    active: boolean;
                    createdAt: number;
                    updatedAt: number;
                  }>;
                };
                return payload.assets.map((asset) => ({
                  ...asset,
                  categoryName: category.name,
                }));
              }),
            );

            const nextClipartAssets = assetsByCategory.flat();
            setClipartAssets(nextClipartAssets);
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

  return { colors, fonts, clipartAssets, clipartCategories, isLoading };
}

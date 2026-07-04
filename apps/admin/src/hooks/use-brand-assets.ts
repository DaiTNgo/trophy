import { useEffect, useState } from "react";
import { backendFetch } from "../lib/fetch";

export function useBrandAssets() {
  const [colors, setColors] = useState<{ id: string; name: string; hexCode: string }[]>([]);
  const [fonts, setFonts] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [colorsRes, fontsRes] = await Promise.all([
          backendFetch("/api/admin/brand-assets/colors"),
          backendFetch("/api/admin/brand-assets/fonts")
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
  }, []);

  return { colors, fonts, isLoading };
}

import { useCallback, useEffect, useState } from "react";
import type { CustomShape } from "@trophy/customization";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";

export function useShapeLibrary() {
  const [shapes, setShapes] = useState<CustomShape[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/customizations/shapes`);
      if (response.ok) {
        const data = (await response.json()) as { shapes: CustomShape[] };
        setShapes(data.shapes);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createShape = useCallback(async (name: string, svgPathData: string, type: "svg_upload" | "polygon") => {
    const response = await fetch(`${BACKEND_URL}/api/customizations/shapes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, svgPathData, type }),
    });
    if (!response.ok) throw new Error("Failed to create shape");
    const data = (await response.json()) as { shape: CustomShape };
    setShapes((prev) => [data.shape, ...prev]);
    return data.shape;
  }, []);

  const deleteShape = useCallback(async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/api/customizations/shapes/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete shape");
    setShapes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const shapesMap = new Map(shapes.map((s) => [s.id, s]));

  return { shapes, shapesMap, loading, refresh, createShape, deleteShape };
}

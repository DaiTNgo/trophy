import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  getLayerPixelRect,
  layerPixelRectToGeometry,
  type ImageShapeEditorLayer,
  type TextEditorLayer,
} from "@trophy/customization";
import { getHandleCursor, handleStyle, resizeRect } from "./customization-template-editor";

const background = DEFAULT_TEMPLATE.background!;
const textLayer = DEFAULT_TEMPLATE.layers.find((l) => l.id === "line_1") as TextEditorLayer;
const circleLayer = DEFAULT_TEMPLATE.layers.find((l) => l.id === "badge_shape") as ImageShapeEditorLayer;

describe("Custom editor block x,y,w,h editing positioning", () => {
  describe("Text block position editing", () => {
    it("displays the actual visual Y (top) of the text block, not background-centered offset", () => {
      const visualH = textLayer.text.maxLines * textLayer.text.maxFontSizePt * 1.35;
      const expectedVisualTop = textLayer.geometry.yRatio * background.heightPx - visualH / 2;

      const rect = getLayerPixelRect({ layer: textLayer, background });

      expect(rect.yPx).toBeCloseTo(expectedVisualTop, 1);
      expect(rect.heightPx).toBeCloseTo(visualH, 1);
      expect(rect.xPx).toBeCloseTo(textLayer.geometry.xRatio * background.widthPx - rect.widthPx / 2, 1);
      expect(rect.widthPx).toBeCloseTo(textLayer.geometry.widthRatio * background.widthPx, 1);
    });

    it("keeps Y unchanged when user edits only X in inspector PositionFields", () => {
      const rect = getLayerPixelRect({ layer: textLayer, background });

      // User changes X by +20px
      const nextX = rect.xPx + 20;
      const merged = { ...rect, xPx: nextX };

      const newGeometry = layerPixelRectToGeometry({
        rect: merged,
        layer: textLayer,
        background,
      });

      // yRatio MUST stay exactly unchanged!
      expect(newGeometry.yRatio).toBeCloseTo(textLayer.geometry.yRatio, 5);
      expect(newGeometry.xRatio).toBeCloseTo((nextX + rect.widthPx / 2) / background.widthPx, 5);
      expect(newGeometry.heightRatio).toBeUndefined();
    });

    it("keeps X unchanged when user edits only Y in inspector PositionFields", () => {
      const rect = getLayerPixelRect({ layer: textLayer, background });

      // User changes Y by +30px
      const nextY = rect.yPx + 30;
      const merged = { ...rect, yPx: nextY };

      const newGeometry = layerPixelRectToGeometry({
        rect: merged,
        layer: textLayer,
        background,
      });

      // xRatio MUST stay exactly unchanged!
      expect(newGeometry.xRatio).toBeCloseTo(textLayer.geometry.xRatio, 5);
      expect(newGeometry.yRatio).toBeCloseTo((nextY + rect.heightPx / 2) / background.heightPx, 5);
      expect(newGeometry.heightRatio).toBeUndefined();
    });

    it("keeps Y unchanged when user resizes text block width using right handle", () => {
      const start = getLayerPixelRect({ layer: textLayer, background });
      // Drag right handle by dx = 50px
      const next = resizeRect(start, "right", 50, 0, false);

      const geometry = layerPixelRectToGeometry({
        rect: next,
        layer: textLayer,
        background,
      });

      // yRatio MUST stay exactly unchanged!
      expect(geometry.yRatio).toBeCloseTo(textLayer.geometry.yRatio, 5);
      expect(geometry.widthRatio).toBeCloseTo((start.widthPx + 50) / background.widthPx, 5);
      expect(geometry.heightRatio).toBeUndefined();
    });

    it("keeps Y unchanged when moving horizontally via arrow keys", () => {
      const rect = getLayerPixelRect({ layer: textLayer, background });
      const next = {
        ...rect,
        xPx: rect.xPx + 10,
        yPx: rect.yPx,
      };
      const geometry = layerPixelRectToGeometry({ rect: next, layer: textLayer, background });

      expect(geometry.yRatio).toBeCloseTo(textLayer.geometry.yRatio, 5);
      expect(geometry.xRatio).toBeCloseTo((rect.xPx + 10 + rect.widthPx / 2) / background.widthPx, 5);
      expect(geometry.heightRatio).toBeUndefined();
    });
  });

  describe("Shape block aspect ratio locking when editing and resizing", () => {
    it("anchors the opposite corner when resizing from top-left handle with locked ratio even if dx != dy", () => {
      const start = getLayerPixelRect({ layer: circleLayer, background });
      const initialRight = start.xPx + start.widthPx;
      const initialBottom = start.yPx + start.heightPx;

      // User drags top-left handle 'nw' horizontally only (dx=20, dy=0)
      const next = resizeRect(start, "nw", 20, 0, circleLayer.shape.lockAspectRatio);

      // The bottom-right corner must remain anchored!
      expect(next.xPx + next.widthPx).toBeCloseTo(initialRight, 1);
      expect(next.yPx + next.heightPx).toBeCloseTo(initialBottom, 1);
      expect(next.widthPx).toBeCloseTo(next.heightPx, 1);
    });

    it("anchors the top-left corner when resizing from bottom-right handle with locked ratio", () => {
      const start = getLayerPixelRect({ layer: circleLayer, background });
      // Drag 'se' outward by dx=50, dy=10
      const next = resizeRect(start, "se", 50, 10, circleLayer.shape.lockAspectRatio);

      // Top-left corner must remain at (start.xPx, start.yPx)!
      expect(next.xPx).toBeCloseTo(start.xPx, 1);
      expect(next.yPx).toBeCloseTo(start.yPx, 1);
      expect(next.widthPx).toBeCloseTo(next.heightPx, 1);
    });

    it("maintains heightRatio when converting pixel rect to layer geometry", () => {
      const rect = getLayerPixelRect({ layer: circleLayer, background });
      const geometry = layerPixelRectToGeometry({ rect, layer: circleLayer, background });

      expect(geometry.xRatio).toBeCloseTo(circleLayer.geometry.xRatio, 5);
      expect(geometry.yRatio).toBeCloseTo(circleLayer.geometry.yRatio, 5);
      expect(geometry.widthRatio).toBeCloseTo(circleLayer.geometry.widthRatio, 5);
      expect(geometry.heightRatio).toBeCloseTo(circleLayer.geometry.heightRatio, 5);
    });
  });

  describe("Resize handle styles and cursor helper", () => {
    it("returns correct cursor for all handle directions", () => {
      expect(getHandleCursor("left")).toBe("ew-resize");
      expect(getHandleCursor("right")).toBe("ew-resize");
      expect(getHandleCursor("w")).toBe("ew-resize");
      expect(getHandleCursor("e")).toBe("ew-resize");
      expect(getHandleCursor("n")).toBe("ns-resize");
      expect(getHandleCursor("s")).toBe("ns-resize");
      expect(getHandleCursor("nw")).toBe("nwse-resize");
      expect(getHandleCursor("se")).toBe("nwse-resize");
      expect(getHandleCursor("ne")).toBe("nesw-resize");
      expect(getHandleCursor("sw")).toBe("nesw-resize");
      expect(getHandleCursor("unknown")).toBe("pointer");
    });

    it("compensates for canvas zoom level in handleStyle", () => {
      // Unscaled / default zoom
      const defaultStyle = handleStyle("left");
      expect(defaultStyle.left).toBe(0);
      expect(defaultStyle.top).toBe("50%");
      expect(defaultStyle.transform).toBe("translate(-50%, -50%) scale(1)");

      // Zoomed in 2x -> handle scale should be 0.5 (1 / 2)
      const zoomedIn = handleStyle("right", 2);
      expect(zoomedIn.left).toBe("100%");
      expect(zoomedIn.top).toBe("50%");
      expect(zoomedIn.transform).toBe("translate(-50%, -50%) scale(0.5)");

      // Zoomed out 0.5x -> handle scale should be 2 (1 / 0.5)
      const zoomedOut = handleStyle("nw", 0.5);
      expect(zoomedOut.left).toBe(0);
      expect(zoomedOut.top).toBe(0);
      expect(zoomedOut.transform).toBe("translate(-50%, -50%) scale(2)");
    });
  });
});

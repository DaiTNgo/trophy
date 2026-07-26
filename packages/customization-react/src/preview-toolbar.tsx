import type { ImageShapeFieldValue } from "@trophy/customization";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Fullscreen,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { MIN_FREE_IMAGE_SCALE, PREVIEW_ZOOM_STEP } from "./index";
import { CanvasAction } from "./preview-support";

type PreviewToolbarProps = {
  selectedImageValue: ImageShapeFieldValue | null;
  zoom: number;
  onImageAdjust: (patch: Partial<ImageShapeFieldValue>) => void;
  onFullscreen: () => void;
  onZoomChange: (zoom: number) => void;
  onFit: () => void;
};

export function PreviewToolbar({
  selectedImageValue,
  zoom,
  onImageAdjust,
  onFullscreen,
  onZoomChange,
  onFit,
}: PreviewToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
      {selectedImageValue ? (
        <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto rounded-md border border-outline-variant bg-white/95 p-1 shadow-lg backdrop-blur">
          <CanvasAction label="Zoom out image" onClick={() => onImageAdjust({ cropScale: Math.max(MIN_FREE_IMAGE_SCALE, (selectedImageValue.cropScale ?? 1) / 1.1) })}>
            <Minus className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Zoom in image" onClick={() => onImageAdjust({ cropScale: (selectedImageValue.cropScale ?? 1) * 1.1 })}>
            <Plus className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Move image left" onClick={() => onImageAdjust({ cropXRatio: (selectedImageValue.cropXRatio ?? 0) - 0.05 })}>
            <ArrowLeft className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Move image right" onClick={() => onImageAdjust({ cropXRatio: (selectedImageValue.cropXRatio ?? 0) + 0.05 })}>
            <ArrowRight className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Move image up" onClick={() => onImageAdjust({ cropYRatio: (selectedImageValue.cropYRatio ?? 0) - 0.05 })}>
            <ArrowUp className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Move image down" onClick={() => onImageAdjust({ cropYRatio: (selectedImageValue.cropYRatio ?? 0) + 0.05 })}>
            <ArrowDown className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Reset image" onClick={() => onImageAdjust({ cropScale: 1, cropXRatio: 0, cropYRatio: 0, cropRotationDeg: 0 })}>
            <RotateCcw className="size-3.5" />
          </CanvasAction>
        </div>
      ) : <span />}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-outline-variant bg-white/95 p-1 shadow-lg backdrop-blur">
        <CanvasAction label="Open fullscreen preview" onClick={onFullscreen}>
          <Fullscreen className="size-3.5" />
        </CanvasAction>
        <CanvasAction label="Zoom out" onClick={() => onZoomChange(zoom - PREVIEW_ZOOM_STEP)}>
          <Minus className="size-3.5" />
        </CanvasAction>
        <CanvasAction label="Zoom in" onClick={() => onZoomChange(zoom + PREVIEW_ZOOM_STEP)}>
          <Plus className="size-3.5" />
        </CanvasAction>
        <CanvasAction label="Fit canvas" onClick={onFit}>
          <Crosshair className="size-3.5" />
        </CanvasAction>
      </div>
    </div>
  );
}

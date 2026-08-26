import {
  resolveLocalizedInput,
  vectorPointsToSvgPathD,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationLayer,
  type DynamicFontFamily,
  type ImageShapeFieldValue,
  type ImageShapeEditorLayer,
  type RuntimeLayer,
} from "@trophy/customization";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import { ProductCustomizationForm, CustomizationStudio } from "./customization-forms";
import { TextField } from "./text-field";
import { ImageField } from "./image-field";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type PanState = { x: number; y: number };
export type CustomizationUploadImage = (
  field: CustomizationFormField,
  file: File,
) => Promise<ImageShapeFieldValue> | ImageShapeFieldValue;
export type CustomizationDeleteImage = (
  field: CustomizationFormField,
  assetId: string,
) => Promise<void> | void;
export type ResolveCustomizationFontUrl = (assetId: string) => string;
export type ResolveCustomizationStaticFontUrl = (fileName: string) => string;
export type ResolveCustomizationAssetUrl = (url: string) => string;

export function createCustomizationInteractionHandlers(onInteraction?: () => void) {
  return {
    onFocusCapture: onInteraction,
    onPointerDown: onInteraction,
  };
}

export const MIN_FREE_IMAGE_SCALE = 0.02;
export const MIN_PREVIEW_ZOOM = 0.05;
export const MAX_PREVIEW_ZOOM = 4;
export const PREVIEW_ZOOM_STEP = 0.1;
export const FIT_PADDING_PX = 56;

function quoteFontFamily(fontId: string) {
  return `"${fontId.replace(/["\\]/g, "\\$&")}"`;
}

export function useBrowserTextMeasure(fontIds: string[]) {
  const [fontRevision, setFontRevision] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fontIdsKey = fontIds.join("\u0000");

  const measureText = useCallback(
    (text: string, fontSizePt: number, fontId: string) => {
      if (typeof document === "undefined") {
        return text.length * fontSizePt * 0.55;
      }

      canvasRef.current ??= document.createElement("canvas");
      const context = canvasRef.current.getContext("2d");
      if (!context) return text.length * fontSizePt * 0.55;

      context.font = `${fontSizePt}px ${quoteFontFamily(fontId)}`;
      return context.measureText(text).width;
    },
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;

    let cancelled = false;
    const loadFonts = async () => {
      await Promise.all(
        (fontIdsKey ? fontIdsKey.split("\u0000") : []).map((fontId) =>
          document.fonts.load(`16px ${quoteFontFamily(fontId)}`, "Aa"),
        ),
      );
      // Only refresh measurements once after all requested fonts are ready.
      // Do NOT subscribe to the global "loadingdone" event: that event fires
      // for any @font-face parsed on the page, which includes the re-parse
      // triggered by FontLoader itself. Subscribing to it creates a feedback
      // loop that causes fontRevision to bump — and the preview to re-render
      // a second time — on every keystroke the user types.
      if (!cancelled) setFontRevision((revision) => revision + 1);
    };

    void loadFonts();
    return () => {
      cancelled = true;
    };
  }, [fontIdsKey]);

  return { measureText, fontRevision };
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow hover:bg-accent/90",
        outline:
          "border border-outline bg-white text-on-surface shadow-sm hover:border-accent hover:bg-accent/10",
        ghost: "text-on-surface hover:bg-surface-container-low",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}







import { ProductCustomizationPreview } from "./product-customization-preview";

export {
  ProductCustomizationPreview,
  ProductCustomizationForm,
  CustomizationStudio,
  ProductCustomizationPreview as CustomizationCanvas,
  ProductCustomizationForm as CustomizationForm,
};

export function FormField({
  field,
  layer,
  stepNumber,
  value,
  locale,
  issue,
  uploading,
  dynamicFonts = [],
  resolveAssetUrl,
  onChange,
  onUpload,
  onRemove,
}: {
  field: CustomizationFormField;
  layer: CustomizationLayer;
  stepNumber: number;
  value: CustomizationFieldValue | undefined;
  locale?: string;
  issue?: string;
  uploading: boolean;
  dynamicFonts?: DynamicFontFamily[];
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}) {
  const imageLayer =
    layer.type === "image_shape" ? (layer as ImageShapeEditorLayer) : null;
  return (
    <section className="py-4">
      {/* Step header */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          STEP {stepNumber}
          {field.helpText ? (
            <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-on-surface-variant">
              {resolveLocalizedInput(field.helpText, locale)}
            </span>
          ) : null}
        </p>
        <label className="mt-0.5 block text-sm font-semibold text-on-surface">
          {resolveLocalizedInput(field.label, locale)}
          {field.required ? (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      </div>
      {layer.type === "text" ? (
        <TextField
          field={field}
          layer={layer}
          value={value}
          dynamicFonts={dynamicFonts}
          locale={locale}
          onChange={onChange}
        />
      ) : (
        <ImageField
          layer={imageLayer}
          value={value}
          uploading={uploading}
          resolveAssetUrl={resolveAssetUrl}
          onChange={onChange}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      )}
      {issue ? (
        <p className="mt-2 text-xs font-medium text-destructive">{issue}</p>
      ) : null}
    </section>
  );
}



export function ShapeClipPaths({ layers }: { layers?: RuntimeLayer[] }) {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <clipPath id="clip-shape-heart" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.85 C 0.1 0.55 0 0.25 0.25 0.12 C 0.4 0 0.5 0.16 0.5 0.28 C 0.5 0.16 0.6 0 0.75 0.12 C 1 0.25 0.9 0.55 0.5 0.85 Z" />
        </clipPath>
        {layers?.map((layer) => {
          if (
            layer.type === "image_shape" &&
            layer.shape.type === "vector" &&
            layer.shape.vectorPath
          ) {
            return (
              <clipPath
                key={layer.id}
                id={`clip-vector-${layer.id}`}
                clipPathUnits="objectBoundingBox"
              >
                <path
                  d={vectorPointsToSvgPathD(
                    layer.shape.vectorPath.points,
                    layer.shape.vectorPath.closed,
                  )}
                />
              </clipPath>
            );
          }
          return null;
        })}
      </defs>
    </svg>
  );
}

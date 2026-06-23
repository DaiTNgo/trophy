import {
  DEFAULT_TEMPLATE,
  type CustomizationBlock,
  type CustomizationTemplate,
  type CustomizationZone,
  type MediaSelectBlock,
  type TextBlock,
} from "@trophy/customization";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { Link, useSearchParams } from "react-router";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
const STAGE_SIZE = 680;

function useHtmlImage(source: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = source;
  }, [source]);

  return image;
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function CustomizationTemplatePage() {
  const [searchParams] = useSearchParams();
  const edit = searchParams.get("edit");

  const [template, setTemplate] = useState<CustomizationTemplate>(DEFAULT_TEMPLATE);
  const [selectedZoneId, setSelectedZoneId] = useState(template.zones[0]?.id ?? "");
  const [flash, setFlash] = useState("");
  const previewImage = useHtmlImage(template.previewUrl);

  const selectedZone = useMemo(
    () => template.zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, template.zones],
  );

  useEffect(() => {
    const editParam: string = edit ?? "";
    if (!editParam || editParam === "new") return;
    let active = true;

    async function loadTemplate() {
      try {
        const isTemplateId = editParam.includes("-");
        const url = isTemplateId
          ? `${BACKEND_URL}/api/customizations/templates/${editParam}`
          : `${BACKEND_URL}/api/customizations/templates/product/${editParam}`;
        const response = await fetch(url);
        if (!response.ok) {
          setFlash("Template not found.");
          return;
        }
        const data = await response.json();
        if (active) {
          setTemplate(data.template);
          setSelectedZoneId(data.template.zones[0]?.id ?? "");
        }
      } catch {
        if (active) {
          setFlash("Failed to load template.");
        }
      }
    }

    void loadTemplate();
    return () => {
      active = false;
    };
  }, [edit]);

  function updateZone(zoneId: string, updater: (zone: CustomizationZone) => CustomizationZone) {
    setTemplate((current) => ({
      ...current,
      status: "draft",
      zones: current.zones.map((zone) => (zone.id === zoneId ? updater(zone) : zone)),
    }));
  }

  function addZone() {
    const id = `zone_${crypto.randomUUID()}`;
    const nextZone: CustomizationZone = {
      ...DEFAULT_TEMPLATE.zones[0]!,
      id,
      name: `Custom zone ${template.zones.length + 1}`,
      previewBounds: {
        xRatio: 0.35,
        yRatio: 0.35,
        widthRatio: 0.3,
        heightRatio: 0.12,
        rotationDeg: 0,
      },
    };
    setTemplate((current) => ({
      ...current,
      status: "draft",
      zones: [...current.zones, nextZone],
    }));
    setSelectedZoneId(id);
  }

  function removeSelectedZone() {
    if (!selectedZone || template.zones.length === 1) {
      return;
    }

    const nextZones = template.zones.filter((zone) => zone.id !== selectedZone.id);
    setTemplate((current) => ({ ...current, status: "draft", zones: nextZones }));
    setSelectedZoneId(nextZones[0]?.id ?? "");
  }

  function loadPreview(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setTemplate((current) => ({
          ...current,
          previewUrl: reader.result as string,
          status: "draft",
        }));
      }
    };
    reader.readAsDataURL(file);
  }

  const saveToServer = useCallback(async () => {
    const response = await fetch(`${BACKEND_URL}/api/customizations/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: Number(template.productId),
        name: template.name,
        previewUrl: template.previewUrl,
        zones: template.zones,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.template as CustomizationTemplate;
  }, [template]);

  async function handleSaveDraft() {
    const serverTemplate = await saveToServer();
    if (!serverTemplate) {
      setFlash("Failed to save template.");
      return;
    }
    setTemplate(serverTemplate);
    setFlash("Draft saved.");
  }

  async function handlePublish() {
    const serverTemplate = await saveToServer();
    if (!serverTemplate) {
      setFlash("Failed to save before publishing.");
      return;
    }
    setTemplate(serverTemplate);

    const publishResponse = await fetch(`${BACKEND_URL}/api/customizations/templates/${serverTemplate.id}/publish`, {
      method: "POST",
    });
    if (!publishResponse.ok) {
      setFlash("Failed to publish revision.");
      return;
    }
    setFlash("Template revision published.");
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Customization
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Cup production template
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Place multiple rotatable zones on the cup preview, then define their physical print or
              engraving rules.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/customization-templates"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Back to list
            </Link>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Publish revision
            </button>
          </div>
        </div>
      </header>

      {flash ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Preview placement</p>
              <p className="mt-1 text-sm text-slate-500">
                Drag, resize, and rotate the selected zone.
              </p>
            </div>
            <label className="cursor-pointer rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Upload cup image
              <input type="file" accept="image/*" onChange={loadPreview} className="sr-only" />
            </label>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
            <Stage width={STAGE_SIZE} height={STAGE_SIZE} className="mx-auto max-w-full">
              <Layer>
                {previewImage ? (
                  <KonvaImage image={previewImage} width={STAGE_SIZE} height={STAGE_SIZE} />
                ) : null}
                {template.zones.map((zone) => (
                  <EditableZone
                    key={zone.id}
                    zone={zone}
                    selected={zone.id === selectedZoneId}
                    onSelect={() => setSelectedZoneId(zone.id)}
                    onChange={(previewBounds) =>
                      updateZone(zone.id, (current) => ({ ...current, previewBounds }))
                    }
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {template.zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZoneId(zone.id)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold",
                  selectedZoneId === zone.id
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-stone-200 text-slate-600",
                ].join(" ")}
              >
                {zone.name}
              </button>
            ))}
            <button
              type="button"
              onClick={addZone}
              className="rounded-full border border-dashed border-slate-400 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              + Add zone
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
            <p className="font-semibold text-slate-900">Template</p>
            <div className="mt-5 space-y-4">
              <Field
                label="Template name"
                value={template.name}
                onChange={(value) =>
                  setTemplate((current) => ({ ...current, name: value, status: "draft" }))
                }
              />
              <ProductSelector
                value={template.productId}
                onChange={(productId) =>
                  setTemplate((current) => ({ ...current, productId }))
                }
              />
              <div className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-600">
                Revision {template.revision} · {template.status}
              </div>
            </div>
          </div>

          {selectedZone ? (
            <ZoneProperties
              zone={selectedZone}
              canRemove={template.zones.length > 1}
              onChange={(updater) => updateZone(selectedZone.id, updater)}
              onRemove={removeSelectedZone}
            />
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function EditableZone({
  zone,
  selected,
  onSelect,
  onChange,
}: {
  zone: CustomizationZone;
  selected: boolean;
  onSelect: () => void;
  onChange: (bounds: CustomizationZone["previewBounds"]) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const bounds = zone.previewBounds;

  useEffect(() => {
    if (selected && shapeRef.current && transformerRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={bounds.xRatio * STAGE_SIZE}
        y={bounds.yRatio * STAGE_SIZE}
        width={bounds.widthRatio * STAGE_SIZE}
        height={bounds.heightRatio * STAGE_SIZE}
        rotation={bounds.rotationDeg}
        fill="rgba(245,158,11,0.22)"
        stroke={selected ? "#b45309" : "#f59e0b"}
        strokeWidth={selected ? 3 : 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange({
            ...bounds,
            xRatio: event.target.x() / STAGE_SIZE,
            yRatio: event.target.y() / STAGE_SIZE,
          })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) {
            return;
          }
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            xRatio: node.x() / STAGE_SIZE,
            yRatio: node.y() / STAGE_SIZE,
            widthRatio: Math.max(0.04, (node.width() * scaleX) / STAGE_SIZE),
            heightRatio: Math.max(0.03, (node.height() * scaleY) / STAGE_SIZE),
            rotationDeg: node.rotation(),
          });
        }}
      />
      <Text
        x={bounds.xRatio * STAGE_SIZE}
        y={bounds.yRatio * STAGE_SIZE - 24}
        text={zone.name}
        fontSize={14}
        fill="#78350f"
        listening={false}
      />
      {selected ? (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          rotateEnabled
          boundBoxFunc={(oldBox, nextBox) =>
            nextBox.width < 30 || nextBox.height < 20 ? oldBox : nextBox
          }
        />
      ) : null}
    </>
  );
}

function ZoneProperties({
  zone,
  canRemove,
  onChange,
  onRemove,
}: {
  zone: CustomizationZone;
  canRemove: boolean;
  onChange: (updater: (zone: CustomizationZone) => CustomizationZone) => void;
  onRemove: () => void;
}) {
  const set = <K extends keyof CustomizationZone>(key: K, value: CustomizationZone[K]) =>
    onChange((current) => ({ ...current, [key]: value }));

  return (
    <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-slate-900">Zone production rules</p>
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="text-sm font-semibold text-rose-700 disabled:opacity-30"
        >
          Remove
        </button>
      </div>
      <div className="mt-5 space-y-4">
        <Field label="Zone name" value={zone.name} onChange={(value) => set("name", value)} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Width (mm)"
            value={zone.widthMm}
            onChange={(value) => set("widthMm", value)}
          />
          <NumberField
            label="Height (mm)"
            value={zone.heightMm}
            onChange={(value) => set("heightMm", value)}
          />
          <NumberField
            label="Safe margin (mm)"
            value={zone.safeMarginMm}
            onChange={(value) => set("safeMarginMm", value)}
          />
          <NumberField
            label="Bleed (mm)"
            value={zone.bleedMm}
            onChange={(value) => set("bleedMm", value)}
          />
          <NumberField
            label="Minimum DPI"
            value={zone.production.minImageDpi}
            onChange={(value) =>
              set("production", { ...zone.production, minImageDpi: Math.round(value) })
            }
          />
          <NumberField
            label="Min font (pt)"
            value={zone.textRules.minFontSizePt}
            onChange={(value) => set("textRules", { ...zone.textRules, minFontSizePt: value })}
          />
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Production method
          <select
            value={zone.production.method}
            onChange={(event) =>
              set("production", {
                ...zone.production,
                method: event.target.value as "print" | "engrave",
              })
            }
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none"
          >
            <option value="engrave">Engrave</option>
            <option value="print">Print</option>
          </select>
        </label>

        <div>
          <p className="text-sm font-medium text-slate-700">Allowed content</p>
          <div className="mt-2 flex gap-2">
            {(["text", "image"] as const).map((content) => {
              const active = zone.allowedContent.includes(content);
              return (
                <button
                  key={content}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? zone.allowedContent.filter((entry) => entry !== content)
                      : [...zone.allowedContent, content];
                    if (next.length > 0) {
                      set("allowedContent", next);
                    }
                  }}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold capitalize",
                    active
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-stone-200 text-slate-500",
                  ].join(" ")}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        <BlockEditor blocks={zone.blocks} onChange={(blocks) => set("blocks", blocks)} />
      </div>
    </div>
  );
}

function createBlock(type: CustomizationBlock["type"], order: number): CustomizationBlock {
  const id = `block_${crypto.randomUUID()}`;
  const common = { id, label: "New field", required: false, order };
  const bounds = {
    xRatio: 0.5,
    yRatio: 0.5,
    widthRatio: 0.8,
    heightRatio: 0.25,
    rotationDeg: 0,
    zIndex: order,
  };

  if (type === "text" || type === "textarea") {
    return {
      ...common,
      type,
      defaultValue: "",
      maxChars: 30,
      maxLines: type === "text" ? 1 : 3,
      bounds,
      fontId: "sans-bold",
      minFontSizePt: 8,
      maxFontSizePt: 20,
      color: "#111111",
      alignment: "center",
    };
  }
  if (type === "media-select") {
    return {
      ...common,
      type,
      role: "logo",
      defaultOptionId: "none",
      allowNone: true,
      bounds,
      fit: "contain",
      options: [
        {
          id: "none",
          label: "None",
          previewUrl:
            "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/%3E",
          productionAssetId: "preset_none_v1",
          sourceWidthPx: 100,
          sourceHeightPx: 100,
        },
      ],
    };
  }
  if (type === "media-upload") {
    return {
      ...common,
      type,
      accept: ["image/png", "image/jpeg"],
      maxBytes: 20 * 1024 * 1024,
      minDpi: 300,
      bounds,
      fit: "contain",
    };
  }
  if (type === "checkbox") return { ...common, type, defaultValue: false };
  return {
    ...common,
    type,
    defaultValue: "option-1",
    options: [{ value: "option-1", label: "Option 1" }],
  };
}

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: CustomizationBlock[];
  onChange: (blocks: CustomizationBlock[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(blocks[0]?.id ?? "");
  const selected = blocks.find((block) => block.id === selectedId);

  function replace(next: CustomizationBlock) {
    onChange(blocks.map((block) => (block.id === next.id ? next : block)));
  }

  return (
    <div className="border-t border-stone-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Customization blocks</p>
          <p className="mt-1 text-xs text-slate-500">Shopper form fields with fixed placement.</p>
        </div>
        <select
          value=""
          onChange={(event) => {
            if (!event.target.value) return;
            const block = createBlock(
              event.target.value as CustomizationBlock["type"],
              blocks.length + 1,
            );
            onChange([...blocks, block]);
            setSelectedId(block.id);
          }}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="">+ Add block</option>
          <option value="text">Text input</option>
          <option value="textarea">Textarea</option>
          <option value="media-select">Logo/background presets</option>
          <option value="media-upload">Artwork upload</option>
          <option value="radio">Radio options</option>
          <option value="color">Color options</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => setSelectedId(block.id)}
            className={[
              "rounded-full border px-3 py-2 text-xs font-semibold",
              selectedId === block.id
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-stone-200 text-slate-600",
            ].join(" ")}
          >
            {block.label} · {block.type}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4">
          <Field
            label="Field label"
            value={selected.label}
            onChange={(label) => replace({ ...selected, label })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.required}
              onChange={(event) => replace({ ...selected, required: event.target.checked })}
            />
            Required field
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={selected.order <= 1}
              onClick={() => replace({ ...selected, order: Math.max(1, selected.order - 1) })}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-30"
            >
              Move up
            </button>
            <button
              type="button"
              onClick={() => replace({ ...selected, order: selected.order + 1 })}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs"
            >
              Move down
            </button>
          </div>

          {selected.type === "text" || selected.type === "textarea" ? (
            <TextBlockSettings block={selected} onChange={replace} />
          ) : selected.type === "media-select" ? (
            <MediaSelectSettings block={selected} onChange={replace} />
          ) : selected.type === "media-upload" ? (
            <BlockBoundsEditor block={selected} onChange={replace} />
          ) : null}

          <button
            type="button"
            onClick={() => {
              const next = blocks.filter((block) => block.id !== selected.id);
              onChange(next);
              setSelectedId(next[0]?.id ?? "");
            }}
            className="text-xs font-semibold text-rose-700"
          >
            Delete block
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MediaSelectSettings({
  block,
  onChange,
}: {
  block: MediaSelectBlock;
  onChange: (block: MediaSelectBlock) => void;
}) {
  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        Media role
        <select
          value={block.role}
          onChange={(event) =>
            onChange({ ...block, role: event.target.value as MediaSelectBlock["role"] })
          }
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3"
        >
          <option value="logo">Logo</option>
          <option value="background">Background</option>
          <option value="border">Border</option>
          <option value="artwork">Artwork</option>
        </select>
      </label>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Preset options</p>
          <button
            type="button"
            onClick={() => {
              const id = `option_${crypto.randomUUID()}`;
              onChange({
                ...block,
                options: [
                  ...block.options,
                  {
                    id,
                    label: `Option ${block.options.length + 1}`,
                    previewUrl: "",
                    productionAssetId: `pending_${id}`,
                    sourceWidthPx: 1200,
                    sourceHeightPx: 1200,
                  },
                ],
              });
            }}
            className="text-xs font-semibold text-amber-800"
          >
            + Add option
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {block.options.map((option) => (
            <div key={option.id} className="rounded-xl border border-stone-200 bg-white p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  name={`${block.id}-default`}
                  checked={block.defaultOptionId === option.id}
                  onChange={() => onChange({ ...block, defaultOptionId: option.id })}
                />
                Default option
              </label>
              <div className="mt-2 space-y-2">
                <Field
                  label="Option label"
                  value={option.label}
                  onChange={(label) =>
                    onChange({
                      ...block,
                      options: block.options.map((entry) =>
                        entry.id === option.id ? { ...entry, label } : entry,
                      ),
                    })
                  }
                />
                <Field
                  label="Preview/asset URL"
                  value={option.previewUrl}
                  onChange={(previewUrl) =>
                    onChange({
                      ...block,
                      options: block.options.map((entry) =>
                        entry.id === option.id ? { ...entry, previewUrl } : entry,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BlockBoundsEditor block={block} onChange={onChange} />
    </>
  );
}

function TextBlockSettings({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max characters"
          value={block.maxChars}
          onChange={(maxChars) =>
            onChange({ ...block, maxChars: Math.max(1, Math.round(maxChars)) })
          }
        />
        <NumberField
          label="Max lines"
          value={block.maxLines}
          onChange={(maxLines) =>
            onChange({
              ...block,
              maxLines: block.type === "text" ? 1 : Math.max(1, Math.round(maxLines)),
            })
          }
        />
      </div>
      <Field
        label="Default value"
        value={block.defaultValue}
        onChange={(defaultValue) => onChange({ ...block, defaultValue })}
      />
      <BlockBoundsEditor block={block} onChange={onChange} />
    </>
  );
}

function BlockBoundsEditor<T extends Extract<CustomizationBlock, { bounds: unknown }>>({
  block,
  onChange,
}: {
  block: T;
  onChange: (block: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["xRatio", "yRatio", "widthRatio", "heightRatio"] as const).map((key) => (
        <NumberField
          key={key}
          label={key}
          value={block.bounds[key]}
          onChange={(value) => onChange({ ...block, bounds: { ...block.bounds, [key]: value } })}
        />
      ))}
    </div>
  );
}

function ProductSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (productId: string) => void;
}) {
  const [products, setProducts] = useState<Array<{ id: number; title: string; handle: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/products?limit=200`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setProducts(data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <label className="block text-sm font-medium text-slate-700">
      Product
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      >
        {loading ? (
          <option value="">Loading...</option>
        ) : products.length === 0 ? (
          <option value="">No products found</option>
        ) : (
          products.map((product) => (
            <option key={product.id} value={String(product.id)}>
              {product.title} ({product.handle})
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) => onChange(numberValue(event.target.value, value))}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      />
    </label>
  );
}

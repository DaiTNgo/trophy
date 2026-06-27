import { useRef, useState } from "react";
import { FocusModal, Button, Heading, Text, Input, Badge } from "@medusajs/ui";
import { Trash, Upload, Plus, Minus } from "lucide-react";
import type { CustomShape } from "@trophy/customization";
import { validateSvgPathData } from "@trophy/customization";

export function ShapeLibraryDialog({
  open,
  onOpenChange,
  shapes,
  onSelect,
  onCreate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shapes: CustomShape[];
  onSelect: (shape: CustomShape) => void;
  onCreate: (name: string, svgPathData: string, type: "svg_upload" | "polygon") => Promise<CustomShape>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"library" | "upload" | "polygon">("library");
  const [name, setName] = useState("");
  const [svgContent, setSvgContent] = useState("");
  const [error, setError] = useState("");

  async function handleUploadSvg() {
    setError("");
    const trimmed = svgContent.trim();
    if (!trimmed) { setError("Paste SVG path data or SVG markup."); return; }

    let pathData = trimmed;
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, "image/svg+xml");
    const pathEl = doc.querySelector("path");
    if (pathEl) {
      const d = pathEl.getAttribute("d");
      if (!d) { setError("SVG has no path with a 'd' attribute."); return; }
      pathData = d;
    }

    const validation = validateSvgPathData(pathData);
    if (!validation.valid) { setError(validation.error!); return; }

    const finalName = name.trim() || "Custom shape";
    await onCreate(finalName, pathData, "svg_upload");
    setName("");
    setSvgContent("");
    setTab("library");
  }

  async function handleCreatePolygon(pathData: string) {
    setError("");
    const validation = validateSvgPathData(pathData);
    if (!validation.valid) { setError(validation.error!); return; }

    const finalName = name.trim() || "Polygon shape";
    await onCreate(finalName, pathData, "polygon");
    setName("");
    setTab("library");
  }

  async function handleDelete(id: string) {
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete shape");
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center gap-4">
            <Heading>Shape Library</Heading>
            <div className="flex gap-1 rounded-md border bg-ui-bg-subtle p-0.5">
              {(["library", "upload", "polygon"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(""); }}
                  className={`rounded px-2 py-1 text-xs font-medium capitalize ${tab === t ? "bg-ui-bg-base shadow-sm" : "text-ui-fg-muted"}`}
                >
                  {t === "library" ? "Library" : t === "upload" ? "Upload SVG" : "Draw Polygon"}
                </button>
              ))}
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 p-6">
          {error && <Text className="text-ui-fg-error text-sm">{error}</Text>}

          {tab === "upload" && (
            <div className="flex flex-col gap-4">
              <Input placeholder="Shape name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea
                placeholder="Paste SVG markup or raw path 'd' attribute..."
                value={svgContent}
                onChange={(e) => setSvgContent(e.target.value)}
                className="min-h-[200px] w-full rounded-md border border-ui-border-base p-3 font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleUploadSvg}>
                  <Upload className="size-4" /> Import Shape
                </Button>
                <Button variant="secondary" onClick={() => { setSvgContent(""); setName(""); }}>Clear</Button>
              </div>
              {svgContent.trim() && (
                <div className="flex items-center justify-center rounded-lg border bg-ui-bg-subtle p-8">
                  <svg viewBox="0 0 100 100" className="h-32 w-32">
                    <path d={svgContent} fill="#333" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {tab === "polygon" && (
            <PolygonDrawTool
              name={name}
              onNameChange={setName}
              onSave={handleCreatePolygon}
            />
          )}

          {tab === "library" && (
            <div className="grid grid-cols-4 gap-4">
              {shapes.length === 0 && (
                <div className="col-span-4 flex flex-col items-center gap-2 py-12 text-ui-fg-muted">
                  <Upload className="size-8" />
                  <Text>No custom shapes yet. Upload an SVG or draw a polygon.</Text>
                </div>
              )}
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-ui-border-base p-4 hover:bg-ui-bg-subtle"
                  onClick={() => onSelect(shape)}
                >
                  <svg viewBox="0 0 100 100" className="h-16 w-16">
                    <path d={shape.svgPathData} fill="#333" />
                  </svg>
                  <Text className="text-center text-xs">{shape.name}</Text>
                  <Badge size="small" className="text-[10px]">{shape.type === "svg_upload" ? "SVG" : "Polygon"}</Badge>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(shape.id); }}
                    className="absolute right-2 top-2 hidden rounded p-1 text-ui-fg-muted hover:bg-ui-bg-base group-hover:block"
                  >
                    <Trash className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}

function PolygonDrawTool({
  name,
  onNameChange,
  onSave,
}: {
  name: string;
  onNameChange: (name: string) => void;
  onSave: (pathData: string) => Promise<void>;
}) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPoints((prev) => [...prev, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }]);
  }

  function undo() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function clear() {
    setPoints([]);
  }

  async function save() {
    if (points.length < 3) return;
    setSaving(true);
    try {
      const d = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} Z`;
      await onSave(d);
      setPoints([]);
    } finally {
      setSaving(false);
    }
  }

  const pathD = points.length > 0
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} ${points.length > 2 ? "Z" : ""}`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Shape name (optional)" value={name} onChange={(e) => onNameChange(e.target.value)} />
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="h-64 w-full cursor-crosshair rounded-lg border bg-white"
        onClick={handleClick}
      >
        {points.length > 0 && <path d={pathD} fill="#33333333" stroke="#333" strokeWidth="1" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#333" />
        ))}
      </svg>
      <div className="flex items-center gap-2">
        <Text className="text-xs text-ui-fg-muted">{points.length} vertices</Text>
        <div className="flex-1" />
        <Button variant="secondary" size="small" onClick={undo} disabled={points.length === 0}>
          <Minus className="size-3" /> Undo
        </Button>
        <Button variant="secondary" size="small" onClick={clear} disabled={points.length === 0}>
          Clear
        </Button>
        <Button size="small" onClick={save} disabled={points.length < 3 || saving}>
          <Plus className="size-3" /> Save Shape
        </Button>
      </div>
    </div>
  );
}

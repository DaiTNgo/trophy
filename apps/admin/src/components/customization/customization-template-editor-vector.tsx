import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { type CustomizationLayer, type ImageShapeEditorLayer, type VectorPoint } from "@trophy/customization";
import { createId } from "./customization-template-ui";

export function VectorPointOverlay({
  layer,
  selectedPointId,
  onSelectPoint,
  onUpdate,
}: {
  layer: ImageShapeEditorLayer;
  selectedPointId: string | null;
  onSelectPoint: (pointId: string) => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const vectorPath = layer.shape.vectorPath;
  if (!vectorPath) return null;
  const [hoverPoint, setHoverPoint] = useState<{ xRatio: number; yRatio: number; afterIndex: number } | null>(null);
  const points = vectorPath.points;
  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;

  // Build edge segments (including closing edge if closed)
  const edges: { fromIdx: number; toIdx: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    edges.push({ fromIdx: i - 1, toIdx: i });
  }
  if (vectorPath.closed && points.length > 2) {
    edges.push({ fromIdx: points.length - 1, toIdx: 0 });
  }

  function handleEdgeHover(event: React.PointerEvent<SVGElement>, fromIdx: number, toIdx: number) {
    const svg = event.currentTarget.closest("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseXRatio = (event.clientX - rect.left) / rect.width;
    const mouseYRatio = (event.clientY - rect.top) / rect.height;
    const from = points[fromIdx]!;
    const to = points[toIdx]!;
    // Project mouse position onto the line segment
    const dx = to.xRatio - from.xRatio;
    const dy = to.yRatio - from.yRatio;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return;
    let t = ((mouseXRatio - from.xRatio) * dx + (mouseYRatio - from.yRatio) * dy) / len2;
    t = Math.max(0.05, Math.min(0.95, t));
    setHoverPoint({
      xRatio: from.xRatio + dx * t,
      yRatio: from.yRatio + dy * t,
      afterIndex: fromIdx,
    });
  }

  function handleEdgeClick() {
    if (!hoverPoint) return;
    const newPoint: VectorPoint = {
      id: createId("vector_point"),
      type: "corner",
      xRatio: hoverPoint.xRatio,
      yRatio: hoverPoint.yRatio,
    };
    const insertIndex = hoverPoint.afterIndex + 1;
    onUpdate((current) =>
      current.type === "image_shape" && current.shape.vectorPath
        ? {
            ...current,
            shape: {
              ...current.shape,
              vectorPath: {
                ...current.shape.vectorPath,
                points: [
                  ...current.shape.vectorPath.points.slice(0, insertIndex),
                  newPoint,
                  ...current.shape.vectorPath.points.slice(insertIndex),
                ],
              },
            },
          }
        : current,
    );
    setHoverPoint(null);
    onSelectPoint(newPoint.id);
  }

  return (
    <>
      {/* Connection lines + invisible thick hit-test edges */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {edges.map(({ fromIdx, toIdx }) => {
          const from = points[fromIdx]!;
          const to = points[toIdx]!;
          const prevOut = from.outHandle;
          const currIn = to.inHandle;
          const x1 = from.xRatio * 100;
          const y1 = from.yRatio * 100;
          const x2 = to.xRatio * 100;
          const y2 = to.yRatio * 100;
          if (prevOut || currIn) {
            const cp1x = (from.xRatio + (prevOut?.xRatio ?? 0)) * 100;
            const cp1y = (from.yRatio + (prevOut?.yRatio ?? 0)) * 100;
            const cp2x = (to.xRatio + (currIn?.xRatio ?? 0)) * 100;
            const cp2y = (to.yRatio + (currIn?.yRatio ?? 0)) * 100;
            const d = `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`;
            return (
              <g key={`${from.id}-${to.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="8"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "stroke", cursor: "copy" }}
                  onPointerMove={(e) => handleEdgeHover(e, fromIdx, toIdx)}
                  onPointerLeave={() => setHoverPoint(null)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleEdgeClick();
                  }}
                />
              </g>
            );
          }
          return (
            <g key={`${from.id}-${to.id}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6366f1"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              {/* Invisible thick line for hover detection */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth="8"
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "stroke", cursor: "copy" }}
                onPointerMove={(e) => handleEdgeHover(e, fromIdx, toIdx)}
                onPointerLeave={() => setHoverPoint(null)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleEdgeClick();
                }}
              />
            </g>
          );
        })}
        {/* Hover preview point */}
        {hoverPoint ? (
          <circle
            cx={hoverPoint.xRatio * 100}
            cy={hoverPoint.yRatio * 100}
            r="4"
            fill="#22c55e"
            stroke="white"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: "none" }}
          />
        ) : null}
      </svg>
      {/* Point circles */}
      {points.map((point) => (
        <VectorPointHandle
          key={point.id}
          point={point}
          isSelected={selectedPointId === point.id}
          onSelect={() => onSelectPoint(point.id)}
          onDrag={(xRatio, yRatio) => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) =>
                          p.id === point.id ? { ...p, xRatio, yRatio } : p,
                        ),
                      },
                    },
                  }
                : current,
            );
          }}
          onDoubleClick={() => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) => {
                          if (p.id !== point.id) return p;
                          if (p.type === "corner") {
                            return { ...p, type: "smooth", inHandle: { xRatio: -0.08, yRatio: 0 }, outHandle: { xRatio: 0.08, yRatio: 0 } };
                          }
                          return { ...p, type: "corner", inHandle: undefined, outHandle: undefined };
                        }),
                      },
                    },
                  }
                : current,
            );
          }}
          onDelete={() => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.filter((p) => p.id !== point.id),
                      },
                    },
                  }
                : current,
            );
          }}
        />
      ))}
      {/* Handle lines */}
      {selectedPoint?.type === "smooth" && selectedPoint.inHandle ? (
        <VectorHandleLine point={selectedPoint} handle="in" onUpdate={onUpdate} />
      ) : null}
      {selectedPoint?.type === "smooth" && selectedPoint.outHandle ? (
        <VectorHandleLine point={selectedPoint} handle="out" onUpdate={onUpdate} />
      ) : null}
    </>
  );
}

function VectorPointHandle({
  point,
  isSelected,
  onSelect,
  onDrag,
  onDoubleClick,
  onDelete,
}: {
  point: VectorPoint;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (xRatio: number, yRatio: number) => void;
  onDoubleClick: () => void;
  onDelete: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; xRatio: number; yRatio: number } | null>(null);

  useKeyboardDelete(onDelete, isSelected);

  return (
    <button
      type="button"
      className={`absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${isSelected ? "bg-indigo-500" : "bg-indigo-300"}`}
      style={{ left: `${point.xRatio * 100}%`, top: `${point.yRatio * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        const target = event.currentTarget.parentElement as HTMLElement | null;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        dragRef.current = { startX: event.clientX, startY: event.clientY, xRatio: point.xRatio, yRatio: point.yRatio };
        // Need pointer capture to get move events on the parent
        const move = (pointer: PointerEvent) => {
          if (!dragRef.current) return;
          const dx = (pointer.clientX - dragRef.current.startX) / bounds.width;
          const dy = (pointer.clientY - dragRef.current.startY) / bounds.height;
          onDrag(
            Math.max(0, Math.min(1, dragRef.current.xRatio + dx)),
            Math.max(0, Math.min(1, dragRef.current.yRatio + dy)),
          );
        };
        const stop = () => {
          dragRef.current = null;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick();
      }}
    />
  );
}

function VectorHandleLine({
  point,
  handle,
  onUpdate,
}: {
  point: VectorPoint;
  handle: "in" | "out";
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const handleData = handle === "in" ? point.inHandle : point.outHandle;
  if (!handleData) return null;
  const hx = point.xRatio + handleData.xRatio;
  const hy = point.yRatio + handleData.yRatio;

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1={point.xRatio * 100}
          y1={point.yRatio * 100}
          x2={hx * 100}
          y2={hy * 100}
          stroke="#38bdf8"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <button
        type="button"
        className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-400 shadow-sm"
        style={{ left: `${hx * 100}%`, top: `${hy * 100}%` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          const target = event.currentTarget.parentElement as HTMLElement | null;
          if (!target) return;
          const bounds = target.getBoundingClientRect();
          const startX = event.clientX;
          const startY = event.clientY;
          const startHx = handleData.xRatio;
          const startHy = handleData.yRatio;
          function move(pointer: PointerEvent) {
            const dx = (pointer.clientX - startX) / bounds.width;
            const dy = (pointer.clientY - startY) / bounds.height;
            const newHx = startHx + dx;
            const newHy = startHy + dy;
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) =>
                          p.id === point.id ? { ...p, [handle === "in" ? "inHandle" : "outHandle"]: { xRatio: newHx, yRatio: newHy } } : p,
                        ),
                      },
                    },
                  }
                : current,
            );
          }
          function stop() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
          }
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", stop);
        }}
      />
    </>
  );
}

function useKeyboardDelete(onDelete: () => void, enabled: boolean) {
  const ref = useRef(onDelete);
  ref.current = onDelete;
  useEffect(() => {
    if (!enabled) return;
    function handler(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        ref.current();
      }
    }
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled]);
}


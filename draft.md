```tsx


let measureSpan: HTMLSpanElement | null = null;
function measureTextDOM(text: string, fontSizePt: number, fontId: string): number {
  if (typeof window === "undefined" || !document.body) return text.length * fontSizePt * 0.55;
  if (!measureSpan) {
    measureSpan = document.createElement("span");
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.style.whiteSpace = "pre";
    measureSpan.style.pointerEvents = "none";
    document.body.appendChild(measureSpan);
  }
  measureSpan.style.fontFamily = `"${fontId}", sans-serif`;
  measureSpan.style.fontSize = `${fontSizePt}px`;
  measureSpan.textContent = text;
  return measureSpan.getBoundingClientRect().width;
}
```


pdf text bị cắt.
text path không đúng so với preview
storefront chưa load đúng image block.

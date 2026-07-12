import type { PDFPage } from "pdf-lib";
import { rgb, type PDFFont } from "pdf-lib";
import type { TextAlign } from "@trophy/customization";

export interface DrawStraightTextOptions {
  page: PDFPage;
  embeddedFont: PDFFont;
  text: string;
  fontSizePt: number;
  color: string;
  align: TextAlign;
  frameX: number;
  frameTopY: number;
  frameW: number;
}

export function drawStraightText(opts: DrawStraightTextOptions) {
  const { page, embeddedFont, text, fontSizePt, color: colorHex, align, frameX, frameTopY, frameW } = opts;

  const lines = text.split("\n");
  const lineHeight = fontSizePt * 1.35;
  const c = colorHex.replace("#", "");
  const [r, g, b] = [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
  const color = rgb(r / 255, g / 255, b / 255);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line) continue;

    const baselineY = frameTopY - fontSizePt - i * lineHeight;

    let x = frameX;
    if (align === "center") {
      const textW = embeddedFont.widthOfTextAtSize(line, fontSizePt);
      x = frameX + (frameW - textW) / 2;
    } else if (align === "right") {
      const textW = embeddedFont.widthOfTextAtSize(line, fontSizePt);
      x = frameX + frameW - textW;
    } else if (align === "justified" && lines.length > 1 && i < lines.length - 1) {
      drawJustifiedLine(page, embeddedFont, line, fontSizePt, color, frameX, baselineY, frameW);
      continue;
    }
    page.drawText(line, { x, y: baselineY, size: fontSizePt, font: embeddedFont, color });
  }
}

function drawJustifiedLine(
  page: PDFPage,
  embeddedFont: PDFFont,
  line: string,
  fontSizePt: number,
  color: import("pdf-lib").Color,
  frameX: number,
  baselineY: number,
  frameW: number,
) {
  const words = line.split(" ").filter(Boolean);
  if (words.length <= 1) {
    page.drawText(line, { x: frameX, y: baselineY, size: fontSizePt, font: embeddedFont, color });
    return;
  }
  const totalWordW = words.reduce((sum, w) => sum + embeddedFont.widthOfTextAtSize(w, fontSizePt), 0);
  const gap = (frameW - totalWordW) / (words.length - 1);
  let x = frameX;
  for (const word of words) {
    page.drawText(word, { x, y: baselineY, size: fontSizePt, font: embeddedFont, color });
    x += embeddedFont.widthOfTextAtSize(word, fontSizePt) + gap;
  }
}

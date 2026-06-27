/**
 * Straight text rendering for vector PDF export.
 *
 * Uses pdf-lib's native drawText() so text is stored as real glyphs in the PDF
 * (selectable, searchable, font embedded via fontkit subsetting).
 *
 * Handles:
 *   - Multiline (\n split)
 *   - Alignment: left, center, right, justified
 *   - Line height matching preview: fontSizePt * 1.35
 */

import type { PDFPage } from "pdf-lib";
import { rgb, type PDFFont } from "pdf-lib";
import type { TextAlign } from "@trophy/customization";

export interface DrawStraightTextOptions {
  page: PDFPage;
  embeddedFont: PDFFont;
  text: string;            // may contain \n
  fontSizePt: number;
  color: string;           // hex color
  align: TextAlign;
  /** Frame left edge in PDF coords (x) */
  frameX: number;
  /** Frame top edge in PDF coords (y, bottom-up) — top of first line */
  frameTopY: number;
  /** Frame width in design px (used for alignment) */
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

    // In PDF bottom-up coords: line 0 = top, so y decreases per line.
    // frameTopY is the top of the text block in PDF coords.
    // For line 0: y = frameTopY - fontSizePt (pdf-lib draws from baseline)
    const baselineY = frameTopY - fontSizePt - i * lineHeight;

    let x = frameX;
    if (align === "center") {
      const textW = embeddedFont.widthOfTextAtSize(line, fontSizePt);
      x = frameX + (frameW - textW) / 2;
    } else if (align === "right") {
      const textW = embeddedFont.widthOfTextAtSize(line, fontSizePt);
      x = frameX + frameW - textW;
    } else if (align === "justified" && lines.length > 1 && i < lines.length - 1) {
      // Justified: distribute word spacing to fill the frame width.
      // pdf-lib drawText does not support word-spacing natively,
      // so we draw word-by-word with computed gaps.
      drawJustifiedLine(page, embeddedFont, line, fontSizePt, color, frameX, baselineY, frameW);
      continue;
    }
    // left / last-line justified / single-line justified
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

import { describe, expect, it } from "vitest";
import {
  ACCEPT_CLIPART_MIME_TYPES,
  SUPPORTED_CLIPART_TYPES_HINT,
  SUPPORTED_CLIPART_MIME_TYPES,
  buildUploadDraftErrors,
  inferClipartMimeType,
} from "./clipart-utils";

describe("clipart-utils", () => {
  describe("constants", () => {
    it("exports supported clipart hints and mime types", () => {
      expect(SUPPORTED_CLIPART_TYPES_HINT).toBe("SVG, PNG, WEBP up to 20MB");
      expect(ACCEPT_CLIPART_MIME_TYPES).toContain(".svg");
      expect(ACCEPT_CLIPART_MIME_TYPES).toContain(".png");
      expect(ACCEPT_CLIPART_MIME_TYPES).toContain(".webp");
      expect(ACCEPT_CLIPART_MIME_TYPES).not.toContain(".pdf");
      expect(SUPPORTED_CLIPART_MIME_TYPES.has("application/pdf")).toBe(false);
      expect(SUPPORTED_CLIPART_MIME_TYPES.has("image/svg+xml")).toBe(true);
      expect(SUPPORTED_CLIPART_MIME_TYPES.has("image/png")).toBe(true);
      expect(SUPPORTED_CLIPART_MIME_TYPES.has("image/webp")).toBe(true);
    });
  });

  describe("inferClipartMimeType", () => {
    it("recognizes svg, png, and webp files", () => {
      expect(inferClipartMimeType(new File([], "badge.svg", { type: "image/svg+xml" }))).toBe("image/svg+xml");
      expect(inferClipartMimeType(new File([], "badge.svg", { type: "" }))).toBe("image/svg+xml");
      expect(inferClipartMimeType(new File([], "badge.png", { type: "image/png" }))).toBe("image/png");
      expect(inferClipartMimeType(new File([], "badge.webp", { type: "image/webp" }))).toBe("image/webp");
    });

    it("does not recognize pdf or unsupported types as valid clipart mime type", () => {
      expect(inferClipartMimeType(new File([], "doc.pdf", { type: "application/pdf" }))).toBe("application/pdf");
      expect(inferClipartMimeType(new File([], "doc.pdf", { type: "" }))).toBe("");
    });
  });

  describe("buildUploadDraftErrors", () => {
    it("validates valid drafts without errors", () => {
      const drafts = [
        {
          file: new File(["svg content"], "star.svg", { type: "image/svg+xml" }),
          name: { vi: "Ngôi sao", en: "Star" },
          mimeType: "image/svg+xml",
        },
      ];
      const errors = buildUploadDraftErrors(drafts);
      expect(errors[0]).toEqual([]);
    });

    it("rejects unsupported files like PDF", () => {
      const drafts = [
        {
          file: new File(["pdf content"], "document.pdf", { type: "application/pdf" }),
          name: { vi: "Document", en: "Document" },
          mimeType: "application/pdf",
        },
      ];
      const errors = buildUploadDraftErrors(drafts);
      expect(errors[0]).toContain("Only SVG, PNG, and WebP files are supported.");
    });

    it("rejects missing Vietnamese name", () => {
      const drafts = [
        {
          file: new File(["png content"], "icon.png", { type: "image/png" }),
          name: { vi: "  ", en: "Icon" },
          mimeType: "image/png",
        },
      ];
      const errors = buildUploadDraftErrors(drafts);
      expect(errors[0]).toContain("Name is required.");
    });

    it("rejects empty files or files exceeding 20MB", () => {
      const emptyFile = new File([], "empty.png", { type: "image/png" });
      const drafts = [
        {
          file: emptyFile,
          name: { vi: "Empty", en: "Empty" },
          mimeType: "image/png",
        },
      ];
      const errors = buildUploadDraftErrors(drafts);
      expect(errors[0]).toContain("File must be smaller than 20 MB.");
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  inferClipartMimeType,
  prepareClipartBatchUpload,
  readClipartMetadata,
  validateClipartCategoryForLibraryWrites,
} from "./clipart";

describe("validateClipartCategoryForLibraryWrites", () => {
  it("rejects a missing category", () => {
    expect(validateClipartCategoryForLibraryWrites(null)).toEqual({
      ok: false,
      status: 404,
      error: "Clipart category not found",
    });
  });

  it("rejects an inactive category", () => {
    expect(validateClipartCategoryForLibraryWrites({ active: false })).toEqual({
      ok: false,
      status: 409,
      error: "Clipart category is inactive",
    });
  });

  it("accepts an active category", () => {
    expect(validateClipartCategoryForLibraryWrites({ active: true })).toEqual({
      ok: true,
    });
  });
});

describe("prepareClipartBatchUpload", () => {
  it("accepts webp files when the browser omits the mime type but the extension is valid", async () => {
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x1e, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x17, 0x00, 0x00,
      0x17, 0x00, 0x00,
    ]);
    const file = new File([webpBytes], "badge.webp", { type: "" });

    const result = await prepareClipartBatchUpload({
      files: [file],
      names: ["Badge"],
      maxAssetBytes: 20 * 1024 * 1024,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.prepared[0]).toMatchObject({
      fileName: "badge.webp",
      mimeType: "image/webp",
      metadata: { width: 24, height: 24 },
    });
  });

  it("returns row-level validation for duplicate filenames while allowing duplicate display names", async () => {
    const result = await prepareClipartBatchUpload({
      files: [
        new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>'],
          "star.svg",
          { type: "image/svg+xml" },
        ),
        new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/></svg>'],
          "star.svg",
          { type: "image/svg+xml" },
        ),
      ],
      names: ["Star", "Star"],
      maxAssetBytes: 20 * 1024 * 1024,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      error: "Duplicate files in the same clipart batch are not allowed",
      rowErrors: [{ row: 2, message: "Duplicate files in the same clipart batch are not allowed" }],
    });
  });

  it("prepares a valid clipart batch", async () => {
    const result = await prepareClipartBatchUpload({
      files: [
        new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>'],
          "star.svg",
          { type: "image/svg+xml" },
        ),
      ],
      names: ["Star"],
      maxAssetBytes: 20 * 1024 * 1024,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.prepared[0]).toMatchObject({
      displayName: "Star",
      fileName: "star.svg",
      mimeType: "image/svg+xml",
      metadata: { width: 24, height: 24 },
    });
  });
});

describe("readClipartMetadata", () => {
  it("rejects unsafe svg content", () => {
    const result = readClipartMetadata({
      mimeType: "image/svg+xml",
      bytes: new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script></svg>',
      ),
    });

    expect(result).toEqual({
      ok: false,
      error: "SVG assets must not contain scripts, external references, or event handlers.",
      status: 422,
    });
  });
});

describe("inferClipartMimeType", () => {
  it("falls back to the file extension when the mime type is missing", () => {
    expect(inferClipartMimeType({ mimeType: "", fileName: "badge.webp" })).toBe("image/webp");
  });
});

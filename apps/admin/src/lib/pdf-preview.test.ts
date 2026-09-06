import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  render: vi.fn().mockResolvedValue(undefined),
  getPage: vi.fn(),
  getDocument: vi.fn(),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: mocks.getDocument,
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "pdf-worker" }));

import { convertPdfToImageFile } from "./pdf-preview";

describe("convertPdfToImageFile", () => {
  beforeEach(() => {
    mocks.getPage.mockReset();
    mocks.getDocument.mockReset();
    mocks.render.mockClear();

    mocks.getPage.mockResolvedValue({
      getViewport: vi.fn().mockReturnValue({ width: 80, height: 40 }),
      render: () => ({ promise: mocks.render() }),
    });
    mocks.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: mocks.getPage }),
    });

    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue({
        width: 0,
        height: 0,
        getContext: () => ({ clearRect: vi.fn() }),
        toBlob: (callback: BlobCallback, type?: string) =>
          callback(new Blob(["webp"], { type })),
      }),
    });
  });

  it("renders the first PDF page into a WebP file", async () => {
    const pdf = new File(["pdf"], "trophy-design.pdf", {
      type: "application/pdf",
    });

    const image = await convertPdfToImageFile(pdf);

    expect(mocks.getPage).toHaveBeenCalledWith(1);
    expect(image.name).toBe("trophy-design.webp");
    expect(image.type).toBe("image/webp");
  });
});

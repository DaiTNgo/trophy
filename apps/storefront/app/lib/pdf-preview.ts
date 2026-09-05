import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function renderPdfBufferToDataUrl(
  buffer: ArrayBuffer,
  scale = 1.0,
  mimeType = "image/jpeg",
  quality = 0.9
): Promise<{ width: number; height: number; dataUrl: string; numPages: number }> {
  const pdfjsLib = await getPdfjs();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDocument = await loadingTask.promise;

  if (pdfDocument.numPages === 0) {
    throw new Error("PDF file contains no pages.");
  }

  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Unable to create canvas context for PDF preview.");
  }

  await page.render({
    canvasContext,
    viewport,
  } as any).promise;

  const dataUrl = canvas.toDataURL(mimeType, quality);

  return {
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    dataUrl,
    numPages: pdfDocument.numPages,
  };
}

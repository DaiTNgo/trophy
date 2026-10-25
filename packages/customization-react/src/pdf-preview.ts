import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function loadFirstPage(data: ArrayBuffer) {
  const pdfjsLib = await getPdfjs();
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;

  if (pdfDocument.numPages === 0) {
    throw new Error("PDF file contains no pages.");
  }

  const page = await pdfDocument.getPage(1);
  return { page, numPages: pdfDocument.numPages };
}

async function renderFirstPageToCanvas(data: ArrayBuffer, scale: number) {
  const { page, numPages } = await loadFirstPage(data);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Unable to create canvas context for PDF preview.");
  }

  // Clear default white fill so transparent PDFs stay transparent
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext,
    viewport,
    background: "rgba(0,0,0,0)",
  } as any).promise;

  return { canvas, viewport, numPages };
}

export async function renderPdfBufferToDataUrl(
  buffer: ArrayBuffer,
  scale = 1.0,
  mimeType = "image/jpeg",
  quality = 0.9,
): Promise<{ width: number; height: number; dataUrl: string; numPages: number }> {
  const { canvas, viewport, numPages } = await renderFirstPageToCanvas(buffer, scale);

  return {
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    dataUrl: canvas.toDataURL(mimeType, quality),
    numPages,
  };
}

export async function convertPdfToImageFile(file: File): Promise<File> {
  // Use scale 2.0 for higher quality thumbnail images
  const { canvas } = await renderFirstPageToCanvas(await file.arrayBuffer(), 2.0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to convert canvas to blob"));
      const newName = file.name.replace(/\.[^/.]+$/i, ".webp");
      resolve(new File([blob], newName, { type: "image/webp" }));
    }, "image/webp", 0.9);
  });
}

export async function getPdfDimensions(file: File): Promise<{ widthPx: number; heightPx: number }> {
  const { page } = await loadFirstPage(await file.arrayBuffer());
  const viewport = page.getViewport({ scale: 1.0 });

  return {
    widthPx: Math.round(viewport.width),
    heightPx: Math.round(viewport.height),
  };
}

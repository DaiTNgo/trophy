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

export async function extractPdfPreview(file: File): Promise<{ width: number; height: number; dataUrl: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await renderPdfBufferToDataUrl(arrayBuffer, 1.0, "image/jpeg", 0.9);
  return {
    width: result.width,
    height: result.height,
    dataUrl: result.dataUrl,
  };
}

export async function convertPdfToImageFile(file: File): Promise<File> {
  const [pdfjsLib, arrayBuffer] = await Promise.all([
    getPdfjs(),
    file.arrayBuffer(),
  ]);
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  
  if (pdfDocument.numPages === 0) {
    throw new Error("PDF file contains no pages.");
  }
  
  // Use scale 2.0 for higher quality thumbnail images
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  
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
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to convert canvas to blob"));
      const newName = file.name.replace(/\.[^/.]+$/i, ".webp");
      resolve(new File([blob], newName, { type: "image/webp" }));
    }, "image/webp", 0.9);
  });
}

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export async function extractPdfPreview(file: File): Promise<{ width: number; height: number; dataUrl: string }> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  
  if (pdfDocument.numPages === 0) {
    throw new Error("PDF file contains no pages.");
  }
  
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  
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
  
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  
  return {
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    dataUrl,
  };
}

import * as pdfjsLib from "pdfjs-dist/build/pdf.js";

async function main() {
  const loadingTask = pdfjsLib.getDocument({ url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  console.log("Viewport:", viewport);
  console.log("Math.round:", Math.round(viewport.width));
}
main().catch(console.error);

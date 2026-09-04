const { PDFDocument } = require('pdf-lib');
async function run() {
  try {
    await PDFDocument.load(new Uint8Array([82, 73, 70, 70, 10, 0, 0, 0, 87, 69, 66, 80])); // WEBP magic
    console.log("Loaded!");
  } catch (err) {
    console.error("Threw:", err.message);
  }
}
run();

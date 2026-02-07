import * as pdfjsLib from 'pdfjs-dist';

// Set worker path (CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert the first page of a PDF to an image data URL
 * @param file - The PDF file
 * @returns Base64 data URL of the first page as PNG
 */
export async function convertPdfFirstPageToImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get first page
  const page = await pdf.getPage(1);
  
  // Set scale for better quality (2x)
  const scale = 2;
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d')!;
  
  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  // Convert to data URL
  return canvas.toDataURL('image/png');
}

/**
 * Check if a file is a PDF
 */
export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

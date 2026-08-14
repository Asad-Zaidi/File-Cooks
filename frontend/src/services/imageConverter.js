import { loadImageElement, renderImageToCanvas, canvasToBmpBlob } from '../utils/imageUtils';
import { getMimeTypeForFormat } from '../utils/filenameUtils';
import { jsPDF } from 'jspdf';

/**
 * Main Professional Client-Side Image Converter Engine
 *
 * @param {object} params
 * @param {File|Blob} params.inputFile - Source image file
 * @param {string} params.outputFormat - Target format ('jpg', 'png', 'webp', 'bmp', 'pdf')
 * @param {number} [params.quality=90] - Compression quality (1-100) for JPG/WebP/PDF
 * @param {string} [params.backgroundColor='#ffffff'] - Solid background color for transparent source images converting to JPG/BMP/PDF
 * @param {number} [params.rotation=0] - Rotation in degrees (0, 90, 180, 270)
 * @param {number} [params.scalePercent=100] - Scale percentage (10% - 200%)
 * @returns {Promise<{blob: Blob, width: number, height: number, size: number}>}
 */
export async function convertImage({
  inputFile,
  outputFormat = 'webp',
  quality = 90,
  backgroundColor = '#ffffff',
  rotation = 0,
  scalePercent = 100,
}) {
  if (!inputFile) {
    throw new Error('No input file provided for conversion.');
  }

  const format = outputFormat.toLowerCase();
  const normalizedQuality = Math.min(100, Math.max(1, quality)) / 100;

  // 1. Decode image into HTMLImageElement
  const { img, width: originalWidth, height: originalHeight } = await loadImageElement(inputFile);

  // Apply scale percentage if specified
  const scale = Math.max(10, Math.min(200, scalePercent)) / 100;
  const targetWidth = Math.round(originalWidth * scale);
  const targetHeight = Math.round(originalHeight * scale);

  // 2. Determine background color requirement
  const isLossyFormat = format === 'jpg' || format === 'jpeg' || format === 'bmp' || format === 'pdf';
  const fillColor = isLossyFormat ? backgroundColor : null;

  // 3. Render image to Canvas with scaling and rotation
  const canvas = renderImageToCanvas(img, {
    width: targetWidth,
    height: targetHeight,
    rotation: rotation,
    backgroundColor: fillColor,
  });

  // 4. Encode to target Blob
  let resultBlob = null;

  if (format === 'pdf') {
    const imgDataUrl = canvas.toDataURL('image/jpeg', normalizedQuality);
    const orientation = canvas.width > canvas.height ? 'l' : 'p';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
    resultBlob = pdf.output('blob');
  } else if (format === 'bmp') {
    resultBlob = canvasToBmpBlob(canvas);
  } else {
    const mimeType = getMimeTypeForFormat(format);

    resultBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                `Browser failed to encode canvas as ${mimeType}. Format may not be supported natively by this browser.`
              )
            );
          }
        },
        mimeType,
        normalizedQuality
      );
    });
  }

  if (!resultBlob || resultBlob.size === 0) {
    throw new Error(`Failed to produce valid output blob for format "${format}".`);
  }

  return {
    blob: resultBlob,
    width: canvas.width,
    height: canvas.height,
    size: resultBlob.size,
  };
}

/**
 * Combines multiple images into a single multi-page PDF document.
 *
 * @param {object} params
 * @param {Array<{file: File, rotation?: number}>} params.items - Queue items
 * @param {number} [params.quality=90] - Compression quality (1-100)
 * @param {string} [params.backgroundColor='#ffffff'] - Solid background color for transparent images
 * @param {number} [params.scalePercent=100] - Scale percentage
 * @param {number} [params.globalRotation=0] - Global rotation offset
 * @returns {Promise<Blob>}
 */
export async function convertImagesToSinglePdf({
  items,
  quality = 90,
  backgroundColor = '#ffffff',
  scalePercent = 100,
  globalRotation = 0,
}) {
  if (!items || items.length === 0) {
    throw new Error('No items provided to combine into single PDF.');
  }

  const normalizedQuality = Math.min(100, Math.max(1, quality)) / 100;
  let pdf = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const file = item.file;
    if (!file) continue;

    const { img, width: originalWidth, height: originalHeight } = await loadImageElement(file);
    const scale = Math.max(10, Math.min(200, scalePercent)) / 100;
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);
    const rotation = (item.rotation || 0) + (globalRotation || 0);

    const canvas = renderImageToCanvas(img, {
      width: targetWidth,
      height: targetHeight,
      rotation,
      backgroundColor,
    });

    const imgDataUrl = canvas.toDataURL('image/jpeg', normalizedQuality);
    const orientation = canvas.width > canvas.height ? 'l' : 'p';
    const pageWidth = canvas.width;
    const pageHeight = canvas.height;

    if (!pdf) {
      pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [pageWidth, pageHeight],
      });
      pdf.addImage(imgDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
    } else {
      pdf.addPage([pageWidth, pageHeight], orientation);
      pdf.addImage(imgDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
  }

  if (!pdf) {
    throw new Error('Failed to generate combined PDF document.');
  }

  return pdf.output('blob');
}

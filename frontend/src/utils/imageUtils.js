/**
 * Advanced Image processing utilities for HTML5 Canvas rendering.
 */

/**
 * Loads a File / Blob into an HTMLImageElement safely.
 * @param {Blob|File} blob
 * @returns {Promise<{img: HTMLImageElement, width: number, height: number}>}
 */
export function loadImageElement(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image file. File may be corrupted or in an unsupported sub-format.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Renders an image to an HTMLCanvasElement with target dimensions, rotation, and background color fill.
 * @param {HTMLImageElement} img
 * @param {object} options
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {number} [options.rotation=0] - Rotation angle in degrees (0, 90, 180, 270)
 * @param {string} [options.backgroundColor]
 * @returns {HTMLCanvasElement}
 */
export function renderImageToCanvas(img, options = {}) {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const targetWidth = options.width && options.width > 0 ? Math.round(options.width) : origW;
  const targetHeight = options.height && options.height > 0 ? Math.round(options.height) : origH;
  const rotation = (options.rotation || 0) % 360;

  // Swap canvas dimensions if rotated 90 or 270 degrees
  const isRotated90 = rotation === 90 || rotation === 270;
  const canvasWidth = isRotated90 ? targetHeight : targetWidth;
  const canvasHeight = isRotated90 ? targetWidth : targetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Canvas 2D context is not available in this environment.');
  }

  // Smooth image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background color if specified (essential for transparent PNG -> JPG/BMP)
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Save context for transformation matrix
  ctx.save();

  // Move origin to center of canvas for rotation
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  // Draw image centered
  ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

  // Restore context
  ctx.restore();

  return canvas;
}

/**
 * Encodes an HTMLCanvasElement into a BMP Blob (since standard HTMLCanvasElement.toBlob may not support image/bmp natively in all browsers).
 * @param {HTMLCanvasElement} canvas
 * @returns {Blob}
 */
export function canvasToBmpBlob(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // BMP header constants
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const headerSize = fileHeaderSize + infoHeaderSize;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = headerSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // File Header
  view.setUint16(0, 0x424d, false); // "BM"
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, headerSize, true);

  // Info Header
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // Top-down
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 24, true); // 24 bits per pixel (RGB)
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // Horiz resolution (72 DPI)
  view.setInt32(42, 2835, true); // Vert resolution
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Write pixel data (BGR format)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      view.setUint8(offset++, b);
      view.setUint8(offset++, g);
      view.setUint8(offset++, r);
    }
    // Row padding to 4-byte boundary
    const padding = rowSize - width * 3;
    offset += padding;
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

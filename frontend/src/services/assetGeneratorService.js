import { loadImageElement } from '../utils/imageUtils';
import { createMultiResolutionIco } from './icoGenerator';
import { generateManifestSnippet } from './codeSnippetService';

/**
 * Renders an image onto a square canvas with fit: contain, aspect ratio preservation, padding, and background.
 * @param {HTMLImageElement} img
 * @param {number} targetSize - Target width and height in px
 * @param {object} options
 * @param {number} [options.paddingPercent=0] - Icon padding percentage (0-30%)
 * @param {string} [options.backgroundColor='transparent'] - Fill background color
 * @returns {HTMLCanvasElement}
 */
function renderSquareIconCanvas(img, targetSize, options = {}) {
  const { paddingPercent = 0, backgroundColor = 'transparent' } = options;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D context not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background if not transparent
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
  }

  // Calculate inner drawable bounds with padding
  const paddingPx = Math.round(targetSize * (Math.max(0, Math.min(30, paddingPercent)) / 100));
  const availW = targetSize - paddingPx * 2;
  const availH = targetSize - paddingPx * 2;

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const aspect = origW / origH;

  let drawW, drawH;
  if (aspect >= 1) {
    drawW = availW;
    drawH = Math.round(availW / aspect);
  } else {
    drawH = availH;
    drawW = Math.round(availH * aspect);
  }

  const drawX = Math.round(paddingPx + (availW - drawW) / 2);
  const drawY = Math.round(paddingPx + (availH - drawH) / 2);

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return canvas;
}

/**
 * Renders an image onto an Open Graph canvas (default 1200x630).
 * @param {HTMLImageElement} img
 * @param {object} options
 * @param {number} [options.width=1200]
 * @param {number} [options.height=630]
 * @param {string} [options.backgroundColor='transparent']
 * @param {string} [options.logoFit='contain']
 * @param {number} [options.logoSizePercent=70]
 * @param {string} [options.position='center']
 * @returns {HTMLCanvasElement}
 */
function renderOgCanvas(img, options = {}) {
  const {
    width = 1200,
    height = 630,
    backgroundColor = 'transparent',
    logoFit = 'contain',
    logoSizePercent = 70,
    position = 'center',
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D context not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const aspect = origW / origH;

  const sizeScale = Math.max(10, Math.min(100, logoSizePercent)) / 100;
  const targetMaxW = width * sizeScale;
  const targetMaxH = height * sizeScale;

  let drawW, drawH;

  if (logoFit === 'cover') {
    const canvasAspect = width / height;
    if (aspect > canvasAspect) {
      drawH = height;
      drawW = height * aspect;
    } else {
      drawW = width;
      drawH = width / aspect;
    }
  } else {
    // contain / fit
    if (origW / origH > targetMaxW / targetMaxH) {
      drawW = targetMaxW;
      drawH = Math.round(targetMaxW / aspect);
    } else {
      drawH = targetMaxH;
      drawW = Math.round(targetMaxH * aspect);
    }
  }

  let drawX, drawY;

  switch (position) {
    case 'top':
      drawX = Math.round((width - drawW) / 2);
      drawY = Math.round((height - drawH) * 0.1);
      break;
    case 'bottom':
      drawX = Math.round((width - drawW) / 2);
      drawY = Math.round(height - drawH - (height - drawH) * 0.1);
      break;
    case 'left':
      drawX = Math.round((width - drawW) * 0.1);
      drawY = Math.round((height - drawH) / 2);
      break;
    case 'right':
      drawX = Math.round(width - drawW - (width - drawW) * 0.1);
      drawY = Math.round((height - drawH) / 2);
      break;
    case 'center':
    default:
      drawX = Math.round((width - drawW) / 2);
      drawY = Math.round((height - drawH) / 2);
      break;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return canvas;
}

/**
 * Encodes a Canvas element to a PNG Blob asynchronously.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas encoding to PNG failed.'));
    }, 'image/png');
  });
}

/**
 * Main Asset Generator function.
 * Converts one source image into all 10 standard web icon & metadata assets.
 *
 * @param {object} params
 * @param {File|Blob} params.sourceFile - Original source image
 * @param {object} [params.settings] - Customization settings
 * @param {string} [params.settings.backgroundColor='transparent']
 * @param {number} [params.settings.iconPadding=0]
 * @param {object} [params.settings.ogSettings]
 * @param {function(object):void} [params.onProgress]
 * @returns {Promise<Array<{
 *   id: string,
 *   filename: string,
 *   format: string,
 *   width: number,
 *   height: number,
 *   size: number,
 *   blob: Blob,
 *   previewUrl: string,
 *   category: string
 * }>>}
 */
export async function generateAllWebAssets({
  sourceFile,
  settings = {},
  onProgress,
}) {
  if (!sourceFile) {
    throw new Error('No source image file provided.');
  }

  const {
    backgroundColor = 'transparent',
    iconPadding = 0,
    ogSettings = {},
  } = settings;

  // 1. Decode original source image ONCE to preserve maximum source quality
  const { img, width: origWidth, height: origHeight } = await loadImageElement(sourceFile);

  const squareIconSpecs = [
    { filename: 'favicon-16x16.png', size: 16, category: 'favicon' },
    { filename: 'favicon-32x32.png', size: 32, category: 'favicon' },
    { filename: 'favicon-48x48.png', size: 48, category: 'favicon' },
    { filename: 'favicon-64x64.png', size: 64, category: 'favicon' },
    { filename: 'favicon-128x128.png', size: 128, category: 'favicon' },
    { filename: 'apple-touch-icon.png', size: 180, category: 'apple' },
    { filename: 'logo192.png', size: 192, category: 'pwa' },
    { filename: 'logo512.png', size: 512, category: 'pwa' },
  ];

  const totalSteps = squareIconSpecs.length + 3; // + ICO, OG image, Manifest
  let completedSteps = 0;

  const updateProgress = (filename) => {
    completedSteps++;
    if (onProgress && typeof onProgress === 'function') {
      onProgress({
        currentStep: completedSteps,
        totalSteps: totalSteps,
        currentFilename: filename,
        percent: Math.round((completedSteps / totalSteps) * 100),
      });
    }
  };

  const results = [];
  const icoFrames = [];

  // 2. Generate Square Icons directly from source image
  for (const spec of squareIconSpecs) {
    const canvas = renderSquareIconCanvas(img, spec.size, {
      paddingPercent: iconPadding,
      backgroundColor: backgroundColor,
    });

    const pngBlob = await canvasToPngBlob(canvas);

    results.push({
      id: spec.filename,
      filename: spec.filename,
      format: 'PNG',
      width: spec.size,
      height: spec.size,
      size: pngBlob.size,
      blob: pngBlob,
      previewUrl: URL.createObjectURL(pngBlob),
      category: spec.category,
    });

    // Save 16, 32, 48, 64 blobs for ICO generation
    if ([16, 32, 48, 64].includes(spec.size)) {
      icoFrames.push({ size: spec.size, blob: pngBlob });
    }

    updateProgress(spec.filename);
  }

  // 3. Generate favicon.ico (multi-resolution 16/32/48/64)
  icoFrames.sort((a, b) => a.size - b.size);
  const icoBlob = await createMultiResolutionIco(icoFrames);

  results.push({
    id: 'favicon.ico',
    filename: 'favicon.ico',
    format: 'ICO (Multi-Res 16, 32, 48, 64)',
    width: 64,
    height: 64,
    size: icoBlob.size,
    blob: icoBlob,
    previewUrl: results.find((r) => r.filename === 'favicon-32x32.png')?.previewUrl || '',
    category: 'favicon',
  });
  updateProgress('favicon.ico');

  // 4. Generate Open Graph og-image.png (1200 x 630)
  const ogCanvas = renderOgCanvas(img, {
    width: ogSettings.width || 1200,
    height: ogSettings.height || 630,
    backgroundColor: ogSettings.backgroundColor || backgroundColor,
    logoFit: ogSettings.logoFit || 'contain',
    logoSizePercent: ogSettings.logoSizePercent || 70,
    position: ogSettings.position || 'center',
  });

  const ogBlob = await canvasToPngBlob(ogCanvas);

  results.push({
    id: 'og-image.png',
    filename: 'og-image.png',
    format: 'PNG',
    width: ogCanvas.width,
    height: ogCanvas.height,
    size: ogBlob.size,
    blob: ogBlob,
    previewUrl: URL.createObjectURL(ogBlob),
    category: 'social',
  });
  updateProgress('og-image.png');

  // 5. Generate manifest.webmanifest
  const appName = sourceFile.name
    ? sourceFile.name.substring(0, sourceFile.name.lastIndexOf('.')) || 'My Web App'
    : 'My Web App';
  const manifestStr = generateManifestSnippet(appName);
  const manifestBlob = new Blob([manifestStr], { type: 'application/manifest+json' });

  results.push({
    id: 'manifest.webmanifest',
    filename: 'manifest.webmanifest',
    format: 'WebManifest',
    width: 0,
    height: 0,
    size: manifestBlob.size,
    blob: manifestBlob,
    previewUrl: '',
    category: 'pwa',
  });
  updateProgress('manifest.webmanifest');

  return {
    assets: results,
    sourceDetails: {
      name: sourceFile.name,
      size: sourceFile.size,
      width: origWidth,
      height: origHeight,
    },
  };
}

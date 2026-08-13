import { CONVERTER_CONFIG } from '../services/converterConfig';

/**
 * File validation utilities including Magic Bytes checking.
 */

// Magic Bytes signatures
const MAGIC_BYTES = {
  jpg: [
    [0xff, 0xd8, 0xff]
  ],
  png: [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  ],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
  ],
  bmp: [
    [0x42, 0x4d]
  ],
  webp: [
    [0x52, 0x49, 0x46, 0x46]
  ],
  tiff: [
    [0x49, 0x49, 0x2a, 0x00],
    [0x4d, 0x4d, 0x00, 0x2a]
  ]
};

/**
 * Checks if file bytes match known image magic byte signatures.
 * @param {File|Blob} file
 * @returns {Promise<string|null>} Detected format string or null
 */
export async function detectFormatFromMagicBytes(file) {
  if (!file || file.size < 4) return null;

  try {
    let buffer;
    const slice = file.slice(0, 12);
    if (typeof slice.arrayBuffer === 'function') {
      buffer = await slice.arrayBuffer();
    } else {
      buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(slice);
      });
    }

    const bytes = new Uint8Array(buffer);

    // Check PNG
    if (bytes.length >= 8 && matchesPattern(bytes, MAGIC_BYTES.png[0])) {
      return 'png';
    }

    // Check JPEG
    if (bytes.length >= 3 && matchesPattern(bytes, MAGIC_BYTES.jpg[0])) {
      return 'jpg';
    }

    // Check GIF
    for (const pattern of MAGIC_BYTES.gif) {
      if (bytes.length >= pattern.length && matchesPattern(bytes, pattern)) {
        return 'gif';
      }
    }

    // Check BMP
    if (bytes.length >= 2 && matchesPattern(bytes, MAGIC_BYTES.bmp[0])) {
      return 'bmp';
    }

    // Check WebP (RIFF....WEBP)
    if (
      bytes.length >= 12 &&
      matchesPattern(bytes, MAGIC_BYTES.webp[0]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'webp';
    }

    // Check TIFF
    for (const pattern of MAGIC_BYTES.tiff) {
      if (bytes.length >= 4 && matchesPattern(bytes, pattern)) {
        return 'tiff';
      }
    }

    // SVG check
    const name = file.name ? file.name.toLowerCase() : '';
    if ((file.type && file.type.includes('svg')) || name.endsWith('.svg')) {
      return 'svg';
    }
  } catch (err) {
    console.warn('Magic bytes check failed:', err);
  }

  return null;
}

function matchesPattern(bytes, pattern) {
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[i] !== pattern[i]) return false;
  }
  return true;
}

/**
 * Validates a file for image conversion suitability.
 * @param {File|Blob} file
 * @param {string} [expectedSourceFormat] - Optional format constraint (e.g. 'png')
 * @returns {Promise<{valid: boolean, error?: string, format?: string}>}
 */
export async function validateImageFile(file, expectedSourceFormat) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  try {
    if (file.size > CONVERTER_CONFIG.maxFileSize) {
      const limitMB = (CONVERTER_CONFIG.maxFileSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${limitMB}MB.`
      };
    }

    // Determine detected format
    let detectedFormat = await detectFormatFromMagicBytes(file);

    if (!detectedFormat) {
      const name = file.name || '';
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
      if (normalizedExt && CONVERTER_CONFIG.supportedInputFormats.includes(normalizedExt)) {
        detectedFormat = normalizedExt;
      }
    }

    if (!detectedFormat && file.type) {
      const mimeSub = file.type.split('/')[1]?.toLowerCase();
      if (mimeSub) {
        const normalizedMime = mimeSub === 'jpeg' ? 'jpg' : mimeSub.replace('+xml', '');
        if (CONVERTER_CONFIG.supportedInputFormats.includes(normalizedMime)) {
          detectedFormat = normalizedMime;
        }
      }
      if (!detectedFormat && file.type.startsWith('image/')) {
        detectedFormat = 'png';
      }
    }

    if (!detectedFormat) {
      return {
        valid: false,
        error: `Unsupported file format. Supported: ${CONVERTER_CONFIG.supportedInputFormats.join(', ').toUpperCase()}`
      };
    }

    // If expectedSourceFormat is enforced (e.g. user clicked PNG -> JPG)
    if (expectedSourceFormat) {
      const targetFrom = expectedSourceFormat.toLowerCase();
      const normalizedDetected = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;
      if (normalizedDetected !== targetFrom) {
        return {
          valid: false,
          error: `Only ${targetFrom.toUpperCase()} files are accepted for this converter. Received: ${normalizedDetected.toUpperCase()}`
        };
      }
    }

    return { valid: true, format: detectedFormat };
  } catch (err) {
    console.error('Validation error:', err);
    if (file.type && file.type.startsWith('image/')) {
      return { valid: true, format: 'png' };
    }
    return { valid: false, error: 'Failed to validate file.' };
  }
}

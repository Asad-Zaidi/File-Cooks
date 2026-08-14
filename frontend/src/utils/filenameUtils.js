/**
 * Utility functions for file name formatting and collision prevention.
 */

/**
 * Formats bytes to human-readable string (e.g. 2.4 MB)
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Maps format code to standardized extension.
 * @param {string} format
 * @returns {string}
 */
export function getExtensionForFormat(format) {
  const map = {
    jpg: 'jpg',
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    bmp: 'bmp',
    pdf: 'pdf',
    gif: 'gif',
    svg: 'svg',
    tiff: 'tif',
  };
  return map[format.toLowerCase()] || format.toLowerCase();
}

/**
 * Maps format code to target MIME type.
 * @param {string} format
 * @returns {string}
 */
export function getMimeTypeForFormat(format) {
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    bmp: 'image/bmp',
    pdf: 'application/pdf',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    tiff: 'image/tiff',
  };
  return map[format.toLowerCase()] || 'image/png';
}

/**
 * Changes a file extension cleanly.
 * @param {string} filename
 * @param {string} targetFormat
 * @returns {string}
 */
export function replaceFileExtension(filename, targetFormat) {
  const lastDotIndex = filename.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = getExtensionForFormat(targetFormat);
  return `${baseName}.${ext}`;
}

/**
 * Ensures unique filenames in a set to prevent collisions in ZIP / downloads.
 * @param {string[]} filenames
 * @returns {string[]}
 */
export function ensureUniqueFilenames(filenames) {
  const seen = new Map();
  return filenames.map((name) => {
    const lastDot = name.lastIndexOf('.');
    const base = lastDot > 0 ? name.substring(0, lastDot) : name;
    const ext = lastDot > 0 ? name.substring(lastDot) : '';

    if (!seen.has(name)) {
      seen.set(name, 1);
      return name;
    } else {
      const count = seen.get(name);
      seen.set(name, count + 1);
      return `${base}-${count}${ext}`;
    }
  });
}

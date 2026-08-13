import JSZip from 'jszip';
import { replaceFileExtension, ensureUniqueFilenames } from '../utils/filenameUtils';

/**
 * Creates and downloads a ZIP archive containing all converted images.
 * @param {Array<{file: File, resultBlob: Blob, targetFormat: string, originalName?: string}>} items
 * @param {string} [zipFilename='converted_images.zip']
 * @param {function(number):void} [onProgress]
 * @returns {Promise<void>}
 */
export async function downloadImagesAsZip(items, zipFilename = 'converted_images.zip', onProgress) {
  if (!items || items.length === 0) {
    throw new Error('No converted images available to download.');
  }

  const zip = new JSZip();

  // Generate target filenames
  const rawFilenames = items.map((item) => {
    const origName = item.originalName || item.file?.name || 'converted-image';
    return replaceFileExtension(origName, item.targetFormat);
  });

  const uniqueFilenames = ensureUniqueFilenames(rawFilenames);

  // Add files to zip
  items.forEach((item, index) => {
    if (item.resultBlob) {
      zip.file(uniqueFilenames[index], item.resultBlob);
    }
  });

  // Generate ZIP blob with progress callback
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  // Trigger client download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = zipFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

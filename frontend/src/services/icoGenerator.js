/**
 * Pure client-side Multi-Resolution ICO Generator Engine
 *
 * Generates a valid ICO file binary containing multiple PNG-encoded icon frames
 * (16x16, 32x32, 48x48, 64x64) completely in memory.
 * No external APIs, trial SDKs, or watermarks.
 */

/**
 * Creates a multi-resolution ICO Blob from an array of image frame objects.
 * @param {Array<{size: number, blob: Blob}>} frames - Array of icon sizes and PNG Blobs
 * @returns {Promise<Blob>}
 */
export async function createMultiResolutionIco(frames) {
  if (!frames || frames.length === 0) {
    throw new Error('No image frames provided for ICO generation.');
  }

  // Read array buffers for all PNG blobs
  const frameBuffers = await Promise.all(
    frames.map(async (frame) => {
      const arrayBuffer = await frame.blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      return {
        width: frame.size >= 256 ? 0 : frame.size,
        height: frame.size >= 256 ? 0 : frame.size,
        data: uint8,
        length: uint8.byteLength,
      };
    })
  );

  const numImages = frameBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + numImages * dirEntrySize;

  let totalPayloadSize = 0;
  for (const fb of frameBuffers) {
    totalPayloadSize += fb.length;
  }

  const icoBuffer = new ArrayBuffer(totalHeaderSize + totalPayloadSize);
  const view = new DataView(icoBuffer);
  const bytes = new Uint8Array(icoBuffer);

  // 1. ICONDIR Header
  view.setUint16(0, 0, true); // Reserved (must be 0)
  view.setUint16(2, 1, true); // Image type: 1 for ICO
  view.setUint16(4, numImages, true); // Number of images

  let currentOffset = totalHeaderSize;

  // 2. ICONDIRENTRY Table & PNG Payloads
  for (let i = 0; i < numImages; i++) {
    const fb = frameBuffers[i];
    const entryOffset = headerSize + i * dirEntrySize;

    view.setUint8(entryOffset + 0, fb.width); // Width (0 for 256)
    view.setUint8(entryOffset + 1, fb.height); // Height (0 for 256)
    view.setUint8(entryOffset + 2, 0); // Palette color count (0 for >= 8bpp)
    view.setUint8(entryOffset + 3, 0); // Reserved (must be 0)
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel (32-bit RGBA)
    view.setUint32(entryOffset + 8, fb.length, true); // Image data size in bytes
    view.setUint32(entryOffset + 12, currentOffset, true); // Offset of image data from start of ICO file

    // Copy PNG binary data into ICO payload
    bytes.set(fb.data, currentOffset);
    currentOffset += fb.length;
  }

  return new Blob([icoBuffer], { type: 'image/x-icon' });
}

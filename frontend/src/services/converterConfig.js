/**
 * Centralized Configuration for Image Converter
 */
export const CONVERTER_CONFIG = {
  // Maximum individual file size in bytes (e.g. 50 MB)
  maxFileSize: 50 * 1024 * 1024,
  
  // Maximum number of files in batch queue
  maxBatchSize: 100,
  
  // Maximum concurrent conversions
  maxConcurrentConversions: 4,

  // Supported format definitions
  supportedInputFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'tiff'],
  supportedOutputFormats: ['jpg', 'png', 'webp', 'bmp', 'pdf'],

  // Default export settings
  defaults: {
    targetFormat: 'webp',
    jpegQuality: 90,
    webpQuality: 90,
    backgroundColor: '#ffffff', // For transparent -> lossy conversions
    preserveTransparency: true,
  }
};

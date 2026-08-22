import JSZip from 'jszip';
import { replaceFileExtension, ensureUniqueFilenames } from '../utils/filenameUtils';

const API_BASE = (
  (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_URL || process.env.FASTAPI_BASE)) ||
  'http://localhost:8000'
).replace(/\/$/, '');

export const AUDIO_FORMAT_SPECS = {
  mp3: {
    key: 'mp3',
    label: 'MP3',
    extensions: ['mp3'],
    mimeType: 'audio/mpeg',
    lossless: false,
    defaultBitrate: '192k',
    allowedBitrates: ['128k', '192k', '256k', '320k'],
    description: 'Universal standard with great compression and maximum device compatibility.',
  },
  wav: {
    key: 'wav',
    label: 'WAV',
    extensions: ['wav'],
    mimeType: 'audio/wav',
    lossless: true,
    description: 'Uncompressed CD-quality lossless PCM audio. Ideal for editing and mastering.',
  },
  m4a: {
    key: 'm4a',
    label: 'M4A (AAC)',
    extensions: ['m4a'],
    mimeType: 'audio/mp4',
    lossless: false,
    defaultBitrate: '192k',
    allowedBitrates: ['128k', '192k', '256k', '320k'],
    description: 'Advanced Audio Coding in MP4 container. Standard for Apple ecosystem with superior fidelity.',
  },
  aac: {
    key: 'aac',
    label: 'AAC',
    extensions: ['aac'],
    mimeType: 'audio/aac',
    lossless: false,
    defaultBitrate: '192k',
    allowedBitrates: ['128k', '192k', '256k', '320k'],
    description: 'Raw Advanced Audio Coding ADTS stream for high-efficiency audio broadcasting.',
  },
  flac: {
    key: 'flac',
    label: 'FLAC',
    extensions: ['flac'],
    mimeType: 'audio/flac',
    lossless: true,
    description: 'Free Lossless Audio Codec. Bit-for-bit identical to source with ~50% smaller file size.',
  },
  ogg: {
    key: 'ogg',
    label: 'OGG Vorbis',
    extensions: ['ogg'],
    mimeType: 'audio/ogg',
    lossless: false,
    defaultBitrate: '192k',
    allowedBitrates: ['128k', '192k', '256k', '320k'],
    description: 'Open-source lossy audio format with high fidelity at lower bitrates, popular in games & web.',
  },
  opus: {
    key: 'opus',
    label: 'Opus',
    extensions: ['opus'],
    mimeType: 'audio/opus',
    lossless: false,
    defaultBitrate: '128k',
    allowedBitrates: ['64k', '96k', '128k', '192k', '256k'],
    fixedSampleRate: 48000,
    description: 'Next-gen audio codec for ultra-low latency, speech, and modern web streaming.',
  },
  aiff: {
    key: 'aiff',
    label: 'AIFF',
    extensions: ['aiff', 'aif'],
    mimeType: 'audio/aiff',
    lossless: true,
    description: 'Apple uncompressed PCM lossless standard for professional audio production.',
  },
  amr: {
    key: 'amr',
    label: 'AMR',
    extensions: ['amr'],
    mimeType: 'audio/amr',
    lossless: false,
    defaultBitrate: '12.2k',
    allowedBitrates: ['4.75k', '5.15k', '5.9k', '6.7k', '7.4k', '7.95k', '10.2k', '12.2k'],
    fixedSampleRate: 8000,
    fixedChannels: 1,
    description: 'Adaptive Multi-Rate narrowband speech codec tailored for voice recording & telephony.',
  },
  ac3: {
    key: 'ac3',
    label: 'Dolby Digital (AC-3)',
    extensions: ['ac3'],
    mimeType: 'audio/ac3',
    lossless: false,
    defaultBitrate: '192k',
    allowedBitrates: ['128k', '192k', '256k', '320k', '384k', '448k'],
    description: 'Industry-standard surround audio codec for home theater, cinema, and digital broadcasting.',
  },
  wma: {
    key: 'wma',
    label: 'Windows Media Audio',
    extensions: ['wma'],
    mimeType: 'audio/x-ms-wma',
    inputOnly: true,
    description: 'Microsoft proprietary legacy audio format (supported as input for decoding).',
  },
};

export const COMMON_SAMPLE_RATES = [
  { value: '', label: 'Auto (Keep Source)' },
  { value: 8000, label: '8,000 Hz (Voice / Phone)' },
  { value: 16000, label: '16,000 Hz (Speech Recognition)' },
  { value: 22050, label: '22,050 Hz (AM Radio)' },
  { value: 32000, label: '32,000 Hz (Digital Broadcast)' },
  { value: 44100, label: '44,100 Hz (CD Audio Standard)' },
  { value: 48000, label: '48,000 Hz (Studio / Video Standard)' },
  { value: 96000, label: '96,000 Hz (Hi-Res Audio)' },
];

export const QUALITY_PRESETS = [
  { key: 'best', label: 'Best (320 kbps)', desc: 'Highest fidelity for critical listening' },
  { key: 'high', label: 'High (192 kbps)', desc: 'Optimal balance of crystal audio and compact size' },
  { key: 'medium', label: 'Standard (128 kbps)', desc: 'Standard bitrate for podcasts & general use' },
  { key: 'low', label: 'Economy (96 kbps)', desc: 'Minimum storage for long speech & voice recordings' },
];

export const AUDIO_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  maxBatchSize: 50,
  maxConcurrentConversions: 3,
  supportedInputExtensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'aiff', 'aif', 'amr', 'ac3', 'wma'],
  supportedOutputFormats: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'aiff', 'amr', 'ac3'],
};

/**
 * Fetch supported formats from backend
 */
export async function fetchSupportedFormats() {
  try {
    const res = await fetch(`${API_BASE}/api/audio/formats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend formats endpoint unavailable, using static registry:', err);
    return {
      input_formats: AUDIO_CONFIG.supportedInputExtensions,
      output_formats: AUDIO_CONFIG.supportedOutputFormats,
      quality_presets: ['low', 'medium', 'high', 'best'],
    };
  }
}

/**
 * Probe audio metadata
 */
export async function fetchAudioMetadata(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/audio/metadata`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || errData?.detail || 'Failed to extract metadata');
  }

  return await res.json();
}

/**
 * Convert an audio file
 */
export async function convertAudioFile(file, options = {}) {
  const {
    outputFormat = 'mp3',
    quality = null,
    bitrate = null,
    sampleRate = null,
    channels = null,
  } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('output_format', outputFormat);

  if (bitrate) {
    formData.append('bitrate', bitrate);
  } else if (quality) {
    formData.append('quality', quality);
  }

  if (sampleRate) {
    formData.append('sample_rate', String(sampleRate));
  }

  if (channels) {
    formData.append('channels', String(channels));
  }

  const res = await fetch(`${API_BASE}/api/audio/convert`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || errData?.detail || 'Audio conversion failed');
  }

  const result = await res.json();
  return result;
}

/**
 * Download a converted audio file as Blob
 */
export async function fetchConvertedBlob(downloadUrl) {
  const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${API_BASE}${downloadUrl}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error('Could not download converted file from server');
  return await res.blob();
}

/**
 * Download converted audio files as a ZIP archive
 */
export async function downloadAudioAsZip(items, zipFilename = 'converted_audio.zip', onProgress) {
  const completedItems = items.filter((i) => i.status === 'completed' && (i.resultBlob || i.downloadUrl));
  if (completedItems.length === 0) {
    throw new Error('No converted audio files available to download.');
  }

  const zip = new JSZip();

  // Prepare filenames
  const rawFilenames = completedItems.map((item) => {
    const origName = item.name || item.file?.name || 'audio-file';
    const ext = item.targetFormat === 'aiff' ? 'aiff' : item.targetFormat;
    return replaceFileExtension(origName, ext);
  });

  const uniqueFilenames = ensureUniqueFilenames(rawFilenames);

  // Fetch missing blobs if needed and add to zip
  for (let i = 0; i < completedItems.length; i++) {
    const item = completedItems[i];
    let blob = item.resultBlob;
    if (!blob && item.downloadUrl) {
      blob = await fetchConvertedBlob(item.downloadUrl);
    }
    if (blob) {
      zip.file(uniqueFilenames[i], blob);
    }
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } },
    (metadata) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = zipFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

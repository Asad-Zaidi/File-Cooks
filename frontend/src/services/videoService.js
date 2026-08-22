import JSZip from 'jszip';
import { replaceFileExtension, ensureUniqueFilenames } from '../utils/filenameUtils';

const API_BASE = (
  (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_URL || process.env.FASTAPI_BASE)) ||
  'http://localhost:8000'
).replace(/\/$/, '');

export const VIDEO_CONFIG = {
  maxFileSize: 2048 * 1024 * 1024, // 2GB, mirrors backend MAX_VIDEO_UPLOAD_SIZE_MB default
  maxBatchSize: 20,
  maxConcurrentConversions: 2, // mirrors backend MAX_CONCURRENT_CONVERSIONS default
  supportedInputExtensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'mpeg', 'mpg', 'ts', 'm2ts', '3gp', 'ogv'],
  supportedOutputFormats: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'mpeg', 'mpg', 'ts', '3gp', 'ogv'],
};

export const RESOLUTIONS = [
  { value: 'original', label: 'Original' },
  { value: '360p', label: '360p' },
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '2160p', label: '2160p (4K)' },
  { value: 'custom', label: 'Custom' },
];

export const FPS_OPTIONS = [
  { value: '', label: 'Original' },
  { value: 24, label: '24 fps (Film)' },
  { value: 25, label: '25 fps (PAL)' },
  { value: 30, label: '30 fps (Standard)' },
  { value: 50, label: '50 fps' },
  { value: 60, label: '60 fps (Smooth)' },
];

export const QUALITY_PRESETS = [
  { key: 'maximum', label: 'Maximum', desc: 'Best possible quality, slowest encode' },
  { key: 'high', label: 'High', desc: 'Great quality, larger file' },
  { key: 'balanced', label: 'Balanced', desc: 'Good quality/speed/size trade-off' },
  { key: 'fast', label: 'Fast', desc: 'Quickest encode, smaller/lower quality' },
];

export const AUDIO_BITRATES_KBPS = [64, 96, 128, 160, 192, 256, 320];

export const SAMPLE_RATES = [
  { value: '', label: 'Auto (Keep Source)' },
  { value: 8000, label: '8,000 Hz' },
  { value: 16000, label: '16,000 Hz' },
  { value: 22050, label: '22,050 Hz' },
  { value: 32000, label: '32,000 Hz' },
  { value: 44100, label: '44,100 Hz (CD Standard)' },
  { value: 48000, label: '48,000 Hz (Studio/Video Standard)' },
  { value: 96000, label: '96,000 Hz (Hi-Res)' },
];

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

async function parseErrorMessage(res) {
  const errData = await res.json().catch(() => ({}));
  return errData?.error?.message || errData?.detail || `Request failed (${res.status})`;
}

/** Fetch dynamically-supported containers/codecs/formats from the backend. */
export async function fetchSupportedVideoFormats() {
  try {
    const res = await fetch(`${API_BASE}/api/video/formats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend video formats endpoint unavailable:', err);
    return {
      ffmpeg_available: false,
      containers: [],
      audio_output_formats: [],
      resolutions: RESOLUTIONS.map((r) => r.value),
      fps_options: FPS_OPTIONS.map((f) => f.value).filter(Boolean),
      quality_presets: QUALITY_PRESETS.map((q) => q.key),
      audio_bitrates_kbps: AUDIO_BITRATES_KBPS,
      sample_rates: SAMPLE_RATES.map((s) => s.value).filter(Boolean),
    };
  }
}

export async function fetchVideoMetadata(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/video/metadata`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

function appendIfSet(formData, key, value) {
  if (value !== null && value !== undefined && value !== '') {
    formData.append(key, String(value));
  }
}

/** Submit a video -> video conversion. Returns {job_id, status}. */
export async function submitVideoConvert(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('output_format', options.outputFormat);
  appendIfSet(formData, 'video_codec', options.videoCodec);
  appendIfSet(formData, 'audio_codec', options.audioCodec);
  appendIfSet(formData, 'video_bitrate', options.videoBitrate);
  appendIfSet(formData, 'audio_bitrate', options.audioBitrate);
  appendIfSet(formData, 'resolution', options.resolution);
  appendIfSet(formData, 'custom_width', options.customWidth);
  appendIfSet(formData, 'custom_height', options.customHeight);
  appendIfSet(formData, 'fps', options.fps);
  appendIfSet(formData, 'quality', options.quality);

  const res = await fetch(`${API_BASE}/api/video/convert`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** Submit a video -> audio extraction. Returns {job_id, status}. */
export async function submitExtractAudio(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('output_format', options.outputFormat);
  appendIfSet(formData, 'bitrate', options.bitrateKbps);
  appendIfSet(formData, 'sample_rate', options.sampleRate);
  appendIfSet(formData, 'channels', options.channels);

  const res = await fetch(`${API_BASE}/api/video/extract-audio`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function fetchJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function cancelJob(jobId) {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/**
 * Poll GET /api/jobs/{id} until it reaches a terminal status, invoking
 * onProgress(job) after every poll. Returns the final job status object.
 */
export async function pollJobUntilDone(jobId, { intervalMs = 1000, onProgress } = {}) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await fetchJobStatus(jobId);
    if (onProgress) onProgress(job);
    if (TERMINAL_STATUSES.has(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** Resolve a relative /api/... download URL to a full, directly-playable URL. */
export function toAbsoluteDownloadUrl(downloadUrl) {
  if (!downloadUrl) return null;
  return downloadUrl.startsWith('http') ? downloadUrl : `${API_BASE}${downloadUrl}`;
}

export async function fetchConvertedBlob(downloadUrl) {
  const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${API_BASE}${downloadUrl}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error('Could not download the converted file from the server');
  return res.blob();
}

/** Download completed video/audio job outputs as a ZIP archive (client-side, no server ZIP service). */
export async function downloadVideosAsZip(items, zipFilename = 'converted_videos.zip', onProgress) {
  const completedItems = items.filter((i) => i.status === 'completed' && (i.resultBlob || i.downloadUrl));
  if (completedItems.length === 0) {
    throw new Error('No converted files available to download.');
  }

  const zip = new JSZip();
  const rawFilenames = completedItems.map((item) => {
    const origName = item.name || item.file?.name || 'video-file';
    return replaceFileExtension(origName, item.targetFormat);
  });
  const uniqueFilenames = ensureUniqueFilenames(rawFilenames);

  for (let i = 0; i < completedItems.length; i++) {
    const item = completedItems[i];
    let blob = item.resultBlob;
    if (!blob && item.downloadUrl) {
      blob = await fetchConvertedBlob(item.downloadUrl);
    }
    if (blob) zip.file(uniqueFilenames[i], blob);
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } },
    (metadata) => {
      if (onProgress) onProgress(Math.round(metadata.percent));
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

const API_BASE = (
  (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_URL || process.env.FASTAPI_BASE)) ||
  'http://localhost:8000'
).replace(/\/$/, '');

/**
 * Normalized error thrown by this service. Carries the backend's error
 * `code` (e.g. "PDF_INVALID", "PDF_PASSWORD_ERROR") so callers can branch on
 * it instead of pattern-matching message strings.
 */
export class PdfServiceError extends Error {
  constructor(code, message) {
    super(message || 'PDF request failed');
    this.name = 'PdfServiceError';
    this.code = code || 'UNKNOWN_ERROR';
  }
}

async function throwFromResponse(res) {
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code || 'UNKNOWN_ERROR';
  const message = body?.error?.message || body?.detail || `Request failed (HTTP ${res.status})`;
  throw new PdfServiceError(code, message);
}

/**
 * Get structured PDF information (page count, dimensions/rotation per page,
 * PDF version, file size, docinfo metadata, encryption/forms/annotations/
 * signature detection). Mirrors `POST /api/pdf/info`.
 *
 * If the PDF is encrypted and no (or the wrong) password is supplied, the
 * backend still returns 200 with `encrypted: true, password_protected: true,
 * page_count: null` rather than throwing -- callers should check for that
 * shape, not treat a resolved promise as "fully readable".
 */
export async function fetchPdfInfo(file, password = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (password) formData.append('password', password);

  const res = await fetch(`${API_BASE}/api/pdf/info`, { method: 'POST', body: formData });
  if (!res.ok) await throwFromResponse(res);
  return res.json();
}

/**
 * Lightweight validity check -- does this file open as a PDF at all?
 * Mirrors `POST /api/pdf/validate`. Unlike `/info`, this never throws for a
 * malformed file; invalidity comes back as `{ valid: false, malformed_reason }`.
 */
export async function fetchPdfValidation(file, password = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (password) formData.append('password', password);

  const res = await fetch(`${API_BASE}/api/pdf/validate`, { method: 'POST', body: formData });
  if (!res.ok) await throwFromResponse(res);
  return res.json();
}

// --- Merge & Split / Compress / Edit & Forms -------------------------------
//
// These all share one response shape (PDFOperationResponse): { operation_id,
// status, operation, output_format, output_size, processing_time,
// download_url, details }. `details` carries operation-specific stats (e.g.
// page_count, compression_ratio) -- see backend/app/dto/pdf.py.

async function postForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData });
  if (!res.ok) await throwFromResponse(res);
  return res.json();
}

/** Full URL for a completed operation's `download_url`. */
export function resolveDownloadUrl(downloadUrl) {
  return downloadUrl.startsWith('http') ? downloadUrl : `${API_BASE}${downloadUrl}`;
}

/** Fetch a completed operation's output as a Blob (for programmatic saving). */
export async function fetchOperationBlob(downloadUrl) {
  const res = await fetch(resolveDownloadUrl(downloadUrl));
  if (!res.ok) throw new PdfServiceError('DOWNLOAD_FAILED', 'Could not download the result file.');
  return res.blob();
}

/** Trigger a browser download for a completed operation, using the
 * filename the server suggests via Content-Disposition where possible. */
export function triggerOperationDownload(downloadUrl) {
  const anchor = document.createElement('a');
  anchor.href = resolveDownloadUrl(downloadUrl);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

// --- Merge & Split -----------------------------------------------------------

export async function mergePdfs(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return postForm('/api/pdf/merge', formData);
}

export async function splitPdf(file, { mode, ranges = null, everyN = null }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  if (mode === 'ranges' && ranges) formData.append('ranges', ranges);
  if (mode === 'every_n' && everyN) formData.append('every_n', String(everyN));
  return postForm('/api/pdf/split', formData);
}

export async function extractPages(file, pages) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pages', pages);
  return postForm('/api/pdf/extract-pages', formData);
}

export async function reorderPages(file, order) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('order', order);
  return postForm('/api/pdf/reorder-pages', formData);
}

export async function deletePages(file, pages) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pages', pages);
  return postForm('/api/pdf/delete-pages', formData);
}

export async function rotatePages(file, { pages = null, angle }) {
  const formData = new FormData();
  formData.append('file', file);
  if (pages) formData.append('pages', pages);
  formData.append('angle', String(angle));
  return postForm('/api/pdf/rotate-pages', formData);
}

// --- Compression ---------------------------------------------------------------

export async function compressPdf(file, { mode = 'balanced', quality = null, maxDimension = null }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  if (mode === 'custom') {
    if (quality != null) formData.append('quality', String(quality));
    if (maxDimension != null) formData.append('max_dimension', String(maxDimension));
  }
  return postForm('/api/pdf/compress', formData);
}

// --- Editing / Annotations ----------------------------------------------------

export async function annotatePdf(file, ops, applyRedactions = false) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('annotations', JSON.stringify(ops));
  formData.append('apply_redactions', String(applyRedactions));
  return postForm('/api/pdf/annotate', formData);
}

export async function removeAnnotations(file, pages = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (pages) formData.append('pages', pages);
  return postForm('/api/pdf/remove-annotations', formData);
}

export async function extractAnnotationsList(file) {
  const formData = new FormData();
  formData.append('file', file);
  return postForm('/api/pdf/extract-annotations', formData);
}

// --- Forms ---------------------------------------------------------------------

export async function listFormFields(file) {
  const formData = new FormData();
  formData.append('file', file);
  return postForm('/api/pdf/forms/fields', formData);
}

export async function exportFormValues(file) {
  const formData = new FormData();
  formData.append('file', file);
  return postForm('/api/pdf/forms/export', formData);
}

export async function fillForm(file, values, flatten = false) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('values', JSON.stringify(values));
  formData.append('flatten', String(flatten));
  return postForm('/api/pdf/forms/fill', formData);
}

// --- Page rendering / visual page manager ---------------------------------------

/** Render one thumbnail image (base64 PNG) per page. Mirrors POST /api/pdf/thumbnails. */
export async function fetchThumbnails(file, maxWidth = 220) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('max_width', String(maxWidth));
  return postForm('/api/pdf/thumbnails', formData);
}

/**
 * Assemble a PDF from an exact page layout -- the visual page manager's save
 * action. `layout` is `[{ file_index, page }]` (file_index is the position
 * of that page's source file within `files`, page is 1-based within it).
 * Mirrors POST /api/pdf/assemble.
 */
export async function assemblePdf(files, layout) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('layout', JSON.stringify(layout));
  return postForm('/api/pdf/assemble', formData);
}

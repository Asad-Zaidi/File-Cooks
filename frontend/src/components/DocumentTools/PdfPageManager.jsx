import React, { useRef, useState } from 'react';
import { FaTimes, FaPlus, FaFilePdf, FaGripVertical, FaExclamationCircle } from 'react-icons/fa';
import { fetchThumbnails, PdfServiceError } from '../../services/pdfService';

let uidCounter = 0;
const nextUid = () => `p${++uidCounter}`;

/**
 * Visual page manager: every page of the uploaded PDF(s) is shown as a
 * thumbnail. Drag to reorder, click the corner X to delete/exclude a page,
 * and "Add More Pages" (a tile at the end of the grid) uploads another PDF
 * and appends its pages to the working set. Nothing is sent to the server
 * until the caller calls `assemblePdf(files, layout)` with this component's
 * current order -- see `buildLayout` below.
 *
 * `files` / `pages` are lifted to the parent (controlled) so the parent can
 * build the final { file_index, page } layout and call `/api/pdf/assemble`.
 */
export default function PdfPageManager({ files, pages, onFilesChange, onPagesChange, isBusy }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const loadPagesFor = async (file, fileIndex) => {
    const data = await fetchThumbnails(file, 220);
    return data.thumbnails.map((t) => ({
      uid: nextUid(),
      fileIndex,
      page: t.page,
      width: t.width,
      height: t.height,
      imageBase64: t.image_base64,
    }));
  };

  const handleAddFiles = async (fileList) => {
    setError(null);
    const incoming = Array.from(fileList).filter(
      (f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (incoming.length === 0) {
      setError('Please choose a PDF file.');
      return;
    }

    setIsLoadingMore(true);
    try {
      let nextFiles = files;
      let nextPages = pages;
      for (const file of incoming) {
        const fileIndex = nextFiles.length;
        nextFiles = [...nextFiles, file];
        const newPages = await loadPagesFor(file, fileIndex);
        nextPages = [...nextPages, ...newPages];
      }
      onFilesChange(nextFiles);
      onPagesChange(nextPages);
    } catch (err) {
      setError(err instanceof PdfServiceError ? err.message : 'Could not read that PDF.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const removePage = (uid) => onPagesChange(pages.filter((p) => p.uid !== uid));

  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...pages];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onPagesChange(next);
    setDragIndex(null);
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <FaExclamationCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pages.length > 0 && (
        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 px-1 mb-2">
          {pages.length} page{pages.length === 1 ? '' : 's'} · drag to reorder
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {pages.map((p, index) => (
          <div
            key={p.uid}
            draggable={!isBusy}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
            className={`group relative rounded-2xl border-2 bg-white shadow-2xs overflow-hidden transition-all ${
              dragIndex === index ? 'opacity-40 border-orange-400' : 'border-gray-200/90 hover:border-orange-300'
            } ${isBusy ? 'pointer-events-none opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
          >
            {/* Delete icon -- top-right corner */}
            <button
              type="button"
              onClick={() => removePage(p.uid)}
              disabled={isBusy}
              aria-label={`Remove page ${index + 1}`}
              className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-white/95 text-gray-500 shadow-sm border border-gray-200 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
            >
              <FaTimes size={11} />
            </button>

            {/* Drag handle hint -- top-left corner */}
            <span className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-white/90 text-gray-400 shadow-sm border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FaGripVertical size={10} />
            </span>

            <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center p-2">
              <img
                src={`data:image/png;base64,${p.imageBase64}`}
                alt={`Page ${index + 1}`}
                className="max-w-full max-h-full object-contain shadow-sm"
                draggable={false}
              />
            </div>

            <div className="px-2 py-1.5 text-center border-t border-gray-100 bg-white">
              <span className="text-[11px] font-black text-gray-700">Page {index + 1}</span>
            </div>
          </div>
        ))}

        {/* Add More Pages -- tile at the end of the grid, after every page */}
        <button
          type="button"
          onClick={() => !isBusy && fileInputRef.current?.click()}
          disabled={isBusy || isLoadingMore}
          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-orange-200/80 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50/80 transition-all flex flex-col items-center justify-center gap-2 text-orange-600 disabled:opacity-60"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && handleAddFiles(e.target.files)}
          />
          <div className="w-10 h-10 rounded-2xl bg-white shadow-xs flex items-center justify-center">
            {isLoadingMore ? (
              <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <FaPlus size={16} />
            )}
          </div>
          <span className="text-[11px] font-black text-center px-2">
            {isLoadingMore ? 'Loading pages...' : 'Add More Pages'}
          </span>
        </button>
      </div>

      {pages.length === 0 && !isLoadingMore && (
        <p className="text-center text-xs text-gray-400 font-semibold py-6 flex items-center justify-center gap-2">
          <FaFilePdf /> No pages left — everything has been removed.
        </p>
      )}
    </div>
  );
}

/** Build the `[{file_index, page}]` layout for POST /api/pdf/assemble from
 * the manager's current (possibly reordered/filtered) `pages` state. */
export function buildLayout(pages) {
  return pages.map((p) => ({ file_index: p.fileIndex, page: p.page }));
}

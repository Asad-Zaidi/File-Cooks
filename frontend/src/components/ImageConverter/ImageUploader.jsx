import React, { useState, useRef, useEffect } from 'react';
import {
  FaCloudUploadAlt,
  FaShieldAlt,
  FaPaste,
  FaFolderOpen,
  FaPlus,
  FaMagic,
} from 'react-icons/fa';
import { CONVERTER_CONFIG } from '../../services/converterConfig';

export default function ImageUploader({
  onFilesSelected,
  hasFiles = false,
  fromFormat,
  toFormat,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fromUpper = fromFormat ? fromFormat.toUpperCase() : null;
  const toUpper = toFormat ? toFormat.toUpperCase() : null;

  // Determine accept attribute
  let acceptString = "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tiff,.tif";
  if (fromFormat) {
    const fmt = fromFormat.toLowerCase();
    if (fmt === 'jpg' || fmt === 'jpeg') {
      acceptString = '.jpg,.jpeg,image/jpeg';
    } else if (fmt === 'svg') {
      acceptString = '.svg,image/svg+xml';
    } else {
      acceptString = `.${fmt},image/${fmt}`;
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    let files = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      files = Array.from(e.dataTransfer.files);
    } else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleSelectButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Clipboard paste event listener
  useEffect(() => {
    const handlePaste = (e) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const imageFiles = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type && item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split('/')[1] || 'png';
            const name =
              file.name && file.name !== 'image.png'
                ? file.name
                : `pasted-image-${Date.now()}.${ext}`;
            const namedFile = new File([file], name, { type: file.type });
            imageFiles.push(namedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  return (
    <div className="w-full">
      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileChange}
        className="sr-only"
      />

      {hasFiles ? (
        /* ── Compact Upload Bar Mode (when images are in queue) ── */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDragOver
              ? 'border-orange-500 bg-orange-50/95 scale-[1.01] shadow-xl ring-4 ring-orange-200'
              : 'border-orange-300 hover:border-orange-500 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform">
              <FaPlus size={20} />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 justify-center sm:justify-start">
                <span>Add More {fromUpper ? `${fromUpper} ` : ''}Images</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Drag & Drop or Ctrl+V
                </span>
              </h4>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {fromUpper
                  ? `Only ${fromUpper} files are accepted for conversion`
                  : 'Drop JPG, PNG, WebP, GIF, BMP, SVG or TIFF files anywhere'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSelectButtonClick}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <FaFolderOpen size={14} />
              <span>Browse Files</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Full Hero Upload Dropzone Mode (Empty Queue) ── */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-14 text-center flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-orange-500 bg-orange-50/90 scale-[1.01] shadow-2xl ring-4 ring-orange-200/60'
              : 'border-orange-200 hover:border-orange-400 bg-gradient-to-b from-white via-orange-50/20 to-amber-50/30 shadow-sm hover:shadow-xl'
          }`}
        >
          {/* Animated Background Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

          {/* Hero Icon Badge */}
          <div className="mb-5 relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-1 transition-all duration-300">
              <FaCloudUploadAlt size={48} />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-orange-100 text-orange-600 animate-bounce">
              <FaMagic size={14} />
            </div>
          </div>

          {/* Heading */}
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">
            Drop your {fromUpper ? <span className="text-orange-600">{fromUpper} </span> : ''}images here, or{' '}
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent underline decoration-orange-300 underline-offset-8">
              browse files
            </span>
          </h3>

          <p className="text-sm text-gray-500 mb-8 max-w-md font-medium leading-relaxed">
            {fromUpper && toUpper
              ? `Upload ${fromUpper} image files to convert directly to ${toUpper}. Drag and drop, or paste from clipboard (Ctrl+V).`
              : 'Drag and drop multiple files, paste from clipboard (Ctrl+V), or select files from your computer.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
            <button
              type="button"
              onClick={handleSelectButtonClick}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-extrabold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.03] transition-all flex items-center gap-2.5 text-sm pointer-events-auto"
            >
              <FaFolderOpen size={18} />
              <span>Select {fromUpper || 'Image'} Files</span>
            </button>

            <div className="text-xs font-bold text-gray-600 flex items-center gap-2 bg-white/90 border border-gray-200/90 px-4 py-3 rounded-full shadow-2xs">
              <FaPaste size={14} className="text-orange-500" />
              <span>Paste from Clipboard</span>
            </div>
          </div>

          {/* Format Badges */}
          <div className="flex flex-wrap justify-center items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Accepted:
            </span>
            {fromUpper && toUpper ? (
              <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase bg-orange-500 text-white shadow-xs">
                {fromUpper} → {toUpper} ONLY
              </span>
            ) : (
              CONVERTER_CONFIG.supportedInputFormats.map((fmt) => (
                <span
                  key={fmt}
                  className="px-3 py-1 rounded-xl text-[11px] font-black uppercase bg-white/90 text-gray-700 border border-gray-200 shadow-2xs group-hover:border-orange-300 transition-colors"
                >
                  {fmt}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Privacy Notice Bar */}
      {!hasFiles && (
        <div className="mt-5 flex items-center justify-center gap-2.5 text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200/90 px-5 py-3 rounded-2xl shadow-2xs">
          <FaShieldAlt className="text-emerald-500 shrink-0" size={16} />
          <span>
            <strong className="font-black">100% Private & Browser-Based:</strong> Your files never leave your computer. All rendering and conversion happen locally inside your web browser.
          </span>
        </div>
      )}
    </div>
  );
}

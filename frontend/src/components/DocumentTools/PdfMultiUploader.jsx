import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFilePdf, FaTimes, FaGripLines } from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';

/**
 * Multi-file PDF dropzone with a reorderable list -- used by Merge, where
 * upload order is the merge order. Same visual language as PdfUploader.
 */
export default function PdfMultiUploader({ files, onFilesChange, isLoading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const addFiles = (fileList) => {
    setErrorMsg(null);
    const incoming = Array.from(fileList);
    const invalid = incoming.find((f) => !f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf'));
    if (invalid) {
      setErrorMsg(`"${invalid.name}" is not a PDF file.`);
      return;
    }
    onFilesChange([...files, ...incoming]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeAt = (index) => onFilesChange(files.filter((_, i) => i !== index));

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...files];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onFilesChange(next);
  };

  const moveDown = (index) => {
    if (index === files.length - 1) return;
    const next = [...files];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onFilesChange(next);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-orange-500 bg-orange-50/80 shadow-lg scale-[1.01]'
            : 'border-orange-200/80 bg-white/90 hover:border-orange-400 hover:bg-orange-50/30 shadow-xs hover:shadow-md'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          className="hidden"
          disabled={isLoading}
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md">
            <FaCloudUploadAlt size={32} />
          </div>
          <h3 className="text-lg font-black text-gray-900">
            {files.length === 0 ? 'Add PDFs to Merge' : 'Add More PDFs'}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            Drag & drop, or <span className="text-orange-600 font-bold underline">browse files</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 px-1">
            Merge Order ({files.length} files)
          </p>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200/90 bg-white shadow-2xs"
            >
              <FaGripLines className="text-gray-300 shrink-0" size={14} />
              <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              <FaFilePdf className="text-orange-500 shrink-0" size={16} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-800 truncate">{file.name}</div>
                <div className="text-[10px] text-gray-400 font-medium">{formatBytes(file.size)}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 flex items-center justify-center text-xs font-black"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === files.length - 1}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 flex items-center justify-center text-xs font-black"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

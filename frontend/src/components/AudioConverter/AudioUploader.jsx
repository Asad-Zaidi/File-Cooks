import React, { useState, useRef, useEffect } from 'react';
import {
  FaCloudUploadAlt,
  FaHeadphones,
  FaMusic,
  FaFolderOpen,
  FaPlus,
  FaShieldAlt,
  FaBolt,
} from 'react-icons/fa';
import { AUDIO_CONFIG } from '../../services/audioService';

export default function AudioUploader({
  onFilesSelected,
  hasFiles = false,
  fromFormat,
  toFormat,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fromUpper = fromFormat ? fromFormat.toUpperCase() : null;
  const toUpper = toFormat ? toFormat.toUpperCase() : null;

  // Accept attribute for audio files
  const acceptString = AUDIO_CONFIG.supportedInputExtensions
    .map((ext) => `.${ext}`)
    .join(',') + ',audio/*';

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

  // Clipboard paste support for audio files
  useEffect(() => {
    const handlePaste = (e) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const audioFiles = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type && item.type.startsWith('audio/')) {
          const file = item.getAsFile();
          if (file) audioFiles.push(file);
        }
      }

      if (audioFiles.length > 0) {
        onFilesSelected(audioFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  // Compact bar when files already exist in queue
  if (hasFiles) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectButtonClick}
        className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragOver
            ? 'border-orange-500 bg-orange-50/80 scale-[1.01]'
            : 'border-orange-200 bg-gradient-to-r from-orange-50/40 via-amber-50/20 to-orange-50/40 hover:border-orange-400 hover:bg-orange-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptString}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
            <FaPlus size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
              Add more audio tracks
            </p>
            <p className="text-xs text-gray-500 font-medium">
              Drop files here or click to browse (MP3, WAV, M4A, FLAC, AAC, OGG...)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSelectButtonClick}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-xs text-xs font-bold text-gray-700 group-hover:border-orange-300 group-hover:text-orange-600 transition-colors"
        >
          <FaFolderOpen />
          <span>Browse Files</span>
        </button>
      </div>
    );
  }

  // Hero Upload Box (Empty state)
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ${
        isDragOver
          ? 'border-orange-500 bg-orange-50/90 ring-4 ring-orange-500/10 scale-[1.01]'
          : 'border-orange-300/80 bg-gradient-to-b from-white via-orange-50/20 to-white hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/5'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="p-8 sm:p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-xl shadow-orange-500/25 animate-bounce-subtle">
            <FaHeadphones size={42} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white text-orange-600 shadow-md flex items-center justify-center border border-orange-100">
            <FaMusic size={14} />
          </div>
        </div>

        {/* Headline */}
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">
          {fromUpper && toUpper
            ? `Upload ${fromUpper} Audio to Convert to ${toUpper}`
            : 'Drop your audio files here'}
        </h3>
        <p className="text-sm text-gray-600 font-medium max-w-md mb-8">
          Drag and drop audio files, paste from clipboard, or click the button below. High-fidelity transcoding with studio precision.
        </p>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSelectButtonClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 hover:shadow-xl hover:shadow-orange-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <FaCloudUploadAlt size={18} />
            <span>Select Audio Files</span>
          </button>
        </div>

        {/* Supported format pills */}
        <div className="mt-8 pt-6 border-t border-gray-100 w-full flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500">
          <span className="text-gray-400 mr-1">Supported:</span>
          {['MP3', 'WAV', 'M4A', 'FLAC', 'AAC', 'OGG', 'OPUS', 'AIFF', 'AMR', 'AC3', 'WMA'].map(
            (fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded-md bg-gray-100/80 text-gray-600 hover:bg-orange-100 hover:text-orange-700 transition-colors"
              >
                {fmt}
              </span>
            )
          )}
        </div>

        {/* Guarantee badges */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold text-gray-500">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <FaShieldAlt size={13} />
            <span>100% Private & Secure</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <FaBolt size={13} />
            <span>Fast PyAV Transcoder</span>
          </span>
        </div>
      </div>
    </div>
  );
}

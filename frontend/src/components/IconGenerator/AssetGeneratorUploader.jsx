import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaImage, FaFileImage, FaExclamationCircle } from 'react-icons/fa';
import { validateImageFile } from '../../utils/fileValidation';

/**
 * Upload box for Icon & Web Assets Generator
 */
export default function AssetGeneratorUploader({ onFileSelected, isLoading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    setErrorMsg(null);
    if (!file) return;

    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Unable to process this image. Please upload a valid PNG, JPG, WebP, BMP, TIFF, GIF, or supported image.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isLoading) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-orange-500 bg-orange-50/80 shadow-lg scale-[1.01]'
            : 'border-orange-200/80 bg-white/90 hover:border-orange-400 hover:bg-orange-50/30 shadow-xs hover:shadow-md'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tiff,.tif,.svg"
          onChange={handleInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md transform transition-transform group-hover:scale-110">
            <FaCloudUploadAlt size={40} />
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-1">
              Upload Source Logo or Image
            </h3>
            <p className="text-sm text-gray-600 font-medium max-w-md mx-auto">
              Drag & drop your logo here, or <span className="text-orange-600 font-bold underline">browse files</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
              <FaImage className="text-orange-500" /> PNG, JPG, WebP, BMP, GIF, TIFF, SVG
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
              <FaFileImage /> Any Resolution
            </span>
          </div>

          <p className="text-[11px] text-gray-400 font-medium">
            🔒 100% Private Client-Side Generation • Zero Server Uploads
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <FaExclamationCircle className="shrink-0 text-red-500" size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

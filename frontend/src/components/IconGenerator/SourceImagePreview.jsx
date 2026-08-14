import React from 'react';
import { FaTrash, FaCheckCircle, FaFileImage } from 'react-icons/fa';

import { formatBytes } from '../../utils/filenameUtils';

/**
 * Preview card for the uploaded source image
 */
export default function SourceImagePreview({ file, sourceDetails, onReset }) {
  if (!file) return null;

  const objectUrl = URL.createObjectURL(file);

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs mb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left side: Thumbnail & Info */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-20 h-20 rounded-2xl bg-gray-100/80 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center p-2 checkerboard-bg">
            <img
              src={objectUrl}
              alt="Source Logo Preview"
              className="max-w-full max-h-full object-contain drop-shadow-sm"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                Source Image
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <FaCheckCircle size={12} /> Ready
              </span>
            </div>

            <h4 className="text-base font-extrabold text-gray-900 truncate max-w-xs sm:max-w-sm">
              {file.name}
            </h4>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-1">
              <span className="flex items-center gap-1">
                <FaFileImage size={11} className="text-orange-500" />
                {sourceDetails?.width && sourceDetails?.height
                  ? `${sourceDetails.width} × ${sourceDetails.height} px`
                  : 'Image'}
              </span>
              <span>•</span>
              <span>{formatBytes(file.size)}</span>
            </div>
          </div>
        </div>

        {/* Right side: Change / Remove button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 transition-colors"
          >
            <FaTrash size={12} />
            <span>Change Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}

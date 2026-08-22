import React from 'react';
import { FaSpinner } from 'react-icons/fa';

export default function AudioProgressBar({ progress = 0, isProcessing = false, totalCount = 0 }) {
  if (!isProcessing && progress === 0) return null;

  return (
    <div className="bg-white border border-orange-200/80 rounded-3xl p-5 shadow-xs mb-6 animate-fade-in">
      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
        <span className="flex items-center gap-2">
          {isProcessing ? (
            <>
              <FaSpinner className="animate-spin text-orange-500" />
              <span>Transcoding {totalCount} audio tracks in parallel...</span>
            </>
          ) : (
            <span className="text-emerald-600 font-black">All conversions finished!</span>
          )}
        </span>
        <span className="font-black text-orange-600">{progress}%</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/50">
        <div
          className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 shadow-xs"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

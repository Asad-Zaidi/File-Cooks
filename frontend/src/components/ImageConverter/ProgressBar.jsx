import React from 'react';

export default function ProgressBar({ progress, isProcessing, totalCount }) {
  if (!isProcessing && progress === 0) return null;

  return (
    <div className="bg-white border border-orange-200 rounded-3xl p-5 shadow-sm mb-6 animate-fade-in">
      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          Converting batch images...
        </span>
        <span className="text-orange-600">{progress}%</span>
      </div>

      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300 shadow-sm"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

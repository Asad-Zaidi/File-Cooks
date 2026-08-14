import React from 'react';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';

/**
 * Real-time progress bar for asset generation
 */
export default function GenerationProgress({ isGenerating, progressInfo, completedCount, totalCount }) {
  if (!isGenerating && completedCount === 0) return null;

  const percent = progressInfo?.percent || (completedCount && totalCount ? Math.round((completedCount / totalCount) * 100) : 0);

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
          {isGenerating ? (
            <>
              <FaSpinner className="animate-spin text-orange-500" size={16} />
              <span>Generating Web Assets...</span>
            </>
          ) : (
            <>
              <FaCheckCircle className="text-emerald-500" size={16} />
              <span>✓ {completedCount} assets generated successfully</span>
            </>
          )}
        </div>

        <span className="text-xs font-black text-orange-600 font-mono bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
          {isGenerating
            ? `${progressInfo?.currentStep || 0} / ${progressInfo?.totalSteps || 10}`
            : '100% Complete'}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300 shadow-2xs"
          style={{ width: `${percent}%` }}
        />
      </div>

      {isGenerating && progressInfo?.currentFilename && (
        <div className="mt-2 text-xs font-mono font-semibold text-gray-500 text-right truncate">
          Processing: <span className="text-gray-800 font-bold">{progressInfo.currentFilename}</span>
        </div>
      )}
    </div>
  );
}

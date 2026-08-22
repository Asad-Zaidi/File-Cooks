import React from 'react';
import { FaPlay, FaDownload, FaTrashAlt, FaThLarge, FaList, FaSlidersH, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { VIDEO_CONFIG } from '../../services/videoService';
import { VIDEO_TO_AUDIO_TARGETS } from '../../services/videoConversionsConfig';
import { formatBytes } from '../../utils/filenameUtils';

export default function VideoQueueHeader({
  itemsCount = 0,
  totalSizeBytes = 0,
  globalTargetFormat,
  onGlobalFormatChange,
  onConvertAll,
  onDownloadZip,
  onClearAll,
  isProcessingBatch = false,
  completedCount = 0,
  viewMode = 'grid',
  onViewModeChange,
  showSettings = false,
  onToggleSettings,
  mode = 'convert',
}) {
  const allCompleted = itemsCount > 0 && completedCount === itemsCount;
  const hasCompleted = completedCount > 0;
  const outputFormats = mode === 'extract-audio' ? VIDEO_TO_AUDIO_TARGETS : VIDEO_CONFIG.supportedOutputFormats;

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/90 text-orange-600 flex items-center justify-center font-black text-lg border border-orange-200/80 shadow-2xs">
            {itemsCount}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                {mode === 'extract-audio' ? 'Video → Audio Queue' : 'Video Conversion Queue'}
              </h2>
              {hasCompleted && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-extrabold flex items-center gap-1">
                  <FaCheckCircle size={10} />
                  {completedCount}/{itemsCount} Ready
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Total Queue Size: <span className="font-bold text-gray-700">{formatBytes(totalSizeBytes)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-2xl p-1.5 pl-3">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
              {mode === 'extract-audio' ? 'Extract all as:' : 'Convert all to:'}
            </span>
            <select
              value={globalTargetFormat}
              onChange={(e) => onGlobalFormatChange(e.target.value)}
              disabled={isProcessingBatch}
              className="bg-white border border-gray-200 text-gray-900 font-extrabold text-xs rounded-xl px-3 py-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
            >
              {outputFormats.map((fmtKey) => (
                <option key={fmtKey} value={fmtKey}>
                  {fmtKey.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleSettings}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showSettings
                ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-2xs'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Encoder settings"
          >
            <FaSlidersH size={13} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <div className="hidden sm:flex items-center bg-gray-100/90 rounded-2xl p-1 border border-gray-200/60">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid View"
            >
              <FaThLarge size={13} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="List View"
            >
              <FaList size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={onClearAll}
            disabled={isProcessingBatch}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-all text-xs font-bold disabled:opacity-50 cursor-pointer"
            title="Clear entire queue"
          >
            <FaTrashAlt size={13} />
          </button>

          {hasCompleted && (
            <button
              type="button"
              onClick={onDownloadZip}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FaDownload size={12} />
              <span>Download ZIP ({completedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConvertAll}
            disabled={isProcessingBatch || allCompleted}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              allCompleted
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : isProcessingBatch
                ? 'bg-orange-400 text-white cursor-wait'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transform hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isProcessingBatch ? (
              <>
                <FaSpinner className="animate-spin" size={13} />
                <span>Converting...</span>
              </>
            ) : allCompleted ? (
              <>
                <FaCheckCircle size={13} className="text-emerald-500" />
                <span>All Converted</span>
              </>
            ) : (
              <>
                <FaPlay size={11} />
                <span>{mode === 'extract-audio' ? 'Extract All' : 'Convert All'} ({itemsCount - completedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

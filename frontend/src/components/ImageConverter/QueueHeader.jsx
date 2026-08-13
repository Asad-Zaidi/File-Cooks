import React from 'react';
import {
  FaPlay,
  FaDownload,
  FaTrashAlt,
  FaChevronDown,
  FaLayerGroup,
} from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';
import { CONVERTER_CONFIG } from '../../services/converterConfig';

export default function QueueHeader({
  itemsCount,
  totalSizeBytes,
  globalTargetFormat,
  onGlobalFormatChange,
  onConvertAll,
  onDownloadZip,
  onClearAll,
  isProcessingBatch,
  completedCount,
}) {
  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl p-5 md:p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
      {/* Left: Queue Info & Count */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20 shrink-0">
          <FaLayerGroup size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-gray-900">
              Uploaded Images Queue
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold text-xs">
              {itemsCount} {itemsCount === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Total batch size: {formatBytes(totalSizeBytes)}
          </p>
        </div>
      </div>

      {/* Right: Format Selector & Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Global Format Selector */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/90 px-3.5 py-2 rounded-2xl">
          <label className="text-xs font-extrabold text-gray-700 whitespace-nowrap">
            Convert all to:
          </label>
          <div className="relative inline-block">
            <select
              value={globalTargetFormat}
              onChange={(e) => onGlobalFormatChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-xl px-3 py-1 pr-7 text-xs font-black text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-2xs"
            >
              {CONVERTER_CONFIG.supportedOutputFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
            <FaChevronDown
              size={10}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Convert All Button */}
        <button
          type="button"
          onClick={onConvertAll}
          disabled={isProcessingBatch || itemsCount === 0}
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center gap-2"
        >
          <FaPlay size={10} className={isProcessingBatch ? 'animate-spin' : ''} />
          <span>{isProcessingBatch ? 'Converting Batch...' : 'Convert All Now'}</span>
        </button>

        {/* Download ZIP Button */}
        {completedCount > 0 && (
          <button
            type="button"
            onClick={onDownloadZip}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center gap-2 animate-fade-in"
          >
            <FaDownload size={11} />
            <span>Save All as ZIP ({completedCount})</span>
          </button>
        )}

        {/* Clear All Button */}
        <button
          type="button"
          onClick={onClearAll}
          className="p-2.5 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="Clear queue"
        >
          <FaTrashAlt size={14} />
        </button>
      </div>
    </div>
  );
}

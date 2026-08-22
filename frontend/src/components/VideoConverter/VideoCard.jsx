import React from 'react';
import {
  FaPlay,
  FaDownload,
  FaTrashAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaRedo,
  FaBan,
} from 'react-icons/fa';
import { VIDEO_CONFIG, formatDuration, toAbsoluteDownloadUrl } from '../../services/videoService';
import { VIDEO_TO_AUDIO_TARGETS } from '../../services/videoConversionsConfig';
import { formatBytes } from '../../utils/filenameUtils';

export default function VideoCard({
  item,
  viewMode = 'grid',
  onTargetFormatChange,
  onConvertSingle,
  onCancelSingle,
  onDownloadSingle,
  onRemove,
  mode = 'convert',
}) {
  const isExtract = mode === 'extract-audio';
  const outputFormats = isExtract ? VIDEO_TO_AUDIO_TARGETS : VIDEO_CONFIG.supportedOutputFormats;
  const hasResult = item.status === 'completed' && item.resultSize;
  const diffPercent = hasResult && item.originalSize > 0
    ? Math.round(((item.originalSize - item.resultSize) / item.originalSize) * 100)
    : 0;

  const StatusBlock = () => {
    if (item.status === 'converting') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-orange-600">
              <FaSpinner className="animate-spin" size={11} />
              <span>Converting… {item.progress || 0}%</span>
            </span>
            <button
              type="button"
              onClick={() => onCancelSingle(item.id)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Cancel conversion"
            >
              <FaBan size={11} />
              <span>Cancel</span>
            </button>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${item.progress || 0}%` }}
            />
          </div>
        </div>
      );
    }

    if (item.status === 'completed') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <FaCheckCircle size={11} className="text-emerald-500" />
              Done
            </span>
            <span className="font-black text-gray-800">
              {formatBytes(item.resultSize)}
              {diffPercent !== 0 && (
                <span className={`ml-1 text-[10px] ${diffPercent > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ({diffPercent > 0 ? `-${diffPercent}%` : `+${Math.abs(diffPercent)}%`})
                </span>
              )}
            </span>
          </div>
          {isExtract ? (
            <audio controls preload="none" className="w-full h-9" src={toAbsoluteDownloadUrl(item.downloadUrl)} />
          ) : (
            <video controls preload="none" className="w-full rounded-xl bg-black max-h-40" src={toAbsoluteDownloadUrl(item.downloadUrl)} />
          )}
          <button
            type="button"
            onClick={() => onDownloadSingle(item.id)}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FaDownload size={11} />
            <span>Download {item.targetFormat.toUpperCase()}</span>
          </button>
        </div>
      );
    }

    if (item.status === 'cancelled') {
      return (
        <button
          type="button"
          onClick={() => onConvertSingle(item.id)}
          className="w-full py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <FaRedo size={11} />
          <span>Cancelled — Retry</span>
        </button>
      );
    }

    if (item.status === 'error') {
      return (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-red-600 flex items-center gap-1 truncate" title={item.errorMessage}>
            <FaExclamationCircle size={11} />
            <span className="truncate">{item.errorMessage || 'Conversion failed'}</span>
          </div>
          <button
            type="button"
            onClick={() => onConvertSingle(item.id)}
            className="w-full py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FaRedo size={11} />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onConvertSingle(item.id)}
        className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <FaPlay size={10} />
        <span>{isExtract ? 'Extract Audio' : 'Convert Video'}</span>
      </button>
    );
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200/90 hover:border-orange-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <video src={item.videoPreviewUrl} muted className="w-16 h-10 rounded-lg bg-black object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-gray-900 truncate" title={item.name}>{item.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-extrabold text-[10px] uppercase">{item.inputFormat}</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {formatDuration(item.duration)} · {formatBytes(item.originalSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center w-full sm:w-auto">
          <select
            value={item.targetFormat}
            onChange={(e) => onTargetFormatChange(item.id, e.target.value)}
            disabled={item.status === 'converting'}
            className="bg-gray-50 border border-gray-200 text-gray-900 font-extrabold text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
          >
            {outputFormats.map((fmtKey) => (
              <option key={fmtKey} value={fmtKey}>→ {fmtKey.toUpperCase()}</option>
            ))}
          </select>
          <div className="min-w-[9rem]">
            <StatusBlock />
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Remove item"
          >
            <FaTrashAlt size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white border border-gray-200/90 hover:border-orange-300 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-orange-100/80 text-orange-700 font-black text-[10px] uppercase">{item.inputFormat}</span>
          <span className="text-gray-400 text-xs font-bold">→</span>
          <select
            value={item.targetFormat}
            onChange={(e) => onTargetFormatChange(item.id, e.target.value)}
            disabled={item.status === 'converting'}
            className="bg-gray-50 border border-gray-200 text-gray-900 font-black text-[11px] rounded-lg px-2 py-0.5 focus:ring-1 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
          >
            {outputFormats.map((fmtKey) => (
              <option key={fmtKey} value={fmtKey}>{fmtKey.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="Remove video"
        >
          <FaTrashAlt size={12} />
        </button>
      </div>

      <div className="my-2 rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
        <video src={item.videoPreviewUrl} controls preload="metadata" className="w-full h-full object-contain" />
      </div>

      <div className="my-2">
        <p className="font-bold text-xs text-gray-900 truncate" title={item.name}>{item.name}</p>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
          {formatDuration(item.duration)} · <span className="font-bold text-gray-700">{formatBytes(item.originalSize)}</span>
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <StatusBlock />
      </div>
    </div>
  );
}

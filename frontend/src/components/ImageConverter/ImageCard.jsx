import React, { useState } from 'react';
import {
  FaFileImage,
  FaTimes,
  FaPlay,
  FaDownload,
  FaCheckCircle,
  FaExclamationCircle,
  FaChevronDown,
  FaRedo,
  FaEye,
  FaSync,
} from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';
import { CONVERTER_CONFIG } from '../../services/converterConfig';

export default function ImageCard({
  item,
  onTargetFormatChange,
  onConvertSingle,
  onDownloadSingle,
  onRemove,
  onRotateSingle,
}) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const {
    id,
    name,
    originalSize,
    originalFormat,
    targetFormat,
    rotation = 0,
    status,
    errorMessage,
    thumbnailUrl,
    originalDimensions,
    resultSize,
    resultDimensions,
    resultBlobUrl,
  } = item;

  const displayImage = status === 'completed' && resultBlobUrl ? resultBlobUrl : thumbnailUrl;

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-in-out flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group animate-fade-in hover:-translate-y-0.5">
        {/* Left: Thumbnail & Image Info */}
        <div className="flex items-center gap-4 min-w-0 w-full md:w-auto flex-1">
          {/* Thumbnail Container with Zoom Action */}
          <div
            onClick={() => displayImage && setShowPreviewModal(true)}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center relative cursor-pointer group/thumb shadow-xs"
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover/thumb:scale-110"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ) : (
              <FaFileImage className="text-gray-400" size={24} />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-300 flex items-center justify-center text-white backdrop-blur-[1px]">
              <FaEye size={18} className="transform scale-90 group-hover/thumb:scale-100 transition-transform" />
            </div>
          </div>

          {/* File Metadata */}
          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors duration-200"
              title={name}
            >
              {name}
            </h4>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="uppercase font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] tracking-wide border border-gray-200">
                {originalFormat}
              </span>
              <span>•</span>
              {originalDimensions ? (
                <span className="font-mono text-[11px]">
                  {originalDimensions.width} × {originalDimensions.height} px
                </span>
              ) : (
                <span className="font-mono text-[11px]">-- × --</span>
              )}
              <span>•</span>
              <span className="font-medium">{formatBytes(originalSize)}</span>
              {rotation > 0 && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 flex items-center gap-1">
                  <FaSync size={9} className="animate-spin-slow" />
                  <span>{rotation}°</span>
                </span>
              )}
            </div>

            {/* Conversion Result Pill */}
            {status === 'completed' && resultSize && (
              <div className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-2 flex-wrap animate-fade-in">
                <span className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/90">
                  <FaCheckCircle className="text-emerald-500" size={13} />
                  <span>
                    Converted to {targetFormat.toUpperCase()} ({formatBytes(resultSize)})
                  </span>
                </span>

                {resultDimensions && (
                  <span className="text-[10px] font-mono text-gray-500">
                    ({resultDimensions.width} × {resultDimensions.height} px)
                  </span>
                )}

                {originalSize > resultSize && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    -{Math.round((1 - resultSize / originalSize) * 100)}% smaller
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && errorMessage && (
              <div className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-xl border border-red-200 animate-fade-in">
                <FaExclamationCircle className="text-red-500 shrink-0" size={12} />
                <span className="truncate">{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
          {/* Rotate Button */}
          {onRotateSingle && (
            <button
              type="button"
              onClick={() => onRotateSingle(id)}
              className="p-2 rounded-xl text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200 border border-gray-200 hover:scale-105 active:scale-95"
              title="Rotate image 90°"
            >
              <FaRedo size={12} className="transition-transform duration-300 hover:rotate-90" />
            </button>
          )}

          {/* Target Format Dropdown */}
          <div className="relative">
            <select
              value={targetFormat}
              onChange={(e) => onTargetFormatChange(id, e.target.value)}
              disabled={status === 'processing'}
              className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl px-3 py-1.5 pr-7 text-xs font-extrabold text-gray-800 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50 transition-all duration-200"
            >
              {CONVERTER_CONFIG.supportedOutputFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  → {fmt.toUpperCase()}
                </option>
              ))}
            </select>
            <FaChevronDown
              size={10}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Action Button */}
          {status === 'completed' ? (
            <button
              type="button"
              onClick={() => onDownloadSingle(id)}
              className="px-4 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all duration-200 hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
            >
              <FaDownload size={11} />
              <span>Save</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConvertSingle(id)}
              disabled={status === 'processing' || status === 'error'}
              className="px-4 py-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs hover:shadow-md disabled:opacity-50 transition-all duration-200 hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
            >
              {status === 'processing' ? (
                <>
                  <FaPlay size={10} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaPlay size={10} />
                  <span>Convert</span>
                </>
              )}
            </button>
          )}

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 hover:scale-110 ml-1"
            title="Remove file"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && displayImage && (
        <div
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 overflow-hidden shadow-2xl animate-slide-up"
          >
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <FaTimes size={16} />
            </button>

            <div className="flex items-center justify-center p-4">
              <img
                src={displayImage}
                alt={name}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-md transition-transform duration-300"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>

            <div className="text-center pt-3 text-xs text-gray-700 font-bold border-t border-gray-100 flex items-center justify-center gap-2">
              <FaFileImage className="text-orange-500" />
              <span>{name} ({originalDimensions?.width} × {originalDimensions?.height} px)</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

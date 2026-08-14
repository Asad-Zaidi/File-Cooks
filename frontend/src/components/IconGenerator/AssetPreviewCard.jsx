import React from 'react';
import { FaDownload, FaFileCode } from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';

/**
 * Individual generated asset preview card
 */
export default function AssetPreviewCard({ asset, onDownload }) {
  if (!asset) return null;

  const isOg = asset.filename === 'og-image.png';
  const isManifest = asset.filename.endsWith('.webmanifest');

  return (
    <div
      className={`bg-white border border-gray-200/90 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
        isOg ? 'col-span-full md:col-span-2 lg:col-span-3' : ''
      }`}
    >
      <div>
        {/* Preview Frame */}
        <div
          className={`relative rounded-2xl bg-gray-50/80 border border-gray-200 overflow-hidden flex items-center justify-center p-3 mb-3 checkerboard-bg ${
            isOg ? 'h-48 sm:h-64' : 'h-28 sm:h-32'
          }`}
        >
          {isManifest ? (
            <div className="flex flex-col items-center justify-center text-amber-500 gap-1.5 p-2">
              <FaFileCode size={36} />
              <span className="text-[10px] font-mono text-gray-500 font-bold">manifest.webmanifest</span>
            </div>
          ) : (
            <img
              src={asset.previewUrl}
              alt={asset.filename}
              className={`max-w-full max-h-full object-contain transition-transform group-hover:scale-105 drop-shadow-sm`}
            />
          )}

          {/* Badge for Dimensions */}
          {!isManifest && asset.width > 0 && asset.height > 0 && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
              {asset.width} × {asset.height}
            </span>
          )}
        </div>

        {/* Filename & Info */}
        <div className="mb-3">
          <h5 className="text-xs font-black text-gray-900 truncate tracking-tight mb-0.5" title={asset.filename}>
            {asset.filename}
          </h5>
          <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
            <span className="uppercase text-orange-600 font-bold">{asset.format}</span>
            <span>•</span>
            <span>{formatBytes(asset.size)}</span>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <button
        type="button"
        onClick={() => onDownload(asset)}
        className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
      >
        <FaDownload size={11} />
        <span>Download</span>
      </button>
    </div>
  );
}

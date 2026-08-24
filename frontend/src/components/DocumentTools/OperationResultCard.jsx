import React from 'react';
import { FaCheckCircle, FaDownload, FaRedo } from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';
import { triggerOperationDownload } from '../../services/pdfService';

const DETAIL_LABELS = {
  page_count: 'Pages',
  source_files: 'Source Files',
  deleted: 'Pages Deleted',
  rotated: 'Pages Rotated',
  parts: 'Parts',
  mode: 'Mode',
  original_size: 'Original Size',
  final_size: 'Final Size',
  bytes_saved: 'Bytes Saved',
  compression_ratio: 'Compression',
  images_recompressed: 'Images Recompressed',
  annotations_applied: 'Annotations Applied',
  redactions_burned_in: 'Redactions Applied',
  annotations_removed: 'Annotations Removed',
  fields_filled: 'Fields Filled',
  flattened: 'Flattened',
};

const SIZE_KEYS = new Set(['original_size', 'final_size', 'bytes_saved']);

function formatDetailValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (SIZE_KEYS.has(key)) return formatBytes(value);
  if (key === 'compression_ratio') return `${Math.round(value * 100)}% smaller`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/**
 * Generic success panel shared by every PDF operation tool (merge/split,
 * compress, annotate, forms): a stats grid built from the operation's
 * `details`, plus Download and "Do Another" actions.
 */
export default function OperationResultCard({ title, result, onReset }) {
  if (!result) return null;

  const detailEntries = Object.entries(result.details || {}).filter(([key]) => DETAIL_LABELS[key]);

  return (
    <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <FaCheckCircle size={18} />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900">{title || 'Done'}</h3>
          <p className="text-xs text-gray-500 font-medium">
            Processed in {result.processing_time?.toFixed(2)}s · {formatBytes(result.output_size)}
          </p>
        </div>
      </div>

      {detailEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3 text-center">
              <div className="text-sm font-black text-gray-900 truncate" title={String(value)}>
                {formatDetailValue(key, value)}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mt-1">
                {DETAIL_LABELS[key]}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={() => triggerOperationDownload(result.download_url)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95"
        >
          <FaDownload size={13} />
          <span>Download {result.output_format === 'zip' ? 'ZIP' : 'PDF'}</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-300 font-bold text-sm transition-all"
        >
          <FaRedo size={12} />
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
}

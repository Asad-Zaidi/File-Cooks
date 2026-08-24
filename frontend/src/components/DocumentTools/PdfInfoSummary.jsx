import React from 'react';
import { FaFileAlt, FaHdd, FaCodeBranch, FaLockOpen, FaLock } from 'react-icons/fa';
import { formatBytes } from '../../utils/filenameUtils';

/**
 * Top-of-results summary strip: page count, file size, PDF version,
 * encryption state -- the four fields a reader wants first.
 */
export default function PdfInfoSummary({ info, id }) {
  const cards = [
    {
      icon: FaFileAlt,
      label: 'Pages',
      value: info.page_count != null ? info.page_count.toLocaleString() : '—',
      color: 'orange',
    },
    {
      icon: FaHdd,
      label: 'File Size',
      value: formatBytes(info.file_size),
      color: 'amber',
    },
    {
      icon: FaCodeBranch,
      label: 'PDF Version',
      value: info.pdf_version ? `PDF ${info.pdf_version}` : 'Unknown',
      color: 'emerald',
    },
    {
      icon: info.encrypted ? FaLock : FaLockOpen,
      label: 'Encryption',
      value: info.encrypted ? 'Encrypted' : 'Not Encrypted',
      color: info.encrypted ? 'orange' : 'emerald',
    },
  ];

  return (
    <div id={id} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="bg-white border border-gray-200/90 rounded-3xl p-5 text-center shadow-xs"
        >
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              color === 'orange'
                ? 'bg-orange-100 text-orange-600'
                : color === 'amber'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            <Icon size={18} />
          </div>
          <div className="text-sm font-black text-gray-900 truncate" title={String(value)}>
            {value}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

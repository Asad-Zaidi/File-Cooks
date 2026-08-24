import React from 'react';
import { FaWpforms, FaCommentDots, FaSignature, FaLock, FaLockOpen } from 'react-icons/fa';

function Badge({ value, trueLabel = 'Detected', falseLabel = 'None', unknownLabel = 'Unknown' }) {
  if (value === null || value === undefined) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
        {unknownLabel}
      </span>
    );
  }
  return value ? (
    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
      {trueLabel}
    </span>
  ) : (
    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
      {falseLabel}
    </span>
  );
}

/**
 * has_forms / has_annotations / has_signatures / encryption, as scannable
 * rows with pill badges -- section 1 of the PDF spec's "detect X" asks.
 */
export default function PdfFlagsCard({ info, id }) {
  const rows = [
    { icon: FaWpforms, label: 'Interactive Form Fields', detected: info.has_forms },
    { icon: FaCommentDots, label: 'Annotations / Comments', detected: info.has_annotations },
    { icon: FaSignature, label: 'Digital Signature Fields', detected: info.has_signatures },
  ];

  return (
    <div id={id} className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs mb-6">
      <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3 mb-3">
        {info.encrypted ? <FaLock className="text-orange-500" /> : <FaLockOpen className="text-emerald-500" />}
        <span>Security & Content Flags</span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs font-bold text-gray-700">Password Protected</span>
          <Badge value={info.password_protected} trueLabel="Yes" falseLabel="No" />
        </div>
        {rows.map(({ icon: Icon, label, detected }) => (
          <div key={label} className="flex items-center justify-between py-1.5">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <Icon className="text-gray-400" size={12} />
              {label}
            </span>
            <Badge value={detected} />
          </div>
        ))}
      </div>

      {info.encrypted && info.page_count == null && (
        <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
          Form/annotation/signature detection isn't available until this document is unlocked
          with its password.
        </p>
      )}
    </div>
  );
}

import React from 'react';
import { FaThLarge } from 'react-icons/fa';

const DISPLAY_LIMIT = 50;

/**
 * Per-page width/height/rotation table, from PDFInfoResponse.pages[]. Capped
 * at DISPLAY_LIMIT rows so a several-hundred-page PDF doesn't dump thousands
 * of DOM nodes -- the backend already returned every page's data, this is
 * purely a render-cost guard.
 */
export default function PdfPagesTable({ pages, id }) {
  if (!pages || pages.length === 0) return null;

  const shown = pages.slice(0, DISPLAY_LIMIT);
  const remaining = pages.length - shown.length;

  return (
    <div id={id} className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs mb-6">
      <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3 mb-3">
        <FaThLarge className="text-orange-500" />
        <span>Page Dimensions & Rotation</span>
        <span className="ml-auto text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
          {pages.length.toLocaleString()} pages
        </span>
      </div>

      <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 text-gray-500 font-bold uppercase tracking-wide text-[10px]">
            <tr>
              <th className="px-4 py-2 text-left">Page</th>
              <th className="px-4 py-2 text-left">Width (pt)</th>
              <th className="px-4 py-2 text-left">Height (pt)</th>
              <th className="px-4 py-2 text-left">Rotation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((page, index) => (
              <tr key={index} className="hover:bg-orange-50/50 transition-colors">
                <td className="px-4 py-2 font-bold text-gray-800">{index + 1}</td>
                <td className="px-4 py-2 text-gray-600 font-medium">{page.width}</td>
                <td className="px-4 py-2 text-gray-600 font-medium">{page.height}</td>
                <td className="px-4 py-2 text-gray-600 font-medium">{page.rotation}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <p className="text-center text-[11px] text-gray-400 font-semibold mt-3">
          +{remaining.toLocaleString()} more pages not shown
        </p>
      )}
    </div>
  );
}

import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

/**
 * Result banner for the "Quick Validate" action (POST /api/pdf/validate) --
 * distinct from the full /info breakdown, useful for a fast malformed-file
 * check on its own.
 */
export default function PdfValidateResult({ result, onDismiss }) {
  if (!result) return null;

  return (
    <div
      className={`relative rounded-3xl p-5 mb-6 border shadow-xs animate-fade-in ${
        result.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <FaTimes size={14} />
      </button>

      <div className="flex items-start gap-3">
        {result.valid ? (
          <FaCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
        ) : (
          <FaTimesCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
        )}
        <div>
          <h4 className={`text-sm font-black ${result.valid ? 'text-emerald-800' : 'text-red-800'}`}>
            {result.valid ? 'This is a valid PDF' : 'This PDF appears to be malformed'}
          </h4>
          <p className={`text-xs font-medium mt-1 ${result.valid ? 'text-emerald-700' : 'text-red-700'}`}>
            {result.is_pdf === false
              ? "This file doesn't start with the PDF file signature at all."
              : result.malformed_reason ||
                (result.encrypted
                  ? 'The file structure is readable, but it is encrypted.'
                  : `Opens cleanly${result.page_count != null ? ` with ${result.page_count} page(s)` : ''}.`)}
          </p>
        </div>
      </div>
    </div>
  );
}

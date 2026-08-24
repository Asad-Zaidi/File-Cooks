import React, { useState } from 'react';
import { FaLock, FaUnlockAlt, FaExclamationCircle } from 'react-icons/fa';

/**
 * Shown when `/api/pdf/info` reports the document is encrypted and no (or
 * the wrong) password was supplied -- see PdfServiceError.code
 * "PDF_PASSWORD_ERROR" for the wrong-password case.
 */
export default function PdfPasswordPrompt({ fileName, isLoading, errorMessage, onSubmit, onCancel }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200/90 rounded-3xl p-8 shadow-xs text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md mx-auto mb-4">
        <FaLock size={26} />
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-1">This PDF is Password-Protected</h3>
      <p className="text-xs text-gray-600 font-medium mb-6 truncate" title={fileName}>
        {fileName}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          disabled={isLoading}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 disabled:opacity-60"
        />

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 text-left">
            <FaExclamationCircle className="shrink-0 text-red-500" size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !password}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        >
          <FaUnlockAlt size={13} />
          <span>{isLoading ? 'Unlocking...' : 'Unlock & Inspect'}</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2.5 rounded-2xl text-gray-500 hover:text-gray-700 font-bold text-xs transition-colors"
        >
          Choose a Different File
        </button>
      </form>
    </div>
  );
}

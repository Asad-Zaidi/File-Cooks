import React, { useState } from 'react';
import { FaCompressAlt, FaShieldAlt, FaExclamationCircle, FaFilePdf } from 'react-icons/fa';

import PdfUploader from '../components/DocumentTools/PdfUploader';
import OperationResultCard from '../components/DocumentTools/OperationResultCard';
import { compressPdf, PdfServiceError } from '../services/pdfService';

const MODES = [
  { key: 'low', label: 'Low', desc: 'Streams/objects only — no image recompression, safest' },
  { key: 'balanced', label: 'Balanced', desc: 'Good size reduction, minimal visible quality loss' },
  { key: 'high', label: 'High', desc: 'Maximum shrinkage — visible quality tradeoff on images' },
  { key: 'custom', label: 'Custom', desc: 'Set your own JPEG quality & max image dimension' },
];

const DocumentCompress = () => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [quality, setQuality] = useState(70);
  const [maxDimension, setMaxDimension] = useState(1600);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const response = await compressPdf(file, { mode, quality, maxDimension });
      setResult(response);
    } catch (err) {
      setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaCompressAlt size={14} />
            <span>Compress PDF</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Shrink Your PDF's File Size
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium mb-4">
            Optimizes PDF streams/objects and, where you choose, recompresses embedded images.
            Text and vector content stay untouched.
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>Processed on our server, deleted immediately after.</span>
          </div>
        </div>

        {result ? (
          <OperationResultCard title="Compression Complete" result={result} onReset={handleReset} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!file ? (
              <PdfUploader onFileSelected={setFile} isLoading={isLoading} />
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200/90 bg-white shadow-2xs">
                <FaFilePdf className="text-orange-500 shrink-0" size={18} />
                <span className="text-sm font-bold text-gray-800 truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-gray-400 hover:text-red-600">
                  Change
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.key} type="button" onClick={() => setMode(m.key)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    mode === m.key
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                      : 'bg-white border-gray-200/90 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  <div className="text-sm font-black mb-1">{m.label}</div>
                  <div className={`text-[11px] font-medium leading-snug ${mode === m.key ? 'text-white/90' : 'text-gray-500'}`}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>

            {mode === 'custom' && (
              <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-black text-gray-800 mb-2">
                    <span>JPEG Quality</span>
                    <span className="text-orange-600">{quality}</span>
                  </label>
                  <input
                    type="range" min={1} max={95} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-800 mb-2">Max Image Dimension (px)</label>
                  <input
                    type="number" min={100} value={maxDimension}
                    onChange={(e) => setMaxDimension(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                <FaExclamationCircle className="shrink-0 mt-0.5" size={18} />
                <span className="text-xs font-bold">{error.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Compressing...' : 'Compress PDF'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DocumentCompress;

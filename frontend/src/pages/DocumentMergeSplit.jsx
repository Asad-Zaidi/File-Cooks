import React, { useState } from 'react';
import {
  FaObjectGroup, FaShieldAlt, FaExclamationCircle, FaFilePdf, FaSave,
} from 'react-icons/fa';

import PdfUploader from '../components/DocumentTools/PdfUploader';
import PdfMultiUploader from '../components/DocumentTools/PdfMultiUploader';
import PdfPageManager, { buildLayout } from '../components/DocumentTools/PdfPageManager';
import OperationResultCard from '../components/DocumentTools/OperationResultCard';
import {
  mergePdfs, splitPdf, rotatePages, assemblePdf, fetchThumbnails, PdfServiceError,
} from '../services/pdfService';

const ACTIONS = [
  { key: 'manage', label: 'Page Manager', title: 'Save Page Changes' },
  { key: 'merge', label: 'Merge', title: 'Merge PDFs', multi: true },
  { key: 'split', label: 'Split', title: 'Split PDF' },
  { key: 'rotate', label: 'Rotate', title: 'Rotate Pages' },
];

const DocumentMergeSplit = () => {
  const [action, setAction] = useState('manage');
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  // Page Manager state -- files[] indexed by fileIndex, pages[] is the
  // current (reorderable/deletable) working set across all of them.
  const [managerFiles, setManagerFiles] = useState([]);
  const [managerPages, setManagerPages] = useState([]);
  const [isLoadingManager, setIsLoadingManager] = useState(false);

  const [pageSpec, setPageSpec] = useState('');
  const [splitMode, setSplitMode] = useState('ranges');
  const [splitRanges, setSplitRanges] = useState('');
  const [splitEveryN, setSplitEveryN] = useState(1);
  const [rotateAngle, setRotateAngle] = useState(90);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const activeAction = ACTIONS.find((a) => a.key === action);

  const switchAction = (key) => {
    setAction(key);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setFiles([]);
    setFile(null);
    setManagerFiles([]);
    setManagerPages([]);
    setPageSpec('');
    setSplitRanges('');
    setResult(null);
    setError(null);
  };

  const handleManagerFileSelected = async (selected) => {
    setError(null);
    setIsLoadingManager(true);
    try {
      const data = await fetchThumbnails(selected, 220);
      setManagerFiles([selected]);
      setManagerPages(data.thumbnails.map((t) => ({
        uid: `p${t.page}_${Date.now()}`,
        fileIndex: 0,
        page: t.page,
        width: t.width,
        height: t.height,
        imageBase64: t.image_base64,
      })));
    } catch (err) {
      setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
    } finally {
      setIsLoadingManager(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      let response;
      if (action === 'manage') {
        response = await assemblePdf(managerFiles, buildLayout(managerPages));
      } else if (action === 'merge') {
        response = await mergePdfs(files);
      } else if (action === 'split') {
        response = await splitPdf(file, { mode: splitMode, ranges: splitRanges, everyN: splitEveryN });
      } else if (action === 'rotate') {
        response = await rotatePages(file, { pages: pageSpec || null, angle: rotateAngle });
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = action === 'manage' ? managerPages.length > 0 :
    action === 'merge' ? files.length >= 2 :
    Boolean(file) && (
      action === 'split' ? (splitMode === 'ranges' ? Boolean(splitRanges) : Boolean(splitEveryN)) : true
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaObjectGroup size={14} />
            <span>Merge & Split</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Merge, Split & Reorganize PDFs
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium mb-4">
            See every page as a thumbnail, drag to reorder, remove pages you don't want, and add pages
            from another PDF — or merge, split, and rotate. All processed on our server with direct
            page manipulation (no unnecessary re-rendering).
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>Files are deleted immediately after processing.</span>
          </div>
        </div>

        {/* Action selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => switchAction(a.key)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                action === a.key
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {result ? (
          <OperationResultCard title={`${activeAction.title} Complete`} result={result} onReset={handleReset} />
        ) : action === 'manage' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {managerFiles.length === 0 ? (
              <PdfUploader onFileSelected={handleManagerFileSelected} isLoading={isLoadingManager} />
            ) : (
              <>
                <PdfPageManager
                  files={managerFiles}
                  pages={managerPages}
                  onFilesChange={setManagerFiles}
                  onPagesChange={setManagerPages}
                  isBusy={isLoading}
                />

                {error && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                    <FaExclamationCircle className="shrink-0 mt-0.5" size={18} />
                    <span className="text-xs font-bold">{error.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <FaSave size={13} />
                  <span>{isLoading ? 'Saving...' : `Save PDF (${managerPages.length} pages)`}</span>
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {activeAction.multi ? (
              <PdfMultiUploader files={files} onFilesChange={setFiles} isLoading={isLoading} />
            ) : (
              <>
                {!file ? (
                  <PdfUploader onFileSelected={setFile} isLoading={isLoading} />
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200/90 bg-white shadow-2xs">
                    <FaFilePdf className="text-orange-500 shrink-0" size={18} />
                    <span className="text-sm font-bold text-gray-800 truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs font-bold text-gray-400 hover:text-red-600"
                    >
                      Change
                    </button>
                  </div>
                )}
              </>
            )}

            {action === 'rotate' && (
              <>
                <FieldGroup label="Pages to Rotate" hint="Leave blank to rotate every page">
                  <input
                    type="text" value={pageSpec} onChange={(e) => setPageSpec(e.target.value)}
                    placeholder="All pages" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </FieldGroup>
                <FieldGroup label="Rotation Angle">
                  <div className="flex gap-2">
                    {[90, 180, 270, -90].map((deg) => (
                      <button
                        key={deg} type="button" onClick={() => setRotateAngle(deg)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                          rotateAngle === deg
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </FieldGroup>
              </>
            )}

            {action === 'split' && (
              <>
                <FieldGroup label="Split Mode">
                  <div className="flex gap-2">
                    {[['ranges', 'By Ranges'], ['every_n', 'Every N Pages']].map(([key, label]) => (
                      <button
                        key={key} type="button" onClick={() => setSplitMode(key)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                          splitMode === key
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </FieldGroup>
                {splitMode === 'ranges' ? (
                  <FieldGroup label="Range Groups" hint="Semicolon-separated groups, e.g. 1-3;4-6;7-10">
                    <input
                      type="text" value={splitRanges} onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="1-3;4-6;7-10" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    />
                  </FieldGroup>
                ) : (
                  <FieldGroup label="Pages per Part">
                    <input
                      type="number" min={1} value={splitEveryN}
                      onChange={(e) => setSplitEveryN(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    />
                  </FieldGroup>
                )}
              </>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                <FaExclamationCircle className="shrink-0 mt-0.5" size={18} />
                <span className="text-xs font-bold">{error.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : activeAction.title}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

function FieldGroup({ label, hint, children }) {
  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
      <label className="block text-xs font-black text-gray-800 mb-2">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 font-medium mt-1.5">{hint}</p>}
    </div>
  );
}

export default DocumentMergeSplit;

import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaFilePdf,
  FaShieldAlt,
  FaQuestionCircle,
  FaChevronDown,
  FaRedo,
  FaSearchengin,
  FaExclamationCircle,
  FaObjectGroup,
  FaCompressAlt,
  FaSignature,
} from 'react-icons/fa';

import PdfUploader from '../components/DocumentTools/PdfUploader';
import PdfPasswordPrompt from '../components/DocumentTools/PdfPasswordPrompt';
import PdfInfoSummary from '../components/DocumentTools/PdfInfoSummary';
import PdfMetadataCard from '../components/DocumentTools/PdfMetadataCard';
import PdfFlagsCard from '../components/DocumentTools/PdfFlagsCard';
import PdfPagesTable from '../components/DocumentTools/PdfPagesTable';
import PdfValidateResult from '../components/DocumentTools/PdfValidateResult';
import { fetchPdfInfo, fetchPdfValidation, PdfServiceError } from '../services/pdfService';

const SECTION_IDS = { info: 'pdf-summary', metadata: 'pdf-metadata', validate: 'pdf-validate' };

const FromDocument = () => {
  const [searchParams] = useSearchParams();
  const tool = searchParams.get('tool');

  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingPasswordError, setPendingPasswordError] = useState(null);
  const [validateResult, setValidateResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const hasAutoScrolled = useRef(false);

  const needsPassword = info && info.encrypted && info.password_protected && info.page_count == null;

  const runInfo = async (targetFile, password = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPdfInfo(targetFile, password);
      setInfo(data);
      setPendingPasswordError(null);
    } catch (err) {
      if (err instanceof PdfServiceError && err.code === 'PDF_PASSWORD_ERROR') {
        // Wrong password on a retry -- keep the prompt open with the error shown inline.
        setInfo((prev) => prev || { encrypted: true, password_protected: true, page_count: null, file_size: targetFile.size });
        setPendingPasswordError(err.message);
      } else {
        setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
        setFile(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setInfo(null);
    setValidateResult(null);
    hasAutoScrolled.current = false;
    runInfo(selectedFile);
  };

  const handleUnlock = (password) => {
    runInfo(file, password);
  };

  const handleReset = () => {
    setFile(null);
    setInfo(null);
    setError(null);
    setPendingPasswordError(null);
    setValidateResult(null);
  };

  const handleQuickValidate = async () => {
    if (!file) return;
    setIsValidating(true);
    try {
      const data = await fetchPdfValidation(file);
      setValidateResult(data);
    } catch (err) {
      setValidateResult({ valid: false, is_pdf: true, malformed_reason: err.message });
    } finally {
      setIsValidating(false);
    }
  };

  // Deep-linked ?tool=validate runs the quick-validate check automatically
  // once the file is in, matching what the "Validate PDF" menu entry promises.
  useEffect(() => {
    if (tool === 'validate' && file && !isLoading && !needsPassword && !validateResult) {
      handleQuickValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, file, isLoading, needsPassword]);

  // Scroll to / highlight the section matching ?tool= once results are ready.
  useEffect(() => {
    if (!info || needsPassword || hasAutoScrolled.current) return;
    const sectionId = SECTION_IDS[tool];
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (el) {
      hasAutoScrolled.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-orange-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-orange-400'), 2000);
    }
  }, [info, needsPassword, tool]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-24 xl:px-32">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaFilePdf size={14} />
            <span>PDF Info & Inspector</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            Inspect Any PDF Document
          </h1>

          <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed mb-6">
            Upload a PDF to see its page count, dimensions, metadata, encryption status, and
            embedded forms/annotations/signatures — no watermarks, nothing stored.
          </p>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>Processed on our server and deleted immediately after inspection — never stored.</span>
          </div>
        </div>

        {/* Upload / Password / Results */}
        {!file && (
          <div className="mb-8">
            <PdfUploader onFileSelected={handleFileSelected} isLoading={isLoading} />
          </div>
        )}

        {file && needsPassword && (
          <PdfPasswordPrompt
            fileName={file.name}
            isLoading={isLoading}
            errorMessage={pendingPasswordError}
            onSubmit={handleUnlock}
            onCancel={handleReset}
          />
        )}

        {file && !needsPassword && isLoading && !info && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-14 h-14 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-600">Reading {file.name}...</p>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mb-8 p-5 rounded-3xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 animate-fade-in">
            <FaExclamationCircle className="shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-black">Couldn't process this file</h4>
              <p className="text-xs font-medium mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {file && info && !needsPassword && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <p className="text-sm font-bold text-gray-700 truncate max-w-md" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickValidate}
                  disabled={isValidating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:text-orange-600 text-gray-700 text-xs font-bold transition-all disabled:opacity-60"
                >
                  <FaSearchengin size={13} />
                  <span>{isValidating ? 'Validating...' : 'Quick Validate'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                >
                  <FaRedo size={11} />
                  <span>Inspect Another PDF</span>
                </button>
              </div>
            </div>

            <PdfValidateResult result={validateResult} onDismiss={() => setValidateResult(null)} />

            <PdfInfoSummary info={info} id={SECTION_IDS.info} />
            <PdfMetadataCard info={info} id={SECTION_IDS.metadata} />
            <PdfFlagsCard info={info} id="pdf-flags" />
            <PdfPagesTable pages={info.pages} id="pdf-pages" />
          </div>
        )}

        {/* More document tools -- now live */}
        {!file && (
          <div className="mt-14">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">More Document Tools</h2>
              <p className="text-xs text-gray-500 font-medium mt-2">
                Merge/split, compression, editing, and forms are live now. Cryptographic signing is next.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: FaObjectGroup, title: 'Merge & Split', desc: 'Combine PDFs, split, extract, reorder, delete & rotate pages.', to: '/document/merge-split' },
                { icon: FaCompressAlt, title: 'Compress PDF', desc: 'Shrink file size with configurable quality levels.', to: '/document/compress' },
                { icon: FaSignature, title: 'Edit & Forms', desc: 'Annotate, redact, and fill/flatten interactive form fields.', to: '/document/edit' },
              ].map(({ icon: Icon, title, desc, to }) => (
                <Link
                  key={title}
                  to={to}
                  className="group relative bg-white border border-gray-200/90 rounded-3xl p-6 text-center shadow-xs hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-black text-gray-900 mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 pt-12 border-t border-gray-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
              <FaQuestionCircle className="text-orange-500" />
              <span>PDF Inspector FAQs</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <FaqCard
              question="Is my PDF stored on your servers?"
              answer="No. Your file is uploaded only for the duration of the inspection and is deleted immediately afterward. It is never stored, cached, or shared."
            />
            <FaqCard
              question="What if my PDF is password-protected?"
              answer="You'll be prompted to enter its password to unlock full details. Without a password, we can still detect that the file is encrypted, but can't read its content."
            />
            <FaqCard
              question="What's the maximum file size?"
              answer="Up to 200 MB per PDF by default. Very large documents (thousands of pages) may also be capped for processing time."
            />
            <FaqCard
              question="What PDF operations are supported today?"
              answer="Info, metadata, validation, merge/split/reorder/rotate, compression, annotation/redaction, and form filling are all live now. Cryptographic digital signatures are next on the roadmap."
            />
          </div>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
          <FaShieldAlt className="text-emerald-500" />
          <span>FileCooks PDF Engine • No Watermarks • Local Server Processing</span>
        </div>
      </div>
    </div>
  );
};

function FaqCard({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      className="bg-white border border-gray-200/90 rounded-2xl p-4 cursor-pointer hover:border-orange-300 transition-all shadow-2xs"
    >
      <div className="flex items-center justify-between font-extrabold text-sm text-gray-900">
        <span>{question}</span>
        <FaChevronDown
          size={12}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-orange-500' : ''}`}
        />
      </div>
      {open && (
        <p className="mt-2.5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2 font-medium">
          {answer}
        </p>
      )}
    </div>
  );
}

export default FromDocument;

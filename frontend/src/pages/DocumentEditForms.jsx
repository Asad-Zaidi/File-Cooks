import React, { useEffect, useState } from 'react';
import { FaSignature, FaShieldAlt, FaExclamationCircle, FaFilePdf } from 'react-icons/fa';

import PdfUploader from '../components/DocumentTools/PdfUploader';
import OperationResultCard from '../components/DocumentTools/OperationResultCard';
import AnnotationBuilder from '../components/DocumentTools/AnnotationBuilder';
import FormFieldsFiller from '../components/DocumentTools/FormFieldsFiller';
import {
  fetchPdfInfo, annotatePdf, listFormFields, fillForm, PdfServiceError,
} from '../services/pdfService';

const TABS = [
  { key: 'annotate', label: 'Annotate & Redact' },
  { key: 'forms', label: 'Fill Forms' },
];

const DocumentEditForms = () => {
  const [tab, setTab] = useState('annotate');
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);

  const [ops, setOps] = useState([]);
  const [applyRedactions, setApplyRedactions] = useState(true);

  const [fields, setFields] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [flatten, setFlatten] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelected = async (selected) => {
    setFile(selected);
    setFields(null);
    setError(null);
    try {
      const info = await fetchPdfInfo(selected);
      setPageCount(info.page_count);
    } catch {
      setPageCount(null);
    }
  };

  useEffect(() => {
    if (tab === 'forms' && file && fields === null && !isLoadingFields) {
      (async () => {
        setIsLoadingFields(true);
        try {
          const data = await listFormFields(file);
          setFields(data.fields);
        } catch (err) {
          setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
        } finally {
          setIsLoadingFields(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, file]);

  const handleReset = () => {
    setFile(null);
    setPageCount(null);
    setOps([]);
    setFields(null);
    setFormValues({});
    setResult(null);
    setError(null);
  };

  const switchTab = (key) => {
    setTab(key);
    setResult(null);
    setError(null);
  };

  const handleAnnotateSubmit = async (e) => {
    e.preventDefault();
    if (!file || ops.length === 0) return;
    setError(null);
    setIsLoading(true);
    try {
      const response = await annotatePdf(file, ops, applyRedactions);
      setResult(response);
    } catch (err) {
      setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!file || Object.keys(formValues).length === 0) return;
    setError(null);
    setIsLoading(true);
    try {
      const response = await fillForm(file, formValues, flatten);
      setResult(response);
    } catch (err) {
      setError(err instanceof PdfServiceError ? err : new PdfServiceError('UNKNOWN_ERROR', err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaSignature size={14} />
            <span>Edit & Forms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Annotate, Redact & Fill PDF Forms
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium mb-4">
            Add text, shapes & markup annotations, permanently redact content, or fill and export
            interactive form fields.
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>No watermarks. Files deleted immediately after processing.</span>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.key} type="button" onClick={() => switchTab(t.key)}
              className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {result ? (
          <OperationResultCard
            title={tab === 'annotate' ? 'Annotations Applied' : 'Form Filled'}
            result={result}
            onReset={handleReset}
          />
        ) : !file ? (
          <PdfUploader onFileSelected={handleFileSelected} isLoading={isLoading} />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200/90 bg-white shadow-2xs">
              <FaFilePdf className="text-orange-500 shrink-0" size={18} />
              <span className="text-sm font-bold text-gray-800 truncate flex-1">
                {file.name}{pageCount ? ` · ${pageCount} pages` : ''}
              </span>
              <button type="button" onClick={handleReset} className="text-xs font-bold text-gray-400 hover:text-red-600">
                Change
              </button>
            </div>

            {tab === 'annotate' ? (
              <form onSubmit={handleAnnotateSubmit} className="space-y-5">
                <AnnotationBuilder ops={ops} onOpsChange={setOps} pageCount={pageCount} />

                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 px-1">
                  <input
                    type="checkbox" checked={applyRedactions} onChange={(e) => setApplyRedactions(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span>Burn in redactions immediately (permanently removes underlying content)</span>
                </label>

                {error && <ErrorBanner error={error} />}

                <button
                  type="submit" disabled={ops.length === 0 || isLoading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Applying...' : `Apply ${ops.length || ''} Annotation${ops.length === 1 ? '' : 's'}`}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                {isLoadingFields ? (
                  <div className="text-center py-8 text-sm font-bold text-gray-500">Detecting form fields...</div>
                ) : (
                  <FormFieldsFiller fields={fields} values={formValues} onValuesChange={setFormValues} />
                )}

                {fields && fields.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 px-1">
                    <input
                      type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span>Flatten form after filling (removes interactivity, locks in values)</span>
                  </label>
                )}

                {error && <ErrorBanner error={error} />}

                {fields && fields.length > 0 && (
                  <button
                    type="submit" disabled={Object.keys(formValues).length === 0 || isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? 'Filling...' : 'Fill & Download'}
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function ErrorBanner({ error }) {
  return (
    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
      <FaExclamationCircle className="shrink-0 mt-0.5" size={18} />
      <span className="text-xs font-bold">{error.message}</span>
    </div>
  );
}

export default DocumentEditForms;

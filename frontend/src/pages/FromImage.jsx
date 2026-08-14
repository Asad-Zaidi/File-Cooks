import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useImageConverter } from '../hooks/useImageConverter';
import ImageUploader from '../components/ImageConverter/ImageUploader';
import QueueHeader from '../components/ImageConverter/QueueHeader';
import ImageCard from '../components/ImageConverter/ImageCard';
import ConversionSettings from '../components/ImageConverter/ConversionSettings';
import ProgressBar from '../components/ImageConverter/ProgressBar';
import EmptyState from '../components/ImageConverter/EmptyState';
import {
  FaImage,
  FaQuestionCircle,
  FaChevronDown,
  FaShieldAlt,
  FaBolt,
  FaDownload,
  FaCheckCircle,
  FaExchangeAlt,
  FaFileUpload,
  FaSlidersH,
  FaFileDownload,
} from 'react-icons/fa';
import { formatBytes } from '../utils/filenameUtils';

const FromImage = () => {
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from')?.toLowerCase();
  const toParam = searchParams.get('to')?.toLowerCase();

  const fromUpper = fromParam ? fromParam.toUpperCase() : null;
  const toUpper = toParam ? toParam.toUpperCase() : null;
  const isSpecificRoute = fromUpper && toUpper;

  const [viewMode, setViewMode] = React.useState('grid');

  const {
    items,
    globalTargetFormat,
    isProcessingBatch,
    batchProgress,
    globalSettings,
    setGlobalSettings,
    addFiles,
    removeItem,
    clearAll,
    rotateItem,
    setItemTargetFormat,
    updateGlobalTargetFormat,
    convertSingleItem,
    convertAllItems,
    downloadSingleItem,
    downloadAllZip,
    downloadCombinedPdf,
    isGeneratingCombinedPdf,
  } = useImageConverter();

  const totalSizeBytes = items.reduce((acc, i) => acc + (i.originalSize || 0), 0);
  const totalResultBytes = items.reduce(
    (acc, i) => acc + (i.resultSize || i.originalSize || 0),
    0
  );
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const savedBytes =
    totalSizeBytes > totalResultBytes ? totalSizeBytes - totalResultBytes : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-8 lg:px-32">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaImage size={14} />
            <span>
              {isSpecificRoute
                ? `${fromUpper} → ${toUpper} Converter`
                : '100% Private Client-Side Engine'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            {isSpecificRoute
              ? `Convert ${fromUpper} to ${toUpper} Online`
              : 'Professional Online Image Converter'}
          </h1>

          <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed mb-6">
            {isSpecificRoute
              ? `Fast, free, and secure client-side ${fromUpper} to ${toUpper} conversion. Upload only ${fromUpper} files to convert directly to ${toUpper}.`
              : 'Convert JPG, PNG, WebP, GIF, BMP, SVG, and TIFF files directly in your web browser. Completely private, zero file uploads, zero watermarks.'}
          </p>

          {/* User-Friendly 3-Step Process Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto bg-white/90 border border-gray-200/90 rounded-2xl p-2 shadow-2xs text-xs font-bold text-gray-700">
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <FaFileUpload className="text-orange-500" />
              <span>1. Upload {fromUpper || 'Image'} Files</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaSlidersH className="text-amber-500" />
              <span>2. Choose Settings</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaFileDownload className="text-emerald-500" />
              <span>3. Save {toUpper || 'Converted'} Files</span>
            </div>
          </div>

          {/* Quick Stats Bar when items exist */}
          {completedCount > 0 && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 bg-emerald-50 border border-emerald-200 px-6 py-2.5 rounded-2xl shadow-xs text-xs text-emerald-800 font-semibold animate-fade-in">
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500" />
                <span>{completedCount} of {items.length} converted</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <FaBolt className="text-amber-500" />
                <span>Space Saved: {formatBytes(savedBytes)}</span>
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={downloadAllZip}
                className="text-emerald-700 hover:text-emerald-900 underline font-extrabold flex items-center gap-1"
              >
                <FaDownload size={11} />
                <span>Download All ZIP</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area: Show Hero Upload Box when empty, or Images Grid in place when files uploaded */}
        {items.length === 0 ? (
          <div className="mb-8">
            <ImageUploader
              onFilesSelected={addFiles}
              hasFiles={false}
              fromFormat={fromParam}
              toFormat={toParam}
            />
          </div>
        ) : (
          <div className="animate-fade-in mb-8">
            {/* Queue Header & Global Controls */}
            <QueueHeader
              itemsCount={items.length}
              totalSizeBytes={totalSizeBytes}
              globalTargetFormat={globalTargetFormat}
              onGlobalFormatChange={updateGlobalTargetFormat}
              onConvertAll={convertAllItems}
              onDownloadZip={downloadAllZip}
              onDownloadCombinedPdf={downloadCombinedPdf}
              isGeneratingCombinedPdf={isGeneratingCombinedPdf}
              onClearAll={clearAll}
              isProcessingBatch={isProcessingBatch}
              completedCount={completedCount}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Queue Cards Grid / List (In place of Upload Box) */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6'
                  : 'space-y-3.5 mb-6'
              }
            >
              {items.map((item) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onTargetFormatChange={setItemTargetFormat}
                  onConvertSingle={convertSingleItem}
                  onDownloadSingle={downloadSingleItem}
                  onRemove={removeItem}
                  onRotateSingle={rotateItem}
                />
              ))}
            </div>

            {/* Batch Progress Bar */}
            <ProgressBar
              progress={batchProgress}
              isProcessing={isProcessingBatch}
              totalCount={items.length}
            />

            {/* Conversion Controls & Quality Settings */}
            <ConversionSettings
              settings={globalSettings}
              onSettingsChange={setGlobalSettings}
              currentTargetFormat={globalTargetFormat}
            />

            {/* Add More Images Bar */}
            <div className="mt-6">
              <ImageUploader
                onFilesSelected={addFiles}
                hasFiles={true}
                fromFormat={fromParam}
                toFormat={toParam}
              />
            </div>
          </div>
        )}

        {/* Feature Highlights when queue is empty */}
        {items.length === 0 && (
          <EmptyState fromFormat={fromParam} toFormat={toParam} />
        )}

        {/* Format Comparison & Professional Guide */}
        <div className="mt-16 bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
              <FaExchangeAlt className="text-orange-500" />
              <span>
                {isSpecificRoute
                  ? `${fromUpper} & ${toUpper} Format Details`
                  : 'Image Format Comparison Guide'}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {isSpecificRoute
                ? `Detailed specification for ${fromUpper} to ${toUpper} conversion`
                : 'Choose the right format for your specific workflow'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Best Used For</th>
                  <th className="py-3 px-4">Transparency</th>
                  <th className="py-3 px-4">Compression</th>
                  <th className="py-3 px-4">Browser Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {(!isSpecificRoute || fromUpper === 'WEBP' || toUpper === 'WEBP') && (
                  <tr className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 font-black text-orange-600">WebP</td>
                    <td className="py-3 px-4">Modern Web Apps, Smallest File Sizes</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Yes (Alpha)</td>
                    <td className="py-3 px-4">Lossy & Lossless (Advanced)</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">100% Modern Browsers</td>
                  </tr>
                )}
                {(!isSpecificRoute || fromUpper === 'PNG' || toUpper === 'PNG') && (
                  <tr className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 font-black text-orange-600">PNG</td>
                    <td className="py-3 px-4">Logos, Transparent Graphics</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Yes (Full Alpha)</td>
                    <td className="py-3 px-4">Lossless (Crisp details)</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Universal</td>
                  </tr>
                )}
                {(!isSpecificRoute || fromUpper === 'JPG' || fromUpper === 'JPEG' || toUpper === 'JPG' || toUpper === 'JPEG') && (
                  <tr className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 font-black text-orange-600">JPG / JPEG</td>
                    <td className="py-3 px-4">Photographs, Complex Imagery</td>
                    <td className="py-3 px-4 text-gray-400">No (Solid Fill)</td>
                    <td className="py-3 px-4">Lossy (Adjustable 1-100%)</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Universal</td>
                  </tr>
                )}
                {(!isSpecificRoute || fromUpper === 'BMP' || toUpper === 'BMP') && (
                  <tr className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 font-black text-orange-600">BMP</td>
                    <td className="py-3 px-4">Uncompressed Desktop Graphics</td>
                    <td className="py-3 px-4 text-gray-400">No</td>
                    <td className="py-3 px-4">Uncompressed 24-bit RGB</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Universal</td>
                  </tr>
                )}
                {(!isSpecificRoute || fromUpper === 'PDF' || toUpper === 'PDF') && (
                  <tr className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 font-black text-orange-600">PDF</td>
                    <td className="py-3 px-4">Print Documents, Portfolios & Sharing</td>
                    <td className="py-3 px-4 text-gray-400">No (Solid Page Fill)</td>
                    <td className="py-3 px-4">JPEG / High Resolution Encoded</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">Universal Reader Support</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div className="mt-12 pt-12 border-t border-gray-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
              <FaQuestionCircle className="text-orange-500" />
              <span>Frequently Asked Questions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <FaqCard
              question={`Are my ${fromUpper || 'uploaded'} images secure?`}
              answer={`Yes! FileCooks processes all ${fromUpper || 'image'} conversions locally inside your browser using JavaScript and Canvas APIs. Your images are never uploaded to any cloud server.`}
            />
            <FaqCard
              question={
                isSpecificRoute
                  ? `How does ${fromUpper} to ${toUpper} conversion work?`
                  : 'How does transparency work when converting PNG to JPG?'
              }
              answer={
                isSpecificRoute
                  ? `Your ${fromUpper} files are loaded into an HTML5 Canvas element and encoded directly into ${toUpper} format in memory. If ${fromUpper} has transparency and ${toUpper} does not support alpha (like JPG), transparent pixels are filled with your selected background color.`
                  : 'JPEG does not natively support transparency (alpha channel). FileCooks fills transparent areas with your choice of background color (default is solid white).'
              }
            />
            <FaqCard
              question="Will my converted images have watermarks?"
              answer="No. All converted files generated by FileCooks are 100% clean, production-ready, and free of watermarks or branding."
            />
            <FaqCard
              question={`Can I convert multiple ${fromUpper || ''} images at once?`}
              answer={`Yes! You can drag and drop up to 100 ${fromUpper || ''} images at a time, convert them in parallel, and download them all together in a single ZIP file.`}
            />
          </div>
        </div>

        {/* Security Footer Badge */}
        <div className="mt-12 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
          <FaShieldAlt className="text-emerald-500" />
          <span>FileCooks Client-Side Image Engine • Zero Server Storage</span>
        </div>
      </div>
    </div>
  );
};

// Collapsible FAQ Item
function FaqCard({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      className="bg-white border border-gray-200/90 rounded-2xl p-4 cursor-pointer hover:border-orange-300 transition-all shadow-2xs"
    >
      <div className="flex items-center justify-between font-extrabold text-sm text-gray-900">
        <span>{question}</span>
        <FaChevronDown
          size={12}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-orange-500' : ''
            }`}
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

export default FromImage;
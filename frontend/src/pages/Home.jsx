import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaImage,
  FaHeadphones,
  FaVideo,
  FaMagic,
  FaShieldAlt,
  FaBolt,
  FaDownload,
  FaCheckCircle,
  FaExchangeAlt,
  FaFileUpload,
  FaSlidersH,
  FaFileDownload,
  FaArrowRight,
  FaQuestionCircle,
  FaChevronDown,
  FaLock,
} from 'react-icons/fa';
import { FaFileLines } from 'react-icons/fa6';
import { useImageConverter } from '../hooks/useImageConverter';
import ImageUploader from '../components/ImageConverter/ImageUploader';
import QueueHeader from '../components/ImageConverter/QueueHeader';
import ImageCard from '../components/ImageConverter/ImageCard';
import ConversionSettings from '../components/ImageConverter/ConversionSettings';
import ProgressBar from '../components/ImageConverter/ProgressBar';



const popularConversions = [
  { name: 'JPG → PNG', from: 'jpg', to: 'png', desc: 'Transparent PNG conversion' },
  { name: 'PNG → WebP', from: 'png', to: 'webp', desc: 'Web optimization' },
  { name: 'JPG → WebP', from: 'jpg', to: 'webp', desc: 'Compress images' },
  { name: 'Image → PDF', from: '', to: 'pdf', desc: 'Convert to PDF document' },
  { name: 'WebP → PNG', from: 'webp', to: 'png', desc: 'Extract crisp PNG' },
  { name: 'PNG → JPG', from: 'png', to: 'jpg', desc: 'Standard JPG format' },
];

const toolCategories = [
  {
    title: 'Image Converter',
    desc: 'Convert JPG, PNG, WebP, GIF, BMP, SVG, TIFF, and PDF files directly inside your browser.',
    icon: FaImage,
    path: '/image',
    badge: 'Popular',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-600',
  },
  {
    title: 'Icon & Web Assets Generator',
    desc: 'Upload 1 logo image and instantly generate favicons, Apple Touch icons, PWA logos & Open Graph social images in 1 click.',
    icon: FaMagic,
    path: '/image-converter/icon-generator',
    badge: 'New Tool',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-600',
  },
  {
    title: 'Document Cooking',
    desc: 'Convert images to single or multi-page PDF documents with high fidelity rendering.',
    icon: FaFileLines,
    path: '/document',
    badge: 'Free',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
  },
  {
    title: 'Audio Tools',
    desc: 'High quality audio conversion & extraction tools directly on your device.',
    icon: FaHeadphones,
    path: '/audio',
    badge: 'Client-Side',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
  },
  {
    title: 'Video Tools',
    desc: 'Fast browser-based video format converter and processing utilities.',
    icon: FaVideo,
    path: '/video',
    badge: 'Ultra Fast',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600',
  },
];

const Home = () => {
  const [viewMode, setViewMode] = useState('grid');

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
  const completedCount = items.filter((i) => i.status === 'completed').length;


  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-8 lg:px-32">
        {/* ── 1. Hero Section ── */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaMagic size={14} className="text-amber-500" />
            <span>100% Free & Private Client-Side Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight mb-5 leading-tight">
            Convert Any Format <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
              Instantly in Your Browser
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            Fast, secure, browser-based converter for images, web icons, documents, audio, and video.
            Zero cloud uploads — 100% private, unlimited conversions, zero watermarks.
          </p>

          {/* 3-Step Process Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto bg-white/90 border border-gray-200/90 rounded-2xl p-2.5 shadow-2xs text-xs font-bold text-gray-700 mb-6">
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <FaFileUpload className="text-orange-500" />
              <span>1. Upload Any Files</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaSlidersH className="text-amber-500" />
              <span>2. Choose Format</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaFileDownload className="text-emerald-500" />
              <span>3. Save Output Files</span>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>100% Private • Files never leave your browser • Zero server logs</span>
          </div>
        </div>

        {/* ── 2. Live Interactive Any-to-Any Format Converter ── */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            {/* Header tab switcher inside converter box */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <FaExchangeAlt size={16} />
                </span>
                <div>
                  <h2 className="text-lg font-black text-gray-900 leading-tight">
                    Any-to-Any Image & Format Converter
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Drop files below to convert between JPG, PNG, WebP, GIF, BMP, SVG, TIFF & PDF
                  </p>
                </div>
              </div>

              {completedCount > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <FaCheckCircle className="text-emerald-500" />
                  <span>{completedCount} of {items.length} Converted</span>
                </div>
              )}
            </div>

            {/* Dropzone OR Queue Cards Grid */}
            {items.length === 0 ? (
              <div className="mb-4">
                <ImageUploader onFilesSelected={addFiles} hasFiles={false} />
              </div>
            ) : (
              <div className="animate-fade-in mb-6">
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

                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6'
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

                <ProgressBar
                  progress={batchProgress}
                  isProcessing={isProcessingBatch}
                  totalCount={items.length}
                />

                <ConversionSettings
                  settings={globalSettings}
                  onSettingsChange={setGlobalSettings}
                  currentTargetFormat={globalTargetFormat}
                />

                <div className="mt-6">
                  <ImageUploader onFilesSelected={addFiles} hasFiles={true} />
                </div>
              </div>
            )}

            {/* Popular Conversion Shortcuts Pills */}
            <div className="pt-4 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-500 mb-3 flex items-center justify-between">
                <span>Popular Conversion Shortcuts:</span>
                <NavLink to="/image" className="text-orange-600 hover:underline flex items-center gap-1 font-bold">
                  <span>View All Tools</span>
                  <FaArrowRight size={10} />
                </NavLink>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {popularConversions.map((shortcut) => {
                  const link = shortcut.from && shortcut.to
                    ? `/image?from=${shortcut.from}&to=${shortcut.to}`
                    : `/image?to=${shortcut.to}`;
                  return (
                    <NavLink
                      key={shortcut.name}
                      to={link}
                      className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-orange-500 hover:text-white border border-gray-200 text-xs font-bold text-gray-700 transition-all flex items-center gap-1.5 shadow-2xs group"
                    >
                      <span>{shortcut.name}</span>
                      <FaArrowRight size={10} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                    </NavLink>
                  );
                })}

                {/* Special Highlight for Icon Generator */}
                <NavLink
                  to="/image-converter/icon-generator"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-500 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-md"
                >
                  <FaMagic size={12} />
                  <span>Icon & Web Assets Generator</span>
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. FileCooks Tools Suite Section ── */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
              Complete File Conversion Suite
            </h2>
            <p className="text-sm text-gray-600 font-medium">
              Explore dedicated conversion tools tailored for images, icons, documents, audio, and video.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolCategories.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <NavLink
                  key={tool.title}
                  to={tool.path}
                  className="group bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${tool.bgColor} ${tool.textColor} flex items-center justify-center border ${tool.borderColor} shadow-2xs group-hover:scale-110 transition-transform`}>
                        <ToolIcon size={22} />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                        {tool.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 group-hover:text-orange-600 transition-colors mb-2">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed mb-6">
                      {tool.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs font-bold text-orange-600 group-hover:text-orange-700">
                    <span>Open Tool</span>
                    <FaArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* ── 4. Key Value Proposition & Architecture Cards ── */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl mb-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Why Choose FileCooks?
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-3 mb-2">
              100% Client-Side Engine Performance
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-medium">
              We redesigned file conversion from the ground up to run natively inside your web browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 font-bold">
                <FaLock size={18} />
              </div>
              <h3 className="text-base font-black mb-2">100% Private & Secure</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Your images and documents are processed locally in memory. Zero file data is uploaded to remote servers.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 font-bold">
                <FaBolt size={18} />
              </div>
              <h3 className="text-base font-black mb-2">Instant GPU Acceleration</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Uses HTML5 Canvas & multi-core Web Workers for parallel batch processing without waiting in server queues.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4 font-bold">
                <FaDownload size={18} />
              </div>
              <h3 className="text-base font-black mb-2">1-Click ZIP Archives</h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Convert up to 100 images at a time and download them as a clean structured ZIP file in one click.
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. Frequently Asked Questions Section ── */}
        <div className="mt-12 pt-12 border-t border-gray-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
              <FaQuestionCircle className="text-orange-500" />
              <span>Frequently Asked Questions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <FaqCard
              question="How does client-side file conversion work?"
              answer="FileCooks uses HTML5 Canvas APIs, Web Workers, and JSAssembly inside your web browser to decode, transform, and encode images into formats like PNG, JPG, WebP, BMP, and PDF without uploading files anywhere."
            />
            <FaqCard
              question="Are my files uploaded or stored on any server?"
              answer="No. All conversions happen entirely inside your web browser on your own computer or mobile phone. Your files are 100% private."
            />
            <FaqCard
              question="Is there any file size limit or watermarking?"
              answer="No! FileCooks is completely free, unlimited, and adds zero watermarks or trial branding to your converted files."
            />
            <FaqCard
              question="Can I generate website favicons and app icons?"
              answer="Yes! Try our Icon & Web Assets Generator tool under the Image Converter menu. It takes 1 source image and generates favicons, Apple Touch icons, PWA icons, and Open Graph social cards."
            />
          </div>
        </div>

        {/* Security Footer Badge */}
        <div className="mt-12 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
          <FaShieldAlt className="text-emerald-500" />
          <span>FileCooks Client-Side Format Engine • Zero Server Storage</span>
        </div>
      </div>
    </div>
  );
};

// Collapsible FAQ Card Component
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
          className={`text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-orange-500' : ''
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

export default Home;
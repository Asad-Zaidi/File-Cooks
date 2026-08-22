import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAudioConverter } from '../hooks/useAudioConverter';
import AudioUploader from '../components/AudioConverter/AudioUploader';
import AudioQueueHeader from '../components/AudioConverter/AudioQueueHeader';
import AudioCard from '../components/AudioConverter/AudioCard';
import AudioConversionSettings from '../components/AudioConverter/AudioConversionSettings';
import AudioProgressBar from '../components/AudioConverter/AudioProgressBar';
import AudioEmptyState from '../components/AudioConverter/AudioEmptyState';
import AudioFormatGuide from '../components/AudioConverter/AudioFormatGuide';
import {
  FaHeadphones,
  FaFileUpload,
  FaSlidersH,
  FaFileDownload,
  FaCheckCircle,
  FaBolt,
  FaDownload,
} from 'react-icons/fa';
import { formatBytes } from '../utils/filenameUtils';

const FromAudio = () => {
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from')?.toLowerCase();
  const toParam = searchParams.get('to')?.toLowerCase();

  const fromUpper = fromParam ? fromParam.toUpperCase() : null;
  const toUpper = toParam ? toParam.toUpperCase() : null;
  const isSpecificRoute = fromUpper && toUpper;

  const [viewMode, setViewMode] = useState('grid');
  const [showSettings, setShowSettings] = useState(false);

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
    setItemTargetFormat,
    setItemSettings,
    updateGlobalTargetFormat,
    convertSingleItem,
    convertAllItems,
    downloadSingleItem,
    downloadAllZip,
  } = useAudioConverter(toParam || 'mp3');

  const totalSizeBytes = items.reduce((acc, i) => acc + (i.originalSize || 0), 0);
  const totalResultBytes = items.reduce(
    (acc, i) => acc + (i.resultSize || i.originalSize || 0),
    0
  );
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const savedBytes =
    totalSizeBytes > totalResultBytes ? totalSizeBytes - totalResultBytes : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-24 xl:px-32">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaHeadphones size={14} />
            <span>
              {isSpecificRoute
                ? `${fromUpper} → ${toUpper} Audio Converter`
                : 'Studio-Grade PyAV & FFmpeg Audio Engine'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            {isSpecificRoute
              ? `Convert ${fromUpper} to ${toUpper} Online`
              : 'Professional Online Audio Converter'}
          </h1>

          <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed mb-6">
            {isSpecificRoute
              ? `Fast, pristine, and high-fidelity ${fromUpper} to ${toUpper} audio conversion. Transcode tracks with customizable bitrates, sample rates, and channel layouts.`
              : 'Convert MP3, WAV, M4A, FLAC, AAC, OGG, Opus, AIFF, AMR, and AC3 audio files with studio fidelity. Supports 320k bitrates, 96kHz lossless audio, and batch processing.'}
          </p>

          {/* User-Friendly 3-Step Process Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto bg-white/90 border border-gray-200/90 rounded-2xl p-2 shadow-2xs text-xs font-bold text-gray-700">
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <FaFileUpload className="text-orange-500" />
              <span>1. Upload {fromUpper || 'Audio'} Tracks</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaSlidersH className="text-amber-500" />
              <span>2. Choose Audio Settings</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaFileDownload className="text-emerald-500" />
              <span>3. Save {toUpper || 'Converted'} Audio</span>
            </div>
          </div>

          {/* Quick Stats Bar when items exist */}
          {completedCount > 0 && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 bg-emerald-50 border border-emerald-200 px-6 py-2.5 rounded-2xl shadow-xs text-xs text-emerald-800 font-semibold animate-fade-in">
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500" />
                <span>{completedCount} of {items.length} tracks converted</span>
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
                className="text-emerald-700 hover:text-emerald-900 underline font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <FaDownload size={11} />
                <span>Download All ZIP</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area: Show Hero Upload Box when empty, or Queue in place when files uploaded */}
        {items.length === 0 ? (
          <div className="mb-8">
            <AudioUploader
              onFilesSelected={addFiles}
              hasFiles={false}
              fromFormat={fromParam}
              toFormat={toParam}
            />
          </div>
        ) : (
          <div className="animate-fade-in mb-8">
            {/* Queue Header & Global Controls */}
            <AudioQueueHeader
              itemsCount={items.length}
              totalSizeBytes={totalSizeBytes}
              globalTargetFormat={globalTargetFormat}
              onGlobalFormatChange={updateGlobalTargetFormat}
              onConvertAll={convertAllItems}
              onDownloadZip={downloadAllZip}
              onClearAll={clearAll}
              isProcessingBatch={isProcessingBatch}
              completedCount={completedCount}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showSettings={showSettings}
              onToggleSettings={() => setShowSettings((prev) => !prev)}
            />

            {/* Batch Progress Bar */}
            <AudioProgressBar
              progress={batchProgress}
              isProcessing={isProcessingBatch}
              totalCount={items.length}
            />

            {/* Advanced Conversion Controls Drawer (Collapsible) */}
            {showSettings && (
              <AudioConversionSettings
                settings={globalSettings}
                onSettingsChange={setGlobalSettings}
                currentTargetFormat={globalTargetFormat}
              />
            )}

            {/* Queue Cards Grid / List */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6'
                  : 'space-y-3 mb-6'
              }
            >
              {items.map((item) => (
                <AudioCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onTargetFormatChange={setItemTargetFormat}
                  onConvertSingle={convertSingleItem}
                  onDownloadSingle={downloadSingleItem}
                  onRemove={removeItem}
                  onUpdateSettings={setItemSettings}
                />
              ))}
            </div>

            {/* Add More Audio Tracks Bar */}
            <div className="mt-6">
              <AudioUploader
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
          <AudioEmptyState fromFormat={fromParam} toFormat={toParam} />
        )}

        {/* Format Comparison & Technical Guide */}
        <AudioFormatGuide fromFormat={fromParam} toFormat={toParam} />
      </div>
    </div>
  );
};

export default FromAudio;
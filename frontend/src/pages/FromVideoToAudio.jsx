import React, { useState } from 'react';
import { useVideoConverter } from '../hooks/useVideoConverter';
import VideoUploader from '../components/VideoConverter/VideoUploader';
import VideoQueueHeader from '../components/VideoConverter/VideoQueueHeader';
import VideoCard from '../components/VideoConverter/VideoCard';
import VideoConversionSettings from '../components/VideoConverter/VideoConversionSettings';
import VideoProgressBar from '../components/VideoConverter/VideoProgressBar';
import VideoEmptyState from '../components/VideoConverter/VideoEmptyState';
import VideoFormatGuide from '../components/VideoConverter/VideoFormatGuide';
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

const FromVideoToAudio = ({ source, target }) => {
  const fromUpper = source ? source.toUpperCase() : null;
  const toUpper = target ? target.toUpperCase() : null;
  const isSpecificRoute = Boolean(fromUpper && toUpper);

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
    cancelItem,
    downloadSingleItem,
    downloadAllZip,
  } = useVideoConverter('extract-audio', target || 'mp3');

  const totalSizeBytes = items.reduce((acc, i) => acc + (i.originalSize || 0), 0);
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalResultBytes = items.reduce((acc, i) => acc + (i.resultSize || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-24 xl:px-32">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaHeadphones size={14} />
            <span>{isSpecificRoute ? `${fromUpper} → ${toUpper} Audio Extraction` : 'Video-to-Audio Extractor'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            {isSpecificRoute ? `Extract ${toUpper} Audio from ${fromUpper}` : 'Extract Audio from Video'}
          </h1>

          <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed mb-6">
            {isSpecificRoute
              ? `The video stream is discarded — only the audio track from your ${fromUpper} is decoded (or copied) into ${toUpper}.`
              : 'Pull the audio track out of MP4, MKV, MOV, AVI and WEBM videos as MP3, WAV, FLAC, M4A, AAC, OGG or Opus — the video stream is never processed.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto bg-white/90 border border-gray-200/90 rounded-2xl p-2 shadow-2xs text-xs font-bold text-gray-700">
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <FaFileUpload className="text-orange-500" />
              <span>1. Upload {fromUpper || 'Video'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaSlidersH className="text-amber-500" />
              <span>2. Choose Audio Settings</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-gray-50 text-gray-700">
              <FaFileDownload className="text-emerald-500" />
              <span>3. Save {toUpper || 'Extracted'} Audio</span>
            </div>
          </div>

          {completedCount > 0 && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 bg-emerald-50 border border-emerald-200 px-6 py-2.5 rounded-2xl shadow-xs text-xs text-emerald-800 font-semibold animate-fade-in">
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500" />
                <span>{completedCount} of {items.length} tracks extracted</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <FaBolt className="text-amber-500" />
                <span>Total Audio Size: {formatBytes(totalResultBytes)}</span>
              </span>
              <span>•</span>
              <button type="button" onClick={downloadAllZip} className="text-emerald-700 hover:text-emerald-900 underline font-extrabold flex items-center gap-1 cursor-pointer">
                <FaDownload size={11} />
                <span>Download All ZIP</span>
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mb-8">
            <VideoUploader onFilesSelected={addFiles} hasFiles={false} fromFormat={source} toFormat={target} mode="extract-audio" />
          </div>
        ) : (
          <div className="animate-fade-in mb-8">
            <VideoQueueHeader
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
              mode="extract-audio"
            />

            <VideoProgressBar progress={batchProgress} isProcessing={isProcessingBatch} totalCount={items.length} />

            {showSettings && (
              <VideoConversionSettings
                settings={globalSettings}
                onSettingsChange={setGlobalSettings}
                currentTargetFormat={globalTargetFormat}
                mode="extract-audio"
              />
            )}

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6' : 'space-y-3 mb-6'}>
              {items.map((item) => (
                <VideoCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onTargetFormatChange={setItemTargetFormat}
                  onConvertSingle={convertSingleItem}
                  onCancelSingle={cancelItem}
                  onDownloadSingle={downloadSingleItem}
                  onRemove={removeItem}
                  onUpdateSettings={setItemSettings}
                  mode="extract-audio"
                />
              ))}
            </div>

            <div className="mt-6">
              <VideoUploader onFilesSelected={addFiles} hasFiles={true} fromFormat={source} toFormat={target} mode="extract-audio" />
            </div>
          </div>
        )}

        {items.length === 0 && <VideoEmptyState mode="extract-audio" />}

        <VideoFormatGuide />
      </div>
    </div>
  );
};

export default FromVideoToAudio;

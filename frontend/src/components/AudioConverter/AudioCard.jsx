import React, { useState, useRef, useEffect } from 'react';
import {
  FaPlay,
  FaPause,
  FaDownload,
  FaTrashAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaRedo,
} from 'react-icons/fa';
import {
  AUDIO_CONFIG,
  formatDuration,
} from '../../services/audioService';
import { formatBytes } from '../../utils/filenameUtils';

export default function AudioCard({
  item,
  viewMode = 'grid',
  onTargetFormatChange,
  onConvertSingle,
  onDownloadSingle,
  onRemove,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration || 0);
  const audioRef = useRef(null);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Playback error:', err));
    }
  };

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const setAudioDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setAudioDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setAudioDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  };

  // Calculate size difference / savings
  const hasResult = item.status === 'completed' && item.resultSize;
  const diffPercent = hasResult && item.originalSize > 0
    ? Math.round(((item.originalSize - item.resultSize) / item.originalSize) * 100)
    : 0;

  // --- LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200/90 hover:border-orange-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <audio ref={audioRef} src={item.audioPreviewUrl} preload="metadata" />

        {/* File info & player */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shrink-0 ${
              isPlaying
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
            title={isPlaying ? 'Pause' : 'Play preview'}
          >
            {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ml-0.5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-gray-900 truncate" title={item.name}>
                {item.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-extrabold text-[10px] uppercase">
                {item.inputFormat}
              </span>
            </div>

            {/* Time scrub bar */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-gray-400 w-8">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="h-1 flex-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-[10px] font-semibold text-gray-400 w-8 text-right">
                {formatDuration(duration)}
              </span>
              <span className="text-[10px] text-gray-400 font-medium ml-2">
                ({formatBytes(item.originalSize)})
              </span>
            </div>
          </div>
        </div>

        {/* Output Controls & Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {/* Target Format selector */}
          <select
            value={item.targetFormat}
            onChange={(e) => onTargetFormatChange(item.id, e.target.value)}
            disabled={item.status === 'converting'}
            className="bg-gray-50 border border-gray-200 text-gray-900 font-extrabold text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
          >
            {AUDIO_CONFIG.supportedOutputFormats.map((fmtKey) => (
              <option key={fmtKey} value={fmtKey}>
                → {fmtKey.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Status / Actions */}
          {item.status === 'converting' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold animate-pulse">
              <FaSpinner className="animate-spin" size={12} />
              <span>Transcoding...</span>
            </div>
          )}

          {item.status === 'completed' && (
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <p className="text-xs font-extrabold text-emerald-600">
                  {formatBytes(item.resultSize)}
                </p>
                {diffPercent !== 0 && (
                  <p className="text-[10px] font-bold text-gray-500">
                    {diffPercent > 0 ? `-${diffPercent}%` : `+${Math.abs(diffPercent)}%`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDownloadSingle(item.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FaDownload size={11} />
                <span>Save</span>
              </button>
            </div>
          )}

          {item.status === 'error' && (
            <button
              type="button"
              onClick={() => onConvertSingle(item.id)}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title={item.errorMessage || 'Conversion error, click to retry'}
            >
              <FaRedo size={11} />
              <span>Retry</span>
            </button>
          )}

          {item.status === 'idle' && (
            <button
              type="button"
              onClick={() => onConvertSingle(item.id)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FaPlay size={10} />
              <span>Convert</span>
            </button>
          )}

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Remove item"
          >
            <FaTrashAlt size={12} />
          </button>
        </div>
      </div>
    );
  }

  // --- GRID VIEW ---
  return (
    <div className="group relative bg-white border border-gray-200/90 hover:border-orange-300 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <audio ref={audioRef} src={item.audioPreviewUrl} preload="metadata" />

      {/* Top Bar: Format Badge & Delete */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-orange-100/80 text-orange-700 font-black text-[10px] uppercase">
            {item.inputFormat}
          </span>
          <span className="text-gray-400 text-xs font-bold">→</span>
          <select
            value={item.targetFormat}
            onChange={(e) => onTargetFormatChange(item.id, e.target.value)}
            disabled={item.status === 'converting'}
            className="bg-gray-50 border border-gray-200 text-gray-900 font-black text-[11px] rounded-lg px-2 py-0.5 focus:ring-1 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
          >
            {AUDIO_CONFIG.supportedOutputFormats.map((fmtKey) => (
              <option key={fmtKey} value={fmtKey}>
                {fmtKey.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="Remove track"
        >
          <FaTrashAlt size={12} />
        </button>
      </div>

      {/* Audio Visualizer / Player Area */}
      <div className="my-2 p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/60 via-amber-50/40 to-orange-50/20 border border-orange-100/80 flex flex-col items-center">
        {/* Play / Pause Central Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all transform hover:scale-105 mb-2.5 ${
            isPlaying
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-white text-orange-600 shadow-sm border border-orange-200/80 hover:bg-orange-50'
          }`}
          title={isPlaying ? 'Pause audio' : 'Play audio preview'}
        >
          {isPlaying ? <FaPause size={15} /> : <FaPlay size={15} className="ml-1" />}
        </button>

        {/* Audio Wave scrubber */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 w-7">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 flex-1 bg-orange-200/60 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-[10px] font-bold text-gray-400 w-7 text-right">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Filename & Info */}
      <div className="my-2">
        <p className="font-bold text-xs text-gray-900 truncate" title={item.name}>
          {item.name}
        </p>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
          Source: <span className="font-bold text-gray-700">{formatBytes(item.originalSize)}</span>
        </p>
      </div>

      {/* Status or Results Bar */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        {item.status === 'converting' && (
          <div className="py-2 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold animate-pulse">
            <FaSpinner className="animate-spin" size={13} />
            <span>Transcoding...</span>
          </div>
        )}

        {item.status === 'completed' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <FaCheckCircle size={11} className="text-emerald-500" />
                Done
              </span>
              <span className="font-black text-gray-800">
                {formatBytes(item.resultSize)}
                {diffPercent !== 0 && (
                  <span className={`ml-1 text-[10px] ${diffPercent > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ({diffPercent > 0 ? `-${diffPercent}%` : `+${Math.abs(diffPercent)}%`})
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDownloadSingle(item.id)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FaDownload size={11} />
              <span>Download {item.targetFormat.toUpperCase()}</span>
            </button>
          </div>
        )}

        {item.status === 'error' && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-red-600 flex items-center gap-1 truncate" title={item.errorMessage}>
              <FaExclamationCircle size={11} />
              <span className="truncate">{item.errorMessage || 'Conversion failed'}</span>
            </div>
            <button
              type="button"
              onClick={() => onConvertSingle(item.id)}
              className="w-full py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FaRedo size={11} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {item.status === 'idle' && (
          <button
            type="button"
            onClick={() => onConvertSingle(item.id)}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <FaPlay size={10} />
            <span>Convert Track</span>
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { FaSlidersH, FaInfoCircle, FaVolumeUp, FaWaveSquare, FaMicrophone, FaCheck, FaExpand } from 'react-icons/fa';
import {
  RESOLUTIONS,
  FPS_OPTIONS,
  QUALITY_PRESETS,
  AUDIO_BITRATES_KBPS,
  SAMPLE_RATES,
  fetchSupportedVideoFormats,
} from '../../services/videoService';

const QUALITY_WARNINGS = {
  fast: 'Fastest encode; larger file or visibly lower quality than the source.',
  balanced: 'Good trade-off between speed, file size and quality.',
  high: 'Slower encode for noticeably better quality; re-encoding cannot add detail beyond the source.',
  maximum: 'Slowest encode, best achievable quality for the chosen codec. Still bounded by source quality.',
};

export default function VideoConversionSettings({ settings, onSettingsChange, currentTargetFormat = 'mp4', mode = 'convert' }) {
  const [formats, setFormats] = useState(null);
  const isExtract = mode === 'extract-audio';

  useEffect(() => {
    let cancelled = false;
    fetchSupportedVideoFormats().then((data) => {
      if (!cancelled) setFormats(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const container = formats?.containers?.find((c) => c.key === currentTargetFormat);
  const videoCodecs = container?.video_codecs || [];
  const audioCodecs = container?.audio_codecs || [];

  const update = (patch) => onSettingsChange((prev) => ({ ...prev, ...patch }));

  if (isExtract) {
    return (
      <div className="bg-white border border-orange-200/90 rounded-3xl p-6 shadow-sm mb-8 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <FaSlidersH size={14} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Audio Extraction Settings</h3>
            <p className="text-xs text-gray-500 font-medium">The video stream is discarded — only the audio track is processed.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
              <FaVolumeUp className="text-amber-500" />
              <span>Bitrate</span>
            </label>
            <select
              value={settings.bitrateKbps || ''}
              onChange={(e) => update({ bitrateKbps: e.target.value ? Number(e.target.value) : '' })}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {AUDIO_BITRATES_KBPS.map((kbps) => (
                <option key={kbps} value={kbps}>{kbps} kbps</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
              <FaWaveSquare className="text-blue-500" />
              <span>Sample Rate</span>
            </label>
            <select
              value={settings.sampleRate || ''}
              onChange={(e) => update({ sampleRate: e.target.value ? Number(e.target.value) : '' })}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {SAMPLE_RATES.map((sr) => (
                <option key={sr.value} value={sr.value}>{sr.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
              <FaMicrophone className="text-purple-500" />
              <span>Channels</span>
            </label>
            <select
              value={settings.channels || ''}
              onChange={(e) => update({ channels: e.target.value ? Number(e.target.value) : '' })}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">Keep Source Channels</option>
              <option value="2">Stereo (2 Channels)</option>
              <option value="1">Mono (1 Channel)</option>
            </select>
          </div>
        </div>

        <div className="mt-5 p-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-start gap-2.5 text-xs text-gray-600">
          <FaInfoCircle className="text-orange-500 shrink-0 mt-0.5" />
          <span>Only the audio stream is decoded/processed. If the source audio already matches the target format and no override is set here, it's copied byte-for-byte instead of re-encoded.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-orange-200/90 rounded-3xl p-6 shadow-sm mb-8 animate-fade-in">
      <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <FaSlidersH size={14} />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900">Video Encoder Settings ({currentTargetFormat.toUpperCase()})</h3>
          <p className="text-xs text-gray-500 font-medium">Only codecs this server's FFmpeg build actually supports are listed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaWaveSquare className="text-orange-500" />
            <span>Video Codec</span>
          </label>
          <select
            value={settings.videoCodec || ''}
            onChange={(e) => update({ videoCodec: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Auto (Recommended)</option>
            {videoCodecs.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaExpand className="text-blue-500" />
            <span>Resolution</span>
          </label>
          <select
            value={settings.resolution || 'original'}
            onChange={(e) => update({ resolution: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {settings.resolution === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                placeholder="Width"
                value={settings.customWidth || ''}
                onChange={(e) => update({ customWidth: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-400 font-bold">×</span>
              <input
                type="number"
                placeholder="Height"
                value={settings.customHeight || ''}
                onChange={(e) => update({ customHeight: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaWaveSquare className="text-emerald-500" />
            <span>Frame Rate (FPS)</span>
          </label>
          <select
            value={settings.fps || ''}
            onChange={(e) => update({ fps: e.target.value ? Number(e.target.value) : '' })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            {FPS_OPTIONS.map((f) => (
              <option key={f.value || 'orig'} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaCheck className="text-amber-500" />
            <span>Quality Preset</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {QUALITY_PRESETS.map((preset) => {
              const isSelected = (settings.quality || 'balanced') === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => update({ quality: preset.key })}
                  className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                    isSelected ? 'bg-orange-500 text-white border-orange-500 shadow-xs' : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-orange-50/50 hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{preset.label}</span>
                    {isSelected && <FaCheck size={10} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaVolumeUp className="text-purple-500" />
            <span>Audio Codec</span>
          </label>
          <select
            value={settings.audioCodec || ''}
            onChange={(e) => update({ audioCodec: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Auto (Recommended)</option>
            {audioCodecs.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
            <option value="none">No Audio (Strip Track)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaVolumeUp className="text-teal-500" />
            <span>Audio Bitrate</span>
          </label>
          <select
            value={settings.audioBitrate || ''}
            onChange={(e) => update({ audioBitrate: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="">Auto</option>
            {AUDIO_BITRATES_KBPS.map((kbps) => (
              <option key={kbps} value={`${kbps}k`}>{kbps} kbps</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 p-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-start gap-2.5 text-xs text-gray-600">
        <FaInfoCircle className="text-orange-500 shrink-0 mt-0.5" />
        <span>{QUALITY_WARNINGS[settings.quality || 'balanced']}</span>
      </div>
    </div>
  );
}

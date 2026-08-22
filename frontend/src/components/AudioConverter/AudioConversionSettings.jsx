import React from 'react';
import {
  FaSlidersH,
  FaInfoCircle,
  FaVolumeUp,
  FaWaveSquare,
  FaMicrophone,
  FaCheck,
} from 'react-icons/fa';
import {
  AUDIO_FORMAT_SPECS,
  QUALITY_PRESETS,
  COMMON_SAMPLE_RATES,
} from '../../services/audioService';

export default function AudioConversionSettings({
  settings,
  onSettingsChange,
  currentTargetFormat = 'mp3',
}) {
  const spec = AUDIO_FORMAT_SPECS[currentTargetFormat];
  const isLossless = spec?.lossless || false;
  const isFixedSampleRate = spec?.fixedSampleRate !== undefined;
  const isFixedChannels = spec?.fixedChannels !== undefined;

  const handleQualityChange = (presetKey) => {
    onSettingsChange((prev) => ({
      ...prev,
      quality: presetKey,
    }));
  };

  const handleBitrateChange = (e) => {
    onSettingsChange((prev) => ({
      ...prev,
      bitrate: e.target.value,
    }));
  };

  const handleSampleRateChange = (e) => {
    onSettingsChange((prev) => ({
      ...prev,
      sampleRate: e.target.value,
    }));
  };

  const handleChannelsChange = (e) => {
    onSettingsChange((prev) => ({
      ...prev,
      channels: e.target.value,
    }));
  };

  return (
    <div className="bg-white border border-orange-200/90 rounded-3xl p-6 shadow-sm mb-8 animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <FaSlidersH size={14} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">
              Audio Encoder Settings ({spec?.label || currentTargetFormat.toUpperCase()})
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Fine-tune audio quality, sample rate, bitrate and channel configuration.
            </p>
          </div>
        </div>

        {isLossless && (
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
            Lossless Audio Enabled
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Quality Presets (Disabled for Lossless formats) */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaWaveSquare className="text-orange-500" />
            <span>Audio Quality Preset</span>
          </label>

          {isLossless ? (
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 text-xs text-emerald-800 font-medium">
              Bit-for-bit lossless encoding. Bitrate compression presets do not apply.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {QUALITY_PRESETS.map((preset) => {
                const isSelected = settings.quality === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleQualityChange(preset.key)}
                    className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-orange-50/50 hover:border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold capitalize">{preset.key}</span>
                      {isSelected && <FaCheck size={10} />}
                    </div>
                    <span
                      className={`text-[10px] block mt-0.5 ${
                        isSelected ? 'text-orange-100' : 'text-gray-400'
                      }`}
                    >
                      {preset.label.split('(')[1]?.replace(')', '') || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Custom Bitrate */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaVolumeUp className="text-amber-500" />
            <span>Target Bitrate</span>
          </label>

          {isLossless ? (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/60 text-xs text-gray-500 font-medium">
              Lossless PCM/FLAC (Native dynamic bit depth)
            </div>
          ) : (
            <select
              value={settings.bitrate || spec?.defaultBitrate || '192k'}
              onChange={handleBitrateChange}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {(spec?.allowedBitrates || ['96k', '128k', '192k', '256k', '320k']).map((br) => (
                <option key={br} value={br}>
                  {br.toUpperCase()}bps {br === spec?.defaultBitrate ? '(Default)' : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-gray-400">
            Higher bitrate = higher audio clarity, larger file size.
          </p>
        </div>

        {/* 3. Sample Rate */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaWaveSquare className="text-blue-500" />
            <span>Sample Rate (Hz)</span>
          </label>

          {isFixedSampleRate ? (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/60 text-xs text-gray-600 font-medium">
              Fixed: {spec.fixedSampleRate.toLocaleString()} Hz ({spec.label} standard)
            </div>
          ) : (
            <select
              value={settings.sampleRate || ''}
              onChange={handleSampleRateChange}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {COMMON_SAMPLE_RATES.map((sr) => (
                <option key={sr.value} value={sr.value}>
                  {sr.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-gray-400">
            44,100 Hz is standard CD quality; 48,000 Hz is studio video quality.
          </p>
        </div>

        {/* 4. Audio Channels */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <FaMicrophone className="text-purple-500" />
            <span>Audio Channels</span>
          </label>

          {isFixedChannels ? (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/60 text-xs text-gray-600 font-medium">
              Fixed: {spec.fixedChannels === 1 ? 'Mono (1 Channel)' : 'Stereo (2 Channels)'}
            </div>
          ) : (
            <select
              value={settings.channels || ''}
              onChange={handleChannelsChange}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">Keep Source Channels</option>
              <option value="2">Stereo (2 Channels)</option>
              <option value="1">Mono (1 Channel)</option>
            </select>
          )}
          <p className="text-[11px] text-gray-400">
            Stereo preserves spatial sound stage; Mono halves channel overhead.
          </p>
        </div>
      </div>

      {/* Format Info Note */}
      {spec?.description && (
        <div className="mt-5 p-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-start gap-2.5 text-xs text-gray-600">
          <FaInfoCircle className="text-orange-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-gray-900 font-extrabold">{spec.label}: </strong>
            {spec.description}
          </span>
        </div>
      )}
    </div>
  );
}

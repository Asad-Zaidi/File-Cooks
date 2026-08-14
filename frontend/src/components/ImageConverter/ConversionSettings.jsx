import React from 'react';
import {
  FaSlidersH,
  FaPalette,
  FaInfoCircle,
  FaExpandArrowsAlt,
  FaRedo,
  FaMagic,
  FaBolt,
  FaGem,
  FaCompressAlt,
} from 'react-icons/fa';

export default function ConversionSettings({ settings, onSettingsChange, currentTargetFormat }) {
  const isQualityApplicable = currentTargetFormat === 'jpg' || currentTargetFormat === 'webp' || currentTargetFormat === 'pdf';
  const isBackgroundApplicable = currentTargetFormat === 'jpg' || currentTargetFormat === 'bmp' || currentTargetFormat === 'pdf';

  // Smart presets handler
  const applyPreset = (presetType) => {
    switch (presetType) {
      case 'web':
        onSettingsChange({ ...settings, quality: 90, scalePercent: 100 });
        break;
      case 'lossless':
        onSettingsChange({ ...settings, quality: 100, scalePercent: 100 });
        break;
      case 'compact':
        onSettingsChange({ ...settings, quality: 65, scalePercent: 75 });
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl p-5 md:p-6 shadow-sm mb-6 transition-all duration-300 hover:shadow-md animate-fade-in">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20 transition-transform duration-300 hover:scale-105">
            <FaSlidersH size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              Conversion Controls & Optimization
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Fine-tune output format, dimensions, quality, and transparency background
            </p>
          </div>
        </div>

        {/* Format Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Output Target:</span>
          <span className="px-3 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-black uppercase tracking-wider transition-all duration-200 hover:bg-orange-100">
            {currentTargetFormat.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Smart Quick Presets Bar */}
      <div className="mb-6 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-gray-50 p-3.5 rounded-2xl border border-orange-100 flex flex-wrap items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
          <FaMagic className="text-orange-500" />
          <span>Quick Optimization Presets:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('web')}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-400 text-xs font-bold text-gray-700 hover:text-orange-600 transition-all duration-200 shadow-2xs hover:scale-[1.02] flex items-center gap-1.5"
          >
            <FaBolt className="text-amber-500" size={12} />
            <span>Web Optimized</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('lossless')}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-400 text-xs font-bold text-gray-700 hover:text-orange-600 transition-all duration-200 shadow-2xs hover:scale-[1.02] flex items-center gap-1.5"
          >
            <FaGem className="text-blue-500" size={12} />
            <span>Maximum Quality</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('compact')}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-400 text-xs font-bold text-gray-700 hover:text-orange-600 transition-all duration-200 shadow-2xs hover:scale-[1.02] flex items-center gap-1.5"
          >
            <FaCompressAlt className="text-emerald-500" size={12} />
            <span>Smallest File</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quality Control */}
        <div className={`space-y-2.5 transition-all duration-300 ${!isQualityApplicable ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <span>Compression Quality:</span>
              <span className="text-orange-600 font-black">{settings.quality}%</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
              {settings.quality >= 90 ? 'Ultra High' : settings.quality >= 75 ? 'Balanced' : 'High Compression'}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={settings.quality}
            onChange={(e) =>
              onSettingsChange({ ...settings, quality: parseInt(e.target.value, 10) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 transition-all"
          />
          <div className="flex justify-between text-[10px] font-semibold text-gray-400">
            <span>Small file (10%)</span>
            <span>Recommended (90%)</span>
            <span>Lossless (100%)</span>
          </div>
        </div>

        {/* Scale Dimensions Control */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <FaExpandArrowsAlt className="text-orange-500" size={12} />
              <span>Resize Scaling:</span>
            </label>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              {settings.scalePercent}% Size
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '100%', val: 100 },
              { label: '75%', val: 75 },
              { label: '50%', val: 50 },
              { label: '25%', val: 25 },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => onSettingsChange({ ...settings, scalePercent: preset.val })}
                className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all duration-200 border ${
                  settings.scalePercent === preset.val
                    ? 'border-orange-500 bg-orange-500 text-white shadow-xs scale-[1.02]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-[1.01]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Scale width and height proportionally</p>
        </div>

        {/* Background Color & Rotation Control */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <FaPalette className="text-orange-500" size={12} />
              <span>Background Fill:</span>
            </label>
            <button
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  rotation: ((settings.rotation || 0) + 90) % 360,
                })
              }
              className="text-[11px] text-orange-600 hover:text-orange-700 font-extrabold flex items-center gap-1 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 transition-all duration-200 hover:scale-[1.02]"
            >
              <FaRedo size={10} className="transition-transform duration-300 hover:rotate-90" />
              <span>Rotate {settings.rotation || 0}°</span>
            </button>
          </div>

          <div className={`flex items-center gap-2 transition-all duration-300 ${!isBackgroundApplicable ? 'opacity-40 pointer-events-none' : ''}`}>
            {[
              { label: 'White', color: '#ffffff' },
              { label: 'Black', color: '#000000' },
              { label: 'Grey', color: '#888888' },
            ].map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => onSettingsChange({ ...settings, backgroundColor: preset.color })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  settings.backgroundColor === preset.color
                    ? 'border-orange-500 ring-2 ring-orange-200 bg-orange-50/50 text-orange-900 scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="truncate">{preset.label}</span>
              </button>
            ))}

            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => onSettingsChange({ ...settings, backgroundColor: e.target.value })}
              className="w-8 h-8 rounded-xl cursor-pointer border-0 bg-transparent shrink-0 transition-transform hover:scale-110"
              title="Custom hex color"
            />
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Alpha background fill for JPG/BMP export</p>
        </div>
      </div>

      {/* Footer Info Notice */}
      <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
        <FaInfoCircle className="text-blue-500 shrink-0" size={14} />
        <span>
          Settings automatically apply during conversion. You can also customize individual target formats per file card below.
        </span>
      </div>
    </div>
  );
}

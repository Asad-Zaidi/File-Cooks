import React, { useState } from 'react';
import { FaSlidersH, FaChevronDown, FaPalette, FaExpand, FaCompress } from 'react-icons/fa';

/**
 * Settings panel for Background, Icon Padding, and Advanced Open Graph Image
 */
export default function AssetSettings({ settings, onSettingsChange, onRegenerate }) {
  const [ogExpanded, setOgExpanded] = useState(false);

  const handleBgChange = (bg) => {
    onSettingsChange({ ...settings, backgroundColor: bg });
  };

  const handlePaddingChange = (e) => {
    const val = parseInt(e.target.value, 10);
    onSettingsChange({ ...settings, iconPadding: isNaN(val) ? 0 : val });
  };

  const handleOgChange = (key, val) => {
    onSettingsChange({
      ...settings,
      ogSettings: {
        ...(settings.ogSettings || {}),
        [key]: val,
      },
    });
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs mb-8">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-base font-black text-gray-900">
          <FaSlidersH className="text-orange-500" />
          <span>Asset Customization Settings</span>
        </div>
        <span className="text-xs font-bold text-gray-400">Live Config</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Icon Background Color */}
        <div>
          <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FaPalette className="text-amber-500" />
            <span>Icon Background</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBgChange('transparent')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                settings.backgroundColor === 'transparent'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-gray-300 checkerboard-bg" />
              <span>Transparent</span>
            </button>

            <button
              type="button"
              onClick={() => handleBgChange('#ffffff')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                settings.backgroundColor === '#ffffff'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white border border-gray-300" />
              <span>White</span>
            </button>

            <button
              type="button"
              onClick={() => handleBgChange('#000000')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                settings.backgroundColor === '#000000'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black border border-gray-400" />
              <span>Black</span>
            </button>

            {/* Custom Color Input */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
              <input
                type="color"
                value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor}
                onChange={(e) => handleBgChange(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                title="Choose custom background color"
              />
              <span className="text-[11px] font-mono font-bold text-gray-600">
                {settings.backgroundColor === 'transparent' ? 'Custom' : settings.backgroundColor}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Icon Padding */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaCompress className="text-orange-500" />
              <span>Icon Padding</span>
            </label>
            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/80">
              {settings.iconPadding || 0}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={settings.iconPadding || 0}
            onChange={handlePaddingChange}
            className="w-full accent-orange-500 cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
          <p className="text-[11px] text-gray-400 font-medium mt-1">
            Adds inner margin around logo inside square icon frames (16px to 512px).
          </p>
        </div>
      </div>

      {/* 3. Advanced Open Graph Layout Settings (Collapsible) */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setOgExpanded(!ogExpanded)}
          className="w-full flex items-center justify-between text-xs font-extrabold text-gray-800 hover:text-orange-600 transition-colors py-1"
        >
          <span className="flex items-center gap-2">
            <FaExpand className="text-amber-500" />
            <span>Open Graph Image Layout Settings</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
              1200 × 630
            </span>
          </span>
          <FaChevronDown
            size={12}
            className={`transition-transform duration-200 ${ogExpanded ? 'rotate-180 text-orange-500' : ''}`}
          />
        </button>

        {ogExpanded && (
          <div className="mt-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in text-xs">
            {/* Dimensions Display */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Canvas Size</label>
              <div className="font-mono font-bold text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                1200 × 630 px
              </div>
            </div>

            {/* Logo Fit */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Logo Fit</label>
              <select
                value={settings.ogSettings?.logoFit || 'contain'}
                onChange={(e) => handleOgChange('logoFit', e.target.value)}
                className="w-full font-bold text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-xl outline-none focus:border-orange-500"
              >
                <option value="contain">Contain (Preserve Aspect)</option>
                <option value="cover">Cover (Fill Canvas)</option>
              </select>
            </div>

            {/* Logo Size % */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Logo Size</label>
                <span className="font-extrabold text-orange-600">
                  {settings.ogSettings?.logoSizePercent || 70}%
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                step="5"
                value={settings.ogSettings?.logoSizePercent || 70}
                onChange={(e) => handleOgChange('logoSizePercent', parseInt(e.target.value, 10))}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg mt-1"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Position</label>
              <select
                value={settings.ogSettings?.position || 'center'}
                onChange={(e) => handleOgChange('position', e.target.value)}
                className="w-full font-bold text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-xl outline-none focus:border-orange-500"
              >
                <option value="center">Center</option>
                <option value="top">Top Centered</option>
                <option value="bottom">Bottom Centered</option>
                <option value="left">Left Centered</option>
                <option value="right">Right Centered</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Regenerate Button */}
      <div className="mt-4 text-right">
        <button
          type="button"
          onClick={onRegenerate}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md transition-all active:scale-95"
        >
          Apply & Regenerate Assets
        </button>
      </div>
    </div>
  );
}

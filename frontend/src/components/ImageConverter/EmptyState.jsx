import React from 'react';
import { FaShieldAlt, FaBolt, FaBan, FaLayerGroup, FaExchangeAlt } from 'react-icons/fa';

export default function EmptyState({ fromFormat, toFormat }) {
  const fromUpper = fromFormat ? fromFormat.toUpperCase() : null;
  const toUpper = toFormat ? toFormat.toUpperCase() : null;

  const features = [
    {
      icon: FaShieldAlt,
      title: '100% Private & Local',
      description: `Your ${fromUpper || 'image'} files never leave your device. All processing runs directly in your browser using HTML5 Canvas APIs.`,
    },
    {
      icon: FaBolt,
      title: 'Blazing Fast Performance',
      description: `No server upload wait times. Convert dozens of high-resolution ${fromUpper || 'image'} files instantly in parallel.`,
    },
    {
      icon: FaBan,
      title: 'No Watermarks or Fees',
      description: `Clean, production-ready ${toUpper || 'converted'} outputs with zero watermarks, zero hidden fees, and no sign-up required.`,
    },
    {
      icon: FaLayerGroup,
      title: 'Batch & ZIP Export',
      description: `Convert multiple ${fromUpper || ''} files simultaneously and download all outputs in a single organized ZIP archive.`,
    },
  ];

  return (
    <div className="mt-12 text-center animate-slide-up">
      <h3 className="text-xl font-extrabold text-gray-900 mb-6">
        {fromUpper && toUpper
          ? `Why use FileCooks ${fromUpper} to ${toUpper} Converter?`
          : 'Why use FileCooks Image Converter?'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="bg-white/90 backdrop-blur-sm border border-gray-200/90 rounded-3xl p-6 text-left shadow-2xs hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gradient-to-tr group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                <Icon size={20} />
              </div>
              <h4 className="text-sm font-extrabold text-gray-900 mb-1.5">{f.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{f.description}</p>
            </div>
          );
        })}
      </div>

      {/* Format Information Card */}
      <div className="mt-10 p-6 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 rounded-3xl border border-orange-200/80 max-w-3xl mx-auto text-left shadow-2xs">
        <h4 className="text-sm font-extrabold text-orange-950 mb-3 flex items-center gap-2">
          <FaExchangeAlt className="text-orange-500" />
          <span>
            {fromUpper && toUpper
              ? `${fromUpper} to ${toUpper} Conversion Details`
              : 'Supported Conversion Matrix'}
          </span>
        </h4>

        {fromUpper && toUpper ? (
          <div className="bg-white/90 p-4 rounded-2xl border border-orange-100 text-xs text-gray-700 leading-relaxed space-y-2">
            <p>
              <strong>Source Format:</strong> {fromUpper} (Portable Network Graphics / Image Format)
            </p>
            <p>
              <strong>Target Format:</strong> {toUpper} (Optimized Export Image)
            </p>
            <p className="text-gray-500">
              {fromUpper === 'PNG' && toUpper === 'JPG'
                ? 'Note: PNG images with transparent backgrounds will automatically have alpha channel transparent areas filled with your chosen solid background color (default is White).'
                : `Converts your ${fromUpper} files cleanly into ${toUpper} format locally in your web browser with adjustable compression quality.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-700 font-medium">
            <div className="bg-white/90 p-3 rounded-2xl border border-orange-100/90 shadow-2xs hover:scale-[1.02] transition-transform">
              <strong className="text-orange-600">PNG →</strong> JPG, WebP, BMP
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-orange-100/90 shadow-2xs hover:scale-[1.02] transition-transform">
              <strong className="text-orange-600">JPG →</strong> PNG, WebP, BMP
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-orange-100/90 shadow-2xs hover:scale-[1.02] transition-transform">
              <strong className="text-orange-600">WebP →</strong> JPG, PNG, BMP
            </div>
            <div className="bg-white/90 p-3 rounded-2xl border border-orange-100/90 shadow-2xs hover:scale-[1.02] transition-transform">
              <strong className="text-orange-600">BMP / GIF / SVG →</strong> JPG, PNG, WebP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

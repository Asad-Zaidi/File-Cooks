import React from 'react';
import AssetPreviewCard from './AssetPreviewCard';
import { FaShareAlt, FaMobileAlt, FaGlobe } from 'react-icons/fa';


/**
 * Grid layout for previewing all generated assets
 */
export default function AssetPreviewGrid({ assets, onDownloadSingle }) {
  if (!assets || assets.length === 0) return null;

  const favicons = assets.filter((a) => a.category === 'favicon');
  const appleAndPwa = assets.filter((a) => a.category === 'apple' || a.category === 'pwa');
  const social = assets.filter((a) => a.category === 'social');

  return (
    <div className="space-y-8 animate-fade-in mb-10">
      {/* 1. Favicons Section */}
      {favicons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-200/80 pb-2 mb-4">
            <FaGlobe className="text-orange-500" />
            <span>Standard Favicons & Browser Icons</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {favicons.map((asset) => (
              <AssetPreviewCard key={asset.id} asset={asset} onDownload={onDownloadSingle} />
            ))}
          </div>
        </div>
      )}

      {/* 2. Apple & PWA App Icons Section */}
      {appleAndPwa.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-200/80 pb-2 mb-4">
            <FaMobileAlt className="text-amber-500" />
            <span>Apple Touch & PWA App Icons</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {appleAndPwa.map((asset) => (
              <AssetPreviewCard key={asset.id} asset={asset} onDownload={onDownloadSingle} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Open Graph Social Image Section */}
      {social.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-200/80 pb-2 mb-4">
            <FaShareAlt className="text-emerald-500" />
            <span>Open Graph Social Card Image (1200 × 630)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {social.map((asset) => (
              <AssetPreviewCard key={asset.id} asset={asset} onDownload={onDownloadSingle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

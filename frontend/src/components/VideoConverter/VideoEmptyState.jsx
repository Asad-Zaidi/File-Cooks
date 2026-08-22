import React from 'react';
import { Link } from 'react-router-dom';
import { FaVideo, FaBolt, FaShieldAlt, FaArrowRight, FaFilm } from 'react-icons/fa';
import { popularVideoConversions, popularVideoToAudioConversions } from '../../services/videoConversionsConfig';

export default function VideoEmptyState({ mode = 'convert' }) {
  const presets = mode === 'extract-audio' ? popularVideoToAudioConversions : popularVideoConversions;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center mb-4">
            <FaVideo size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">Real FFmpeg Engine</h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Every conversion runs through a real FFmpeg subprocess on the server, with only the containers
            and codecs this build actually supports ever offered to you.
          </p>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-600 flex items-center justify-center mb-4">
            <FaBolt size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">Live Progress & Cancel</h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Progress is calculated from FFmpeg's own encode timestamps — never faked. Cancel any running
            job instantly, or convert a whole batch at once.
          </p>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-4">
            <FaShieldAlt size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">Private & Temporary</h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Uploaded videos and converted outputs are automatically purged from the server after a short
            retention window. No watermarks, no branding added.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <FaFilm className="text-orange-500" />
              <span>{mode === 'extract-audio' ? 'Popular Video → Audio Conversions' : 'Popular Video Conversions'}</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Jump straight to a common conversion pair.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {presets.filter(Boolean).map((preset) => (
            <Link
              key={preset.slug}
              to={preset.path}
              className="p-3.5 rounded-2xl border border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-left group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-gray-900 group-hover:text-orange-600 transition-colors">{preset.name}</span>
                  <FaArrowRight size={10} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-normal line-clamp-2">{preset.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

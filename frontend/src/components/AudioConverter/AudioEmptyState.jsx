import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaHeadphones,
  FaBolt,
  FaShieldAlt,
  FaArrowRight,
  FaMusic,
} from 'react-icons/fa';

const popularConversions = [
  { from: 'wav', to: 'mp3', label: 'WAV to MP3', desc: 'Shrink uncompressed studio WAV to universal MP3' },
  { from: 'm4a', to: 'mp3', label: 'M4A to MP3', desc: 'Convert Apple Voice Memos & AAC to MP3' },
  { from: 'flac', to: 'mp3', label: 'FLAC to MP3', desc: 'Convert lossless FLAC to portable high-bitrate MP3' },
  { from: 'mp3', to: 'wav', label: 'MP3 to WAV', desc: 'Decompress MP3 to uncompressed 16-bit PCM WAV' },
  { from: 'flac', to: 'wav', label: 'FLAC to WAV', desc: 'Bit-for-bit lossless conversion between master formats' },
  { from: 'ogg', to: 'mp3', label: 'OGG to MP3', desc: 'Convert game & open-source audio to standard MP3' },
  { from: 'opus', to: 'mp3', label: 'Opus to MP3', desc: 'Transcode modern voice & chat recordings to MP3' },
  { from: 'mp3', to: 'aac', label: 'MP3 to AAC', desc: 'Convert MP3 to modern high-efficiency AAC stream' },
];

export default function AudioEmptyState({ fromFormat, toFormat }) {
  return (
    <div className="space-y-12">
      {/* 3 Core Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center mb-4">
            <FaHeadphones size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">
            Studio-Grade Fidelity
          </h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Lossless and high-bitrate audio transcoding powered by PyAV and FFmpeg. Supports 320 kbps bitrates, 96 kHz sample rates, and PCM 16-bit encoding.
          </p>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-600 flex items-center justify-center mb-4">
            <FaBolt size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">
            Parallel Batch Processing
          </h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Convert dozens of audio files simultaneously. Preview tracks with the interactive built-in audio player and download all converted songs in a single ZIP.
          </p>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs hover:border-orange-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-4">
            <FaShieldAlt size={22} />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">
            Private & Temporary
          </h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            Your audio files are strictly transcoded in memory and purged automatically. No logs or audio streams are permanently stored or shared.
          </p>
        </div>
      </div>

      {/* Popular Audio Conversion Presets */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <FaMusic className="text-orange-500" />
              <span>Popular Audio Conversions</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Quickly switch to popular source & target audio configurations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {popularConversions.map((preset) => {
            const isCurrent =
              fromFormat?.toLowerCase() === preset.from && toFormat?.toLowerCase() === preset.to;
            return (
              <Link
                key={`${preset.from}-${preset.to}`}
                to={`/audio?from=${preset.from}&to=${preset.to}`}
                className={`p-3.5 rounded-2xl border transition-all text-left group flex flex-col justify-between ${
                  isCurrent
                    ? 'border-orange-500 bg-orange-50/80 shadow-xs'
                    : 'border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-gray-900 group-hover:text-orange-600 transition-colors">
                      {preset.label}
                    </span>
                    <FaArrowRight
                      size={10}
                      className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium leading-normal line-clamp-2">
                    {preset.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                  <span className="uppercase text-orange-600">{preset.from}</span>
                  <span>→</span>
                  <span className="uppercase text-amber-600">{preset.to}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

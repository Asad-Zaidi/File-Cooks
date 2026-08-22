import React, { useState } from 'react';
import {
  FaExchangeAlt,
  FaQuestionCircle,
  FaChevronDown,
  FaCheckCircle,
} from 'react-icons/fa';

const formatSpecsTable = [
  {
    format: 'MP3',
    extension: '.mp3',
    type: 'Lossy (MPEG-1 Layer 3)',
    useCase: 'Universal playback, music streaming, podcasts, mobile devices',
    compression: 'High (Adjustable 96k - 320 kbps)',
    lossless: false,
    compatibility: '100% Universal on all devices & players',
  },
  {
    format: 'WAV',
    extension: '.wav',
    type: 'Lossless Uncompressed PCM',
    useCase: 'Music mastering, audio editing, sound effects, broadcast',
    compression: 'None (Uncompressed CD quality)',
    lossless: true,
    compatibility: 'Universal across macOS, Windows, Linux & DAWs',
  },
  {
    format: 'M4A',
    extension: '.m4a',
    type: 'Lossy (AAC in MP4 container)',
    useCase: 'Apple ecosystem (iPhone, Mac, iTunes), YouTube audio, podcasts',
    compression: 'Very High (Superior quality to MP3 at same bitrate)',
    lossless: false,
    compatibility: 'Universal on Apple, Android, Windows & modern browsers',
  },
  {
    format: 'FLAC',
    extension: '.flac',
    type: 'Lossless Compressed',
    useCase: 'Archiving CD collections, audiophile listening, hi-res music',
    compression: 'Lossless (~50% smaller than raw WAV)',
    lossless: true,
    compatibility: 'High (Supported on Android, Windows 10/11, macOS, VLC)',
  },
  {
    format: 'AAC',
    extension: '.aac',
    type: 'Lossy (ADTS Audio Stream)',
    useCase: 'Digital broadcasting, streaming, Bluetooth audio (LDAC/AAC)',
    compression: 'High (Crisp high frequency preservation)',
    lossless: false,
    compatibility: 'Universal across mobile & web players',
  },
  {
    format: 'OGG',
    extension: '.ogg',
    type: 'Lossy (Vorbis in OGG container)',
    useCase: 'Game development (Unity, Unreal), open-source software, web audio',
    compression: 'High (Variable bitrate support)',
    lossless: false,
    compatibility: 'Modern browsers, Android, Linux, VLC',
  },
  {
    format: 'Opus',
    extension: '.opus',
    type: 'Lossy (Modern Hybrid Codec)',
    useCase: 'VoIP, voice chat (Discord, WhatsApp), real-time web streaming',
    compression: 'Ultra-High (Unmatched voice clarity at 64k-128k)',
    lossless: false,
    compatibility: 'Chrome, Firefox, Safari 15+, Android, VLC',
  },
  {
    format: 'AIFF',
    extension: '.aiff',
    type: 'Lossless Uncompressed PCM',
    useCase: 'Apple professional audio software (Logic Pro, Pro Tools)',
    compression: 'None (Big-endian PCM audio)',
    lossless: true,
    compatibility: 'macOS native, QuickTime, professional DAWs',
  },
  {
    format: 'AMR',
    extension: '.amr',
    type: 'Speech Narrowband Codec',
    useCase: 'Telephony voice memos, MMS audio clips, speech recording',
    compression: 'Ultra-High (Fixed 8,000 Hz mono recording)',
    lossless: false,
    compatibility: 'Cellular devices, media players with AMR decoder',
  },
  {
    format: 'AC3',
    extension: '.ac3',
    type: 'Dolby Digital Surround',
    useCase: 'Home cinema, DVD/Blu-ray audio, surround sound tracks',
    compression: 'High (Supports up to 5.1 multichannel audio)',
    lossless: false,
    compatibility: 'AV receivers, TV sets, VLC, home theater media boxes',
  },
];

const faqs = [
  {
    q: 'Which format gives the highest audio quality?',
    a: 'For zero quality loss, choose WAV, FLAC, or AIFF. WAV and AIFF are uncompressed raw PCM audio, while FLAC uses lossless compression (similar to a ZIP file for audio), giving bit-for-bit identical reproduction at half the file size.',
  },
  {
    q: 'What is the best format for everyday music and podcasts?',
    a: 'MP3 or M4A (AAC) are the most recommended formats. M4A offers slightly superior clarity at lower bitrates, while MP3 offers 100% universal playback on every legacy car stereo, MP3 player, and operating system.',
  },
  {
    q: 'What bitrate should I choose for MP3 conversions?',
    a: '320 kbps (Best) offers near-lossless clarity for high-end headphones. 192 kbps (High) is the golden standard for music streaming, while 128 kbps (Standard) is ideal for spoken-word podcasts and audiobooks.',
  },
  {
    q: 'What sample rate should I select?',
    a: '44,100 Hz (44.1 kHz) is the universal CD audio standard. 48,000 Hz (48 kHz) is the industry standard for video soundtracks, cinema, and modern game engines. Choosing "Auto" preserves your source file\'s native sample rate without resampling.',
  },
  {
    q: 'Are my uploaded audio files kept private and secure?',
    a: 'Yes, absolutely. Audio conversion is processed securely in temporary server memory using our high-speed PyAV/FFmpeg engine. All temporary files are purged automatically immediately after transcode or download.',
  },
  {
    q: 'Can I convert multiple audio files at the same time?',
    a: 'Yes! FileCooks supports multi-file parallel batch conversions. Upload your tracks, choose a global format (or custom formats per track), click "Convert All", and download the results as a single ZIP archive.',
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:bg-orange-50/40 transition-colors cursor-pointer"
      >
        <span>{question}</span>
        <FaChevronDown
          size={12}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>
      {open && (
        <div className="p-4 pt-0 text-xs text-gray-600 font-medium leading-relaxed border-t border-gray-100 bg-orange-50/10">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function AudioFormatGuide({ fromFormat, toFormat }) {
  return (
    <div className="mt-16 space-y-12">
      {/* Format Comparison Table */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
            <FaExchangeAlt className="text-orange-500" />
            <span>Audio Format Specifications & Comparison</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Understand the bitrates, compression types, and best use cases for every supported audio codec.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5">Format</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Best Used For</th>
                <th className="py-3 px-3.5">Compression</th>
                <th className="py-3 px-3.5">Lossless</th>
                <th className="py-3 px-3.5">Compatibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {formatSpecsTable.map((item) => (
                <tr key={item.format} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-black text-orange-600">{item.format}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {item.extension}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-gray-800 font-semibold">{item.type}</td>
                  <td className="py-3 px-3.5 text-gray-600 max-w-xs">{item.useCase}</td>
                  <td className="py-3 px-3.5 text-gray-600">{item.compression}</td>
                  <td className="py-3 px-3.5">
                    {item.lossless ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <FaCheckCircle size={11} />
                        <span>Yes</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 font-semibold">No (Lossy)</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-gray-500 text-[11px]">{item.compatibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pt-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
            <FaQuestionCircle className="text-orange-500" />
            <span>Audio Conversion FAQ</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Common questions about audio codecs, bitrates, sample rates, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-4xl mx-auto">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </div>
  );
}

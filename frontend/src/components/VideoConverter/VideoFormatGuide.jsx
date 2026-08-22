import React, { useState } from 'react';
import { FaExchangeAlt, FaQuestionCircle, FaChevronDown } from 'react-icons/fa';

const containerSpecsTable = [
  { format: 'MP4', extension: '.mp4', codecs: 'H.264, H.265, AV1', useCase: 'Universal playback, web, mobile, streaming', compatibility: 'Universal — every modern device & browser' },
  { format: 'MKV', extension: '.mkv', codecs: 'H.264, H.265, VP8/VP9, AV1', useCase: 'Archiving, multiple audio/subtitle tracks', compatibility: 'High — most desktop players, limited native mobile support' },
  { format: 'AVI', extension: '.avi', codecs: 'MPEG-4, H.264', useCase: 'Legacy compatibility, older editing software', compatibility: 'Wide on Windows, limited on mobile/web' },
  { format: 'MOV', extension: '.mov', codecs: 'H.264, H.265', useCase: 'Apple ecosystem, professional editing (Final Cut, Premiere)', compatibility: 'Native on macOS/iOS, well supported elsewhere' },
  { format: 'WEBM', extension: '.webm', codecs: 'VP8, VP9, AV1', useCase: 'Web video, HTML5 <video>, royalty-free streaming', compatibility: 'All modern browsers' },
  { format: 'FLV', extension: '.flv', codecs: 'H.264, MPEG-4', useCase: 'Legacy Flash-based streaming workflows', compatibility: 'Limited — mostly legacy players' },
  { format: 'WMV', extension: '.wmv', codecs: 'WMV, MPEG-4', useCase: 'Windows Media ecosystem, legacy playback', compatibility: 'Windows Media Player and compatible tools' },
  { format: 'MPEG-TS', extension: '.ts', codecs: 'H.264, H.265, MPEG-2', useCase: 'Broadcast, streaming transport, live segments', compatibility: 'Broadcast equipment, HLS streaming' },
  { format: '3GP', extension: '.3gp', codecs: 'H.264, MPEG-4', useCase: 'Older mobile devices, low-bandwidth video', compatibility: 'Legacy mobile phones and players' },
  { format: 'OGV', extension: '.ogv', codecs: 'Theora, VP8/VP9', useCase: 'Open-source, royalty-free web video', compatibility: 'Firefox, VLC, open-source players' },
];

const faqs = [
  { q: 'Which video format should I choose?', a: 'MP4 (H.264) is the safest universal choice for playback on virtually any device. Use WEBM for the smallest web-delivery file size, and MKV when you need multiple audio/subtitle tracks or maximum codec flexibility.' },
  { q: 'What does the quality preset actually change?', a: '"Fast" trades quality for encode speed; "Maximum" spends much more time per frame for the best result the chosen codec can produce. Re-encoding a low-quality source at "Maximum" cannot add detail that was never there — it can only avoid losing more.' },
  { q: 'Why is my resolution option unavailable for some formats?', a: 'The available video and audio codecs are read live from the server\'s FFmpeg installation — if a codec (e.g. AV1) isn\'t compiled into that build, it simply won\'t appear as an option.' },
  { q: 'What happens when I convert a video to an audio format?', a: 'Only the audio stream is processed — the video is never decoded. If your source audio already matches the target format, it\'s copied directly instead of being re-encoded, preserving full original quality.' },
  { q: 'Can I cancel a conversion in progress?', a: 'Yes — click "Cancel" on any card mid-conversion. The server terminates the FFmpeg process immediately and deletes the partial output; no orphaned files or processes are left behind.' },
  { q: 'Are my uploaded videos kept private?', a: 'Yes. Videos are processed in a temporary server directory and automatically deleted shortly after conversion completes (or immediately on failure/cancellation). No watermarks or branding are ever added.' },
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
        <FaChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-orange-500' : ''}`} />
      </button>
      {open && (
        <div className="p-4 pt-0 text-xs text-gray-600 font-medium leading-relaxed border-t border-gray-100 bg-orange-50/10">{answer}</div>
      )}
    </div>
  );
}

export default function VideoFormatGuide() {
  return (
    <div className="mt-16 space-y-12">
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
            <FaExchangeAlt className="text-orange-500" />
            <span>Video Container & Codec Guide</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">Common codecs, use cases and compatibility for every supported container.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5">Format</th>
                <th className="py-3 px-3.5">Common Codecs</th>
                <th className="py-3 px-3.5">Best Used For</th>
                <th className="py-3 px-3.5">Compatibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {containerSpecsTable.map((item) => (
                <tr key={item.format} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-black text-orange-600">{item.format}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">{item.extension}</span>
                  </td>
                  <td className="py-3 px-3.5 text-gray-800 font-semibold">{item.codecs}</td>
                  <td className="py-3 px-3.5 text-gray-600 max-w-xs">{item.useCase}</td>
                  <td className="py-3 px-3.5 text-gray-500 text-[11px]">{item.compatibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
            <FaQuestionCircle className="text-orange-500" />
            <span>Video Conversion FAQ</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">Common questions about codecs, quality presets, and privacy.</p>
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

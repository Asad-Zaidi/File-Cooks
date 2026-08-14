import React, { useState } from 'react';
import { FaCode, FaCopy, FaCheck, FaFileCode } from 'react-icons/fa';
import { generateHtmlHeadSnippet, generateManifestSnippet } from '../../services/codeSnippetService';

/**
 * Tabbed panel for copyable HTML Snippets and Web App Manifest
 */
export default function CodeSnippetPanel({ appName }) {
  const [activeTab, setActiveTab] = useState('html');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);

  const htmlSnippet = generateHtmlHeadSnippet();
  const manifestSnippet = generateManifestSnippet(appName || 'My Web App');

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'html') {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } else {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs mb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-base font-black text-gray-900">
          <FaCode className="text-orange-500" />
          <span>HTML Code & Web Manifest Snippets</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('html')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'html'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaCode size={12} />
            <span>HTML &lt;head&gt; Tags</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaFileCode size={12} />
            <span>manifest.webmanifest</span>
          </button>
        </div>
      </div>

      {/* Snippet Content */}
      {activeTab === 'html' ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">
              Copy and paste these tags into your HTML document&apos;s <code className="text-orange-600 font-mono font-bold">&lt;head&gt;</code> section:
            </p>

            <button
              type="button"
              onClick={() => copyToClipboard(htmlSnippet, 'html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                copiedHtml
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                  : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-xs'
              }`}
            >
              {copiedHtml ? <FaCheck size={12} /> : <FaCopy size={12} />}
              <span>{copiedHtml ? 'Copied HTML!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto leading-relaxed selection:bg-orange-500 selection:text-white">
            <code>{htmlSnippet}</code>
          </pre>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">
              Generated Web App Manifest configuration for Progressive Web Apps (PWA):
            </p>

            <button
              type="button"
              onClick={() => copyToClipboard(manifestSnippet, 'manifest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                copiedManifest
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                  : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-xs'
              }`}
            >
              {copiedManifest ? <FaCheck size={12} /> : <FaCopy size={12} />}
              <span>{copiedManifest ? 'Copied Manifest!' : 'Copy Manifest'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-gray-900 text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed selection:bg-orange-500 selection:text-white">
            <code>{manifestSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

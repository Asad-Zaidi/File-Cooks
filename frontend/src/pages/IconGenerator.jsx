import React, { useState } from 'react';
import {
  FaDownload,
  FaShieldAlt,
  FaQuestionCircle,
  FaChevronDown,
  FaMagic,
  FaCheckCircle,
} from 'react-icons/fa';

import AssetGeneratorUploader from '../components/IconGenerator/AssetGeneratorUploader';
import SourceImagePreview from '../components/IconGenerator/SourceImagePreview';
import AssetSettings from '../components/IconGenerator/AssetSettings';
import GenerationProgress from '../components/IconGenerator/GenerationProgress';
import AssetPreviewGrid from '../components/IconGenerator/AssetPreviewGrid';
import CodeSnippetPanel from '../components/IconGenerator/CodeSnippetPanel';
import { generateAllWebAssets } from '../services/assetGeneratorService';
import { downloadWebAssetsZip } from '../services/zipService';

export default function IconGenerator() {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceDetails, setSourceDetails] = useState(null);

  const [settings, setSettings] = useState({
    backgroundColor: 'transparent',
    iconPadding: 0,
    ogSettings: {
      width: 1200,
      height: 630,
      logoFit: 'contain',
      logoSizePercent: 70,
      position: 'center',
      backgroundColor: 'transparent',
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [assets, setAssets] = useState([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Trigger asset generation when sourceFile or settings change
  const handleGenerate = async (fileToUse = sourceFile, customSettings = settings) => {
    if (!fileToUse) return;

    setIsGenerating(true);
    setProgressInfo({ currentStep: 0, totalSteps: 10, percent: 0, currentFilename: 'Preparing...' });

    try {
      const result = await generateAllWebAssets({
        sourceFile: fileToUse,
        settings: customSettings,
        onProgress: (pInfo) => setProgressInfo(pInfo),
      });

      setAssets(result.assets);
      setSourceDetails(result.sourceDetails);
    } catch (err) {
      console.error('Failed to generate web assets:', err);
      alert(err.message || 'Error generating web assets. Please try another image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelected = (file) => {
    setSourceFile(file);
    handleGenerate(file, settings);
  };

  const handleReset = () => {
    setSourceFile(null);
    setSourceDetails(null);
    setAssets([]);
    setProgressInfo(null);
  };

  const handleDownloadSingle = (asset) => {
    if (!asset || !asset.blob) return;
    const url = URL.createObjectURL(asset.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadZip = async () => {
    if (!assets || assets.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const baseName = sourceFile?.name
        ? sourceFile.name.substring(0, sourceFile.name.lastIndexOf('.')) || 'my-logo'
        : 'my-logo';
      const cleanName = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const zipName = `${cleanName}-website-assets.zip`;

      await downloadWebAssetsZip(assets, zipName);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      alert('Failed to generate ZIP archive: ' + err.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-gray-50/80 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-8 lg:px-32">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/90 text-orange-600 text-xs font-black uppercase tracking-wider mb-4 border border-orange-200/80 shadow-2xs">
            <FaMagic size={14} className="text-amber-500" />
            <span>Favicons, PWA & Social Asset Engine</span>
          </div>


          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            Icon & Web Assets Generator
          </h1>

          <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed mb-6">
            Generate favicon, app icons, Apple Touch icons, and Open Graph assets from one single image.
          </p>

          {/* Privacy statement badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800 shadow-2xs">
            <FaShieldAlt className="text-emerald-500" size={14} />
            <span>Your image is processed locally in your browser. It is not uploaded to our servers.</span>
          </div>
        </div>

        {/* Upload Dropzone OR Source Image Preview */}
        {!sourceFile ? (
          <div className="mb-8">
            <AssetGeneratorUploader onFileSelected={handleFileSelected} isLoading={isGenerating} />
          </div>
        ) : (
          <div>
            {/* Source Image Summary Card */}
            <SourceImagePreview file={sourceFile} sourceDetails={sourceDetails} onReset={handleReset} />

            {/* Customization Settings Bar */}
            <AssetSettings
              settings={settings}
              onSettingsChange={setSettings}
              onRegenerate={() => handleGenerate(sourceFile, settings)}
            />

            {/* Real-time Generation Progress Bar */}
            <GenerationProgress
              isGenerating={isGenerating}
              progressInfo={progressInfo}
              completedCount={assets.length}
              totalCount={10}
            />

            {/* Top Toolbar Action for 1-Click ZIP Download */}
            {assets.length > 0 && !isGenerating && (
              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 shadow-lg text-white mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                <div>
                  <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                    <FaCheckCircle className="text-white" />
                    <span>All Web Assets Ready for Package Download</span>
                  </h3>
                  <p className="text-xs text-orange-100 font-medium mt-1">
                    Download 10 production-ready icons, favicons, ICO, and Open Graph files in 1 click.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isDownloadingZip}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-orange-600 hover:bg-orange-50 font-black text-sm shadow-md flex items-center justify-center gap-2.5 transition-all shrink-0 active:scale-95 disabled:opacity-75"
                >
                  <FaDownload size={15} />
                  <span>{isDownloadingZip ? 'Building ZIP Package...' : 'Download All Assets (ZIP)'}</span>
                </button>
              </div>
            )}

            {/* Generated Assets Grid */}
            <AssetPreviewGrid assets={assets} onDownloadSingle={handleDownloadSingle} />

            {/* Code Snippets & WebManifest Panel */}
            {assets.length > 0 && <CodeSnippetPanel appName={sourceDetails?.name} />}
          </div>
        )}

        {/* Feature Highlights when empty */}
        {!sourceFile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 text-center shadow-xs hover:border-orange-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 font-black">
                1
              </div>
              <h3 className="text-base font-black text-gray-900 mb-2">Multi-Format Favicons</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Generates 16×16, 32×32, 48×48, 64×64, and 128×128 PNG favicons plus standard multi-resolution <code className="text-orange-600 font-bold">favicon.ico</code>.
              </p>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 text-center shadow-xs hover:border-orange-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 font-black">
                2
              </div>
              <h3 className="text-base font-black text-gray-900 mb-2">Apple & PWA App Icons</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Creates 180×180 Apple Touch icons, 192×192 and 512×512 PWA icons with ready-to-use Web App Manifest snippet.
              </p>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-3xl p-6 text-center shadow-xs hover:border-orange-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 font-black">
                3
              </div>
              <h3 className="text-base font-black text-gray-900 mb-2">Open Graph Social Cards</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Exports 1200×630 Open Graph images for Twitter, Facebook, and LinkedIn previews with customizable backgrounds.
              </p>
            </div>
          </div>
        )}

        {/* FAQ Accordion Section */}
        <div className="mt-12 pt-12 border-t border-gray-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
              <FaQuestionCircle className="text-orange-500" />
              <span>Icon Generator FAQs</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <FaqCard
              question="What file formats can I upload?"
              answer="You can upload PNG, JPG/JPEG, WebP, BMP, GIF, TIFF, SVG, and any format supported by modern browsers."
            />
            <FaqCard
              question="Is the generated favicon.ico a real ICO file?"
              answer="Yes! FileCooks generates a genuine multi-resolution ICO file binary containing 16x16, 32x32, 48x48, and 64x64 icon frames. It is 100% compliant with standard ICO specifications."
            />
            <FaqCard
              question="Does this tool watermark my generated assets?"
              answer="No. All generated favicons, app icons, Open Graph images, and ZIP packages are 100% clean and watermark-free."
            />
            <FaqCard
              question="Are my logos uploaded to any server?"
              answer="No! The entire asset generation process runs locally in your web browser using HTML5 Canvas. Your logo never leaves your device."
            />
          </div>
        </div>

        {/* Footer Badge */}
        <div className="mt-12 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
          <FaShieldAlt className="text-emerald-500" />
          <span>FileCooks Client-Side Asset Generator Engine • Zero Server Storage</span>
        </div>
      </div>
    </div>
  );
}

function FaqCard({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      className="bg-white border border-gray-200/90 rounded-2xl p-4 cursor-pointer hover:border-orange-300 transition-all shadow-2xs"
    >
      <div className="flex items-center justify-between font-extrabold text-sm text-gray-900">
        <span>{question}</span>
        <FaChevronDown
          size={12}
          className={`text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </div>
      {open && (
        <p className="mt-2.5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2 font-medium">
          {answer}
        </p>
      )}
    </div>
  );
}

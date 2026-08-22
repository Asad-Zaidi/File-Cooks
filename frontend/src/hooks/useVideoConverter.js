import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VIDEO_CONFIG,
  cancelJob,
  downloadVideosAsZip,
  fetchConvertedBlob,
  pollJobUntilDone,
  submitExtractAudio,
  submitVideoConvert,
} from '../services/videoService';

let idCounter = 1;

const DEFAULT_CONVERT_SETTINGS = {
  videoCodec: '', audioCodec: '', videoBitrate: '', audioBitrate: '',
  resolution: 'original', customWidth: '', customHeight: '', fps: '', quality: 'balanced',
};

const DEFAULT_EXTRACT_SETTINGS = {
  bitrateKbps: 192, sampleRate: '', channels: '',
};

/**
 * @param {'convert'|'extract-audio'} mode
 * @param {string} initialTargetFormat
 */
export function useVideoConverter(mode = 'convert', initialTargetFormat = 'mp4') {
  const isExtract = mode === 'extract-audio';
  const defaultSettings = isExtract ? DEFAULT_EXTRACT_SETTINGS : DEFAULT_CONVERT_SETTINGS;

  const [items, setItems] = useState([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState(initialTargetFormat);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [globalSettings, setGlobalSettings] = useState({ ...defaultSettings });

  const isCancelledRef = useRef(false);

  const cleanupItem = (item) => {
    if (item.videoPreviewUrl) URL.revokeObjectURL(item.videoPreviewUrl);
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const videoEl = document.createElement('video');
      const url = URL.createObjectURL(file);
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        const duration = videoEl.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(duration) ? duration : null);
      };
      videoEl.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      videoEl.src = url;
    });
  };

  const addFiles = useCallback(
    async (newFiles) => {
      if (!newFiles || newFiles.length === 0) return;

      const validFiles = Array.from(newFiles).filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return VIDEO_CONFIG.supportedInputExtensions.includes(ext) || file.type.startsWith('video/');
      });
      if (validFiles.length === 0) return;

      const resolvedItems = await Promise.all(
        validFiles.map(async (file) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          const previewUrl = URL.createObjectURL(file);
          let duration = null;
          try {
            duration = await getVideoDuration(file);
          } catch {
            duration = null;
          }

          return {
            id: `video_${Date.now()}_${idCounter++}`,
            file,
            name: file.name,
            originalSize: file.size,
            inputFormat: ext,
            duration,
            videoPreviewUrl: previewUrl,
            targetFormat: globalTargetFormat,
            settings: { ...globalSettings },
            status: 'idle', // idle | converting | completed | error | cancelled
            progress: 0,
            resultBlob: null,
            resultSize: null,
            downloadUrl: null,
            jobId: null,
            errorMessage: null,
          };
        })
      );

      setItems((prev) => [...prev, ...resolvedItems].slice(0, VIDEO_CONFIG.maxBatchSize));
    },
    [globalTargetFormat, globalSettings]
  );

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) cleanupItem(target);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    items.forEach(cleanupItem);
    setItems([]);
    setBatchProgress(0);
    setIsProcessingBatch(false);
  }, [items]);

  const setItemTargetFormat = useCallback((id, newFormat) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, targetFormat: newFormat, status: item.status === 'completed' ? 'idle' : item.status }
          : item
      )
    );
  }, []);

  const setItemSettings = useCallback((id, updatedSettings) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, settings: { ...item.settings, ...updatedSettings } } : item))
    );
  }, []);

  const updateGlobalTargetFormat = useCallback((newFormat) => {
    setGlobalTargetFormat(newFormat);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetFormat: newFormat,
        status: item.status === 'completed' ? 'idle' : item.status,
      }))
    );
  }, []);

  const runConversion = useCallback(
    async (item) => {
      const submit = isExtract
        ? () =>
            submitExtractAudio(item.file, {
              outputFormat: item.targetFormat,
              bitrateKbps: item.settings?.bitrateKbps || null,
              sampleRate: item.settings?.sampleRate || null,
              channels: item.settings?.channels || null,
            })
        : () =>
            submitVideoConvert(item.file, {
              outputFormat: item.targetFormat,
              videoCodec: item.settings?.videoCodec || null,
              audioCodec: item.settings?.audioCodec || null,
              videoBitrate: item.settings?.videoBitrate || null,
              audioBitrate: item.settings?.audioBitrate || null,
              resolution: item.settings?.resolution || null,
              customWidth: item.settings?.customWidth || null,
              customHeight: item.settings?.customHeight || null,
              fps: item.settings?.fps || null,
              quality: item.settings?.quality || null,
            });

      const { job_id: jobId } = await submit();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, jobId } : i)));

      const finalJob = await pollJobUntilDone(jobId, {
        intervalMs: 1000,
        onProgress: (job) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: job.progress } : i)));
        },
      });

      if (finalJob.status === 'completed') {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'completed',
                  progress: 100,
                  resultSize: finalJob.output_size,
                  downloadUrl: finalJob.download_url,
                  errorMessage: null,
                }
              : i
          )
        );
      } else if (finalJob.status === 'cancelled') {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'cancelled', progress: 0 } : i)));
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', progress: 0, errorMessage: finalJob.error || 'Conversion failed' } : i
          )
        );
      }
    },
    [isExtract]
  );

  const convertSingleItem = useCallback(
    async (id) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'converting', progress: 0, errorMessage: null } : i)));

      let currentItem;
      setItems((prev) => {
        currentItem = prev.find((i) => i.id === id);
        return prev;
      });
      if (!currentItem) return;

      try {
        await runConversion(currentItem);
      } catch (err) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'error', progress: 0, errorMessage: err.message || 'Conversion failed' } : i))
        );
      }
    },
    [runConversion]
  );

  const cancelItem = useCallback(async (id) => {
    let currentItem;
    setItems((prev) => {
      currentItem = prev.find((i) => i.id === id);
      return prev;
    });
    if (!currentItem?.jobId) return;
    try {
      await cancelJob(currentItem.jobId);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  }, []);

  const convertAllItems = useCallback(async () => {
    if (items.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    isCancelledRef.current = false;
    setBatchProgress(0);

    const pending = items.filter((i) => i.status !== 'completed');
    let completedInBatch = items.length - pending.length;
    const totalToProcess = items.length;
    const poolSize = VIDEO_CONFIG.maxConcurrentConversions;
    let index = 0;

    const worker = async () => {
      while (index < pending.length && !isCancelledRef.current) {
        const item = pending[index++];
        if (!item) break;

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 0, errorMessage: null } : i)));

        try {
          await runConversion(item);
        } catch (err) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'error', progress: 0, errorMessage: err.message || 'Conversion failed' } : i))
          );
        } finally {
          completedInBatch++;
          setBatchProgress(Math.round((completedInBatch / totalToProcess) * 100));
        }
      }
    };

    const workers = Array.from({ length: Math.min(poolSize, pending.length) }, () => worker());
    await Promise.all(workers);
    setIsProcessingBatch(false);
  }, [items, isProcessingBatch, runConversion]);

  const downloadSingleItem = useCallback(
    async (id) => {
      const item = items.find((i) => i.id === id);
      if (!item || (!item.downloadUrl && !item.resultBlob)) return;

      try {
        let blob = item.resultBlob;
        if (!blob && item.downloadUrl) blob = await fetchConvertedBlob(item.downloadUrl);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          const origBase = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
          anchor.href = url;
          anchor.download = `${origBase}.${item.targetFormat}`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (err) {
        console.error('Download failed:', err);
      }
    },
    [items]
  );

  const downloadAllZip = useCallback(async () => {
    try {
      await downloadVideosAsZip(items, isExtract ? 'filecooks_extracted_audio.zip' : 'filecooks_converted_videos.zip');
    } catch (err) {
      console.error('ZIP download failed:', err);
    }
  }, [items, isExtract]);

  useEffect(() => {
    return () => {
      items.forEach(cleanupItem);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items,
    globalTargetFormat,
    isProcessingBatch,
    batchProgress,
    globalSettings,
    setGlobalSettings,
    addFiles,
    removeItem,
    clearAll,
    setItemTargetFormat,
    setItemSettings,
    updateGlobalTargetFormat,
    convertSingleItem,
    convertAllItems,
    cancelItem,
    downloadSingleItem,
    downloadAllZip,
  };
}

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AUDIO_CONFIG,
  AUDIO_FORMAT_SPECS,
  convertAudioFile,
  downloadAudioAsZip,
  fetchConvertedBlob,
} from '../services/audioService';

let idCounter = 1;

export function useAudioConverter(initialTargetFormat = 'mp3') {
  const [items, setItems] = useState([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState(initialTargetFormat || 'mp3');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [globalSettings, setGlobalSettings] = useState({
    quality: 'high',
    bitrate: '192k',
    sampleRate: '',
    channels: '',
  });

  const isCancelledRef = useRef(false);

  // Clean up audio object URLs when items are removed
  const cleanupItem = (item) => {
    if (item.audioPreviewUrl) {
      URL.revokeObjectURL(item.audioPreviewUrl);
    }
  };

  // Helper to extract audio duration in browser client-side
  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(duration) ? duration : null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      audio.src = url;
    });
  };

  // Add files to the queue
  const addFiles = useCallback(
    async (newFiles) => {
      if (!newFiles || newFiles.length === 0) return;

      const validFiles = Array.from(newFiles).filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return (
          AUDIO_CONFIG.supportedInputExtensions.includes(ext) ||
          file.type.startsWith('audio/') ||
          file.type === 'video/mp4' ||
          file.type === 'video/ogg'
        );
      });

      if (validFiles.length === 0) return;

      const newItemsPromises = validFiles.map(async (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        const previewUrl = URL.createObjectURL(file);
        let duration = null;
        try {
          duration = await getAudioDuration(file);
        } catch {
          duration = null;
        }

        return {
          id: `audio_${Date.now()}_${idCounter++}`,
          file,
          name: file.name,
          originalSize: file.size,
          inputFormat: ext,
          duration: duration,
          audioPreviewUrl: previewUrl,
          targetFormat: globalTargetFormat,
          settings: { ...globalSettings },
          status: 'idle', // 'idle' | 'converting' | 'completed' | 'error'
          progress: 0,
          resultBlob: null,
          resultSize: null,
          downloadUrl: null,
          conversionId: null,
          errorMessage: null,
        };
      });

      const resolvedItems = await Promise.all(newItemsPromises);

      setItems((prev) => {
        const combined = [...prev, ...resolvedItems];
        return combined.slice(0, AUDIO_CONFIG.maxBatchSize);
      });
    },
    [globalTargetFormat, globalSettings]
  );

  // Remove single item
  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) cleanupItem(target);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    items.forEach(cleanupItem);
    setItems([]);
    setBatchProgress(0);
    setIsProcessingBatch(false);
  }, [items]);

  // Update target format for a specific item
  const setItemTargetFormat = useCallback((id, newFormat) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const spec = AUDIO_FORMAT_SPECS[newFormat];
        return {
          ...item,
          targetFormat: newFormat,
          settings: {
            ...item.settings,
            bitrate: spec?.defaultBitrate || item.settings.bitrate,
          },
          status: item.status === 'completed' ? 'idle' : item.status,
        };
      })
    );
  }, []);

  // Update specific item settings
  const setItemSettings = useCallback((id, updatedSettings) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, settings: { ...item.settings, ...updatedSettings } } : item
      )
    );
  }, []);

  // Update global target format & propagate to non-completed items
  const updateGlobalTargetFormat = useCallback((newFormat) => {
    setGlobalTargetFormat(newFormat);
    const spec = AUDIO_FORMAT_SPECS[newFormat];
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetFormat: newFormat,
        settings: {
          ...item.settings,
          bitrate: spec?.defaultBitrate || item.settings.bitrate,
        },
        status: item.status === 'completed' ? 'idle' : item.status,
      }))
    );
  }, []);

  // Convert a single item
  const convertSingleItem = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'converting', progress: 20, errorMessage: null } : i))
    );

    let currentItem;
    setItems((prev) => {
      currentItem = prev.find((i) => i.id === id);
      return prev;
    });

    if (!currentItem) return;

    try {
      const opts = {
        outputFormat: currentItem.targetFormat,
        quality: currentItem.settings?.quality || null,
        bitrate: currentItem.settings?.bitrate || null,
        sampleRate: currentItem.settings?.sampleRate ? Number(currentItem.settings.sampleRate) : null,
        channels: currentItem.settings?.channels ? Number(currentItem.settings.channels) : null,
      };

      const result = await convertAudioFile(currentItem.file, opts);

      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          return {
            ...i,
            status: 'completed',
            progress: 100,
            resultSize: result.output_size,
            downloadUrl: result.download_url,
            conversionId: result.conversion_id,
            errorMessage: null,
          };
        })
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          return {
            ...i,
            status: 'error',
            progress: 0,
            errorMessage: err.message || 'Conversion failed',
          };
        })
      );
    }
  }, []);

  // Convert all items in batch
  const convertAllItems = useCallback(async () => {
    if (items.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    isCancelledRef.current = false;
    setBatchProgress(0);

    const pending = items.filter((i) => i.status !== 'completed');
    let completedInBatch = items.filter((i) => i.status === 'completed').length;
    const totalToProcess = items.length;

    // Worker pool for concurrency control
    const poolSize = AUDIO_CONFIG.maxConcurrentConversions;
    let index = 0;

    const worker = async () => {
      while (index < pending.length && !isCancelledRef.current) {
        const item = pending[index++];
        if (!item) break;

        // Mark item converting
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'converting', progress: 30, errorMessage: null } : i
          )
        );

        try {
          const opts = {
            outputFormat: item.targetFormat,
            quality: item.settings?.quality || null,
            bitrate: item.settings?.bitrate || null,
            sampleRate: item.settings?.sampleRate ? Number(item.settings.sampleRate) : null,
            channels: item.settings?.channels ? Number(item.settings.channels) : null,
          };

          const result = await convertAudioFile(item.file, opts);

          setItems((prev) =>
            prev.map((i) => {
              if (i.id !== item.id) return i;
              return {
                ...i,
                status: 'completed',
                progress: 100,
                resultSize: result.output_size,
                downloadUrl: result.download_url,
                conversionId: result.conversion_id,
                errorMessage: null,
              };
            })
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((i) => {
              if (i.id !== item.id) return i;
              return {
                ...i,
                status: 'error',
                progress: 0,
                errorMessage: err.message || 'Conversion failed',
              };
            })
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
  }, [items, isProcessingBatch]);

  // Download single item
  const downloadSingleItem = useCallback(async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item || (!item.downloadUrl && !item.resultBlob)) return;

    try {
      let blob = item.resultBlob;
      if (!blob && item.downloadUrl) {
        blob = await fetchConvertedBlob(item.downloadUrl);
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const origBase = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        const ext = item.targetFormat === 'aiff' ? 'aiff' : item.targetFormat;
        anchor.href = url;
        anchor.download = `${origBase}.${ext}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [items]);

  // Download all as ZIP
  const downloadAllZip = useCallback(async () => {
    try {
      await downloadAudioAsZip(items, 'filecooks_converted_audio.zip');
    } catch (err) {
      console.error('ZIP download failed:', err);
    }
  }, [items]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      items.forEach(cleanupItem);
    };
  }, [items]);

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
    downloadSingleItem,
    downloadAllZip,
  };
}

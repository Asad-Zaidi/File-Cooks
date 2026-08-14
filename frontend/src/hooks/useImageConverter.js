import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateImageFile } from '../utils/fileValidation';
import { loadImageElement } from '../utils/imageUtils';
import { convertImage, convertImagesToSinglePdf } from '../services/imageConverter';
import { downloadImagesAsZip } from '../services/zipService';
import { replaceFileExtension } from '../utils/filenameUtils';
import { CONVERTER_CONFIG } from '../services/converterConfig';

let fileIdCounter = 0;

/**
 * Custom Hook for managing Professional Image Converter state & pipeline.
 */
export function useImageConverter() {
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from')?.toLowerCase();
  const targetParam = searchParams.get('to')?.toLowerCase();

  const initialFormat =
    targetParam && CONVERTER_CONFIG.supportedOutputFormats.includes(targetParam)
      ? targetParam
      : CONVERTER_CONFIG.defaults.targetFormat;

  const [items, setItems] = useState([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState(initialFormat);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [globalSettings, setGlobalSettings] = useState({
    quality: CONVERTER_CONFIG.defaults.jpegQuality,
    backgroundColor: CONVERTER_CONFIG.defaults.backgroundColor,
    scalePercent: 100,
    rotation: 0,
  });

  const abortRef = useRef(false);

  // Sync globalTargetFormat whenever searchParams 'to' changes in URL
  useEffect(() => {
    const toParam = searchParams.get('to')?.toLowerCase();
    if (toParam && CONVERTER_CONFIG.supportedOutputFormats.includes(toParam)) {
      setGlobalTargetFormat(toParam);
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          targetFormat: toParam,
          status: item.status === 'completed' ? 'idle' : item.status,
        }))
      );
    }
  }, [searchParams]);

  /**
   * Adds uploaded files to the conversion queue after validation.
   */
  const addFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const newItems = [];

    // Enforce source format if specified in URL (e.g. ?from=png)
    const expectedFormat = searchParams.get('from')?.toLowerCase();

    for (const file of filesArray) {
      try {
        const { valid, error, format } = await validateImageFile(file, expectedFormat);
        const fileName = file.name || `image-${Date.now()}.${format || 'png'}`;

        const item = {
          id: `img-${Date.now()}-${++fileIdCounter}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: fileName,
          originalSize: file.size,
          originalFormat: format || 'png',
          targetFormat: globalTargetFormat,
          rotation: 0,
          scalePercent: 100,
          status: valid ? 'idle' : 'error',
          errorMessage: valid ? null : error,
          progress: 0,
          resultBlob: null,
          resultSize: null,
          resultDimensions: null,
          originalDimensions: null,
          thumbnailUrl: null,
        };

        if (valid) {
          try {
            const { width, height } = await loadImageElement(file);
            item.originalDimensions = { width, height };
          } catch (e) {
            console.warn('Failed to load dimensions:', e);
          }
          try {
            item.thumbnailUrl = URL.createObjectURL(file);
          } catch (e) {
            console.warn('Failed to create thumbnail URL:', e);
          }
        }

        newItems.push(item);
      } catch (err) {
        console.error('Error adding file to queue:', err);
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => {
        const combined = [...prev, ...newItems];
        return combined.slice(0, CONVERTER_CONFIG.maxBatchSize);
      });
    }
  }, [globalTargetFormat, searchParams]);

  /**
   * Removes a single item from the queue.
   */
  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      if (target?.resultBlobUrl) URL.revokeObjectURL(target.resultBlobUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  /**
   * Clears the entire queue.
   */
  const clearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      if (item.resultBlobUrl) URL.revokeObjectURL(item.resultBlobUrl);
    });
    setItems([]);
    setBatchProgress(0);
    setIsProcessingBatch(false);
  }, [items]);

  /**
   * Rotates a single item in queue by 90 degrees.
   */
  const rotateItem = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextRotation = ((item.rotation || 0) + 90) % 360;
          return {
            ...item,
            rotation: nextRotation,
            status: item.status === 'completed' ? 'idle' : item.status,
          };
        }
        return item;
      })
    );
  }, []);

  /**
   * Updates target format for an individual file.
   */
  const setItemTargetFormat = useCallback((id, format) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            targetFormat: format,
            status: item.status === 'completed' ? 'idle' : item.status,
          };
        }
        return item;
      })
    );
  }, []);

  /**
   * Updates target format for all files in queue.
   */
  const updateGlobalTargetFormat = useCallback((format) => {
    setGlobalTargetFormat(format);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetFormat: format,
        status: item.status === 'completed' ? 'idle' : item.status,
      }))
    );
  }, []);

  /**
   * Converts a single item.
   */
  const convertSingleItem = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'processing', errorMessage: null } : item
      )
    );

    let targetItem = null;
    setItems((prev) => {
      targetItem = prev.find((i) => i.id === id);
      return prev;
    });

    if (!targetItem || !targetItem.file) return;

    try {
      const result = await convertImage({
        inputFile: targetItem.file,
        outputFormat: targetItem.targetFormat,
        quality: globalSettings.quality,
        backgroundColor: globalSettings.backgroundColor,
        rotation: (targetItem.rotation || 0) + (globalSettings.rotation || 0),
        scalePercent: globalSettings.scalePercent,
      });

      const resultBlobUrl = URL.createObjectURL(result.blob);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              status: 'completed',
              resultBlob: result.blob,
              resultBlobUrl,
              resultSize: result.size,
              resultDimensions: { width: result.width, height: result.height },
              progress: 100,
            };
          }
          return item;
        })
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              status: 'error',
              errorMessage: err.message || 'Conversion failed.',
              progress: 0,
            };
          }
          return item;
        })
      );
    }
  }, [globalSettings]);

  /**
   * Converts all eligible items in batch with concurrency control.
   */
  const convertAllItems = useCallback(async () => {
    const pendingItems = items.filter((item) => item.status !== 'error' && item.file);
    if (pendingItems.length === 0) return;

    setIsProcessingBatch(true);
    setBatchProgress(0);
    abortRef.current = false;

    let completedCount = 0;
    const totalCount = pendingItems.length;

    const pool = [...pendingItems];
    const activeTasks = [];

    const processItem = async (item) => {
      if (abortRef.current) return;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i))
      );

      try {
        const result = await convertImage({
          inputFile: item.file,
          outputFormat: item.targetFormat,
          quality: globalSettings.quality,
          backgroundColor: globalSettings.backgroundColor,
          rotation: (item.rotation || 0) + (globalSettings.rotation || 0),
          scalePercent: globalSettings.scalePercent,
        });

        const resultBlobUrl = URL.createObjectURL(result.blob);

        setItems((prev) =>
          prev.map((i) => {
            if (i.id === item.id) {
              return {
                ...i,
                status: 'completed',
                resultBlob: result.blob,
                resultBlobUrl,
                resultSize: result.size,
                resultDimensions: { width: result.width, height: result.height },
                progress: 100,
              };
            }
            return i;
          })
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', errorMessage: err.message || 'Conversion failed.' }
              : i
          )
        );
      } finally {
        completedCount++;
        setBatchProgress(Math.round((completedCount / totalCount) * 100));
      }
    };

    while (pool.length > 0 || activeTasks.length > 0) {
      if (abortRef.current) break;

      while (
        pool.length > 0 &&
        activeTasks.length < CONVERTER_CONFIG.maxConcurrentConversions
      ) {
        const nextItem = pool.shift();
        const promise = processItem(nextItem).then(() => {
          activeTasks.splice(activeTasks.indexOf(promise), 1);
        });
        activeTasks.push(promise);
      }

      if (activeTasks.length > 0) {
        await Promise.race(activeTasks);
      }
    }

    setIsProcessingBatch(false);
  }, [items, globalSettings]);

  /**
   * Triggers individual file download.
   */
  const downloadSingleItem = useCallback((id) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.resultBlob) return;

    const fileName = replaceFileExtension(item.name, item.targetFormat);
    const url = item.resultBlobUrl || URL.createObjectURL(item.resultBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [items]);

  const [isGeneratingCombinedPdf, setIsGeneratingCombinedPdf] = useState(false);

  /**
   * Combines all valid queue images into a single multi-page PDF document and triggers download.
   */
  const downloadCombinedPdf = useCallback(async () => {
    const validItems = items.filter((item) => item.file && item.status !== 'error');
    if (validItems.length === 0) return;

    try {
      setIsGeneratingCombinedPdf(true);
      const pdfBlob = await convertImagesToSinglePdf({
        items: validItems,
        quality: globalSettings.quality,
        backgroundColor: globalSettings.backgroundColor,
        scalePercent: globalSettings.scalePercent,
        globalRotation: globalSettings.rotation,
      });

      const firstItemName = validItems[0]?.name || 'images';
      const baseName = replaceFileExtension(firstItemName, 'pdf').replace(/\.pdf$/i, '');
      const downloadName = validItems.length > 1 ? `${baseName}-combined.pdf` : `${baseName}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate combined PDF document:', err);
    } finally {
      setIsGeneratingCombinedPdf(false);
    }
  }, [items, globalSettings]);

  /**
   * Triggers ZIP download for all completed files.
   */
  const downloadAllZip = useCallback(async () => {
    const completed = items.filter((i) => i.status === 'completed' && i.resultBlob);
    if (completed.length === 0) return;

    await downloadImagesAsZip(completed, 'filecooks-converted-images.zip');
  }, [items]);

  return {
    items,
    globalTargetFormat,
    isProcessingBatch,
    batchProgress,
    globalSettings,
    isGeneratingCombinedPdf,
    fromFormat: fromParam,
    toFormat: targetParam,
    setGlobalSettings,
    addFiles,
    removeItem,
    clearAll,
    rotateItem,
    setItemTargetFormat,
    updateGlobalTargetFormat,
    convertSingleItem,
    convertAllItems,
    downloadSingleItem,
    downloadAllZip,
    downloadCombinedPdf,
  };
}

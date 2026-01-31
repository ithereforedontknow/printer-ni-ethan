import { useState, useCallback, useRef } from "react";
import type { Photo, PhotoSize } from "../utils/packingAlgorithms";

// Hook for managing photo state with undo/redo
export const usePhotoHistory = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [history, setHistory] = useState<Photo[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const addToHistory = useCallback(
    (newPhotos: Photo[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPhotos);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPhotos(newPhotos);
    },
    [history, historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPhotos(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPhotos(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    photos,
    setPhotos: addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};

// Hook for handling file uploads
export const useFileUpload = (
  onPhotosAdded: (photos: Photo[]) => void,
  defaultSize: PhotoSize,
) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MIN_RESOLUTION = 300; // Minimum DPI for print quality

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File ${file.name} exceeds 10MB limit` };
    }

    if (!file.type.startsWith("image/")) {
      return { valid: false, error: `File ${file.name} is not an image` };
    }

    return { valid: true };
  };

  const checkImageResolution = (
    img: HTMLImageElement,
    fileName: string,
  ): { adequate: boolean; warning?: string } => {
    const dpi = Math.min(img.width / 4, img.height / 6); // Rough estimate

    if (dpi < MIN_RESOLUTION) {
      return {
        adequate: false,
        warning: `${fileName} has low resolution (${Math.round(dpi)} DPI). Recommended: 300+ DPI for print quality.`,
      };
    }

    return { adequate: true };
  };

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      const newPhotos: Photo[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push(validation.error!);
          setUploadProgress(((i + 1) / totalFiles) * 100);
          continue;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          const img = await loadImage(dataUrl);

          // Check resolution
          const resolutionCheck = checkImageResolution(img, file.name);
          if (!resolutionCheck.adequate && resolutionCheck.warning) {
            warnings.push(resolutionCheck.warning);
          }

          newPhotos.push({
            id: Date.now() + Math.random(),
            name: file.name,
            dataUrl,
            size: defaultSize,
            rotation: 0,
            imgWidth: img.width,
            imgHeight: img.height,
            quantity: 1,
          });
        } catch (error) {
          errors.push(`Failed to load ${file.name}`);
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      setIsUploading(false);
      setUploadProgress(0);

      if (errors.length > 0) {
        console.error("Upload errors:", errors);
        alert("Some files failed to upload:\n" + errors.join("\n"));
      }

      if (warnings.length > 0) {
        console.warn("Upload warnings:", warnings);
      }

      if (newPhotos.length > 0) {
        onPhotosAdded(newPhotos);
      }
    },
    [defaultSize, onPhotosAdded],
  );

  return {
    handleFileUpload,
    isUploading,
    uploadProgress,
  };
};

// Helper function to read file as data URL
const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper function to load image
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (callbacks: {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        callbacks.onUndo?.();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        callbacks.onRedo?.();
      }

      // Delete or Backspace for delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        callbacks.onDelete?.();
      }

      // Ctrl/Cmd + A for select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        callbacks.onSelectAll?.();
      }
    },
    [callbacks],
  );

  return { handleKeyDown };
};

// Hook for local storage persistence
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error saving ${key} to localStorage:`, error);
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing ${key} from localStorage:`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

// Hook for debounced values
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  });

  return debouncedValue;
};

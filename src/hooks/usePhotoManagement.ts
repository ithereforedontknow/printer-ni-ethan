import { useState, useCallback } from "react";
import type { Photo, PhotoSize } from "../types";

interface UsePhotoHistoryReturn {
  photos: Photo[];
  setPhotos: (photos: Photo[] | ((prev: Photo[]) => Photo[])) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface UseFileUploadProps {
  onUploadComplete: (photos: Photo[]) => void;
  defaultSize: PhotoSize;
}

interface UseFileUploadReturn {
  handleFileUpload: (files: FileList | null) => void;
  isUploading: boolean;
  uploadProgress: number;
}

interface UseKeyboardShortcutsProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
}

// Photo History Hook
export const usePhotoHistory = (): UsePhotoHistoryReturn => {
  const [history, setHistory] = useState<Photo[][]>([[]]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setPhotos = useCallback(
    (newPhotos: Photo[] | ((prev: Photo[]) => Photo[])) => {
      setHistory((prev) => {
        const currentPhotos = prev[currentIndex];
        const nextPhotos =
          typeof newPhotos === "function"
            ? newPhotos(currentPhotos)
            : newPhotos;

        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push(nextPhotos);
        setCurrentIndex(newHistory.length - 1);

        return newHistory;
      });
    },
    [currentIndex],
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, history.length]);

  return {
    photos: history[currentIndex] || [],
    setPhotos,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
  };
};

// File Upload Hook
export const useFileUpload = ({
  onUploadComplete,
  defaultSize,
}: UseFileUploadProps): UseFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      const newPhotos: Photo[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        try {
          const dataUrl = await readFileAsDataURL(file);
          const dimensions = await getImageDimensions(dataUrl);

          newPhotos.push({
            id: Date.now() + i,
            name: file.name,
            dataUrl: dataUrl,
            imgWidth: dimensions.width,
            imgHeight: dimensions.height,
            originalDataUrl: dataUrl,
            size: defaultSize,
            sizes: [{ size: defaultSize, quantity: 1, rotation: 0 }],
            quantity: 1,
            rotation: 0,
          });

          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }

      setIsUploading(false);
      setUploadProgress(100);
      onUploadComplete(newPhotos);
    },
    [defaultSize, onUploadComplete],
  );

  return { handleFileUpload, isUploading, uploadProgress };
};

// Keyboard Shortcuts Hook
export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  onDelete,
  onSelectAll,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;

      if (isModifier && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo?.();
      } else if (isModifier && event.key === "y") {
        event.preventDefault();
        onRedo?.();
      } else if (isModifier && event.key === "Z") {
        event.preventDefault();
        onRedo?.();
      } else if (event.key === "Delete") {
        event.preventDefault();
        onDelete?.();
      } else if (isModifier && event.key === "a") {
        event.preventDefault();
        onSelectAll?.();
      }
    },
    [onUndo, onRedo, onDelete, onSelectAll],
  );

  return { handleKeyDown };
};

// Local Storage Hook
export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
};

// Helper functions
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getImageDimensions = (
  dataUrl: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
};

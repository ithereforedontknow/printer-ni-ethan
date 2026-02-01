import { useState, useCallback } from "react";
import type { Photo, CropPreset } from "../types";

interface UsePhotoEditingReturn {
  editingPhoto: Photo | null;
  cropMode: boolean;
  showCropPresets: boolean;
  startEditing: (photo: Photo) => void;
  cancelEditing: () => void;
  applyCrop: (photo: Photo, crop: Photo["crop"]) => Promise<Photo>;
  quickCrop: (photo: Photo, preset: CropPreset) => Promise<Photo>;
  resetCrop: (photo: Photo) => Photo;
  setCropMode: (mode: boolean) => void;
  setShowCropPresets: (show: boolean) => void;
  enhanceImage: (photo: Photo, adjustments: ImageAdjustments) => Promise<Photo>;
  applyFilter: (photo: Photo, filter: ImageFilter) => Promise<Photo>;
}

interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number; // 0 to 100
}

interface ImageFilter {
  name: string;
  matrix: number[]; // 4x4 color matrix
}

export const usePhotoEditing = (): UsePhotoEditingReturn => {
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [showCropPresets, setShowCropPresets] = useState(false);

  const startEditing = useCallback((photo: Photo) => {
    setEditingPhoto(photo);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingPhoto(null);
    setCropMode(false);
    setShowCropPresets(false);
  }, []);

  const applyCrop = useCallback(
    async (photo: Photo, crop: Photo["crop"]): Promise<Photo> => {
      if (!crop) return photo;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(photo);
            return;
          }

          // Set canvas dimensions to crop size
          canvas.width = Math.max(1, Math.round(crop.width));
          canvas.height = Math.max(1, Math.round(crop.height));

          // Ensure high quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw cropped portion
          ctx.drawImage(
            img,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          // Create new data URL with high quality
          const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

          // Update photo with original preserved
          const updatedPhoto = {
            ...photo,
            dataUrl: croppedDataUrl,
            imgWidth: canvas.width,
            imgHeight: canvas.height,
            crop,
          };

          resolve(updatedPhoto);
        };

        // Use original image for cropping to avoid quality loss
        img.src = photo.originalDataUrl || photo.dataUrl;
      });
    },
    [],
  );

  const quickCrop = useCallback(
    async (photo: Photo, preset: CropPreset): Promise<Photo> => {
      // If free form, return original
      if (preset.ratio === 0) {
        return {
          ...photo,
          crop: undefined,
          dataUrl: photo.originalDataUrl || photo.dataUrl,
          imgWidth: photo.imgWidth,
          imgHeight: photo.imgHeight,
        };
      }

      const aspectRatio = preset.ratio;
      const imgWidth = photo.imgWidth;
      const imgHeight = photo.imgHeight;

      let cropWidth, cropHeight;

      // Calculate crop to maintain aspect ratio
      const imageAspectRatio = imgWidth / imgHeight;

      if (imageAspectRatio > aspectRatio) {
        // Image is wider than desired ratio
        cropHeight = imgHeight;
        cropWidth = cropHeight * aspectRatio;
      } else {
        // Image is taller than desired ratio
        cropWidth = imgWidth;
        cropHeight = cropWidth / aspectRatio;
      }

      // Center the crop with integer values
      const cropX = Math.max(0, Math.round((imgWidth - cropWidth) / 2));
      const cropY = Math.max(0, Math.round((imgHeight - cropHeight) / 2));
      cropWidth = Math.min(cropWidth, imgWidth - cropX);
      cropHeight = Math.min(cropHeight, imgHeight - cropY);

      const crop = {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
        aspectRatio: preset.name,
      };

      return await applyCrop(photo, crop);
    },
    [applyCrop],
  );

  const resetCrop = useCallback((photo: Photo): Photo => {
    return {
      ...photo,
      dataUrl: photo.originalDataUrl || photo.dataUrl,
      imgWidth: photo.imgWidth,
      imgHeight: photo.imgHeight,
      crop: undefined,
    };
  }, []);

  const enhanceImage = useCallback(
    async (photo: Photo, adjustments: ImageAdjustments): Promise<Photo> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(photo);
            return;
          }

          canvas.width = photo.imgWidth;
          canvas.height = photo.imgHeight;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Apply enhancements (simplified)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Apply brightness and contrast
          const brightness = adjustments.brightness / 100;
          const contrast = adjustments.contrast / 100;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] = Math.min(255, Math.max(0, data[i] + brightness * 255));
            data[i + 1] = Math.min(
              255,
              Math.max(0, data[i + 1] + brightness * 255),
            );
            data[i + 2] = Math.min(
              255,
              Math.max(0, data[i + 2] + brightness * 255),
            );

            // Apply contrast
            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
          }

          ctx.putImageData(imageData, 0, 0);

          const enhancedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

          resolve({
            ...photo,
            dataUrl: enhancedDataUrl,
          });
        };

        img.src = photo.dataUrl;
      });
    },
    [],
  );

  const applyFilter = useCallback(async (photo: Photo): Promise<Photo> => {
    // Filter implementation would go here
    // For now, return original
    return photo;
  }, []);

  return {
    editingPhoto,
    cropMode,
    showCropPresets,
    startEditing,
    cancelEditing,
    applyCrop,
    quickCrop,
    resetCrop,
    setCropMode,
    setShowCropPresets,
    enhanceImage,
    applyFilter,
  };
};

import React, { useState, useRef, useEffect } from "react";
import { LayoutControls } from "./components/LayoutControls";
import { PhotoList } from "./components/PhotoList";
import { Preview } from "./components/Preview";
import { AdvancedSettingsModal } from "./components/AdvancedSettingsModal";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import {
  usePhotoHistory,
  useFileUpload,
  useKeyboardShortcuts,
  useLocalStorage,
} from "./hooks/usePhotoManagement";
import { usePhotoEditing } from "./hooks/usePhotoEditing";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import {
  packPhotos,
  getRotatedDimensions,
  type PackingAlgorithm,
  type PackedPhoto,
} from "./utils/packingAlgorithm";
import jsPDF from "jspdf";
import {
  type PaperSize,
  type LayoutSettings,
  PAPER_SIZES,
  PHOTO_SIZES,
  type PhotoSize,
} from "./types";

const App: React.FC = () => {
  // State management
  const { photos, setPhotos, undo, redo, canUndo, canRedo } = usePhotoHistory();
  const [paperSize, setPaperSize] = useState<PaperSize>(PAPER_SIZES[0]);
  const [layoutResult, setLayoutResult] = useState<PackedPhoto[] | null>(null);
  const [packingAlgorithm, setPackingAlgorithm] =
    useState<PackingAlgorithm>("maxrects");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(
    new Set(),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [settings, setSettings] = useLocalStorage<LayoutSettings>(
    "layout-settings",
    {
      marginTop: 0.25,
      marginRight: 0.25,
      marginBottom: 0.25,
      marginLeft: 0.25,
      spacing: 0.1,
      bleed: 0.125,
      dpi: 300,
      showCutLines: true,
      showSafeZone: false,
      showMargins: true,
      multiPage: true,
    },
  );

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { handleFileUpload, isUploading, uploadProgress } = useFileUpload({
    onUploadComplete: (newPhotos) => {
      // Initialize each new photo with default size
      const initializedPhotos = newPhotos.map((photo) => ({
        ...photo,
        sizes: [
          {
            size: PHOTO_SIZES[0],
            quantity: 1,
            rotation: 0,
          },
        ],
        originalDataUrl: photo.dataUrl,
      }));
      setPhotos([...photos, ...initializedPhotos]);
    },
    defaultSize: PHOTO_SIZES[0],
  });

  const { handleKeyDown } = useKeyboardShortcuts({
    onUndo: canUndo ? undo : undefined,
    onRedo: canRedo ? redo : undefined,
    onDelete: () => {
      if (selectedPhotoIds.size > 0) {
        handleBulkDelete();
      }
    },
    onSelectAll: () => {
      setSelectedPhotoIds(new Set(photos.map((p) => p.id)));
    },
  });

  const { applyCrop, quickCrop, resetCrop } = usePhotoEditing();

  const {
    draggedPhotoId,
    draggedOverPhotoId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    isTouchDevice,
  } = useDragAndDrop();

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    // PWA Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Photo size operations
  const updatePhotoSize = (
    photoId: number,
    sizeIndex: number,
    newSize: PhotoSize,
  ) => {
    setPhotos(
      photos.map((photo) => {
        if (photo.id !== photoId) return photo;

        const newSizes = [...photo.sizes];
        newSizes[sizeIndex] = {
          ...newSizes[sizeIndex],
          size: newSize,
        };

        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  const updatePhotoQuantity = (
    photoId: number,
    sizeIndex: number,
    quantity: number,
  ) => {
    setPhotos(
      photos.map((photo) => {
        if (photo.id !== photoId) return photo;

        const newSizes = [...photo.sizes];
        newSizes[sizeIndex] = {
          ...newSizes[sizeIndex],
          quantity: Math.max(1, quantity),
        };

        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  const rotatePhoto = (
    photoId: number,
    sizeIndex: number,
    rotation: number,
  ) => {
    setPhotos(
      photos.map((photo) => {
        if (photo.id !== photoId) return photo;

        const newSizes = [...photo.sizes];
        newSizes[sizeIndex] = {
          ...newSizes[sizeIndex],
          rotation: rotation % 360,
        };

        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  const addSizeToPhoto = (photoId: number, size: PhotoSize) => {
    setPhotos(
      photos.map((photo) => {
        if (photo.id !== photoId) return photo;

        return {
          ...photo,
          sizes: [
            ...photo.sizes,
            {
              size,
              quantity: 1,
              rotation: 0,
            },
          ],
        };
      }),
    );
  };

  const removeSizeFromPhoto = (photoId: number, sizeIndex: number) => {
    setPhotos(
      photos.map((photo) => {
        if (photo.id !== photoId) return photo;

        const newSizes = [...photo.sizes];
        if (newSizes.length <= 1) return photo; // Keep at least one size

        newSizes.splice(sizeIndex, 1);
        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  const removePhoto = (photoId: number) => {
    setPhotos(photos.filter((photo) => photo.id !== photoId));
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  // Crop operations
  const handleCropPhoto = async (photoId: number, cropData: any) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    try {
      const updatedPhoto = await applyCrop(photo, cropData);
      setPhotos(photos.map((p) => (p.id === photoId ? updatedPhoto : p)));
    } catch (error) {
      console.error("Error cropping photo:", error);
    }
  };

  const handleQuickCrop = async (photoId: number, preset: any) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    try {
      const updatedPhoto = await quickCrop(photo, preset);
      setPhotos(photos.map((p) => (p.id === photoId ? updatedPhoto : p)));
    } catch (error) {
      console.error("Error applying quick crop:", error);
    }
  };

  const handleResetCrop = (photoId: number) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const updatedPhoto = resetCrop(photo);
    setPhotos(photos.map((p) => (p.id === photoId ? updatedPhoto : p)));
  };

  // Bulk operations
  const handleBulkDelete = () => {
    setPhotos(photos.filter((photo) => !selectedPhotoIds.has(photo.id)));
    setSelectedPhotoIds(new Set());
  };

  const handleBulkSizeChange = (newSize: PhotoSize) => {
    setPhotos(
      photos.map((photo) => {
        if (!selectedPhotoIds.has(photo.id)) return photo;

        const newSizes = photo.sizes.map((sizeConfig) => ({
          ...sizeConfig,
          size: newSize,
        }));

        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  const handleBulkRotate = () => {
    setPhotos(
      photos.map((photo) => {
        if (!selectedPhotoIds.has(photo.id)) return photo;

        const newSizes = photo.sizes.map((sizeConfig) => ({
          ...sizeConfig,
          rotation: (sizeConfig.rotation + 90) % 360,
        }));

        return {
          ...photo,
          sizes: newSizes,
        };
      }),
    );
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId: number, shiftKey: boolean) => {
    if (shiftKey) {
      const newSet = new Set(selectedPhotoIds);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      setSelectedPhotoIds(newSet);
    } else {
      setSelectedPhotoIds(new Set([photoId]));
    }
  };

  // Generate layout - Updated for multiple sizes
  const generateLayout = async () => {
    if (photos.length === 0) return;

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Expand photos based on their sizes and quantities
    const expandedPhotos: Array<{
      id: number;
      dataUrl: string;
      size: PhotoSize;
      rotation: number;
      originalIndex: number;
    }> = [];

    photos.forEach((photo, index) => {
      photo.sizes.forEach((sizeConfig) => {
        for (let i = 0; i < sizeConfig.quantity; i++) {
          expandedPhotos.push({
            id: photo.id * 1000 + index * 10 + i, // Unique ID
            dataUrl: photo.dataUrl,
            size: sizeConfig.size,
            rotation: sizeConfig.rotation,
            originalIndex: index,
          });
        }
      });
    });

    const packed = packPhotos(expandedPhotos, packingAlgorithm, {
      paperWidth: paperSize.width,
      paperHeight: paperSize.height,
      marginTop: settings.marginTop,
      marginRight: settings.marginRight,
      marginBottom: settings.marginBottom,
      marginLeft: settings.marginLeft,
      spacing: settings.spacing,
      multiPage: settings.multiPage,
    });

    setLayoutResult(packed);
    setCurrentPage(0);
    setIsGenerating(false);
  };

  // Download PNG
  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `photo-layout-page-${currentPage + 1}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png", 1.0);
    link.click();
  };

  // Download PDF
  const downloadPDF = () => {
    if (!layoutResult) return;

    const pdf = new jsPDF({
      orientation:
        paperSize.width > paperSize.height ? "landscape" : "portrait",
      unit: "in",
      format: [paperSize.width, paperSize.height],
    });

    const totalPages = Math.max(...layoutResult.map((p) => p.pageIndex)) + 1;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage([paperSize.width, paperSize.height]);
      }

      const pagePhotos = layoutResult.filter(
        (photo) => photo.pageIndex === page,
      );
      pagePhotos.forEach((photo) => {
        const dims = getRotatedDimensions(photo);
        pdf.addImage(
          photo.dataUrl,
          "JPEG",
          photo.x,
          photo.y,
          dims.width,
          dims.height,
          undefined,
          "FAST",
          photo.rotation,
        );
      });
    }

    pdf.save(`photo-layout-${totalPages}-pages-${Date.now()}.pdf`);
  };

  // Calculate totals
  const totalPhotos = photos.reduce(
    (sum, photo) =>
      sum + photo.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0,
  );
  const packedPhotos = layoutResult ? layoutResult.length : 0;
  const totalPages = layoutResult
    ? Math.max(...layoutResult.map((p) => p.pageIndex)) + 1
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-8xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
          {/* Left Sidebar - Controls */}
          <div className="xl:col-span-1 space-y-4">
            <LayoutControls
              paperSize={paperSize}
              onPaperSizeChange={setPaperSize}
              packingAlgorithm={packingAlgorithm}
              onAlgorithmChange={setPackingAlgorithm}
              settings={settings}
              onSettingsChange={setSettings}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onGenerateLayout={generateLayout}
              hasPhotos={photos.length > 0}
              isGenerating={isGenerating}
              onShowAdvanced={() => setShowAdvanced(true)}
            />
          </div>

          {/* Center - Photo List */}
          <div className="xl:col-span-1">
            <PhotoList
              photos={photos}
              selectedPhotoIds={selectedPhotoIds}
              onPhotoSelect={togglePhotoSelection}
              onUpdatePhotoSize={updatePhotoSize}
              onUpdatePhotoQuantity={updatePhotoQuantity}
              onRotatePhoto={rotatePhoto}
              onAddSizeToPhoto={addSizeToPhoto}
              onRemoveSizeFromPhoto={removeSizeFromPhoto}
              onRemovePhoto={removePhoto}
              onBulkSizeChange={handleBulkSizeChange}
              onBulkRotate={handleBulkRotate}
              onBulkDelete={handleBulkDelete}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              fileInputRef={fileInputRef}
              onCropPhoto={handleCropPhoto}
              onQuickCrop={handleQuickCrop}
              onResetCrop={handleResetCrop}
              draggedPhotoId={draggedPhotoId}
              draggedOverPhotoId={draggedOverPhotoId}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              isTouchDevice={isTouchDevice}
            />
          </div>

          {/* Right - Preview */}
          <div className="xl:col-span-2">
            <Preview
              layoutResult={layoutResult}
              paperSize={paperSize}
              settings={settings}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onDownloadPNG={downloadPNG}
              onDownloadPDF={downloadPDF}
              canvasRef={canvasRef}
              totalPhotos={totalPhotos}
              packedPhotos={packedPhotos}
            />
          </div>
        </div>

        <KeyboardShortcutsHelp />

        <AdvancedSettingsModal
          isOpen={showAdvanced}
          onClose={() => setShowAdvanced(false)}
          settings={settings}
          onSettingsChange={setSettings}
        />
      </div>
    </div>
  );
};

export default App;

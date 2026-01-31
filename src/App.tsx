import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Image as ImageIcon,
  Trash2,
  Grid,
  RotateCw,
  Settings,
  Undo,
  Redo,
  Save,
  FolderOpen,
  Copy,
  Plus,
  Minus,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Layout,
  Printer,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  type Photo,
  type PhotoSize,
  type PackedPhoto,
  type PackingAlgorithm,
  packPhotos,
  expandPhotosByQuantity,
  getRotatedDimensions,
} from "./utils/packingAlgorithms";
import {
  usePhotoHistory,
  useFileUpload,
  useKeyboardShortcuts,
  useLocalStorage,
} from "./hooks/usePhotoManagement";

interface PaperSize {
  name: string;
  width: number;
  height: number;
}

interface LayoutSettings {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  spacing: number;
  bleed: number;
  dpi: number;
  showCutLines: boolean;
  showSafeZone: boolean;
  showMargins: boolean;
  multiPage: boolean;
}

const App: React.FC = () => {
  // Available photo sizes (in inches)
  const photoSizes: PhotoSize[] = [
    { name: "1x1", width: 1, height: 1 },
    { name: "2x2", width: 2, height: 2 },
    { name: "2x3", width: 2, height: 3 },
    { name: "Passport (2x2)", width: 2, height: 2 },
    { name: "3x5", width: 3, height: 5 },
    { name: "4x6", width: 4, height: 6 },
    { name: "Wallet (2.5x3.5)", width: 2.5, height: 3.5 },
    { name: "5x7", width: 5, height: 7 },
    { name: "8x10", width: 8, height: 10 },
  ];

  // Paper sizes
  const paperSizes: PaperSize[] = [
    { name: "A4 (11.7x8.3)", width: 11.7, height: 8.3 },
    { name: "Letter (11x8.5)", width: 11, height: 8.5 },
    { name: "4R (6x4)", width: 6, height: 4 },
    { name: "5R (7x5)", width: 7, height: 5 },
    { name: "8R (10x8)", width: 10, height: 8 },
    { name: "A3 (16.5x11.7)", width: 16.5, height: 11.7 },
  ];

  // State management
  const { photos, setPhotos, undo, redo, canUndo, canRedo } = usePhotoHistory();
  const [paperSize, setPaperSize] = useState<PaperSize>(paperSizes[0]);
  const [layoutResult, setLayoutResult] = useState<PackedPhoto[] | null>(null);
  const [packingAlgorithm, setPackingAlgorithm] =
    useState<PackingAlgorithm>("maxrects");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(
    new Set(),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Layout settings with localStorage persistence
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload hook
  const { handleFileUpload, isUploading, uploadProgress } = useFileUpload(
    (newPhotos) => {
      setPhotos([...photos, ...newPhotos]);
    },
    photoSizes[0],
  );

  // Keyboard shortcuts
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

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown as any);
    return () => window.removeEventListener("keydown", handleKeyDown as any);
  }, [handleKeyDown]);

  // Update photo size
  const updatePhotoSize = (photoId: number, newSize: PhotoSize) => {
    setPhotos(
      photos.map((photo) =>
        photo.id === photoId ? { ...photo, size: newSize } : photo,
      ),
    );
  };

  // Update photo quantity
  const updatePhotoQuantity = (photoId: number, quantity: number) => {
    setPhotos(
      photos.map((photo) =>
        photo.id === photoId
          ? { ...photo, quantity: Math.max(1, quantity) }
          : photo,
      ),
    );
  };

  // Rotate photo
  const rotatePhoto = (photoId: number) => {
    setPhotos(
      photos.map((photo) =>
        photo.id === photoId
          ? { ...photo, rotation: (photo.rotation + 90) % 360 }
          : photo,
      ),
    );
  };

  // Remove photo
  const removePhoto = (photoId: number) => {
    setPhotos(photos.filter((photo) => photo.id !== photoId));
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  // Bulk operations
  const handleBulkDelete = () => {
    setPhotos(photos.filter((photo) => !selectedPhotoIds.has(photo.id)));
    setSelectedPhotoIds(new Set());
  };

  const handleBulkSizeChange = (newSize: PhotoSize) => {
    setPhotos(
      photos.map((photo) =>
        selectedPhotoIds.has(photo.id) ? { ...photo, size: newSize } : photo,
      ),
    );
  };

  const handleBulkRotate = () => {
    setPhotos(
      photos.map((photo) =>
        selectedPhotoIds.has(photo.id)
          ? { ...photo, rotation: (photo.rotation + 90) % 360 }
          : photo,
      ),
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

  // Generate layout with debouncing
  const generateLayout = async () => {
    if (photos.length === 0) return;

    setIsGenerating(true);

    // Simulate async processing for large photo sets
    await new Promise((resolve) => setTimeout(resolve, 100));

    const expandedPhotos = expandPhotosByQuantity(photos);

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

  // Draw on canvas
  useEffect(() => {
    if (!layoutResult || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpi = settings.dpi;

    canvas.width = paperSize.width * dpi;
    canvas.height = paperSize.height * dpi;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bleed area
    if (settings.bleed > 0) {
      ctx.fillStyle = "#ffebee";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        settings.bleed * dpi,
        settings.bleed * dpi,
        canvas.width - settings.bleed * dpi * 2,
        canvas.height - settings.bleed * dpi * 2,
      );
    }

    // Draw margins
    if (settings.showMargins) {
      ctx.strokeStyle = "#90caf9";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        settings.marginLeft * dpi,
        settings.marginTop * dpi,
        (paperSize.width - settings.marginLeft - settings.marginRight) * dpi,
        (paperSize.height - settings.marginTop - settings.marginBottom) * dpi,
      );
      ctx.setLineDash([]);
    }

    // Draw safe zone
    if (settings.showSafeZone) {
      const safeZone = 0.125;
      ctx.strokeStyle = "#ffb74d";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(
        (settings.marginLeft + safeZone) * dpi,
        (settings.marginTop + safeZone) * dpi,
        (paperSize.width -
          settings.marginLeft -
          settings.marginRight -
          safeZone * 2) *
          dpi,
        (paperSize.height -
          settings.marginTop -
          settings.marginBottom -
          safeZone * 2) *
          dpi,
      );
      ctx.setLineDash([]);
    }

    // Filter photos for current page
    const currentPagePhotos = layoutResult.filter(
      (photo) => photo.pageIndex === currentPage,
    );

    // Draw photos
    currentPagePhotos.forEach((photo) => {
      const img = new Image();
      img.onload = () => {
        const dims = getRotatedDimensions(photo);
        const x = photo.x * dpi;
        const y = photo.y * dpi;
        const width = dims.width * dpi;
        const height = dims.height * dpi;

        ctx.save();

        // Apply rotation
        if (photo.rotation !== 0) {
          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate((photo.rotation * Math.PI) / 180);
          ctx.translate(-width / 2, -height / 2);
          ctx.drawImage(img, 0, 0, width, height);
        } else {
          ctx.drawImage(img, x, y, width, height);
        }

        ctx.restore();

        // Draw border
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw cut lines if enabled
        if (settings.showCutLines) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(x, y, width, height);

          // Corner marks
          const markLength = 10;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(x - markLength, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y - markLength);
          ctx.stroke();

          // Top-right
          ctx.beginPath();
          ctx.moveTo(x + width + markLength, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y - markLength);
          ctx.stroke();

          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(x - markLength, y + height);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x, y + height + markLength);
          ctx.stroke();

          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(x + width + markLength, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height + markLength);
          ctx.stroke();

          ctx.setLineDash([]);
        }

        // Draw label
        ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
        ctx.fillRect(x, y, Math.min(width, 180), 28);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px system-ui";

        let label = photo.size.name;
        if (photo.rotation !== 0) {
          label += ` (${photo.rotation}°)`;
        }

        ctx.fillText(label, x + 6, y + 19);
      };
      img.src = photo.dataUrl;
    });
  }, [layoutResult, paperSize, settings, currentPage]);

  // Download as PNG
  const downloadPNG = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = `photo-layout-page-${currentPage + 1}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png", 1.0);
    link.click();
  };

  // Download all pages as PDF
  const downloadPDF = () => {
    if (!canvasRef.current || !layoutResult) return;

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

        if (settings.showCutLines) {
          pdf.setDrawColor(239, 68, 68);
          pdf.setLineWidth(0.01);
          pdf.setLineDash([0.08, 0.04]);
          pdf.rect(photo.x, photo.y, dims.width, dims.height);
          pdf.setLineDash([]);
        }
      });
    }

    pdf.save(`photo-layout-${totalPages}-pages-${Date.now()}.pdf`);
  };

  // Save layout as JSON
  const saveLayout = () => {
    const layoutData = {
      photos,
      paperSize,
      settings,
      algorithm: packingAlgorithm,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(layoutData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `photo-layout-${Date.now()}.json`;
    link.click();
  };

  // Load layout from JSON
  const loadLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const layoutData = JSON.parse(event.target?.result as string);
        setPhotos(layoutData.photos || []);
        setPaperSize(layoutData.paperSize || paperSizes[0]);
        setSettings(layoutData.settings || settings);
        setPackingAlgorithm(layoutData.algorithm || "maxrects");
      } catch (error) {
        alert("Failed to load layout file");
      }
    };
    reader.readAsText(file);
  };

  const totalPhotos = photos.reduce(
    (sum, photo) => sum + (photo.quantity || 1),
    0,
  );
  const packedPhotos = layoutResult ? layoutResult.length : 0;
  const totalPages = layoutResult
    ? Math.max(...layoutResult.map((p) => p.pageIndex)) + 1
    : 0;
  const efficiency =
    packedPhotos > 0 ? ((packedPhotos / totalPhotos) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {/*<h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 mb-3 tracking-tight">
            Pang Print ni Ethan
          </h1>*/}
          {/*<p className="text-gray-600 text-lg font-medium">
            Professional multi-page photo layout generator with advanced packing
            algorithms
          </p>*/}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="xl:col-span-1 space-y-4">
            {/* Upload Section */}

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold mb-5 flex items-center justify-between text-gray-800">
                <div className="flex items-center gap-2">Layout</div>
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1.5"
                >
                  Advanced <Settings className="w-5 h-5 text-purple-600" />
                </button>
              </h2>

              {/* Paper Size */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Paper Size
                </label>
                <select
                  value={paperSize.name}
                  onChange={(e) =>
                    setPaperSize(
                      paperSizes.find((p) => p.name === e.target.value)!,
                    )
                  }
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                >
                  {paperSizes.map((size) => (
                    <option key={size.name} value={size.name}>
                      {size.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {paperSize.width}" × {paperSize.height}"
                </p>
              </div>

              {/* Algorithm */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Algorithm
                </label>
                <select
                  value={packingAlgorithm}
                  onChange={(e) =>
                    setPackingAlgorithm(e.target.value as PackingAlgorithm)
                  }
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                >
                  <option value="maxrects">MaxRects (Best)</option>
                  <option value="guillotine">Guillotine (Fast)</option>
                  <option value="shelf">Shelf (Simple)</option>
                </select>
              </div>

              {/* Quick margins preview / simple mode */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Margins (uniform quick-set)
                </label>
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  max="1"
                  value={settings.marginTop} // using top as representative
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSettings({
                      ...settings,
                      marginTop: val,
                      marginRight: val,
                      marginBottom: val,
                      marginLeft: val,
                    });
                  }}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium"
                  placeholder="Set all sides"
                />
                <p className="text-xs text-gray-500 mt-1">
                  change all four at once (advanced modal for individual
                  control)
                </p>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex-1 p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="flex-1 p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4 mx-auto" />
                </button>
              </div>

              {/*<div className="flex gap-2 mb-3">
                <button
                  onClick={saveLayout}
                  className="flex-1 p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <label className="flex-1 p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <FolderOpen className="w-4 h-4" />
                  Load
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadLayout}
                    className="hidden"
                  />
                </label>
              </div>*/}

              <button
                onClick={generateLayout}
                disabled={photos.length === 0 || isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-black hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-sm uppercase tracking-wide"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Grid className="w-5 h-5" />
                    Generate Layout
                  </>
                )}
              </button>
            </div>

            {showAdvanced && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-white px-6 pt-5 pb-3 flex items-center justify-between z-10">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-600" />
                      Advanced Settings
                    </h3>
                    <button
                      onClick={() => setShowAdvanced(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Detailed Margins */}
                    <div>
                      <label className="block text-base font-semibold text-gray-800 mb-3">
                        Individual Margins (inches)
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Top", key: "marginTop" },
                          { label: "Right", key: "marginRight" },
                          { label: "Bottom", key: "marginBottom" },
                          { label: "Left", key: "marginLeft" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label className="text-sm text-gray-600 mb-1.5 block">
                              {label}
                            </label>
                            <input
                              type="number"
                              step="0.01" // more precision in advanced mode
                              min="0"
                              max="2"
                              value={settings[key as keyof typeof settings]}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  [key]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* You can add more advanced options here later */}
                    {/* e.g. per-side bleed, rotation constraints, packing heuristics sliders, etc. */}

                    {/* DPI */}
                    <div className="mb-5">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Print DPI
                      </label>
                      <select
                        value={settings.dpi}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            dpi: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium"
                      >
                        <option value={150}>150 DPI (Preview)</option>
                        <option value={300}>300 DPI (Standard)</option>
                        <option value={600}>600 DPI (High Quality)</option>
                      </select>
                    </div>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Spacing
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="0.5"
                          value={settings.spacing}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              spacing: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Bleed
                        </label>
                        <input
                          type="number"
                          step="0.0625"
                          min="0"
                          max="0.25"
                          value={settings.bleed}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              bleed: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="pt-4 ">
                      <button
                        onClick={() => setShowAdvanced(false)}
                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                      >
                        Apply & Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Photo List */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Photos ({totalPhotos} total)
                </h2>
                {selectedPhotoIds.size > 0 && (
                  <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    {selectedPhotoIds.size} selected
                  </span>
                )}
              </div>
              <div className="bg-white rounded-2xl p-2">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-2 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200">
                    <Upload className="w-5 h-5 text-blue-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700">
                      Click to upload
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG (max 10MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </label>

                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Bulk Operations */}
              {selectedPhotoIds.size > 0 && (
                <div className="mb-4 p-3 bg-purple-50 rounded-xl border-2 border-purple-200">
                  <p className="text-xs font-bold text-purple-900 mb-2">
                    Bulk Actions
                  </p>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        const size = photoSizes.find(
                          (s) => s.name === e.target.value,
                        );
                        if (size) handleBulkSizeChange(size);
                      }}
                      className="flex-1 p-2 border-2 border-purple-300 rounded-lg text-sm font-medium"
                    >
                      <option value="">Change Size...</option>
                      {photoSizes.map((size) => (
                        <option key={size.name} value={size.name}>
                          {size.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkRotate}
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      title="Rotate selected"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto p-2">
                {photos.length === 0 ? (
                  <div className="text-center py-16">
                    <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">
                      No photos uploaded
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload photos to get started
                    </p>
                  </div>
                ) : (
                  photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={(e) =>
                        togglePhotoSelection(photo.id, e.shiftKey)
                      }
                      className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                        selectedPhotoIds.has(photo.id)
                          ? "border-purple-500 bg-purple-50 shadow-md"
                          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative flex-shrink-0">
                          <img
                            src={photo.dataUrl}
                            alt={photo.name}
                            className="w-14 h-14 object-cover rounded-lg shadow-sm"
                            style={{
                              transform: `rotate(${photo.rotation}deg)`,
                            }}
                          />
                          {photo.rotation !== 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
                              {photo.rotation}°
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {photo.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {photo.imgWidth} × {photo.imgHeight}px
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePhoto(photo.id);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Rotate"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(photo.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">
                            Size
                          </label>
                          <select
                            value={photo.size.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const size = photoSizes.find(
                                (s) => s.name === e.target.value,
                              );
                              if (size) updatePhotoSize(photo.id, size);
                            }}
                            className="w-full p-1.5 text-xs border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                          >
                            {photoSizes.map((size) => (
                              <option key={size.name} value={size.name}>
                                {size.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">
                            Quantity
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePhotoQuantity(
                                  photo.id,
                                  (photo.quantity || 1) - 1,
                                );
                              }}
                              className="p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={photo.quantity || 1}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                updatePhotoQuantity(
                                  photo.id,
                                  parseInt(e.target.value) || 1,
                                );
                              }}
                              className="w-full p-1.5 text-xs border-2 border-gray-200 rounded-lg text-center font-bold"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePhotoQuantity(
                                  photo.id,
                                  (photo.quantity || 1) + 1,
                                );
                              }}
                              className="p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right - Preview */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">Preview</h2>
                  {layoutResult && totalPages > 1 && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(0, currentPage - 1))
                        }
                        disabled={currentPage === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold text-gray-700">
                        Page {currentPage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage(
                            Math.min(totalPages - 1, currentPage + 1),
                          )
                        }
                        disabled={currentPage === totalPages - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {layoutResult && (
                  <div className="flex gap-2">
                    <button
                      onClick={downloadPNG}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors font-bold text-sm shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      PNG
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors font-bold text-sm shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                )}
              </div>

              {layoutResult && (
                <div className="mb-4 grid grid-cols-4 gap-3 text-center">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-200">
                    <p className="text-2xl font-black text-blue-700">
                      {packedPhotos}
                    </p>
                    <p className="text-xs font-bold text-blue-600">Photos</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border-2 border-green-200">
                    <p className="text-2xl font-black text-green-700">
                      {efficiency}%
                    </p>
                    <p className="text-xs font-bold text-green-600">
                      Efficiency
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border-2 border-purple-200">
                    <p className="text-2xl font-black text-purple-700">
                      {totalPages}
                    </p>
                    <p className="text-xs font-bold text-purple-600">Pages</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border-2 border-orange-200">
                    <p className="text-2xl font-black text-orange-700">
                      {totalPhotos - packedPhotos}
                    </p>
                    <p className="text-xs font-bold text-orange-600">Not Fit</p>
                  </div>
                </div>
              )}

              <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 overflow-auto">
                {!layoutResult ? (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <Layout className="w-20 h-20 mb-4 opacity-30" />
                    <p className="text-lg font-bold">No layout generated yet</p>
                    <p className="text-sm mt-1">
                      Upload photos and click "Generate Layout"
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto shadow-2xl rounded-lg border-4 border-white"
                      style={{ imageRendering: "high-quality" }}
                    />
                  </div>
                )}
              </div>

              {layoutResult && packedPhotos < totalPhotos && (
                <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4">
                  <p className="text-sm font-bold text-yellow-900">
                    ⚠️ {totalPhotos - packedPhotos} photo(s) could not fit.
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Try: larger paper size, smaller photo sizes, different
                    algorithm, or enable multi-page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
          <p className="text-sm font-bold mb-2">⌨️ Keyboard Shortcuts:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                Ctrl+Z
              </span>{" "}
              Undo
            </div>
            <div>
              <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                Ctrl+Y
              </span>{" "}
              Redo
            </div>
            <div>
              <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                Del
              </span>{" "}
              Delete Selected
            </div>
            <div>
              <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                Ctrl+A
              </span>{" "}
              Select All
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

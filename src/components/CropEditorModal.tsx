import React, { useState, useRef, useEffect } from "react";
import { X, Crop, Maximize2, Check } from "lucide-react";
import { type Photo, CROP_PRESETS } from "../types";

interface CropEditorModalProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (photo: Photo, crop: Photo["crop"]) => Promise<void>;
  onQuickCrop: (photo: Photo, preset: any) => Promise<void>;
  onReset: (photo: Photo) => Promise<void>;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  photo,
  isOpen,
  onClose,
  onApplyCrop,
  onReset,
}) => {
  const [crop, setCrop] = useState(
    photo.crop || {
      x: 0,
      y: 0,
      width: photo.imgWidth,
      height: photo.imgHeight,
      aspectRatio: "Free Form",
    },
  );

  const [selectedPreset, setSelectedPreset] = useState<string>("Free Form");
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<
    "move" | "nw" | "ne" | "sw" | "se" | null
  >(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate optimal scale for display
    const maxSize = 500;
    const displayScale = Math.min(
      maxSize / photo.imgWidth,
      maxSize / photo.imgHeight,
      1,
    );
    setScale(displayScale);

    canvas.width = photo.imgWidth * displayScale;
    canvas.height = photo.imgHeight * displayScale;

    // Draw image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw crop overlay
      drawCropOverlay(ctx, crop, displayScale);
    };
    img.src = photo.dataUrl;
  }, [isOpen, photo, crop]);

  const drawCropOverlay = (
    ctx: CanvasRenderingContext2D,
    crop: Photo["crop"],
    displayScale: number,
  ) => {
    if (!crop) return;

    const x = crop.x * displayScale;
    const y = crop.y * displayScale;
    const width = crop.width * displayScale;
    const height = crop.height * displayScale;

    // Draw semi-transparent overlay outside crop area
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Clear the crop area (shows original image)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // Draw crop border with shadow
    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical lines
    const v1 = x + width / 3;
    const v2 = x + (2 * width) / 3;
    ctx.beginPath();
    ctx.moveTo(v1, y);
    ctx.lineTo(v1, y + height);
    ctx.moveTo(v2, y);
    ctx.lineTo(v2, y + height);
    ctx.stroke();

    // Horizontal lines
    const h1 = y + height / 3;
    const h2 = y + (2 * height) / 3;
    ctx.beginPath();
    ctx.moveTo(x, h1);
    ctx.lineTo(x + width, h1);
    ctx.moveTo(x, h2);
    ctx.lineTo(x + width, h2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 12;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;

    const corners = [
      { x, y }, // top-left
      { x: x + width, y }, // top-right
      { x, y: y + height }, // bottom-left
      { x: x + width, y: y + height }, // bottom-right
    ];

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw aspect ratio info
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x + 10, y + 10, 100, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px system-ui";
    ctx.fillText(
      `${Math.round(crop.width)}×${Math.round(crop.height)}`,
      x + 15,
      y + 25,
    );
    ctx.fillText(crop.aspectRatio, x + 15, y + 40);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    // Check which part is being dragged
    const handleSize = 20;

    // Check corners first
    const corners = [
      { x: crop.x, y: crop.y, type: "nw" as const },
      { x: crop.x + crop.width, y: crop.y, type: "ne" as const },
      { x: crop.x, y: crop.y + crop.height, type: "sw" as const },
      { x: crop.x + crop.width, y: crop.y + crop.height, type: "se" as const },
    ];

    for (const corner of corners) {
      if (
        Math.abs(mouseX - corner.x) < handleSize &&
        Math.abs(mouseY - corner.y) < handleSize
      ) {
        setDragType(corner.type);
        setIsDragging(true);
        setDragStart({ x: mouseX, y: mouseY });
        return;
      }
    }

    // Check if inside crop area for moving
    if (
      mouseX >= crop.x &&
      mouseX <= crop.x + crop.width &&
      mouseY >= crop.y &&
      mouseY <= crop.y + crop.height
    ) {
      setDragType("move");
      setIsDragging(true);
      setDragStart({ x: mouseX - crop.x, y: mouseY - crop.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !dragType) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    let newCrop = { ...crop };

    switch (dragType) {
      case "move":
        newCrop.x = Math.max(
          0,
          Math.min(photo.imgWidth - crop.width, mouseX - dragStart.x),
        );
        newCrop.y = Math.max(
          0,
          Math.min(photo.imgHeight - crop.height, mouseY - dragStart.y),
        );
        break;

      case "nw":
        newCrop.width = crop.width + (crop.x - mouseX);
        newCrop.height = crop.height + (crop.y - mouseY);
        newCrop.x = mouseX;
        newCrop.y = mouseY;
        break;

      case "ne":
        newCrop.width = mouseX - crop.x;
        newCrop.height = crop.height + (crop.y - mouseY);
        newCrop.y = mouseY;
        break;

      case "sw":
        newCrop.width = crop.width + (crop.x - mouseX);
        newCrop.height = mouseY - crop.y;
        newCrop.x = mouseX;
        break;

      case "se":
        newCrop.width = mouseX - crop.x;
        newCrop.height = mouseY - crop.y;
        break;
    }

    // Ensure minimum size
    newCrop.width = Math.max(50, newCrop.width);
    newCrop.height = Math.max(50, newCrop.height);

    // Keep within image bounds
    newCrop.x = Math.max(
      0,
      Math.min(photo.imgWidth - newCrop.width, newCrop.x),
    );
    newCrop.y = Math.max(
      0,
      Math.min(photo.imgHeight - newCrop.height, newCrop.y),
    );

    setCrop(newCrop);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const handlePresetSelect = (preset: (typeof CROP_PRESETS)[0]) => {
    setSelectedPreset(preset.name);
    if (preset.ratio === 0) {
      // Free form - reset to full image
      setCrop({
        x: 0,
        y: 0,
        width: photo.imgWidth,
        height: photo.imgHeight,
        aspectRatio: "Free Form",
      });
    } else {
      // Apply aspect ratio constraint
      const newWidth = Math.min(photo.imgWidth, photo.imgHeight * preset.ratio);
      const newHeight = Math.min(
        photo.imgHeight,
        photo.imgWidth / preset.ratio,
      );
      const newX = (photo.imgWidth - newWidth) / 2;
      const newY = (photo.imgHeight - newHeight) / 2;

      setCrop({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        aspectRatio: preset.name,
      });
    }
  };

  const handleApply = async () => {
    await onApplyCrop(photo, crop);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-5 pb-3 flex items-center justify-between z-10 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Crop className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Crop & Edit Photo
              </h3>
              <p className="text-sm text-gray-600">{photo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Presets Panel */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto p-6">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                Crop Presets
              </h4>
              <div className="space-y-2">
                {CROP_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full p-3 text-left rounded-lg transition-all duration-200 ${
                      selectedPreset === preset.name
                        ? "bg-purple-100 border-2 border-purple-500 shadow-sm"
                        : "border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    <div className="font-medium text-gray-800">
                      {preset.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3">
                Crop Dimensions
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Width
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={Math.round(crop.width)}
                      onChange={(e) =>
                        setCrop((prev) => ({
                          ...prev,
                          width: Math.max(50, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded-l text-sm"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm">
                      px
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Height
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={Math.round(crop.height)}
                      onChange={(e) =>
                        setCrop((prev) => ({
                          ...prev,
                          height: Math.max(50, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded-l text-sm"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm">
                      px
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  await onReset(photo);
                  onClose();
                }}
                className="w-full p-3 rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                Reset to Original
              </button>

              <button
                onClick={() => {
                  // Fill crop to image bounds
                  setCrop({
                    x: 0,
                    y: 0,
                    width: photo.imgWidth,
                    height: photo.imgHeight,
                    aspectRatio: "Full Image",
                  });
                  setSelectedPreset("Free Form");
                }}
                className="w-full p-3 rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Fill to Image Bounds
              </button>
            </div>
          </div>

          {/* Right: Crop Canvas */}
          <div className="flex-1 overflow-auto p-6">
            <div className="flex flex-col items-center h-full">
              <div className="mb-6 text-center">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Drag corners or edges to adjust
                </h4>
                <p className="text-sm text-gray-500">
                  Hold Shift to maintain aspect ratio • Double-click to apply
                  preset
                </p>
              </div>

              <div className="relative flex-1 flex items-center justify-center">
                <div
                  ref={containerRef}
                  className="relative rounded-lg shadow-2xl overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <canvas
                    ref={canvasRef}
                    className="bg-gray-900 cursor-crosshair"
                    style={{
                      cursor: isDragging ? "grabbing" : "crosshair",
                      maxWidth: "100%",
                      maxHeight: "70vh",
                    }}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 bg-transparent" />
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between w-full max-w-2xl">
                <div className="text-sm text-gray-600">
                  Original: {photo.imgWidth} × {photo.imgHeight}px • Crop:{" "}
                  {Math.round(crop.width)} × {Math.round(crop.height)}px
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg"
                  >
                    <Check className="w-5 h-5" />
                    Apply Crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

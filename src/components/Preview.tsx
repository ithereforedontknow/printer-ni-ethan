import React, { useEffect } from "react";
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Layout,
} from "lucide-react";
import type { PackedPhoto } from "../utils/packingAlgorithm";
import type { PaperSize, LayoutSettings } from "../types";
import { getRotatedDimensions } from "../utils/packingAlgorithm";

interface PreviewProps {
  layoutResult: PackedPhoto[] | null;
  paperSize: PaperSize;
  settings: LayoutSettings;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDownloadPNG: () => void;
  onDownloadPDF: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  totalPhotos: number;
  packedPhotos: number;
}

export const Preview: React.FC<PreviewProps> = ({
  layoutResult,
  paperSize,
  settings,
  currentPage,
  totalPages,
  onPageChange,
  onDownloadPNG,
  onDownloadPDF,
  canvasRef,
  totalPhotos,
  packedPhotos,
}) => {
  useEffect(() => {
    if (!layoutResult || !canvasRef.current) return;
    drawCanvas(
      canvasRef.current,
      layoutResult,
      paperSize,
      settings,
      currentPage,
    );
  }, [layoutResult, paperSize, settings, currentPage, canvasRef]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Preview</h2>
          {layoutResult && totalPages > 1 && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
              <button
                onClick={() => onPageChange(Math.max(0, currentPage - 1))}
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
                  onPageChange(Math.min(totalPages - 1, currentPage + 1))
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
              onClick={onDownloadPNG}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors font-bold text-sm shadow-md"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={onDownloadPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors font-bold text-sm shadow-md"
            >
              <Printer className="w-4 h-4" />
              PDF
            </button>
          </div>
        )}
      </div>

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
              style={{ imageRendering: "smooth" }}
            />
          </div>
        )}
      </div>

      {layoutResult && packedPhotos < totalPhotos && (
        <div className="mt-4 bg-linear-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4">
          <p className="text-sm font-bold text-yellow-900">
            ⚠️ {totalPhotos - packedPhotos} photo(s) could not fit.
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            Try: larger paper size, smaller photo sizes, different algorithm, or
            enable multi-page.
          </p>
        </div>
      )}
    </div>
  );
};

// Canvas drawing function
function drawCanvas(
  canvas: HTMLCanvasElement,
  layoutResult: PackedPhoto[],
  paperSize: PaperSize,
  settings: LayoutSettings,
  currentPage: number,
) {
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
}

import React, { useState } from "react";
import { X, Ruler, Save } from "lucide-react";
import type { PhotoSize } from "../types";

interface CustomSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (size: PhotoSize) => void;
  existingSizes: PhotoSize[];
}

export const CustomSizeModal: React.FC<CustomSizeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSizes,
}) => {
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"inches" | "cm">("inches");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);

    if (!name.trim()) {
      setError("Please enter a name for this size");
      return;
    }

    if (
      isNaN(widthNum) ||
      isNaN(heightNum) ||
      widthNum <= 0 ||
      heightNum <= 0
    ) {
      setError("Please enter valid positive numbers for width and height");
      return;
    }

    // Convert to inches if in cm (1 inch = 2.54 cm)
    const finalWidth = unit === "cm" ? widthNum / 2.54 : widthNum;
    const finalHeight = unit === "cm" ? heightNum / 2.54 : heightNum;

    // Check for duplicates
    const isDuplicate = existingSizes.some(
      (size) =>
        Math.abs(size.width - finalWidth) < 0.01 &&
        Math.abs(size.height - finalHeight) < 0.01,
    );

    if (isDuplicate) {
      setError("This size already exists");
      return;
    }

    onSave({
      name: name.trim(),
      width: parseFloat(finalWidth.toFixed(2)),
      height: parseFloat(finalHeight.toFixed(2)),
    });

    // Reset form
    setName("");
    setWidth("");
    setHeight("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setWidth("");
    setHeight("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Ruler className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-800">
              Create Custom Size
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Size Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Instagram Square, Polaroid"
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={30}
            />
            <p className="text-xs text-gray-500 mt-1">
              Give this size a descriptive name
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Width
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="50"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="0.0"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {unit === "inches" ? "in" : "cm"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="50"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="0.0"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {unit === "inches" ? "in" : "cm"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Unit
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUnit("inches")}
                className={`flex-1 py-2.5 rounded-lg border-2 transition-colors ${
                  unit === "inches"
                    ? "bg-purple-100 border-purple-500 text-purple-700 font-semibold"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Inches
              </button>
              <button
                type="button"
                onClick={() => setUnit("cm")}
                className={`flex-1 py-2.5 rounded-lg border-2 transition-colors ${
                  unit === "cm"
                    ? "bg-purple-100 border-purple-500 text-purple-700 font-semibold"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Centimeters
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-1">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg border-2 border-gray-300"
                style={{
                  width: "80px",
                  height: `${
                    unit === "inches"
                      ? (parseFloat(height) / parseFloat(width) || 1) * 80
                      : (parseFloat(height) / parseFloat(width) || 1) * 80
                  }px`,
                  maxHeight: "120px",
                }}
              />
              <div>
                <p className="text-sm text-gray-600">{name || "Custom Size"}</p>
                <p className="text-xs text-gray-500">
                  {width || "0"} × {height || "0"}{" "}
                  {unit === "inches" ? "inches" : "cm"}
                  {width && height && unit === "cm" && (
                    <span className="block">
                      ({parseFloat((parseFloat(width) / 2.54).toFixed(2))} ×{" "}
                      {parseFloat((parseFloat(height) / 2.54).toFixed(2))}{" "}
                      inches)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Size
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

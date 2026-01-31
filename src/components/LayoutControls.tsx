import React from "react";
import { Grid, Settings, Undo, Redo } from "lucide-react";
import { type PaperSize, PAPER_SIZES } from "../types";

interface LayoutControlsProps {
  paperSize: PaperSize;
  onPaperSizeChange: (size: PaperSize) => void;
  packingAlgorithm: string;
  onAlgorithmChange: (algo: string) => void;
  settings: any;
  onSettingsChange: (settings: any) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onGenerateLayout: () => void;
  hasPhotos: boolean;
  isGenerating: boolean;
  onShowAdvanced: () => void;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({
  paperSize,
  onPaperSizeChange,
  packingAlgorithm,
  onAlgorithmChange,
  settings,
  onSettingsChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onGenerateLayout,
  hasPhotos,
  isGenerating,
  onShowAdvanced,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-5 flex items-center justify-between text-gray-800">
        <div className="flex items-center gap-2">Layout</div>
        <button
          onClick={onShowAdvanced}
          className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1.5"
        >
          Advanced <Settings className="w-5 h-5 text-purple-600" />
        </button>
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Paper Size
        </label>
        <select
          value={paperSize.name}
          onChange={(e) =>
            onPaperSizeChange(
              PAPER_SIZES.find((p) => p.name === e.target.value)!,
            )
          }
          className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
        >
          {PAPER_SIZES.map((size) => (
            <option key={size.name} value={size.name}>
              {size.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          {paperSize.width}" × {paperSize.height}"
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Algorithm
        </label>
        <select
          value={packingAlgorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
          className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
        >
          <option value="maxrects">MaxRects (Best)</option>
          <option value="guillotine">Guillotine (Fast)</option>
          <option value="shelf">Shelf (Simple)</option>
        </select>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Margins (uniform quick-set)
        </label>
        <input
          type="number"
          step="0.125"
          min="0"
          max="1"
          value={settings.marginTop}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onSettingsChange({
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
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-sm"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-sm"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4 mx-auto" />
        </button>
      </div>

      <button
        onClick={onGenerateLayout}
        disabled={!hasPhotos || isGenerating}
        className="w-full bg-linear-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-black hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-sm uppercase tracking-wide"
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
  );
};

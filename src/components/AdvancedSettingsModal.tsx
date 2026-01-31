import React from "react";
import { X, Settings } from "lucide-react";
import type { LayoutSettings } from "../types";

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LayoutSettings;
  onSettingsChange: (settings: LayoutSettings) => void;
}

export const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 pt-5 pb-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Advanced Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
                    step="0.01"
                    min="0"
                    max="2"
                    value={String(settings[key as keyof LayoutSettings])}
                    onChange={(e) =>
                      onSettingsChange({
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

          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Print DPI
            </label>
            <select
              value={settings.dpi}
              onChange={(e) =>
                onSettingsChange({ ...settings, dpi: parseInt(e.target.value) })
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
                  onSettingsChange({
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
                  onSettingsChange({
                    ...settings,
                    bleed: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showCutLines"
                checked={settings.showCutLines}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    showCutLines: e.target.checked,
                  })
                }
                className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="showCutLines"
                className="text-sm text-gray-700 font-medium"
              >
                Show Cut Lines
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showSafeZone"
                checked={settings.showSafeZone}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    showSafeZone: e.target.checked,
                  })
                }
                className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="showSafeZone"
                className="text-sm text-gray-700 font-medium"
              >
                Show Safe Zone
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showMargins"
                checked={settings.showMargins}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    showMargins: e.target.checked,
                  })
                }
                className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="showMargins"
                className="text-sm text-gray-700 font-medium"
              >
                Show Margins
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="multiPage"
                checked={settings.multiPage}
                onChange={(e) =>
                  onSettingsChange({ ...settings, multiPage: e.target.checked })
                }
                className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="multiPage"
                className="text-sm text-gray-700 font-medium"
              >
                Enable Multi-page (auto-create new pages)
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

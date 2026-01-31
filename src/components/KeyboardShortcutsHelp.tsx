import React from "react";

export const KeyboardShortcutsHelp: React.FC = () => {
  return (
    <div className="mt-6 bg-linear-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
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
          <span className="font-mono bg-gray-700 px-2 py-1 rounded">Del</span>{" "}
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
  );
};

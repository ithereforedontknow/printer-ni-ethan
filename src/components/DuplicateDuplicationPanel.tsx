import React, { useState, useEffect } from "react";
import { Copy, Trash2, CheckSquare, Square } from "lucide-react";
import type { Photo, DuplicateGroup } from "../types";

interface DuplicateDetectionPanelProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  onRemovePhotos: (photoIds: number[]) => void;
  onKeepPhotos: (photoIds: number[]) => void;
}

export const DuplicateDetectionPanel: React.FC<
  DuplicateDetectionPanelProps
> = ({ photos, isOpen, onClose, onRemovePhotos, onKeepPhotos }) => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      detectDuplicates();
    }
  }, [isOpen, photos]);

  const detectDuplicates = async () => {
    // Simple duplicate detection based on image data
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < photos.length; i++) {
      if (processed.has(photos[i].id)) continue;

      const group: DuplicateGroup = {
        hash: `group-${groups.length}`,
        photos: [photos[i]],
        isSelected: false,
      };

      // Compare with remaining photos
      for (let j = i + 1; j < photos.length; j++) {
        if (processed.has(photos[j].id)) continue;

        // Simple size-based detection (can be enhanced with image hash)
        if (
          photos[i].imgWidth === photos[j].imgWidth &&
          photos[i].imgHeight === photos[j].imgHeight &&
          photos[i].name === photos[j].name
        ) {
          group.photos.push(photos[j]);
          processed.add(photos[j].id);
        }
      }

      if (group.photos.length > 1) {
        groups.push(group);
      }

      processed.add(photos[i].id);
    }

    setDuplicateGroups(groups);
  };

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleRemoveDuplicates = () => {
    const photosToRemove: number[] = [];

    duplicateGroups.forEach((group) => {
      if (selectedGroups.has(group.hash)) {
        // Keep first photo, remove others
        const photosToKeep = group.photos.slice(0, 1);
        const photosToRemoveFromGroup = group.photos.slice(1);

        photosToRemove.push(...photosToRemoveFromGroup.map((p) => p.id));
      }
    });

    onRemovePhotos(photosToRemove);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-white px-6 pt-5 pb-3 flex items-center justify-between z-10 border-b">
          <div className="flex items-center gap-3">
            <Copy className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Duplicate Detection
              </h3>
              <p className="text-sm text-gray-600">
                Found {duplicateGroups.length} groups of similar photos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <Copy className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No duplicates found</p>
              <p className="text-sm text-gray-500 mt-1">
                All photos appear to be unique
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((group) => (
                <div
                  key={group.hash}
                  className={`border rounded-xl p-4 transition-colors ${
                    selectedGroups.has(group.hash)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGroupSelection(group.hash)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {selectedGroups.has(group.hash) ? (
                          <CheckSquare className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <span className="font-medium text-gray-700">
                        {group.photos.length} similar photos
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {group.photos[0].imgWidth} × {group.photos[0].imgHeight}px
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {group.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`relative rounded-lg overflow-hidden border-2 ${
                          index === 0 ? "border-green-500" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1">
                          <div className="truncate">{photo.name}</div>
                          <div className="text-xs opacity-75">
                            {index === 0 ? "(Keep)" : "(Duplicate)"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {duplicateGroups.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedGroups.size} of {duplicateGroups.length} groups
                selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedGroups(new Set())}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleRemoveDuplicates}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Selected Duplicates
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

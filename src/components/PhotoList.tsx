import React from "react";
import {
  Upload,
  ImageIcon,
  Trash2,
  RotateCw,
  Plus,
  Minus,
  Crop,
  GripVertical,
  Copy,
} from "lucide-react";
import { type Photo, type PhotoSize, PHOTO_SIZES } from "../types";
import { CropEditorModal } from "./CropEditorModal";

interface PhotoListProps {
  photos: Photo[];
  selectedPhotoIds: Set<number>;
  onPhotoSelect: (photoId: number, shiftKey: boolean) => void;
  onUpdatePhotoSize: (
    photoId: number,
    sizeIndex: number,
    size: PhotoSize,
  ) => void;
  onUpdatePhotoQuantity: (
    photoId: number,
    sizeIndex: number,
    quantity: number,
  ) => void;
  onRotatePhoto: (photoId: number, sizeIndex: number, rotation: number) => void;
  onAddSizeToPhoto: (photoId: number, size: PhotoSize) => void;
  onRemoveSizeFromPhoto: (photoId: number, sizeIndex: number) => void;
  onRemovePhoto: (photoId: number) => void;
  onBulkSizeChange: (size: PhotoSize) => void;
  onBulkRotate: () => void;
  onBulkDelete: () => void;
  onFileUpload: (files: FileList | null) => void;
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  // Photo editing props
  onCropPhoto: (photoId: number, crop: any) => Promise<void>;
  onQuickCrop: (photoId: number, preset: any) => Promise<void>;
  onResetCrop: (photoId: number) => void;
  // Drag & drop props
  draggedPhotoId: number | null;
  draggedOverPhotoId: number | null;
  onDragStart: (e: React.DragEvent, photoId: number) => void;
  onDragOver: (e: React.DragEvent, photoId: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, photoId: number) => void;
  isTouchDevice: boolean;
}

export const PhotoList: React.FC<PhotoListProps> = ({
  photos,
  selectedPhotoIds,
  onPhotoSelect,
  onUpdatePhotoSize,
  onUpdatePhotoQuantity,
  onRotatePhoto,
  onAddSizeToPhoto,
  onRemoveSizeFromPhoto,
  onRemovePhoto,
  onBulkSizeChange,
  onBulkRotate,
  onBulkDelete,
  onFileUpload,
  isUploading,
  uploadProgress,
  fileInputRef,
  onCropPhoto,
  onQuickCrop,
  onResetCrop,
  draggedPhotoId,
  draggedOverPhotoId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isTouchDevice,
}) => {
  const [editingPhoto, setEditingPhoto] = React.useState<Photo | null>(null);
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [showAddSizeModal, setShowAddSizeModal] = React.useState<number | null>(
    null,
  );

  const totalPhotos = photos.reduce(
    (sum, photo) =>
      sum + photo.sizes.reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0,
  );

  const handleCropClick = (photo: Photo) => {
    setEditingPhoto(photo);
    setShowCropModal(true);
  };

  const handleAddSizeClick = (photoId: number) => {
    setShowAddSizeModal(photoId);
  };

  const handleApplyCrop = async (photo: Photo, crop: any) => {
    await onCropPhoto(photo.id, crop);
  };

  const handleQuickCrop = async (photo: Photo, preset: any) => {
    await onQuickCrop(photo.id, preset);
  };

  const handleResetCrop = (photo: Photo) => {
    onResetCrop(photo.id);
  };

  const handleAddSize = (photoId: number, size: PhotoSize) => {
    onAddSizeToPhoto(photoId, size);
    setShowAddSizeModal(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          Photos ({totalPhotos} total)
        </h2>
        <div className="flex items-center gap-2">
          {selectedPhotoIds.size > 0 && (
            <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              {selectedPhotoIds.size} selected
            </span>
          )}
          <button
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
            title="Upload more photos"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Add More
          </button>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-2xl p-2 mb-4">
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-2 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200">
            <Upload className="w-5 h-5 text-blue-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              {isTouchDevice
                ? "Tap to upload photos"
                : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG (max 10MB)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => onFileUpload(e.target.files)}
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
          <p className="text-xs font-bold text-purple-900 mb-2">Bulk Actions</p>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const size = PHOTO_SIZES.find((s) => s.name === e.target.value);
                if (size) onBulkSizeChange(size);
              }}
              className="flex-1 p-2 border-2 border-purple-300 rounded-lg text-sm font-medium"
            >
              <option value="">Change Size...</option>
              {PHOTO_SIZES.map((size) => (
                <option key={size.name} value={size.name}>
                  {size.name}
                </option>
              ))}
            </select>
            <button
              onClick={onBulkRotate}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Rotate selected"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onBulkDelete}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Photos List */}
      <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto p-2">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No photos uploaded</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload photos to get started
            </p>
          </div>
        ) : (
          photos.map((photo) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotoIds.has(photo.id)}
              isDragged={draggedPhotoId === photo.id}
              isDragOver={draggedOverPhotoId === photo.id}
              onSelect={onPhotoSelect}
              onUpdateSize={onUpdatePhotoSize}
              onUpdateQuantity={onUpdatePhotoQuantity}
              onRotate={onRotatePhoto}
              onRemoveSize={onRemoveSizeFromPhoto}
              onRemovePhoto={onRemovePhoto}
              onCrop={handleCropClick}
              onAddSize={handleAddSizeClick}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              isTouchDevice={isTouchDevice}
            />
          ))
        )}
      </div>

      {/* Crop Editor Modal */}
      {editingPhoto && (
        <CropEditorModal
          photo={editingPhoto}
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setEditingPhoto(null);
          }}
          onApplyCrop={handleApplyCrop}
          onQuickCrop={handleQuickCrop}
          onReset={handleResetCrop}
        />
      )}

      {/* Add Size Modal */}
      {showAddSizeModal && (
        <AddSizeModal
          photoId={showAddSizeModal}
          existingSizes={
            photos.find((p) => p.id === showAddSizeModal)?.sizes || []
          }
          onAddSize={handleAddSize}
          onClose={() => setShowAddSizeModal(null)}
        />
      )}
    </div>
  );
};

// PhotoItem Component with Multiple Sizes
const PhotoItem: React.FC<{
  photo: Photo;
  isSelected: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  onSelect: (photoId: number, shiftKey: boolean) => void;
  onUpdateSize: (photoId: number, sizeIndex: number, size: PhotoSize) => void;
  onUpdateQuantity: (
    photoId: number,
    sizeIndex: number,
    quantity: number,
  ) => void;
  onRotate: (photoId: number, sizeIndex: number, rotation: number) => void;
  onRemoveSize: (photoId: number, sizeIndex: number) => void;
  onRemovePhoto: (photoId: number) => void;
  onCrop: (photo: Photo) => void;
  onAddSize: (photoId: number) => void;
  onDragStart: (e: React.DragEvent, photoId: number) => void;
  onDragOver: (e: React.DragEvent, photoId: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, photoId: number) => void;
  isTouchDevice: boolean;
}> = ({
  photo,
  isSelected,
  isDragged,
  isDragOver,
  onSelect,
  onUpdateSize,
  onUpdateQuantity,
  onRotate,
  onRemoveSize,
  onRemovePhoto,
  onCrop,
  onAddSize,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isTouchDevice,
}) => {
  const hasCrop = !!photo.crop;
  const totalCopies = photo.sizes.reduce((sum, size) => sum + size.quantity, 0);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, photo.id)}
      onDragOver={(e) => onDragOver(e, photo.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, photo.id)}
      onClick={(e) => onSelect(photo.id, e.shiftKey)}
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        isDragged
          ? "opacity-50 border-dashed border-purple-500 bg-purple-50"
          : isDragOver
            ? "border-dashed border-blue-500 bg-blue-50"
            : isSelected
              ? "border-solid border-purple-500 bg-purple-50 shadow-md"
              : "border-solid border-gray-200 hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <div
        className="absolute left-3 top-4 cursor-move text-gray-400 hover:text-gray-600"
        draggable
        onDragStart={(e) => onDragStart(e, photo.id)}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Photo header */}
      <div className="flex items-start gap-3 mb-4 ml-8">
        <div className="relative shrink-0">
          <img
            src={photo.dataUrl}
            alt={photo.name}
            className="w-16 h-16 object-cover rounded-lg shadow-sm"
            style={{ transform: `rotate(${photo.sizes[0]?.rotation || 0}deg)` }}
          />
          {hasCrop && (
            <div className="absolute -top-2 -left-2 bg-green-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
              <Crop className="w-3 h-3" />
            </div>
          )}
          {totalCopies > 1 && (
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
              {totalCopies}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {photo.name}
          </p>
          <p className="text-xs text-gray-500">
            {photo.imgWidth} × {photo.imgHeight}px
            {hasCrop && <span className="text-green-600 ml-2">• Cropped</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {photo.sizes.length} size{photo.sizes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCrop(photo);
            }}
            className={`p-2 rounded-lg transition-colors ${
              hasCrop
                ? "text-green-600 hover:bg-green-100"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            title="Crop photo"
          >
            <Crop className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSize(photo.id);
            }}
            className="p-2 text-purple-500 hover:bg-purple-100 rounded-lg transition-colors"
            title="Add another size"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemovePhoto(photo.id);
            }}
            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Size configurations */}
      <div className="space-y-3">
        {photo.sizes.map((sizeConfig, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Size selection */}
            <div className="col-span-5">
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Size
              </label>
              <select
                value={sizeConfig.size.name}
                onChange={(e) => {
                  const newSize = PHOTO_SIZES.find(
                    (s) => s.name === e.target.value,
                  );
                  if (newSize) onUpdateSize(photo.id, index, newSize);
                }}
                className="w-full p-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {PHOTO_SIZES.map((size) => (
                  <option key={size.name} value={size.name}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="col-span-5">
              <label className="text-xs font-bold text-gray-600 block mb-1">
                Quantity
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    onUpdateQuantity(photo.id, index, sizeConfig.quantity - 1)
                  }
                  className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={sizeConfig.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(
                      photo.id,
                      index,
                      parseInt(e.target.value) || 1,
                    )
                  }
                  className="w-full p-2 text-sm border-2 border-gray-200 rounded-lg text-center font-bold"
                />
                <button
                  onClick={() =>
                    onUpdateQuantity(photo.id, index, sizeConfig.quantity + 1)
                  }
                  className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Rotation */}
            <div className="col-span-2">
              <button
                onClick={() =>
                  onRotate(photo.id, index, (sizeConfig.rotation + 90) % 360)
                }
                className="w-full p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
                {/*<span className="ml-1 text-xs font-medium">
                  {sizeConfig.rotation}°
                </span>*/}
              </button>
            </div>

            {/* Remove size */}
            <div className="col-span-1">
              <button
                onClick={() => onRemoveSize(photo.id, index)}
                className="w-full p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                title="Remove this size"
                disabled={photo.sizes.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add Size Modal Component
const AddSizeModal: React.FC<{
  photoId: number;
  existingSizes: Array<{ size: PhotoSize }>;
  onAddSize: (photoId: number, size: PhotoSize) => void;
  onClose: () => void;
}> = ({ photoId, existingSizes, onAddSize, onClose }) => {
  const [selectedSize, setSelectedSize] = React.useState<PhotoSize>(
    PHOTO_SIZES[0],
  );
  const [quantity, setQuantity] = React.useState(1);

  const availableSizes = PHOTO_SIZES.filter(
    (size) =>
      !existingSizes.some((existing) => existing.size.name === size.name),
  );

  if (availableSizes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            All Sizes Added
          </h3>
          <p className="text-gray-600 mb-4">
            This photo already has all available sizes configured.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Size</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Size
            </label>
            <select
              value={selectedSize.name}
              onChange={(e) => {
                const size = PHOTO_SIZES.find((s) => s.name === e.target.value);
                if (size) setSelectedSize(size);
              }}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {availableSizes.map((size) => (
                <option key={size.name} value={size.name}>
                  {size.name} ({size.width}" × {size.height}")
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="flex-1 p-3 border-2 border-gray-200 rounded-lg text-center font-bold"
              />
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onAddSize(photoId, { ...selectedSize, quantity, rotation: 0 })
            }
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
          >
            Add Size
          </button>
        </div>
      </div>
    </div>
  );
};

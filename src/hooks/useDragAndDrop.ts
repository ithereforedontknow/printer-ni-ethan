import { useState, useCallback, useRef } from "react";

interface UseDragAndDropReturn {
  draggedPhotoId: number | null;
  draggedOverPhotoId: number | null;
  handleDragStart: (e: React.DragEvent, photoId: number) => void;
  handleDragOver: (e: React.DragEvent, photoId: number) => void;
  handleDragEnd: () => void;
  handleDrop: (e: React.DragEvent, photoId: number) => void;
  isTouchDevice: boolean;
  handleTouchStart: (e: React.TouchEvent, photoId: number) => void;
  handleTouchMove: (e: React.TouchEvent, photoId: number) => void;
  handleTouchEnd: (e: React.TouchEvent, photoId: number) => void;
}

export const useDragAndDrop = (): UseDragAndDropReturn => {
  const [draggedPhotoId, setDraggedPhotoId] = useState<number | null>(null);
  const [draggedOverPhotoId, setDraggedOverPhotoId] = useState<number | null>(
    null,
  );
  const touchStartRef = useRef<{
    x: number;
    y: number;
    photoId: number;
  } | null>(null);

  const isTouchDevice = "ontouchstart" in window;

  const handleDragStart = useCallback((e: React.DragEvent, photoId: number) => {
    setDraggedPhotoId(photoId);
    e.dataTransfer.setData("text/plain", photoId.toString());
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, photoId: number) => {
      e.preventDefault();
      if (draggedPhotoId !== photoId) {
        setDraggedOverPhotoId(photoId);
      }
    },
    [draggedPhotoId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPhotoId(null);
    setDraggedOverPhotoId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedPhotoId(null);
    setDraggedOverPhotoId(null);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, photoId: number) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        photoId,
      };
    },
    [],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Start drag if movement exceeds threshold
    if (deltaX > 10 || deltaY > 10) {
      setDraggedPhotoId(touchStartRef.current.photoId);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    setDraggedPhotoId(null);
    setDraggedOverPhotoId(null);
  }, []);

  return {
    draggedPhotoId,
    draggedOverPhotoId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

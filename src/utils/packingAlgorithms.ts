export interface PhotoSize {
  name: string;
  width: number;
  height: number;
}

export interface Photo {
  id: number;
  name: string;
  dataUrl: string;
  size: PhotoSize;
  rotation: number;
  imgWidth: number;
  imgHeight: number;
  priority?: number; // For priority packing
  quantity?: number; // For auto-layout by quantity
}

export interface PackedPhoto extends Photo {
  x: number;
  y: number;
  pageIndex: number; // Which page this photo is on
}

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackingOptions {
  paperWidth: number;
  paperHeight: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  spacing?: number; // Minimum spacing between photos
  multiPage?: boolean; // Allow multiple pages
}

export type PackingAlgorithm = "guillotine" | "shelf" | "maxrects";

// Get actual dimensions based on rotation
export const getRotatedDimensions = (
  photo: Photo,
): { width: number; height: number } => {
  if (photo.rotation === 90 || photo.rotation === 270) {
    return { width: photo.size.height, height: photo.size.width };
  }
  return { width: photo.size.width, height: photo.size.height };
};

// Get printable area considering margins
const getPrintableArea = (options: PackingOptions) => {
  const marginLeft = options.marginLeft || 0;
  const marginRight = options.marginRight || 0;
  const marginTop = options.marginTop || 0;
  const marginBottom = options.marginBottom || 0;

  return {
    x: marginLeft,
    y: marginTop,
    width: options.paperWidth - marginLeft - marginRight,
    height: options.paperHeight - marginTop - marginBottom,
  };
};

// Guillotine Bin Packing Algorithm
export const packPhotosGuillotine = (
  photos: Photo[],
  options: PackingOptions,
): PackedPhoto[] => {
  const packed: PackedPhoto[] = [];
  const printable = getPrintableArea(options);
  const spacing = options.spacing || 0;

  let currentPage = 0;
  let freeRectangles: FreeRectangle[] = [
    {
      x: printable.x,
      y: printable.y,
      width: printable.width,
      height: printable.height,
    },
  ];

  // Sort by priority first, then by area
  const sortedPhotos = [...photos].sort((a, b) => {
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    const aSize = getRotatedDimensions(a);
    const bSize = getRotatedDimensions(b);
    return bSize.width * bSize.height - aSize.width * aSize.height;
  });

  for (const photo of sortedPhotos) {
    const dims = getRotatedDimensions(photo);
    const requiredWidth = dims.width + spacing;
    const requiredHeight = dims.height + spacing;
    let placed = false;

    // Try to place on current page
    for (let i = 0; i < freeRectangles.length; i++) {
      const rect = freeRectangles[i];

      if (requiredWidth <= rect.width && requiredHeight <= rect.height) {
        packed.push({
          ...photo,
          x: rect.x,
          y: rect.y,
          pageIndex: currentPage,
        });

        const newRects: FreeRectangle[] = [];

        if (rect.width > requiredWidth) {
          newRects.push({
            x: rect.x + requiredWidth,
            y: rect.y,
            width: rect.width - requiredWidth,
            height: requiredHeight,
          });
        }

        if (rect.height > requiredHeight) {
          newRects.push({
            x: rect.x,
            y: rect.y + requiredHeight,
            width: rect.width,
            height: rect.height - requiredHeight,
          });
        }

        freeRectangles.splice(i, 1);
        freeRectangles.push(...newRects);
        freeRectangles.sort((a, b) => b.width * b.height - a.width * a.height);

        placed = true;
        break;
      }
    }

    // If not placed and multi-page is enabled, create new page
    if (!placed && options.multiPage) {
      currentPage++;
      freeRectangles = [
        {
          x: printable.x,
          y: printable.y,
          width: printable.width,
          height: printable.height,
        },
      ];

      // Try to place on new page
      const rect = freeRectangles[0];
      if (requiredWidth <= rect.width && requiredHeight <= rect.height) {
        packed.push({
          ...photo,
          x: rect.x,
          y: rect.y,
          pageIndex: currentPage,
        });

        const newRects: FreeRectangle[] = [];

        if (rect.width > requiredWidth) {
          newRects.push({
            x: rect.x + requiredWidth,
            y: rect.y,
            width: rect.width - requiredWidth,
            height: requiredHeight,
          });
        }

        if (rect.height > requiredHeight) {
          newRects.push({
            x: rect.x,
            y: rect.y + requiredHeight,
            width: rect.width,
            height: rect.height - requiredHeight,
          });
        }

        freeRectangles.splice(0, 1);
        freeRectangles.push(...newRects);
        freeRectangles.sort((a, b) => b.width * b.height - a.width * a.height);
      }
    }
  }

  return packed;
};

// Shelf Bin Packing Algorithm
export const packPhotosShelf = (
  photos: Photo[],
  options: PackingOptions,
): PackedPhoto[] => {
  const packed: PackedPhoto[] = [];
  const printable = getPrintableArea(options);
  const spacing = options.spacing || 0;

  const sortedPhotos = [...photos].sort((a, b) => {
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    const aSize = getRotatedDimensions(a);
    const bSize = getRotatedDimensions(b);
    return bSize.height - aSize.height;
  });

  let currentPage = 0;
  let currentY = printable.y;
  let currentX = printable.x;
  let shelfHeight = 0;

  for (const photo of sortedPhotos) {
    const dims = getRotatedDimensions(photo);
    const requiredWidth = dims.width + spacing;
    const requiredHeight = dims.height + spacing;

    // Check if photo fits on current shelf
    if (currentX + requiredWidth > printable.x + printable.width) {
      // Move to next shelf
      currentY += shelfHeight;
      currentX = printable.x;
      shelfHeight = 0;
    }

    // Check if there's room for a new shelf on current page
    if (currentY + requiredHeight > printable.y + printable.height) {
      if (options.multiPage) {
        // Start new page
        currentPage++;
        currentY = printable.y;
        currentX = printable.x;
        shelfHeight = 0;
      } else {
        continue; // Skip this photo
      }
    }

    // Place photo
    packed.push({
      ...photo,
      x: currentX,
      y: currentY,
      pageIndex: currentPage,
    });

    currentX += requiredWidth;
    shelfHeight = Math.max(shelfHeight, requiredHeight);
  }

  return packed;
};

// MaxRects Bin Packing Algorithm
export const packPhotosMaxRects = (
  photos: Photo[],
  options: PackingOptions,
): PackedPhoto[] => {
  const packed: PackedPhoto[] = [];
  const printable = getPrintableArea(options);
  const spacing = options.spacing || 0;

  let currentPage = 0;
  let freeRectangles: FreeRectangle[] = [
    {
      x: printable.x,
      y: printable.y,
      width: printable.width,
      height: printable.height,
    },
  ];

  const sortedPhotos = [...photos].sort((a, b) => {
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    const aSize = getRotatedDimensions(a);
    const bSize = getRotatedDimensions(b);
    return bSize.width * bSize.height - aSize.width * aSize.height;
  });

  for (const photo of sortedPhotos) {
    const dims = getRotatedDimensions(photo);
    const requiredWidth = dims.width + spacing;
    const requiredHeight = dims.height + spacing;
    let bestRect: FreeRectangle | null = null;
    let bestShortSideFit = Infinity;
    let bestLongSideFit = Infinity;

    // Find the best fitting rectangle (Best Short Side Fit)
    for (const rect of freeRectangles) {
      if (requiredWidth <= rect.width && requiredHeight <= rect.height) {
        const leftoverX = rect.width - requiredWidth;
        const leftoverY = rect.height - requiredHeight;
        const shortSideFit = Math.min(leftoverX, leftoverY);
        const longSideFit = Math.max(leftoverX, leftoverY);

        if (
          shortSideFit < bestShortSideFit ||
          (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
        ) {
          bestRect = rect;
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
        }
      }
    }

    if (bestRect) {
      // Place the photo
      packed.push({
        ...photo,
        x: bestRect.x,
        y: bestRect.y,
        pageIndex: currentPage,
      });

      // Split the used rectangle
      const newRects: FreeRectangle[] = [];

      if (bestRect.width > requiredWidth) {
        newRects.push({
          x: bestRect.x + requiredWidth,
          y: bestRect.y,
          width: bestRect.width - requiredWidth,
          height: bestRect.height,
        });
      }

      if (bestRect.height > requiredHeight) {
        newRects.push({
          x: bestRect.x,
          y: bestRect.y + requiredHeight,
          width: bestRect.width,
          height: bestRect.height - requiredHeight,
        });
      }

      const index = freeRectangles.indexOf(bestRect);
      freeRectangles.splice(index, 1);

      for (const newRect of newRects) {
        let shouldAdd = true;

        for (const existingRect of freeRectangles) {
          if (
            newRect.x >= existingRect.x &&
            newRect.y >= existingRect.y &&
            newRect.x + newRect.width <= existingRect.x + existingRect.width &&
            newRect.y + newRect.height <= existingRect.y + existingRect.height
          ) {
            shouldAdd = false;
            break;
          }
        }

        if (shouldAdd) {
          freeRectangles.push(newRect);
        }
      }

      // Remove contained rectangles
      for (let i = freeRectangles.length - 1; i >= 0; i--) {
        for (let j = freeRectangles.length - 1; j >= 0; j--) {
          if (i !== j) {
            const rectA = freeRectangles[i];
            const rectB = freeRectangles[j];

            if (
              rectA.x >= rectB.x &&
              rectA.y >= rectB.y &&
              rectA.x + rectA.width <= rectB.x + rectB.width &&
              rectA.y + rectA.height <= rectB.y + rectB.height
            ) {
              freeRectangles.splice(i, 1);
              break;
            }
          }
        }
      }
    } else if (options.multiPage) {
      // Try new page
      currentPage++;
      freeRectangles = [
        {
          x: printable.x,
          y: printable.y,
          width: printable.width,
          height: printable.height,
        },
      ];

      // Retry placement on new page
      const rect = freeRectangles[0];
      if (requiredWidth <= rect.width && requiredHeight <= rect.height) {
        packed.push({
          ...photo,
          x: rect.x,
          y: rect.y,
          pageIndex: currentPage,
        });

        const newRects: FreeRectangle[] = [];

        if (rect.width > requiredWidth) {
          newRects.push({
            x: rect.x + requiredWidth,
            y: rect.y,
            width: rect.width - requiredWidth,
            height: rect.height,
          });
        }

        if (rect.height > requiredHeight) {
          newRects.push({
            x: rect.x,
            y: rect.y + requiredHeight,
            width: rect.width,
            height: rect.height - requiredHeight,
          });
        }

        freeRectangles.splice(0, 1);
        freeRectangles.push(...newRects);
      }
    }
  }

  return packed;
};

// Main packing function
export const packPhotos = (
  photos: Photo[],
  algorithm: PackingAlgorithm,
  options: PackingOptions,
): PackedPhoto[] => {
  switch (algorithm) {
    case "guillotine":
      return packPhotosGuillotine(photos, options);
    case "shelf":
      return packPhotosShelf(photos, options);
    case "maxrects":
      return packPhotosMaxRects(photos, options);
    default:
      return packPhotosMaxRects(photos, options);
  }
};

// Expand photos by quantity (for auto-layout feature)
export const expandPhotosByQuantity = (photos: Photo[]): Photo[] => {
  const expanded: Photo[] = [];

  photos.forEach((photo) => {
    const quantity = photo.quantity || 1;
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        ...photo,
        id: photo.id + i * 0.0001, // Ensure unique IDs
      });
    }
  });

  return expanded;
};

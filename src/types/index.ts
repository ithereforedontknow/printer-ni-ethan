export interface PhotoSize {
  name: string;
  width: number;
  height: number;
}

export interface PaperSize {
  name: string;
  width: number;
  height: number;
}

export interface LayoutSettings {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  spacing: number;
  bleed: number;
  dpi: number;
  showCutLines: boolean;
  showSafeZone: boolean;
  showMargins: boolean;
  multiPage: boolean;
}

// Updated Photo interface to support multiple sizes
export interface Photo {
  id: number;
  name: string;
  dataUrl: string;
  originalDataUrl: string; // Keep original for reset
  imgWidth: number;
  imgHeight: number;
  size: PhotoSize;
  rotation: number;
  quantity: number;
  sizes: Array<{
    size: PhotoSize;
    quantity: number;
    rotation: number; // <--- ADD THIS LINE HERE
  }>;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
}

export interface CropPreset {
  name: string;
  ratio: number; // width/height
  description: string;
}

// Enhanced crop presets for better UX
export const CROP_PRESETS: CropPreset[] = [
  { name: "Square (1:1)", ratio: 1, description: "Perfect square crop" },
  { name: "Standard (2:3)", ratio: 2 / 3, description: "Standard photo ratio" },
  {
    name: "Landscape (4:3)",
    ratio: 4 / 3,
    description: "Traditional landscape",
  },
  {
    name: "Widescreen (16:9)",
    ratio: 16 / 9,
    description: "Widescreen format",
  },
  { name: "Portrait (3:4)", ratio: 3 / 4, description: "Portrait orientation" },
  { name: "Instagram Post (4:5)", ratio: 4 / 5, description: "Instagram feed" },
  {
    name: "Instagram Story (9:16)",
    ratio: 9 / 16,
    description: "Instagram story",
  },
  {
    name: "Passport (1.25:1.5)",
    ratio: 1.25 / 1.5,
    description: "Passport photo",
  },
  { name: "Wallet (2.5:3.5)", ratio: 2.5 / 3.5, description: "Wallet size" },
  { name: "Free Form", ratio: 0, description: "Custom crop area" },
];

export const PHOTO_SIZES: PhotoSize[] = [
  { name: "1x1", width: 1, height: 1 },
  { name: "2x2", width: 2, height: 2 },
  { name: "2x3", width: 2, height: 3 },
  // calling card size
  { name: "Calling Card (2x3.5)", width: 2, height: 3.5 },
  { name: "Calling Card (3.5x2)", width: 3.5, height: 2 },
  { name: "Passport (2x2)", width: 2, height: 2 },
  { name: "3x5", width: 3, height: 5 },
  { name: "4x6", width: 4, height: 6 },
  { name: "Wallet (2.5x3.5)", width: 2.5, height: 3.5 },
  { name: "5x7", width: 5, height: 7 },
  { name: "8x10", width: 8, height: 10 },
];

export const PAPER_SIZES: PaperSize[] = [
  { name: "A4 (11.7x8.3)", width: 11.7, height: 8.3 },
  { name: "Letter (11x8.5)", width: 11, height: 8.5 },
  { name: "4R (6x4)", width: 6, height: 4 },
  { name: "5R (7x5)", width: 7, height: 5 },
  { name: "8R (10x8)", width: 10, height: 8 },
  { name: "A3 (16.5x11.7)", width: 16.5, height: 11.7 },
];

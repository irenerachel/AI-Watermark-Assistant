export interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  font?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderStyle: 'none' | 'solid' | 'outline';
  borderColor?: string;
  borderWidth?: number;
  borderOpacity?: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  customImage?: File;
  margin?: number;
}

export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  processed?: boolean;
  processedUrl?: string;
}

export interface OutputConfig {
  quality: number;
  scale?: number;
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
  };
}

export interface ProcessingProgressData {
  current: number;
  total: number;
  percentage: number;
  currentFileName: string;
}

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageFile } from '../types';

export const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_FILES_COUNT = 50;

export function validateFile(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return '不支持的文件格式，请上传 JPG、PNG、WebP 或 BMP 格式的图片';
  }

  if (file.size > MAX_FILE_SIZE) {
    return '文件大小超过限制，单张图片最大 20MB';
  }

  return null;
}

export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILES_COUNT) {
    return `一次最多只能处理 ${MAX_FILES_COUNT} 张图片`;
  }

  for (const file of files) {
    const error = validateFile(file);
    if (error) return error;
  }

  return null;
}

export function createImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve) => {
    console.log('创建图片文件:', file.name, '类型:', file.type, '大小:', file.size);
    
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      console.log('图片加载成功:', file.name, '尺寸:', img.width, 'x', img.height);
      const result = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: objectUrl,
        name: file.name,
        size: file.size,
        width: img.width,
        height: img.height,
      };
      resolve(result);
    };
    
    img.onerror = (error) => {
      console.error('图片加载失败:', file.name, error);
      // 即使图片加载失败，也保留URL以便显示
      const result = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: objectUrl,
        name: file.name,
        size: file.size,
        width: 0,
        height: 0,
      };
      resolve(result);
    };
    
    img.src = objectUrl;
  });
}

export async function downloadSingleFile(blob: Blob, originalName: string) {
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(`.${extension}`, '');
  const newName = `${baseName}_watermarked.${extension || 'jpg'}`;
  
  saveAs(blob, newName);
}

export async function downloadBatchFiles(processedImages: { blob: Blob; originalName: string }[]) {
  const zip = new JSZip();
  
  processedImages.forEach(({ blob, originalName }) => {
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(`.${extension}`, '');
    const newName = `${baseName}_watermarked.${extension || 'jpg'}`;
    
    zip.file(newName, blob);
  });
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'watermarked_images.zip');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

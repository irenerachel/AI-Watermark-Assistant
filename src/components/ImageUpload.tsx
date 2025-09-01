import React, { useCallback, useState, useRef } from 'react';
import { InboxOutlined, FileImageOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { ImageFile } from '../types';
import { validateFiles, createImageFile, ACCEPTED_FILE_TYPES } from '../utils/fileUtils';

interface ImageUploadProps {
  onImagesSelected: (images: ImageFile[]) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesSelected, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (isProcessing) {
      console.log('ImageUpload - 正在处理中，忽略重复请求');
      return;
    }
    
    console.log('ImageUpload - 收到文件数量:', files.length);
    console.log('ImageUpload - 文件名列表:', files.map(f => f.name));
    
    setIsProcessing(true);
    
    const error = validateFiles(files);
    if (error) {
      message.error(error);
      setIsProcessing(false);
      return;
    }

    try {
      const imageFiles = await Promise.all(files.map(async (file) => {
        const imageFile = await createImageFile(file);
        return imageFile;
      }));
      
      console.log('ImageUpload - 处理完成，准备传递给父组件，数量:', imageFiles.length);
      onImagesSelected(imageFiles);
      message.success(`成功选择 ${files.length} 张图片`);
    } catch (error) {
      console.error('ImageUpload - 处理图片时出错:', error);
      message.error('处理图片时出错');
    } finally {
      setIsProcessing(false);
    }
  }, [onImagesSelected, isProcessing]);

  const handleClick = () => {
    if (!disabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('ImageUpload - handleFileChange 被调用，文件数量:', files.length);
    
    if (files.length > 0) {
      handleFileSelect(files);
    }
    
    // 清空文件输入框，防止重复选择
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && !isProcessing) {
      const files = Array.from(e.dataTransfer.files);
      handleFileSelect(files);
    }
  };

  return (
    <div className="upload-section">
      <div className="step-indicator">
        <div className="step-number">1</div>
        <div className="step-text">选择图片</div>
      </div>
      
      <div 
        className={`upload-area ${isDragging ? 'dragover' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon">
          <InboxOutlined />
        </div>
        <div className="upload-text">点击或拖拽图片到此区域上传</div>
        <div className="upload-hint">
          支持 JPG、PNG、WebP、BMP 格式，单张图片最大 20MB，最多 50 张
        </div>
        <div className="upload-features">
          <div className="feature-item">
            <FileImageOutlined />
            <span>支持多种图片格式</span>
          </div>
          <div className="feature-item">
            <InboxOutlined />
            <span>批量上传处理</span>
          </div>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  );
};

export default ImageUpload;

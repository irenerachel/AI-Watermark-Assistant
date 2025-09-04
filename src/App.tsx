import React, { useState, useCallback, useEffect } from 'react';
import { Layout, Button, message, Typography } from 'antd';
import ImageUpload from './components/ImageUpload';
import { ImageFile, WatermarkConfig as WatermarkConfigType, OutputConfig as OutputConfigType } from './types';
import { WatermarkProcessor } from './utils/watermarkProcessor';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);

  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfigType>({
    type: 'text',
    text: 'AI生成',
    font: 'SourceHanSansCN',
    fontSize: 24,
    color: '#ffffff',
    textOpacity: 100,
    backgroundColor: '#000000',
    backgroundOpacity: 80,
    borderStyle: 'solid',
    borderColor: '#000000',
    borderWidth: 2,
    borderOpacity: 100,
    position: 'top-left',
    margin: 15,
    imageOpacity: 100
  });

  const [outputConfig, setOutputConfig] = useState<OutputConfigType>({
    quality: 1.0,
    scale: 1.0,
  });





  const [processedImages, setProcessedImages] = useState<ImageFile[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // 水印预设管理 - 确保功能同步
  const [presets, setPresets] = useState<Array<{id: string, name: string, config: WatermarkConfigType}>>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetManagement, setShowPresetManagement] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  
  // 确保currentPreviewIndex在有效范围内
  useEffect(() => {
    if (images.length > 0 && currentPreviewIndex >= images.length) {
      setCurrentPreviewIndex(0);
    }
  }, [images.length, currentPreviewIndex]);

  // 检测屏幕尺寸变化
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 加载保存的预设
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('watermarkPresets');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (error) {
      console.error('加载预设失败:', error);
    }
  }, []);

  // 保存预设到localStorage
  const savePresetsToStorage = (newPresets: Array<{id: string, name: string, config: WatermarkConfigType}>) => {
    try {
      localStorage.setItem('watermarkPresets', JSON.stringify(newPresets));
    } catch (error) {
      console.error('保存预设失败:', error);
    }
  };

  // 保存当前配置为预设
  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) {
      message.error('请输入预设名称');
      return;
    }
    
    const newPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      config: { ...watermarkConfig }
    };
    
    const newPresets = [...presets, newPreset];
    setPresets(newPresets);
    savePresetsToStorage(newPresets);
    setPresetName('');
    setShowPresetModal(false);
    message.success('预设保存成功');
  };

  // 加载预设
  const loadPreset = (preset: {id: string, name: string, config: WatermarkConfigType}) => {
    setWatermarkConfig(preset.config);
    message.success(`已加载预设: ${preset.name}`);
  };

  // 删除预设
  const deletePreset = (presetId: string) => {
    const newPresets = presets.filter(p => p.id !== presetId);
    setPresets(newPresets);
    savePresetsToStorage(newPresets);
    message.success('预设已删除');
  };

  // 清空所有预设
  const clearAllPresets = () => {
    setPresets([]);
    savePresetsToStorage([]);
    message.success('所有预设已清空');
  };

  // 长按开始
  const handleLongPressStart = () => {
    const timer = setTimeout(() => {
      setShowPresetManagement(true);
      message.info('进入预设管理模式');
    }, 800); // 800ms长按
    setLongPressTimer(timer);
  };

  // 长按结束
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // 退出预设管理模式
  const exitPresetManagement = () => {
    setShowPresetManagement(false);
  };

  // 导出预设为JSON文件
  const exportPresetsToJSON = () => {
    try {
      const dataStr = JSON.stringify(presets, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermark-presets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('预设配置已导出');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 从JSON文件导入预设
  const importPresetsFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPresets = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedPresets)) {
          const newPresets = [...presets, ...importedPresets];
          setPresets(newPresets);
          savePresetsToStorage(newPresets);
          message.success(`成功导入 ${importedPresets.length} 个预设`);
        } else {
          message.error('文件格式不正确');
        }
      } catch (error) {
        console.error('导入失败:', error);
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  // 将水印保存为PNG图片
  const saveWatermarkAsPNG = () => {
    try {
      // 创建一个canvas来绘制水印
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        message.error('无法创建画布');
        return;
      }

      // 设置画布大小（根据字体大小和文字长度动态调整）
      const fontSize = watermarkConfig.fontSize || 24;
      const text = watermarkConfig.text || 'AI生成';
      const padding = 20;
      
      // 设置字体
      ctx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      
      canvas.width = textWidth + padding * 2;
      canvas.height = textHeight + padding * 2;

      // 根据边框样式绘制不同的效果
      if (watermarkConfig.borderStyle === 'outline') {
        // 线框模式：只绘制边框，不填充背景
        const borderWidth = watermarkConfig.borderWidth || 2;
        const borderColor = watermarkConfig.borderColor || '#000000';
        const borderOpacity = (watermarkConfig.borderOpacity || 100) / 100;
        
        // 绘制边框
        ctx.strokeStyle = borderColor + Math.round(borderOpacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);
        
        // 绘制文字
        ctx.save();
        ctx.globalAlpha = (watermarkConfig.textOpacity || 100) / 100;
        ctx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
        ctx.fillStyle = watermarkConfig.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      } else if (watermarkConfig.borderStyle === 'solid') {
        // 实心模式：绘制背景和文字
        const bgColor = watermarkConfig.backgroundColor || '#000000';
        const bgOpacity = (watermarkConfig.backgroundOpacity || 80) / 100;
        
        // 绘制背景
        ctx.fillStyle = bgColor + Math.round(bgOpacity * 255).toString(16).padStart(2, '0');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制文字
        ctx.save();
        ctx.globalAlpha = (watermarkConfig.textOpacity || 100) / 100;
        ctx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
        ctx.fillStyle = watermarkConfig.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      } else {
        // 无边框模式：只绘制文字
        ctx.save();
        ctx.globalAlpha = (watermarkConfig.textOpacity || 100) / 100;
        ctx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
        ctx.fillStyle = watermarkConfig.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      // 导出为PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `watermark-${text}-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          message.success('水印图片已保存');
        } else {
          message.error('保存失败');
        }
      }, 'image/png');
    } catch (error) {
      console.error('保存水印图片失败:', error);
      message.error('保存失败');
    }
  };

  const handleImagesSelected = useCallback((selectedImages: ImageFile[]) => {
    console.log('选择新图片 - 数量:', selectedImages.length);
    console.log('选择前images数量:', images.length);
    
    // 先清理之前的图片URL
    images.forEach(img => {
      if (img.url) {
        console.log('清理旧图片URL:', img.url);
        URL.revokeObjectURL(img.url);
      }
      if (img.processedUrl) {
        console.log('清理旧processedURL:', img.processedUrl);
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    
    setImages(selectedImages);
    setProcessedImages([]); // 清空处理结果
    setCurrentPreviewIndex(0); // 重置预览索引
    console.log('设置新图片数组完成');
  }, [images]);







  // 清空所有图片
  const handleClearAllImages = () => {
    console.log('清空前 - images数量:', images.length, 'processedImages数量:', processedImages.length);
    
    // 先清理所有URL对象，再清空状态
    [...images, ...processedImages].forEach(img => {
      if (img.url) {
        console.log('清理URL:', img.url);
        URL.revokeObjectURL(img.url);
      }
      if (img.processedUrl) {
        console.log('清理processedURL:', img.processedUrl);
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    
    // 强制清空状态 - 使用空数组确保完全清空
    setImages([]);
    setProcessedImages([]);
    setCurrentPreviewIndex(0);

    
    // 强制重新渲染
    setTimeout(() => {
      console.log('延迟检查 - images数量:', images.length, 'processedImages数量:', processedImages.length);
    }, 100);
    
    console.log('清空后 - 状态已重置');
    message.success('已清空所有图片');
  };



  const handleBatchDownload = async () => {
    if (images.length === 0) {
      message.warning('没有上传的图片');
      return;
    }
    
    try {
      message.loading(`正在处理 ${images.length} 张图片...`, 0);
      
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      
      // 处理所有图片
      const promises = images.map(async (image, index) => {
        try {
          console.log(`开始处理图片 ${index + 1}/${images.length}:`, image.name);
          
          // 验证水印配置
          if (watermarkConfig.type === 'text' && !watermarkConfig.text) {
            throw new Error('水印文本为空');
          }
          
          const processor = new WatermarkProcessor();
          const blob = await processor.processImage(image.file, watermarkConfig, outputConfig);
          const fileName = image.name.replace(/\.[^/.]+$/, '') + '_watermarked.jpg';
          zip.file(fileName, blob);
          console.log(`图片 ${index + 1}/${images.length} 处理完成:`, image.name);
        } catch (error) {
          console.error(`图片 ${image.name} 处理失败:`, error);
          throw error;
        }
      });
      
      await Promise.all(promises);
      
      // 生成ZIP文件
      message.destroy();
      message.loading('正在生成ZIP文件...', 0);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'watermarked_images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      message.destroy();
      message.success(`批量下载完成，共 ${images.length} 张图片`);
    } catch (error) {
      console.error('批量下载失败:', error);
      message.destroy();
      message.error(`批量下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 将十六进制颜色转换为rgba字符串
  const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized.length === 3 ? normalized.split('').map(c => c + c).join('') : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const a = Math.min(Math.max(alpha, 0), 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // 计算建议的水印尺寸
  const calculateWatermarkSize = (imageWidth: number, imageHeight: number) => {
    if (!imageWidth || !imageHeight) return null;
    
    // 计算图片总面积
    const totalImageArea = imageWidth * imageHeight;
    
    // 0.3%最小面积
    const minArea = totalImageArea * 0.003;
    
    // 假设水印宽高比为7.43:1（参考示例）
    const aspectRatio = 7.43;
    
    // 计算最小高度
    const calculatedMinHeight = Math.sqrt(minArea / aspectRatio);
    
    // 实际最小高度（最低20px）
    const actualMinHeight = Math.max(calculatedMinHeight, 20);
    
    // 对应宽度
    const correspondingWidth = actualMinHeight * aspectRatio;
    
    return {
      width: Math.round(correspondingWidth),
      height: Math.round(actualMinHeight)
    };
  };

  // 检查当前水印尺寸是否符合0.3%要求
  const checkWatermarkCompliance = () => {
    if (images.length > 0 && currentPreviewIndex >= 0) {
      const currentImage = images[currentPreviewIndex];
      if (currentImage.width && currentImage.height) {
        const currentSize = getCurrentWatermarkSize();
        if (currentSize) {
          // 计算建议的水印尺寸作为参考
          const suggestedSize = calculateWatermarkSize(currentImage.width, currentImage.height);
          if (suggestedSize) {
            // 检查宽度或高度是否有一个符合要求（允许±20%的误差）
            const widthRatio = currentSize.width / suggestedSize.width;
            const heightRatio = currentSize.height / suggestedSize.height;
            
            // 调试信息（可选）
            console.log(`图片 ${currentPreviewIndex + 1} (${currentImage.width}×${currentImage.height}): 当前${currentSize.width}×${currentSize.height}, 建议${suggestedSize.width}×${suggestedSize.height}, 宽度比例${widthRatio.toFixed(2)}, 高度比例${heightRatio.toFixed(2)}`);
            
            // 宽度或高度有一个在0.8-1.2范围内就认为符合要求
            return (widthRatio >= 0.8 && widthRatio <= 1.2) || (heightRatio >= 0.8 && heightRatio <= 1.2);
          }
        }
      }
    }
    return false;
  };

  // 计算当前水印的实际尺寸
  const getCurrentWatermarkSize = () => {
    if (watermarkConfig.type === 'text') {
      // 文字水印尺寸计算
      const fontSize = watermarkConfig.fontSize || 24;
      const text = watermarkConfig.text || 'AI生成';
      const padding = 18.66; // 9.33 * 2 (左右padding)
      
      // 创建临时canvas来测量文字宽度
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
        const textWidth = tempCtx.measureText(text).width;
        
        // 计算多行文字的高度
        const lineHeight = fontSize * 1.2;
        const lines = Math.ceil(text.length / 12); // 每12个字符一行
        const textHeight = lines * lineHeight;
        
        return {
          width: Math.round(textWidth + padding),
          height: Math.round(textHeight + padding)
        };
      }
    } else if (watermarkConfig.type === 'image') {
      // 图片水印尺寸计算 - 需要基于当前图片尺寸
      if (images.length > 0 && currentPreviewIndex >= 0) {
        const currentImage = images[currentPreviewIndex];
        if (currentImage.width && currentImage.height) {
          const imageWidth = currentImage.width;
          const imageHeight = currentImage.height;
          const shortSide = Math.min(imageWidth, imageHeight);
          const maxWatermarkSize = shortSide * 0.15; // 最大15%的短边
          
          // 假设水印图片是正方形（常见情况），如果不是正方形会有偏差
          const baseWatermarkSize = Math.min(maxWatermarkSize, 200); // 限制最大200px
          const sizeMultiplier = watermarkConfig.watermarkSize || 1.0;
          const finalSize = baseWatermarkSize * sizeMultiplier;
          
          return {
            width: Math.round(finalSize),
            height: Math.round(finalSize) // 假设正方形水印
          };
        }
      }
      
      // 如果没有当前图片，使用默认值
      const defaultSize = 120;
      const sizeMultiplier = watermarkConfig.watermarkSize || 1.0;
      return {
        width: Math.round(defaultSize * sizeMultiplier),
        height: Math.round(defaultSize * sizeMultiplier)
      };
    }
    return null;
  };

  // 水印预览覆盖层组件 - 完全模拟Canvas绘制逻辑
  const WatermarkPreviewOverlay = ({ watermarkConfig, outputConfig, imageElement }: {
    watermarkConfig: WatermarkConfigType;
    outputConfig: OutputConfigType;
    imageElement: ImageFile;
  }) => {
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

    useEffect(() => {
      if (imageElement.url) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          
          // 计算显示尺寸 - 保持图片原始比例
          const maxWidth = 800;
          const maxHeight = 600;
          const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
          setDisplaySize({
            width: img.naturalWidth * scale,
            height: img.naturalHeight * scale
          });
        };
        img.src = imageElement.url;
      }
    }, [imageElement.url]);

    if (!imageSize.width || !displaySize.width) return null;

    // 完全模拟Canvas的绘制逻辑
    const outputScale = outputConfig.scale || 1;
    const previewScale = displaySize.width / imageSize.width;
    
    // 计算Canvas中的实际尺寸
    let canvasFontSize = (watermarkConfig.fontSize || 24) * outputScale;
    const canvasPadding = 9.33 * outputScale; // 6 + 3.33pt (增加更多左右边距，让文字不局促)
    const canvasBorderRadius = 6 * outputScale;
    const canvasBorderWidth = (watermarkConfig.borderWidth || 2) * outputScale;
    const canvasMargin = (watermarkConfig.margin || 15) * outputScale;
    
    // 自适应字体大小 - 模拟后端的自适应逻辑
    const maxTextWidth = Math.min(imageSize.width * 0.8, 800);
    const testFontSize = (fontSize: number) => {
      // 创建一个临时的canvas来测试文字宽度
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.font = `${fontSize}px ${watermarkConfig.font || 'SourceHanSansCN'}`;
        const textWidth = tempCtx.measureText(watermarkConfig.text || '').width;
        return textWidth <= maxTextWidth;
      }
      return true;
    };
    
    // 如果字体太大，逐步减小直到合适
    while (canvasFontSize > 12 * outputScale && !testFontSize(canvasFontSize)) {
      canvasFontSize -= 2 * outputScale;
    }
    
    // 在预览中按比例缩放
    const previewFontSize = canvasFontSize * previewScale;
    const previewPadding = canvasPadding * previewScale;
    const previewBorderRadius = canvasBorderRadius * previewScale;
    const previewBorderWidth = canvasBorderWidth * previewScale;
    const previewMargin = canvasMargin * previewScale;

    // 文本自动换行 - 与WatermarkProcessor保持一致
    const wrapText = (text: string): string[] => {
      if (!text) return [];
      // 每12个字符换一行，与后端逻辑保持一致
      const chars = Array.from(text);
      const lines: string[] = [];
      let currentLine = '';
      
      for (let i = 0; i < chars.length; i++) {
        currentLine += chars[i];
        
        // 每12个字符换一行，或者到达文本末尾
        if (currentLine.length >= 12 || i === chars.length - 1) {
          lines.push(currentLine);
          currentLine = '';
        }
      }
      
      return lines;
    };

    // 计算位置 - 完全模拟Canvas的位置计算
    const getPosition = () => {
      const margin = previewMargin;
      switch (watermarkConfig.position) {
        case 'top-left':
          return { top: `${margin}px`, left: `${margin}px` };
        case 'top-right':
          return { top: `${margin}px`, right: `${margin}px` };
        case 'bottom-left':
          return { bottom: `${margin}px`, left: `${margin}px` };
        case 'bottom-right':
          return { bottom: `${margin}px`, right: `${margin}px` };
        default:
          return { top: `${margin}px`, left: `${margin}px` };
      }
    };

    // 计算多行文本的总高度
    const lines = wrapText(watermarkConfig.text || '');
    const lineHeight = previewFontSize * 1.2; // 行高为字体大小的1.2倍
    const totalTextHeight = lines.length * lineHeight;

    return (
      <div
        style={{
          position: 'absolute',
          ...getPosition(),
          padding: watermarkConfig.borderStyle === 'none' ? '0' : `${previewPadding}px`,
          borderRadius: watermarkConfig.borderStyle === 'none' ? '0' : `${previewBorderRadius}px`,
          fontSize: `${previewFontSize}px`,
          fontFamily: watermarkConfig.font || 'SourceHanSansCN',
          color: watermarkConfig.color || '#ffffff',
          opacity: (watermarkConfig.textOpacity || 100) / 100,
          lineHeight: `${lineHeight}px`,
          whiteSpace: 'pre-line',
          pointerEvents: 'none',
          zIndex: 10,
          minHeight: watermarkConfig.borderStyle === 'none' ? 'auto' : `${totalTextHeight + previewPadding * 2}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          ...(watermarkConfig.borderStyle === 'none' && {
            background: 'transparent',
            border: 'none'
          }),
          ...(watermarkConfig.borderStyle === 'outline' && {
            background: 'transparent',
            border: `${previewBorderWidth}px solid ${hexToRgba(watermarkConfig.borderColor || '#000000', (watermarkConfig.borderOpacity || 100) / 100)}`,
          }),
          ...(watermarkConfig.borderStyle === 'solid' && {
            background: hexToRgba(watermarkConfig.backgroundColor || '#000000', (watermarkConfig.backgroundOpacity || 80) / 100),
            border: 'none',
          }),
          filter: 'none'
        }}
      >
        {lines.map((line, index) => (
          <div key={index} style={{ textAlign: 'center' }}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #f8faff 0%, #e0f2fe 100%)', 
        borderBottom: '2px solid #3b82f6',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100px',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <span style={{ 
              color: '#ffffff', 
              fontSize: '24px', 
              fontWeight: 'bold',
              fontFamily: 'serif'
            }}>
              AI
            </span>
          </div>
          <div>
            <Title level={2} style={{ 
              margin: 0, 
              color: '#1a365d',
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '1px',
              lineHeight: '1.2'
            }}>
              AI水印小助手
            </Title>
            <Paragraph style={{ 
              margin: 0, 
              color: '#3b82f6', 
              fontSize: '14px',
              fontWeight: '500',
              opacity: '0.8',
              lineHeight: '1.4'
            }}>
              一键批量添加AI标识水印，符合法规要求
            </Paragraph>
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            cursor: 'pointer',
            color: '#3b82f6',
            fontWeight: '500',
            fontSize: '16px',
            padding: '8px 16px',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            const qrCode = e.currentTarget.querySelector('.qr-code') as HTMLElement;
            if (qrCode) {
              qrCode.style.display = 'block';
            }
          }}
          onMouseLeave={(e) => {
            const qrCode = e.currentTarget.querySelector('.qr-code') as HTMLElement;
            if (qrCode) {
              qrCode.style.display = 'none';
            }
          }}
        >
          公众号@阿真Irene
          <div
            className="qr-code"
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              display: 'none',
              background: '#fff',
              padding: '12px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              zIndex: 1000
            }}
          >
            <img
              src="/qrcode"
              alt="二维码"
              style={{
                width: '120px',
                height: '120px',
                display: 'block'
              }}
            />
          </div>
        </div>
      </Header>

      <Content style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>


        {/* 图片上传 */}
        <ImageUpload 
          onImagesSelected={handleImagesSelected}
          disabled={false}
        />

        {images.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div className="step-indicator">
              <div className="step-number">2</div>
              <div className="step-text">配置水印</div>
            </div>
            
            {/* 响应式布局 */}
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? '16px' : '24px', 
              alignItems: 'flex-start',
              marginTop: '20px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              {/* 左侧：水印配置区域 */}
              <div style={{ flex: '1', minWidth: '0' }}>
                {/* 水印设置面板 */}
                <div style={{ 
                  background: '#fff', 
                  padding: isMobile ? '16px' : '24px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  marginBottom: isMobile ? '16px' : '24px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: isMobile ? '16px' : '20px' 
                  }}>
                    <h3 style={{ 
                      color: '#1a365d', 
                      fontSize: isMobile ? '16px' : '18px',
                      margin: 0
                    }}>水印设置</h3>
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <Button
                        size="small"
                        onClick={() => setShowPresetModal(true)}
                        style={{ 
                          background: '#3b82f6', 
                          color: '#fff',
                          border: 'none',
                          height: '28px',
                          padding: '0 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        保存预设
                      </Button>
                      {presets.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                if (e.target.value === 'manage-presets') {
                                  setShowPresetManagement(true);
                                } else {
                                  const preset = presets.find(p => p.id === e.target.value);
                                  if (preset) loadPreset(preset);
                                }
                                e.target.value = '';
                              }
                            }}
                            onMouseDown={handleLongPressStart}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onTouchStart={handleLongPressStart}
                            onTouchEnd={handleLongPressEnd}
                            style={{
                              height: '28px',
                              padding: '0 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '12px',
                              background: '#f9fafb',
                              color: '#374151',
                              minWidth: '100px',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 8px center',
                              backgroundSize: '12px 12px',
                              paddingRight: '28px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              cursor: 'pointer'
                            }}
                            defaultValue=""
                          >
                            <option value="">加载预设</option>
                            {presets.map(preset => (
                              <option key={preset.id} value={preset.id}>
                                {preset.name}
                              </option>
                            ))}
                            <option value="manage-presets">管理预设</option>
                          </select>
                          {showPresetManagement && (
                            <div style={{
                              position: 'absolute',
                              top: '32px',
                              left: '0',
                              right: '0',
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              zIndex: 1000,
                              padding: '8px 0'
                            }}>
                              <div style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                color: '#6b7280',
                                borderBottom: '1px solid #f3f4f6'
                              }}>
                                预设管理
                              </div>
                              {presets.map(preset => (
                                <div key={preset.id} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}>
                                  <span style={{ color: '#374151' }}>{preset.name}</span>
                                  <button
                                    onClick={() => {
                                      deletePreset(preset.id);
                                      setShowPresetManagement(false);
                                    }}
                                    style={{
                                      background: '#ef4444',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    删除
                                  </button>
                                </div>
                              ))}
                              <div style={{
                                padding: '8px 12px',
                                borderTop: '1px solid #f3f4f6'
                              }}>
                                <button
                                  onClick={() => {
                                    clearAllPresets();
                                    setShowPresetManagement(false);
                                  }}
                                  style={{
                                    background: '#f59e0b',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}
                                >
                                  清空预设
                                </button>
                              </div>
                              <div style={{
                                padding: '4px 12px',
                                textAlign: 'center'
                              }}>
                                <button
                                  onClick={exitPresetManagement}
                                  style={{
                                    background: '#6b7280',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  关闭
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <select
                        onChange={(e) => {
                          if (e.target.value === 'export-json') {
                            exportPresetsToJSON();
                          } else if (e.target.value === 'import-json') {
                            document.getElementById('import-json-input')?.click();
                          } else if (e.target.value === 'save-png') {
                            saveWatermarkAsPNG();
                          }
                          e.target.value = '';
                        }}
                        style={{
                          height: '28px',
                          padding: '0 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          background: '#f9fafb',
                          color: '#374151',
                          minWidth: '100px',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '12px 12px',
                          paddingRight: '28px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                        defaultValue=""
                      >
                        <option value="">更多操作</option>
                        {presets.length > 0 && (
                          <option value="export-json">导出JSON</option>
                        )}
                        <option value="import-json">导入JSON</option>
                        {watermarkConfig.type === 'text' && (
                          <option value="save-png">保存PNG</option>
                        )}
                      </select>
                      <input
                        type="file"
                        accept=".json"
                        onChange={importPresetsFromJSON}
                        style={{ display: 'none' }}
                        id="import-json-input"
                      />
                    </div>
                  </div>
                  
                  {/* 预设水印样式 */}
                  <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: isMobile ? '10px' : '12px', 
                      color: '#1a365d', 
                      fontWeight: '500',
                      fontSize: isMobile ? '14px' : '16px'
                    }}>
                      预设样式:
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      gap: isMobile ? '6px' : '8px', 
                      flexWrap: 'wrap' 
                    }}>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#ffffff',
                          textOpacity: 100,
                          backgroundColor: '#000000',
                          backgroundOpacity: 90,
                          borderStyle: 'solid',
                          borderColor: '#000000',
                          borderWidth: 1,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: '#000000', 
                          color: '#ffffff',
                          border: '1px solid #000000'
                        }}
                      >
                        白字黑底
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#000000',
                          textOpacity: 100,
                          backgroundColor: '#ffffff',
                          backgroundOpacity: 100,
                          borderStyle: 'solid',
                          borderColor: '#000000',
                          borderWidth: 1,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: '#ffffff', 
                          color: '#000000',
                          border: '1px solid #000000'
                        }}
                      >
                        黑字白底
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#ffffff',
                          textOpacity: 100,
                          backgroundColor: '#3b82f6',
                          backgroundOpacity: 90,
                          borderStyle: 'solid',
                          borderColor: '#3b82f6',
                          borderWidth: 1,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: '#3b82f6', 
                          color: '#ffffff',
                          border: '1px solid #3b82f6'
                        }}
                      >
                        蓝底白字
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#000000',
                          textOpacity: 100,
                          backgroundColor: '#fbbf24',
                          backgroundOpacity: 90,
                          borderStyle: 'solid',
                          borderColor: '#fbbf24',
                          borderWidth: 1,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: '#fbbf24', 
                          color: '#000000',
                          border: '1px solid #fbbf24'
                        }}
                      >
                        黄底黑字
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#ffffff',
                          textOpacity: 100,
                          backgroundColor: '#ffffff',
                          backgroundOpacity: 100,
                          borderStyle: 'outline',
                          borderColor: '#ffffff',
                          borderWidth: 3,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: '#f0f0f0', 
                          color: '#333333',
                          border: '1px solid #cccccc'
                        }}
                      >
                        白底白字
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#000000',
                          textOpacity: 100,
                          backgroundColor: 'transparent',
                          backgroundOpacity: 0,
                          borderStyle: 'outline',
                          borderColor: '#000000',
                          borderWidth: 2,
                          borderOpacity: 100,
                          margin: 15
                        })}
                        style={{ 
                          background: 'transparent', 
                          color: '#000000',
                          border: '1px solid #000000'
                        }}
                      >
                        黑边黑字
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#000000',
                          textOpacity: 100,
                          backgroundColor: 'transparent',
                          backgroundOpacity: 0,
                          borderStyle: 'none',
                          borderColor: 'transparent',
                          borderWidth: 0,
                          borderOpacity: 0,
                          margin: 15
                        })}
                        style={{ 
                          background: 'transparent', 
                          color: '#000000',
                          border: '1px solid #000000'
                        }}
                      >
                        纯文字
                      </Button>
                    </div>
                  </div>

                  {/* 常用文字模板 */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                      常用文字模板:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig(prev => ({ ...prev, text: 'AI生成' }))}
                        style={{ 
                          background: '#f0f0f0', 
                          color: '#666',
                          border: '1px solid #ddd'
                        }}
                      >
                        AI生成
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig(prev => ({ ...prev, text: '人工智能生成' }))}
                        style={{ 
                          background: '#f0f0f0', 
                          color: '#666',
                          border: '1px solid #ddd'
                        }}
                      >
                        人工智能生成
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig(prev => ({ ...prev, text: 'AI合成' }))}
                        style={{ 
                          background: '#f0f0f0', 
                          color: '#666',
                          border: '1px solid #ddd'
                        }}
                      >
                        AI合成
                      </Button>
                    </div>
                  </div>


                  
                  {/* 水印类型 */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                      水印类型:
                    </label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label>
                        <input
                          type="radio"
                          checked={watermarkConfig.type === 'text'}
                          onChange={() => setWatermarkConfig(prev => ({ ...prev, type: 'text' }))}
                          style={{ marginRight: '8px' }}
                        />
                        文字水印
                      </label>
                      <label>
                        <input
                          type="radio"
                          checked={watermarkConfig.type === 'image'}
                          onChange={() => setWatermarkConfig(prev => ({ ...prev, type: 'image' }))}
                          style={{ marginRight: '8px' }}
                        />
                        图片水印
                      </label>
                    </div>
                  </div>

                  {/* 文字水印设置 */}
                  {watermarkConfig.type === 'text' && (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          水印文字:
                        </label>
                        <input
                          type="text"
                          value={watermarkConfig.text || ''}
                          onChange={(e) => {
                            const text = e.target.value;
                            if (text.length <= 50) {
                              setWatermarkConfig(prev => ({ ...prev, text }));
                            }
                          }}
                          maxLength={50}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #3b82f6',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="输入水印文字（最多50字）"
                        />
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280', 
                          marginTop: '4px',
                          textAlign: 'right'
                        }}>
                          {watermarkConfig.text ? watermarkConfig.text.length : 0}/50
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ flex: '1' }}>
                          <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                            字体:
                          </label>
                          <select
                            value={watermarkConfig.font || 'SourceHanSansCN'}
                            onChange={(e) => setWatermarkConfig(prev => ({ ...prev, font: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '12px 40px 12px 16px',
                              border: '1px solid #3b82f6',
                              borderRadius: '8px',
                              fontSize: '14px',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%233b82f6' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 12px center',
                              backgroundSize: '16px 16px'
                            }}
                          >
                            <option value="SourceHanSansCN">思源黑体</option>
                            <option value="SmileySans">得意黑</option>
                            <option value="HuiWenMingChao">汇文明朝体</option>
                            <option value="XiangcuiDengcusong">香脆等粗宋</option>
                            <option value="ZhanKuCangErYuYang">站酷仓耳渔阳体</option>
                            <option value="JiangChengHeiTi-300W">江城黑体</option>
                            <option value="LXGWWenKaiMono-Light">霞鹜文楷</option>
                          </select>
                        </div>
                        <div style={{ flex: '1' }}>
                          <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                            字体颜色:
                          </label>
                          <input
                            type="color"
                            value={watermarkConfig.color || '#ffffff'}
                            onChange={(e) => setWatermarkConfig(prev => ({ ...prev, color: e.target.value }))}
                            style={{
                              width: '100%',
                              height: '48px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: 'transparent',
                              marginTop: '-3px'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          文字透明度: {watermarkConfig.textOpacity || 100}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={watermarkConfig.textOpacity || 100}
                          onChange={(e) => setWatermarkConfig(prev => ({ ...prev, textOpacity: parseInt(e.target.value) }))}
                          style={{
                            width: '100%',
                            height: '6px',
                            background: '#3b82f6',
                            borderRadius: '3px',
                            outline: 'none'
                          }}
                        />
                        <div style={{ position: 'relative', fontSize: '12px', color: '#666', marginTop: '4px', height: '16px' }}>
                          <span style={{ position: 'absolute', left: '0%' }}>0%</span>
                          <span style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)' }}>25%</span>
                          <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>50%</span>
                          <span style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)' }}>75%</span>
                          <span style={{ position: 'absolute', right: '0%' }}>100%</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <label style={{ color: '#1a365d', fontWeight: '500' }}>
                            字体大小: {watermarkConfig.fontSize || 24}px
                          </label>
                          {(() => {
                            const currentSize = getCurrentWatermarkSize();
                            if (currentSize) {
                              return (
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#1e40af',
                                  fontWeight: '500',
                                  padding: '4px 8px',
                                  background: '#f0f9ff',
                                  border: '1px solid #3b82f6',
                                  borderRadius: '4px'
                                }}>
                                  📐 {currentSize.width}×{currentSize.height}px
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="120"
                          value={watermarkConfig.fontSize || 24}
                          onChange={(e) => setWatermarkConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                          style={{
                            width: '100%',
                            height: '6px',
                            background: '#3b82f6',
                            borderRadius: '3px',
                            outline: 'none'
                          }}
                        />
                        <div style={{ position: 'relative', fontSize: '12px', color: '#666', marginTop: '4px', height: '16px' }}>
                          <span style={{ position: 'absolute', left: '0%' }}>8px</span>
                          <span style={{ position: 'absolute', left: '14.3%', transform: 'translateX(-50%)' }}>24px</span>
                          <span style={{ position: 'absolute', left: '35.7%', transform: 'translateX(-50%)' }}>48px</span>
                          <span style={{ position: 'absolute', left: '57.1%', transform: 'translateX(-50%)' }}>72px</span>
                          <span style={{ position: 'absolute', left: '78.6%', transform: 'translateX(-50%)' }}>96px</span>
                          <span style={{ position: 'absolute', right: '0%' }}>120px</span>
                        </div>
                      </div>



                      {/* 背景样式设置 */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          背景样式:
                        </label>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ marginRight: '16px' }}>
                            <input
                              type="radio"
                              checked={watermarkConfig.borderStyle === 'none'}
                              onChange={() => setWatermarkConfig(prev => ({ ...prev, borderStyle: 'none' }))}
                              style={{ marginRight: '8px' }}
                            />
                            无背景
                          </label>
                          <label style={{ marginRight: '16px' }}>
                            <input
                              type="radio"
                              checked={watermarkConfig.borderStyle === 'solid'}
                              onChange={() => setWatermarkConfig(prev => ({ ...prev, borderStyle: 'solid' }))}
                              style={{ marginRight: '8px' }}
                            />
                            纯色背景
                          </label>
                          <label>
                            <input
                              type="radio"
                              checked={watermarkConfig.borderStyle === 'outline'}
                              onChange={() => setWatermarkConfig(prev => ({ ...prev, borderStyle: 'outline' }))}
                              style={{ marginRight: '8px' }}
                            />
                            边框样式
                          </label>
                        </div>

                        {watermarkConfig.borderStyle !== 'none' && (
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1' }}>
                              <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                                <strong>{watermarkConfig.borderStyle === 'outline' ? '边框颜色' : '背景颜色'}:</strong>
                              </label>
                              <input
                                type="color"
                                value={watermarkConfig.borderStyle === 'outline' ? (watermarkConfig.borderColor || '#000000') : (watermarkConfig.backgroundColor || '#000000')}
                                onChange={(e) => {
                                  if (watermarkConfig.borderStyle === 'outline') {
                                    setWatermarkConfig(prev => ({ ...prev, borderColor: e.target.value }));
                                  } else {
                                    setWatermarkConfig(prev => ({ ...prev, backgroundColor: e.target.value }));
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  height: '40px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  background: 'transparent'
                                }}
                              />
                            </div>
                            <div style={{ flex: '1', marginTop: '5px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                                <strong>{watermarkConfig.borderStyle === 'outline' ? '边框透明度' : '背景透明度'}:</strong> {watermarkConfig.borderStyle === 'outline' ? (watermarkConfig.borderOpacity || 100) : (watermarkConfig.backgroundOpacity || 80)}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={watermarkConfig.borderStyle === 'outline' ? (watermarkConfig.borderOpacity || 100) : (watermarkConfig.backgroundOpacity || 80)}
                                onChange={(e) => {
                                  if (watermarkConfig.borderStyle === 'outline') {
                                    setWatermarkConfig(prev => ({ ...prev, borderOpacity: parseInt(e.target.value) }));
                                  } else {
                                    setWatermarkConfig(prev => ({ ...prev, backgroundOpacity: parseInt(e.target.value) }));
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#3b82f6',
                                  borderRadius: '3px',
                                  outline: 'none',
                                  marginTop: '5px'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 边框宽度设置（仅边框样式时显示） */}
                        {watermarkConfig.borderStyle === 'outline' && (
                          <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                              <strong>边框宽度:</strong> {watermarkConfig.borderWidth || 2}px
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={watermarkConfig.borderWidth || 2}
                              onChange={(e) => setWatermarkConfig(prev => ({ ...prev, borderWidth: parseInt(e.target.value) }))}
                              style={{
                                width: '100%',
                                height: '6px',
                                background: '#3b82f6',
                                borderRadius: '3px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 图片水印设置 */}
                  {watermarkConfig.type === 'image' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                        上传水印图片:
                      </label>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        marginBottom: '8px',
                        padding: '6px 8px',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        border: '1px solid #e5e7eb'
                      }}>
                        💡 提示：可上传最多3个水印图片作为备选，点击选择要使用的水印
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            // 限制最多3个文件
                            const limitedFiles = files.slice(0, 3);
                            setWatermarkConfig(prev => ({ 
                              ...prev, 
                              customImages: limitedFiles,
                              customImage: limitedFiles[0], // 保持向后兼容
                              selectedWatermarkIndex: 0 // 默认选择第一个
                            }));
                          }
                          // 清空文件输入框，避免显示多个文件
                          e.target.value = '';
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                      {(watermarkConfig.customImages && watermarkConfig.customImages.length > 0) && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px 12px',
                          background: '#f0f9ff',
                          border: '1px solid #3b82f6',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#1e40af'
                        }}>
                          <div style={{ 
                            marginBottom: '8px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}>
                            <span>✅ 已选择 {watermarkConfig.customImages.length} 个水印图片 (最多3个)</span>
                            <button
                              onClick={() => setWatermarkConfig(prev => ({ 
                                ...prev, 
                                customImages: undefined,
                                customImage: undefined 
                              }))}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#dc2626';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                              }}
                            >
                              🗑️ 清除全部
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {watermarkConfig.customImages.map((file, index) => (
                              <div key={file.name + file.lastModified} style={{ position: 'relative' }}>
                                <div
                                  onClick={() => {
                                    setWatermarkConfig(prev => ({ 
                                      ...prev, 
                                      selectedWatermarkIndex: index,
                                      customImage: file // 更新当前选中的图片
                                    }));
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    border: watermarkConfig.selectedWatermarkIndex === index ? '2px solid #3b82f6' : '1px dashed #94a3b8',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    background: watermarkConfig.selectedWatermarkIndex === index ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`水印图片预览 ${index + 1}`}
                                    onError={(e) => {
                                      console.error('水印图片预览加载失败:', e);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    style={{
                                      maxWidth: '80px',
                                      maxHeight: '60px',
                                      borderRadius: '4px',
                                      objectFit: 'contain',
                                      background: 'transparent',
                                      imageRendering: 'auto',
                                      display: 'block'
                                    }}
                                  />
                                  {/* 选中标识 */}
                                  {watermarkConfig.selectedWatermarkIndex === index && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      ✓
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    const newImages = watermarkConfig.customImages?.filter((_, i) => i !== index);
                                    const newSelectedIndex = watermarkConfig.selectedWatermarkIndex === index ? 0 : 
                                      (watermarkConfig.selectedWatermarkIndex && watermarkConfig.selectedWatermarkIndex > index ? 
                                        watermarkConfig.selectedWatermarkIndex - 1 : watermarkConfig.selectedWatermarkIndex);
                                    
                                    setWatermarkConfig(prev => ({ 
                                      ...prev, 
                                      customImages: newImages,
                                      customImage: newImages?.[newSelectedIndex || 0],
                                      selectedWatermarkIndex: newSelectedIndex
                                    }));
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 水印大小设置 - 仅图片水印 */}
                  {watermarkConfig.type === 'image' && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={{ color: '#1a365d', fontWeight: '500' }}>
                          水印大小: {Math.round((watermarkConfig.watermarkSize || 1.0) * 100)}%
                        </label>
                        {(() => {
                          const currentSize = getCurrentWatermarkSize();
                          if (currentSize) {
                            return (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#1e40af',
                                fontWeight: '500',
                                padding: '4px 8px',
                                background: '#f0f9ff',
                                border: '1px solid #3b82f6',
                                borderRadius: '4px'
                              }}>
                                📐 {currentSize.width}×{currentSize.height}px
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="2.0"
                        step="0.1"
                        value={watermarkConfig.watermarkSize || 1.0}
                        onChange={(e) => setWatermarkConfig(prev => ({ ...prev, watermarkSize: parseFloat(e.target.value) }))}
                        style={{
                          width: '100%',
                          height: '6px',
                          background: '#3b82f6',
                          borderRadius: '3px',
                          outline: 'none'
                        }}
                      />
                      <div style={{ position: 'relative', fontSize: '12px', color: '#666', marginTop: '4px', height: '16px' }}>
                        <span style={{ position: 'absolute', left: '0%' }}>30%</span>
                        <span style={{ position: 'absolute', left: '20%', transform: 'translateX(-50%)' }}>60%</span>
                        <span style={{ position: 'absolute', left: '40%', transform: 'translateX(-50%)' }}>100%</span>
                        <span style={{ position: 'absolute', left: '60%', transform: 'translateX(-50%)' }}>140%</span>
                        <span style={{ position: 'absolute', left: '80%', transform: 'translateX(-50%)' }}>180%</span>
                        <span style={{ position: 'absolute', right: '0%' }}>200%</span>
                      </div>
                    </div>
                  )}

                  {/* 图片水印透明度设置 - 仅图片水印 */}
                  {watermarkConfig.type === 'image' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                        图片透明度: {watermarkConfig.imageOpacity || 100}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={watermarkConfig.imageOpacity || 100}
                        onChange={(e) => setWatermarkConfig(prev => ({ ...prev, imageOpacity: parseInt(e.target.value) }))}
                        style={{
                          width: '100%',
                          height: '6px',
                          background: '#3b82f6',
                          borderRadius: '3px',
                          outline: 'none'
                        }}
                      />
                      <div style={{ position: 'relative', fontSize: '12px', color: '#666', marginTop: '4px', height: '16px' }}>
                        <span style={{ position: 'absolute', left: '0%' }}>0%</span>
                        <span style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)' }}>25%</span>
                        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>50%</span>
                        <span style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)' }}>75%</span>
                        <span style={{ position: 'absolute', right: '0%' }}>100%</span>
                      </div>
                    </div>
                  )}


                  {/* 水印边距设置 - 文字和图片水印共用 */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                      水印边距: {watermarkConfig.margin || 15}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={watermarkConfig.margin || 15}
                      onChange={(e) => setWatermarkConfig(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                      style={{
                        width: '100%',
                        height: '6px',
                        background: '#3b82f6',
                        borderRadius: '3px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ position: 'relative', fontSize: '12px', color: '#666', marginTop: '4px', height: '16px' }}>
                      <span style={{ position: 'absolute', left: '0%' }}>0px</span>
                      <span style={{ position: 'absolute', left: '20%', transform: 'translateX(-50%)' }}>20px</span>
                      <span style={{ position: 'absolute', left: '40%', transform: 'translateX(-50%)' }}>40px</span>
                      <span style={{ position: 'absolute', left: '60%', transform: 'translateX(-50%)' }}>60px</span>
                      <span style={{ position: 'absolute', left: '80%', transform: 'translateX(-50%)' }}>80px</span>
                      <span style={{ position: 'absolute', right: '0%' }}>100px</span>
                    </div>
                  </div>

                  {/* 水印位置设置 - 文字和图片水印共用 */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                      水印位置:
                    </label>
                    <select
                      value={watermarkConfig.position}
                      onChange={(e) => setWatermarkConfig(prev => ({ ...prev, position: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '14px',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%233b82f6' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px 16px'
                      }}
                    >
                      <option value="top-left">左上角</option>
                      <option value="top-right">右上角</option>
                      <option value="bottom-left">左下角</option>
                      <option value="bottom-right">右下角</option>
                    </select>
                  </div>
                </div>

                {/* 输出设置 */}
                <div style={{ 
                  background: '#fff', 
                  padding: isMobile ? '16px' : '24px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  marginBottom: isMobile ? '16px' : '24px'
                }}>
                  <div className="step-indicator">
                    <div className="step-number">3</div>
                    <div className="step-text">输出设置</div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '12px' : '20px', 
                    marginBottom: isMobile ? '16px' : '20px',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: isMobile ? '6px' : '8px', 
                        color: '#1a365d', 
                        fontSize: isMobile ? '13px' : '14px' 
                      }}>
                        图片质量:
                        {images.length > 0 && images[currentPreviewIndex] && images[currentPreviewIndex].width && images[currentPreviewIndex].height && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            fontWeight: 'normal',
                            marginLeft: '8px'
                          }}>
                            ( {outputConfig.quality === 0.1 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.1 / 1000) + ' KB' :
                              outputConfig.quality === 0.3 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.3 / 1000) + ' KB' :
                              outputConfig.quality === 0.5 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.5 / 1000) + ' KB' :
                              outputConfig.quality === 0.7 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.7 / 1000) + ' KB' :
                              outputConfig.quality === 0.8 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.8 / 1000) + ' KB' :
                              outputConfig.quality === 0.9 ? '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height * 0.9 / 1000) + ' KB' :
                              '约 ' + Math.round(images[currentPreviewIndex].width * images[currentPreviewIndex].height / 1000) + ' KB' } )
                          </span>
                        )}
                      </label>
                      <select
                        value={outputConfig.quality}
                        onChange={(e) => setOutputConfig(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: isMobile ? '10px 35px 10px 12px' : '12px 40px 12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: isMobile ? '13px' : '14px',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%233b82f6' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px 16px'
                        }}
                      >
                        <option value={0.1}>10%</option>
                        <option value={0.3}>30%</option>
                        <option value={0.5}>50%</option>
                        <option value={0.7}>70%</option>
                        <option value={0.8}>80%</option>
                        <option value={0.9}>90%</option>
                        <option value={1.0}>100%</option>
                      </select>
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: isMobile ? '6px' : '8px', 
                        color: '#1a365d', 
                        fontSize: isMobile ? '13px' : '14px' 
                      }}>
                        缩放比例:
                        {images.length > 0 && images[currentPreviewIndex] && images[currentPreviewIndex].width && images[currentPreviewIndex].height && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            fontWeight: 'normal',
                            marginLeft: '8px'
                          }}>
                            ( {Math.round(images[currentPreviewIndex].width * (outputConfig.scale || 1))} × {Math.round(images[currentPreviewIndex].height * (outputConfig.scale || 1))} px )
                          </span>
                        )}
                      </label>
                      <select
                        value={outputConfig.scale}
                        onChange={(e) => setOutputConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%233b82f6' d='M4.427 6.427a.6.6 0 0 1 .848 0L8 9.152l2.725-2.725a.6.6 0 0 1 .848.848l-3.15 3.15a.6.6 0 0 1-.848 0l-3.15-3.15a.6.6 0 0 1 0-.848z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px 16px'
                        }}
                      >
                        <option value={0.1}>10%</option>
                        <option value={0.5}>50%</option>
                        <option value={0.7}>70%</option>
                        <option value={0.8}>80%</option>
                        <option value={0.9}>90%</option>
                        <option value={1.0}>100%</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* 右侧：预览和结果区域 */}
              <div style={{ flex: '1', minWidth: '0' }}>





                {/* 图片预览 */}
                <div style={{ 
                  background: '#fff', 
                  padding: '32px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  minHeight: '500px',
                  marginTop: '0'
                }}>
                                      <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '32px' 
                    }}>
                      <h3 style={{ color: '#1a365d', fontSize: '18px', margin: 0 }}>
                        {processedImages.length > 0 ? '处理结果' : '图片预览'}
                      </h3>
                      {images.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <Button
                            onClick={async () => {
                              // 单个图片下载 - 实际处理并添加水印
                              if (images.length > 0) {
                                try {
                                  message.loading('正在处理图片...', 0);
                                  const processor = new WatermarkProcessor();
                                  const blob = await processor.processImage(
                                    images[0].file,
                                    watermarkConfig,
                                    outputConfig
                                  );
                                  
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = images[0].name.replace(/\.[^/.]+$/, '') + '_watermarked.jpg';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(link.href);
                                  
                                  message.destroy();
                                  message.success('图片下载成功');
                                } catch (error) {
                                  console.error('图片处理失败:', error);
                                  message.destroy();
                                  message.error('图片处理失败');
                                }
                              }
                            }}
                            style={{
                              borderColor: '#3b82f6',
                              color: '#3b82f6',
                              fontSize: '14px',
                              fontWeight: '600',
                              height: '40px',
                              padding: '0 20px',
                              minWidth: '100px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
                            }}
                          >
                            📥 下载
                          </Button>
                          <Button
                            type="primary"
                            onClick={handleBatchDownload}
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              borderColor: '#3b82f6',
                              fontSize: '14px',
                              fontWeight: '600',
                              height: '40px',
                              padding: '0 20px',
                              minWidth: '120px',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            }}
                          >
                            📦 批量下载{images.length > 1 && ` (${images.length}张)`}
                          </Button>
                          <Button
                            onClick={handleClearAllImages}
                            style={{
                              borderColor: '#dc2626',
                              color: '#dc2626',
                              fontSize: '14px',
                              fontWeight: '600',
                              height: '40px',
                              padding: '0 20px',
                              minWidth: '100px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.2)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            🗑️ 清空图片
                          </Button>
                        </div>
                      )}
                    </div>
                  {images.length > 0 ? (
                    <div>
                      {/* 多图轮播控制 */}
                      {images.length > 1 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '16px',
                          padding: '12px 16px',
                          background: '#f8faff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <Button
                            size="small"
                            onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
                            disabled={currentPreviewIndex === 0 || images.length === 0}
                            style={{ minWidth: '60px' }}
                          >
                            上一张
                          </Button>
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#1a365d',
                            fontWeight: '500'
                          }}>
                            {currentPreviewIndex + 1} / {images.length}
                          </div>
                          <Button
                            size="small"
                            onClick={() => setCurrentPreviewIndex(Math.min(images.length - 1, currentPreviewIndex + 1))}
                            disabled={currentPreviewIndex === images.length - 1 || images.length === 0}
                            style={{ minWidth: '60px' }}
                          >
                            下一张
                          </Button>
                        </div>
                      )}
                      
                      {/* 图片预览区域 */}
                      <div className="preview-container" style={{ position: 'relative', display: 'inline-block' }}>
                        {/* 显示当前选中的图片 */}
                        {images.length > 0 && images[currentPreviewIndex] && (
                          <img
                            src={processedImages.length > 0 && processedImages[currentPreviewIndex] ? processedImages[currentPreviewIndex].processedUrl : images[currentPreviewIndex].url}
                            alt={images[currentPreviewIndex].name}
                            style={{
                              width: '100%',
                              maxHeight: 'none',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              border: '1px solid #ddd'
                            }}
                          />
                        )}
                        
                        {/* 实时水印预览覆盖层 - 只在未处理时显示 */}
                        {processedImages.length === 0 && watermarkConfig.type === 'text' && watermarkConfig.text && images[currentPreviewIndex] && (
                          <WatermarkPreviewOverlay
                            watermarkConfig={watermarkConfig}
                            outputConfig={outputConfig}
                            imageElement={images[currentPreviewIndex]}
                          />
                        )}
                        
                        {/* 图片水印预览 - 只显示选中的水印 */}
                        {watermarkConfig.type === 'image' && watermarkConfig.customImages && watermarkConfig.customImages.length > 0 && watermarkConfig.selectedWatermarkIndex !== undefined && (
                          (() => {
                            const selectedIndex = watermarkConfig.selectedWatermarkIndex;
                            const selectedFile = watermarkConfig.customImages[selectedIndex];
                            
                            if (!selectedFile) return null;
                            
                            return (
                              <img
                                key={selectedFile.name + selectedFile.lastModified}
                                src={URL.createObjectURL(selectedFile)}
                                alt={`选中的水印图片`}
                                onError={(e) => {
                                  console.error('图片水印加载失败:', e);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('图片水印加载成功，文件名:', selectedFile.name);
                                }}
                                style={{
                                  position: 'absolute',
                                  ...(watermarkConfig.position === 'top-left' ? { 
                                    top: `${watermarkConfig.margin || 15}px`, 
                                    left: `${watermarkConfig.margin || 15}px` 
                                  } : watermarkConfig.position === 'top-right' ? { 
                                    top: `${watermarkConfig.margin || 15}px`, 
                                    right: `${watermarkConfig.margin || 15}px` 
                                  } : watermarkConfig.position === 'bottom-left' ? { 
                                    bottom: `${watermarkConfig.margin || 15}px`, 
                                    left: `${watermarkConfig.margin || 15}px` 
                                  } : watermarkConfig.position === 'bottom-right' ? { 
                                    bottom: `${watermarkConfig.margin || 15}px`, 
                                    right: `${watermarkConfig.margin || 15}px` 
                                  } : {
                                    top: `${watermarkConfig.margin || 15}px`, 
                                    left: `${watermarkConfig.margin || 15}px` 
                                  }),
                                  maxWidth: `${120 * (watermarkConfig.watermarkSize || 1.0)}px`,
                                  maxHeight: `${80 * (watermarkConfig.watermarkSize || 1.0)}px`,
                                  borderRadius: '4px',
                                  border: '1px dashed #94a3b8',
                                  objectFit: 'contain',
                                  pointerEvents: 'none',
                                  background: 'transparent',
                                  imageRendering: 'auto',
                                  opacity: (watermarkConfig.imageOpacity || 100) / 100,
                                  zIndex: 10
                                }}
                              />
                            );
                          })()
                        )}
                      </div>
                      
                      {/* 图片信息 */}
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px 12px',
                        background: '#f8faff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <div>文件名: {images[currentPreviewIndex]?.name}</div>
                        <div>尺寸: {images[currentPreviewIndex]?.width} × {images[currentPreviewIndex]?.height}</div>
                        {(() => {
                          const currentImage = images[currentPreviewIndex];
                          if (currentImage?.width && currentImage?.height) {
                            const watermarkSize = calculateWatermarkSize(currentImage.width, currentImage.height);
                            if (watermarkSize) {
                              return (
                                <div style={{ 
                                  color: '#059669', 
                                  marginTop: '4px',
                                  padding: '4px 6px',
                                  background: '#f0fdf4',
                                  borderRadius: '4px',
                                  border: '1px solid #bbf7d0'
                                }}>
                                  📏 建议水印尺寸: <strong>{watermarkSize.width}×{watermarkSize.height}px</strong> (符合0.3%要求)
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                        
                        {/* 当前水印尺寸符合要求提醒 */}
                        {(() => {
                          const currentSize = getCurrentWatermarkSize();
                          if (currentSize) {
                            const isCompliant = checkWatermarkCompliance();
                            if (isCompliant) {
                              return (
                                <div style={{ 
                                  color: '#059669', 
                                  marginTop: '4px',
                                  padding: '4px 6px',
                                  background: '#f0fdf4',
                                  borderRadius: '4px',
                                  border: '1px solid #bbf7d0'
                                }}>
                                  ✅ 当前水印尺寸 <strong>{currentSize.width}×{currentSize.height}px</strong> 符合0.3%要求
                                </div>
                              );
                            } else {
                              return (
                                <div style={{ 
                                  color: '#dc2626', 
                                  marginTop: '4px',
                                  padding: '4px 6px',
                                  background: '#fef2f2',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca'
                                }}>
                                  ⚠️ 当前水印尺寸 <strong>{currentSize.width}×{currentSize.height}px</strong> 不符合0.3%要求
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                        {images.length > 1 && (
                          <div style={{ color: '#3b82f6', marginTop: '4px' }}>
                            💡 多图预览：使用上方按钮切换查看不同图片的水印效果
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#666',
                      fontSize: '14px'
                    }}>
                      请先上传图片
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>
        )}

        {/* 处理进度 */}

      </Content>
      
      {/* 保存预设模态框 */}
      {showPresetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            minWidth: '300px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#1a365d',
              fontSize: '18px'
            }}>保存水印预设</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#1a365d',
                fontWeight: '500'
              }}>
                预设名称:
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="请输入预设名称"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveCurrentAsPreset();
                  }
                }}
                autoFocus
              />
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <Button
                onClick={() => {
                  setShowPresetModal(false);
                  setPresetName('');
                }}
                style={{
                  background: '#f0f0f0',
                  color: '#666',
                  border: '1px solid #ddd'
                }}
              >
                取消
              </Button>
              <Button
                onClick={saveCurrentAsPreset}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none'
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default App;

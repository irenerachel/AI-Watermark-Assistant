import React, { useState, useCallback, useEffect } from 'react';
import { Layout, Button, message, Space, Typography, Divider } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import ImageUpload from './components/ImageUpload';
import WatermarkConfig from './components/WatermarkConfig';
import OutputConfig from './components/OutputConfig';
import ProcessingProgress from './components/ProcessingProgress';
import ResultDisplay from './components/ResultDisplay';
import WatermarkPreview from './components/WatermarkPreview';
import { ImageFile, WatermarkConfig as WatermarkConfigType, OutputConfig as OutputConfigType, ProcessingProgressData } from './types';
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
    backgroundColor: '#000000',
    backgroundOpacity: 80,
    borderStyle: 'solid',
    borderColor: '#000000',
    borderWidth: 2,
    borderOpacity: 100,
    position: 'top-left',
    margin: 15
  });

  const [outputConfig, setOutputConfig] = useState<OutputConfigType>({
    quality: 1.0,
    scale: 1.0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgressData>({
    current: 0,
    total: 0,
    percentage: 0,
    currentFileName: '',
  });

  // 最近水印配置历史
  const [recentWatermarks, setRecentWatermarks] = useState<WatermarkConfigType[]>([]);

  const [processedImages, setProcessedImages] = useState<ImageFile[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // 确保currentPreviewIndex在有效范围内
  useEffect(() => {
    if (images.length > 0 && currentPreviewIndex >= images.length) {
      setCurrentPreviewIndex(0);
    }
  }, [images.length, currentPreviewIndex]);



  const handleImagesSelected = useCallback((selectedImages: ImageFile[]) => {
    setImages(selectedImages);
  }, []);

  const handleProcessImages = async () => {
    if (images.length === 0) {
      message.warning('请先选择图片');
      return;
    }

    if (watermarkConfig.type === 'text' && !watermarkConfig.text) {
      message.warning('请输入水印文本');
      return;
    }

    if (watermarkConfig.type === 'image' && !watermarkConfig.customImage) {
      message.warning('请上传水印图片');
      return;
    }

    // 添加详细的调试信息
    console.log('=== 开始处理图片 ===');
    console.log('图片数量:', images.length);
    console.log('水印配置:', JSON.stringify(watermarkConfig, null, 2));
    console.log('输出配置:', JSON.stringify(outputConfig, null, 2));
    
    // 验证图片数据
    images.forEach((img, index) => {
      console.log(`图片 ${index + 1}:`, {
        name: img.name,
        size: img.size,
        file: img.file,
        fileType: img.file?.type,
        fileSize: img.file?.size,
        url: img.url
      });
    });
    
    // 测试Canvas支持
    try {
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      if (!testCtx) {
        throw new Error('浏览器不支持Canvas 2D上下文');
      }
      console.log('Canvas 2D上下文测试通过');
    } catch (error) {
      console.error('Canvas测试失败:', error);
      message.error('浏览器不支持Canvas功能');
      return;
    }

    setIsProcessing(true);
    setProgress({
      current: 0,
      total: images.length,
      percentage: 0,
      currentFileName: '',
    });

    const processedResults: ImageFile[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          percentage: ((i + 1) / images.length) * 100,
          currentFileName: image.name,
        }));

        try {
          console.log(`=== 处理图片 ${i + 1}/${images.length} ===`);
          console.log('图片名称:', image.name);
          console.log('文件大小:', image.file.size);
          console.log('文件类型:', image.file.type);
          console.log('文件对象:', image.file);
          
          // 验证文件
          if (!image.file || image.file.size === 0) {
            throw new Error('文件无效或为空');
          }
          
          // 验证水印配置
          if (watermarkConfig.type === 'text' && !watermarkConfig.text) {
            throw new Error('水印文本为空');
          }
          
          console.log('开始创建WatermarkProcessor...');
          const processor = new WatermarkProcessor();
          console.log('WatermarkProcessor创建成功');
          
          console.log('开始处理图片...');
          const processedBlob = await processor.processImage(
            image.file,
            watermarkConfig,
            outputConfig
          );
          console.log('图片处理完成:', image.name, '生成blob大小:', processedBlob.size);

          const processedUrl = URL.createObjectURL(processedBlob);
          const processedImage: ImageFile = {
            ...image,
            processed: true,
            processedUrl,
          };

          processedResults.push(processedImage);
          console.log(`图片 ${i + 1} 处理成功`);
        } catch (error) {
          console.error(`处理图片 ${image.name} 失败:`, error);
          console.error('错误详情:', error.message);
          console.error('错误堆栈:', error.stack);
          message.error(`处理图片 ${image.name} 失败: ${error.message}`);
        }
      }

      setProcessedImages(processedResults);
      message.success(`成功处理 ${processedResults.length} 张图片`);
    } catch (error) {
      console.error('批量处理失败:', error);
      message.error('批量处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearResults = () => {
    // 先清理URL对象，再清空状态
    processedImages.forEach(img => {
      if (img.processedUrl) {
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    
    // 清空状态
    setProcessedImages([]);
  };

  // 保存水印配置到最近历史
  const saveToRecentWatermarks = (config: WatermarkConfigType) => {
    const newRecent = [config, ...recentWatermarks.filter(item => 
      JSON.stringify(item) !== JSON.stringify(config)
    )].slice(0, 5); // 保留最近5个
    setRecentWatermarks(newRecent);
    localStorage.setItem('recentWatermarks', JSON.stringify(newRecent));
  };

  // 加载最近水印配置
  const loadRecentWatermarks = () => {
    const saved = localStorage.getItem('recentWatermarks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentWatermarks(parsed);
      } catch (error) {
        console.error('加载最近水印配置失败:', error);
      }
    }
  };

  // 应用最近水印配置
  const applyRecentWatermark = (config: WatermarkConfigType) => {
    setWatermarkConfig(config);
    message.success('已应用最近的水印配置');
  };

  // 清空所有图片
  const handleClearAllImages = () => {
    // 先清理所有URL对象，再清空状态
    [...images, ...processedImages].forEach(img => {
      if (img.url) URL.revokeObjectURL(img.url);
      if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
    });
    
    // 清空状态
    setImages([]);
    setProcessedImages([]);
    setCurrentPreviewIndex(0);
    
    message.success('已清空所有图片');
  };

  const handleReset = () => {
    // 只重置配置，保留图片
    setProcessedImages([]);
    setWatermarkConfig({
      type: 'text',
      text: 'AI生成',
      font: 'SourceHanSansCN',
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 80,
      borderStyle: 'solid',
      borderColor: '#000000',
      borderWidth: 2,
      borderOpacity: 100,
      position: 'top-left',
    });
    setOutputConfig({
      quality: 1.0,
      scale: 1.0,
    });
    // 只清理处理后的图片URL
    processedImages.forEach(img => {
      if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
    });
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
      message.error(`批量下载失败: ${error.message}`);
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
    const canvasFontSize = (watermarkConfig.fontSize || 24) * outputScale;
    const canvasPadding = 7.33 * outputScale; // 6 + 1.33pt (增加1pt的左右边距)
    const canvasBorderRadius = 6 * outputScale;
    const canvasBorderWidth = (watermarkConfig.borderWidth || 2) * outputScale;
    const canvasMargin = (watermarkConfig.margin || 15) * outputScale;
    
    // 在预览中按比例缩放
    const previewFontSize = canvasFontSize * previewScale;
    const previewPadding = canvasPadding * previewScale;
    const previewBorderRadius = canvasBorderRadius * previewScale;
    const previewBorderWidth = canvasBorderWidth * previewScale;
    const previewMargin = canvasMargin * previewScale;

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
          lineHeight: '1',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
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
        {watermarkConfig.text}
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
        height: '80px',
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
              letterSpacing: '1px'
            }}>
              AI水印小助手
            </Title>
            <Paragraph style={{ 
              margin: 0, 
              color: '#3b82f6', 
              fontSize: '14px',
              fontWeight: '500',
              opacity: '0.8'
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
          disabled={isProcessing}
        />

        {images.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div className="step-indicator">
              <div className="step-number">2</div>
              <div className="step-text">配置水印</div>
            </div>
            
            {/* 左右分栏布局 */}
            <div style={{ 
              display: 'flex', 
              gap: '24px', 
              alignItems: 'flex-start',
              marginTop: '20px'
            }}>
              {/* 左侧：水印配置区域 */}
              <div style={{ flex: '1', minWidth: '0' }}>
                {/* 水印设置面板 */}
                <div style={{ 
                  background: '#fff', 
                  padding: '24px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ color: '#1a365d', marginBottom: '20px', fontSize: '18px' }}>水印设置</h3>
                  
                  {/* 预设水印样式 */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                      预设样式:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        onClick={() => setWatermarkConfig({
                          ...watermarkConfig,
                          type: 'text',
                          text: 'AI生成',
                          color: '#ffffff',
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

                  {/* 最近使用的水印配置 */}
                  {recentWatermarks.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                        最近使用:
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {recentWatermarks.slice(0, 3).map((config, index) => (
                          <Button
                            key={index}
                            size="small"
                            onClick={() => setWatermarkConfig(config)}
                            style={{ 
                              background: '#f0f0f0', 
                              color: '#666',
                              border: '1px solid #ddd'
                            }}
                          >
                            配置 {index + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
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
                          onChange={(e) => setWatermarkConfig(prev => ({ ...prev, text: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #3b82f6',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="输入水印文字"
                        />
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
                              padding: '12px 16px',
                              border: '1px solid #3b82f6',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="Roboto">Roboto</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Source Sans Pro">Source Sans Pro</option>
                            <option value="Noto Sans SC">Noto Sans SC</option>
                            <option value="SourceHanSansCN">思源黑体</option>
                            <option value="SmileySans">得意黑</option>
                            <option value="HuiWenMingChao">汇文明朝体</option>
                            <option value="XiangcuiDengcusong">香脆等粗宋</option>
                            <option value="ZhanKuCangErYuYang">站酷仓耳渔阳体</option>
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
                              border: '1px solid #3b82f6',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          字体大小: {watermarkConfig.fontSize || 24}px
                        </label>
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

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          水印边距: {watermarkConfig.margin || 15}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="50"
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
                          <span style={{ position: 'absolute', left: '20%', transform: 'translateX(-50%)' }}>10px</span>
                          <span style={{ position: 'absolute', left: '40%', transform: 'translateX(-50%)' }}>20px</span>
                          <span style={{ position: 'absolute', left: '60%', transform: 'translateX(-50%)' }}>30px</span>
                          <span style={{ position: 'absolute', left: '80%', transform: 'translateX(-50%)' }}>40px</span>
                          <span style={{ position: 'absolute', right: '0%' }}>50px</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: '#1a365d', fontWeight: '500' }}>
                          水印位置:
                        </label>
                        <select
                          value={watermarkConfig.position}
                          onChange={(e) => setWatermarkConfig(prev => ({ ...prev, position: e.target.value as any }))}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #3b82f6',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-right">右上角</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-right">右下角</option>
                        </select>
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
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1' }}>
                              <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                                {watermarkConfig.borderStyle === 'outline' ? '边框颜色' : '背景颜色'}:
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
                                  border: '1px solid #3b82f6',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              />
                            </div>
                            <div style={{ flex: '1' }}>
                              <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                                {watermarkConfig.borderStyle === 'outline' ? '边框透明度' : '背景透明度'}: {watermarkConfig.borderStyle === 'outline' ? (watermarkConfig.borderOpacity || 100) : (watermarkConfig.backgroundOpacity || 80)}%
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
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 边框宽度设置（仅边框样式时显示） */}
                        {watermarkConfig.borderStyle === 'outline' && (
                          <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                              边框宽度: {watermarkConfig.borderWidth || 2}px
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
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setWatermarkConfig(prev => ({ ...prev, customImage: file }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  )}
                </div>




              </div>

              {/* 右侧：预览和结果区域 */}
              <div style={{ flex: '1', minWidth: '0' }}>
                {/* 输出设置和处理按钮 */}
                <div style={{ 
                  background: '#fff', 
                  padding: '24px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  marginBottom: '20px'
                }}>
                  <div className="step-indicator">
                    <div className="step-number">3</div>
                    <div className="step-text">输出设置</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                        图片质量:
                      </label>
                      <select
                        value={outputConfig.quality}
                        onChange={(e) => setOutputConfig(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px'
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
                      <label style={{ display: 'block', marginBottom: '8px', color: '#1a365d', fontSize: '14px' }}>
                        缩放比例:
                      </label>
                      <select
                        value={outputConfig.scale}
                        onChange={(e) => setOutputConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #3b82f6',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value={0.1}>10%</option>
                        <option value={0.5}>50%</option>
                        <option value={0.7}>70%</option>
                        <option value={0.8}>80%</option>
                        <option value={0.9}>90%</option>
                        <option value={1.0}>100%</option>
                        <option value={1.2}>120%</option>
                        <option value={1.5}>150%</option>
                        <option value={2.0}>200%</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* 开始处理按钮 */}
                  <div style={{ textAlign: 'center' }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handleProcessImages}
                      loading={isProcessing}
                      disabled={images.length === 0}
                      style={{ 
                        height: '56px', 
                        padding: '0 40px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        background: images.length === 0 ? '#d1d5db' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        borderColor: images.length === 0 ? '#d1d5db' : 'transparent',
                        boxShadow: images.length === 0 ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.4)',
                        transform: images.length === 0 ? 'none' : 'translateY(-2px)',
                        transition: 'all 0.3s ease',
                        border: 'none'
                      }}
                    >
                      {isProcessing ? '处理中...' : '开始处理'}
                    </Button>
                    {images.length === 0 && (
                      <div style={{ 
                        color: '#6b7280', 
                        fontSize: '14px', 
                        marginTop: '8px'
                      }}>
                        请先上传图片
                      </div>
                    )}
                    {images.length > 0 && (
                      <div style={{ 
                        color: '#3b82f6', 
                        fontSize: '14px', 
                        marginTop: '8px',
                        fontWeight: '500'
                      }}>
                        调整完成即可点击开始处理，要点击才能打水印成功哦！
                      </div>
                    )}
                  </div>
                </div>

                {/* 图片预览 */}
                <div style={{ 
                  background: '#fff', 
                  padding: '32px', 
                  borderRadius: '12px',
                  border: '1px solid #3b82f6',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                  minHeight: '500px'
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
                              height: '32px',
                              padding: '0 16px',
                              minWidth: '80px'
                            }}
                          >
                            下载
                          </Button>
                          <Button
                            type="primary"
                            onClick={handleBatchDownload}
                            style={{
                              background: '#3b82f6',
                              borderColor: '#3b82f6',
                              fontSize: '14px',
                              height: '32px',
                              padding: '0 16px',
                              minWidth: '80px'
                            }}
                          >
                            批量下载{images.length > 1 && ` (${images.length}张)`}
                          </Button>
                          <Button
                            onClick={handleClearAllImages}
                            style={{
                              borderColor: '#dc2626',
                              color: '#dc2626',
                              fontSize: '14px',
                              height: '32px',
                              padding: '0 16px',
                              minWidth: '80px'
                            }}
                          >
                            清空图片
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
                      <div style={{ position: 'relative', display: 'inline-block' }}>
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
                        
                        {/* 图片水印预览 - 只在未处理时显示 */}
                        {processedImages.length === 0 && watermarkConfig.type === 'image' && watermarkConfig.customImage && (
                          <div
                            style={{
                              position: 'absolute',
                              ...(watermarkConfig.position === 'top-left' && { top: `${watermarkConfig.margin || 15}px`, left: `${watermarkConfig.margin || 15}px` }),
                              ...(watermarkConfig.position === 'top-right' && { top: `${watermarkConfig.margin || 15}px`, right: `${watermarkConfig.margin || 15}px` }),
                              ...(watermarkConfig.position === 'bottom-left' && { bottom: `${watermarkConfig.margin || 15}px`, left: `${watermarkConfig.margin || 15}px` }),
                              ...(watermarkConfig.position === 'bottom-right' && { bottom: `${watermarkConfig.margin || 15}px`, right: `${watermarkConfig.margin || 15}px` }),
                              width: '60px',
                              height: '40px',
                              borderRadius: '4px',
                              border: '2px solid #3b82f6',
                              background: '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#666',
                              pointerEvents: 'none',
                              zIndex: 10
                            }}
                          >
                            水印图片
                          </div>
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
        <ProcessingProgress
          progress={progress}
          isProcessing={isProcessing}
        />
      </Content>
    </Layout>
  );
};

export default App;

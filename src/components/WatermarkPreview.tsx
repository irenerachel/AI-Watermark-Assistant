import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Spin, Carousel, Button } from 'antd';
import { EyeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { ImageFile, WatermarkConfig, OutputConfig } from '../types';
import { WatermarkProcessor } from '../utils/watermarkProcessor';

const { Title, Text } = Typography;

interface WatermarkPreviewProps {
  images: ImageFile[];
  watermarkConfig: WatermarkConfig;
  outputConfig: OutputConfig;
}

const WatermarkPreview: React.FC<WatermarkPreviewProps> = ({ 
  images, 
  watermarkConfig, 
  outputConfig 
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const watermarkProcessor = useRef(new WatermarkProcessor());
  const carouselRef = useRef<any>(null);

  useEffect(() => {
    const generatePreviews = async () => {
      if (!images.length || !watermarkConfig) return;

      // 验证水印配置
      if (watermarkConfig.type === 'text' && !watermarkConfig.text) return;
      if (watermarkConfig.type === 'image' && !watermarkConfig.customImage) return;

      setIsGenerating(true);
      try {
        const urls: string[] = [];
        for (const image of images) {
          const processedBlob = await watermarkProcessor.current.processImage(
            image.file,
            watermarkConfig,
            outputConfig
          );
          const url = URL.createObjectURL(processedBlob);
          urls.push(url);
        }
        setPreviewUrls(urls);
      } catch (error) {
        console.error('生成预览失败:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    // 延迟生成预览，避免频繁更新
    const timeoutId = setTimeout(generatePreviews, 300);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [images, watermarkConfig, outputConfig]);

  // 清理预览URL的useEffect
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      carouselRef.current?.prev();
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      carouselRef.current?.next();
    }
  };

  if (!images.length) {
    return (
      <Card className="processing-card" title="预览效果">
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#999',
          fontSize: '14px'
        }}>
          请先上传图片
        </div>
      </Card>
    );
  }

  return (
    <Card className="processing-card" title="预览效果">
      <div style={{ textAlign: 'center' }}>
        {isGenerating ? (
          <div style={{ 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '16px'
          }}>
            <Spin size="large" />
            <Text type="secondary">正在生成预览...</Text>
          </div>
        ) : previewUrls.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <Carousel
              ref={carouselRef}
              dots={false}
              infinite={false}
              beforeChange={(from, to) => setCurrentIndex(to)}
              style={{ width: '100%' }}
            >
              {previewUrls.map((url, index) => (
                <div key={index}>
                  <img
                    src={url}
                    alt={`水印预览 ${index + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </div>
              ))}
            </Carousel>
            
            {/* 预览信息 */}
            <div style={{ 
              marginTop: '12px',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#3b82f6'
              }}>
                <EyeOutlined />
                预览 {images.length > 1 ? `${currentIndex + 1}/${images.length}` : ''}
              </div>
            </div>
            
            {/* 轮播控制按钮 */}
            {images.length > 1 && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                transform: 'translateY(-50%)',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 16px',
                pointerEvents: 'none'
              }}>
                <Button
                  type="primary"
                  shape="circle"
                  icon={<LeftOutlined />}
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  style={{
                    pointerEvents: 'auto',
                    opacity: currentIndex === 0 ? 0.5 : 1
                  }}
                />
                <Button
                  type="primary"
                  shape="circle"
                  icon={<RightOutlined />}
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  style={{
                    pointerEvents: 'auto',
                    opacity: currentIndex === images.length - 1 ? 0.5 : 1
                  }}
                />
              </div>
            )}
            

          </div>
        ) : (
          <div style={{ 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '16px',
            color: '#999'
          }}>
            {images[0]?.url ? (
              <img
                src={images[0].url}
                alt="原图"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  opacity: 0.7
                }}
              />
            ) : (
              <div style={{ 
                width: '200px', 
                height: '150px', 
                background: '#f0f0f0', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                图片加载中...
              </div>
            )}
            <Text type="secondary">请配置水印参数查看效果</Text>
          </div>
        )}
        
        <div style={{ marginTop: '16px', textAlign: 'left' }}>
          <Text type="secondary">
            原图尺寸: {images[currentIndex]?.width} × {images[currentIndex]?.height}
          </Text>
          <br />
          <Text type="secondary">
            文件名: {images[currentIndex]?.name}
          </Text>
          {images.length > 1 && (
            <>
              <br />
              <Text type="secondary">
                当前预览: {currentIndex + 1} / {images.length}
              </Text>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default WatermarkPreview;


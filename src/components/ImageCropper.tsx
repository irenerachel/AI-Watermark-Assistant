import React, { useState, useRef } from 'react';
import { Modal, Button, Slider, Space, message } from 'antd';
import { CropOutlined, RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  visible: boolean;
  imageUrl: string;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  visible,
  imageUrl,
  onCancel,
  onConfirm,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const centerAspectCrop = (mediaWidth: number, mediaHeight: number, aspect: number) => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const aspect = 16 / 9; // 可以设置为null来允许自由裁剪

  const getCroppedImg = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imgRef.current || !completedCrop) {
        reject(new Error('No image or crop data'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.scale(scaleX, scaleY);
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;

      const centerX = imgRef.current.naturalWidth / 2;
      const centerY = imgRef.current.naturalHeight / 2;

      ctx.save();

      // 5) Move the crop origin to the canvas origin (0,0)
      ctx.translate(centerX, centerY);
      // 4) Rotate around the origin
      ctx.rotate((rotation * Math.PI) / 180);
      // 3) Scale the image
      ctx.scale(scale, scale);
      // 2) Move the origin of the coordinate system to the center of the original position
      ctx.translate(-centerX, -centerY);
      // 1) Move the origin of the coordinate system to the center of the original position
      ctx.translate(-cropX, -cropY);

      ctx.drawImage(
        imgRef.current,
        0,
        0,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight,
        0,
        0,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight,
      );

      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas is empty'));
          }
        },
        'image/jpeg',
        0.95,
      );
    });
  };

  const handleConfirm = async () => {
    try {
      const croppedBlob = await getCroppedImg();
      onConfirm(croppedBlob);
      message.success('图片裁剪成功');
    } catch (error) {
      message.error('图片裁剪失败');
    }
  };

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  return (
    <Modal
      title="裁剪图片"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确认裁剪
        </Button>,
      ]}
    >
      <div style={{ textAlign: 'center' }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<RotateLeftOutlined />} onClick={handleRotateLeft}>
            向左旋转
          </Button>
          <Button icon={<RotateRightOutlined />} onClick={handleRotateRight}>
            向右旋转
          </Button>
        </Space>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>缩放: {Math.round(scale * 100)}%</div>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={scale}
            onChange={setScale}
            style={{ width: 200 }}
          />
        </div>

        <div style={{ 
          maxHeight: '500px', 
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
            minHeight={50}
          >
            <img
              ref={imgRef}
              alt="裁剪图片"
              src={imageUrl}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                maxWidth: '100%',
                maxHeight: '400px',
              }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropper;

import { WatermarkConfig, OutputConfig } from '../types';

export class WatermarkProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    if (!this.ctx) {
      throw new Error('无法创建Canvas 2D上下文');
    }
    
    console.log('WatermarkProcessor初始化成功');
  }

  async processImage(
    imageFile: File,
    watermarkConfig: WatermarkConfig,
    outputConfig: OutputConfig
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      console.log('开始处理图片:', imageFile.name, '类型:', imageFile.type, '大小:', imageFile.size);
      
      // 验证文件
      if (!imageFile || imageFile.size === 0) {
        reject(new Error('文件无效或为空'));
        return;
      }
      
      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'];
      if (!validTypes.includes(imageFile.type)) {
        reject(new Error(`不支持的文件类型: ${imageFile.type}`));
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        try {
          console.log('图片加载成功:', imageFile.name, '尺寸:', img.width, 'x', img.height);
          
          // 验证图片尺寸
          if (img.width === 0 || img.height === 0) {
            reject(new Error('图片尺寸无效'));
            return;
          }
          
          // 设置画布尺寸
          const { width, height } = this.calculateOutputSize(img, outputConfig);
          console.log('输出尺寸:', width, 'x', height);
          
          // 验证输出尺寸
          if (width <= 0 || height <= 0) {
            reject(new Error('输出尺寸无效'));
            return;
          }
          
          this.canvas.width = width;
          this.canvas.height = height;

          // 绘制原图
          this.ctx.drawImage(img, 0, 0, width, height);

          // 添加水印（传入scale，默认1）
          this.addWatermark(watermarkConfig, width, height, outputConfig.scale || 1);

          // 导出图片
          this.canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log('图片处理成功，生成blob大小:', blob.size);
                resolve(blob);
              } else {
                console.error('Canvas生成blob失败');
                reject(new Error('Canvas生成blob失败'));
              }
            },
            'image/jpeg',
            outputConfig.quality
          );
        } catch (error) {
          console.error('图片处理过程中出错:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('图片加载失败:', error, '文件类型:', imageFile.type, '文件大小:', imageFile.size);
        reject(new Error(`图片加载失败: ${imageFile.name}`));
      };
      
      const objectUrl = URL.createObjectURL(imageFile);
      console.log('创建对象URL:', objectUrl, '文件类型:', imageFile.type);
      img.src = objectUrl;
    });
  }

  private calculateOutputSize(img: HTMLImageElement, outputConfig: OutputConfig) {
    let { width, height } = img;

    // 使用缩放比例
    if (outputConfig.scale && outputConfig.scale !== 1.0) {
      width = Math.round(img.width * outputConfig.scale);
      height = Math.round(img.height * outputConfig.scale);
    } else if (outputConfig.resize) {
      const { resize } = outputConfig;
      if (resize.width && resize.height) {
        width = resize.width;
        height = resize.height;
      } else if (resize.width) {
        if (resize.maintainAspectRatio) {
          height = (img.height * resize.width) / img.width;
        } else {
          width = resize.width;
        }
      } else if (resize.height) {
        if (resize.maintainAspectRatio) {
          width = (img.width * resize.height) / img.height;
        } else {
          height = resize.height;
        }
      }
    }

    return { width, height };
  }

  private addWatermark(watermarkConfig: WatermarkConfig, imageWidth: number, imageHeight: number, scale: number = 1) {
    if (watermarkConfig.type === 'text') {
      this.addTextWatermark(watermarkConfig, imageWidth, imageHeight, scale);
    } else {
      this.addImageWatermark(watermarkConfig, imageWidth, imageHeight, scale);
    }
  }

  private addTextWatermark(watermarkConfig: WatermarkConfig, imageWidth: number, imageHeight: number, scale: number = 1) {
    if (!watermarkConfig.text) {
      console.log('水印文本为空，跳过添加');
      return;
    }

    console.log('开始添加文字水印:', watermarkConfig.text, 'scale:', scale);

    // 使用用户设置的字体大小，按scale缩放
    const baseFontSize = watermarkConfig.fontSize || 24;
    const fontSize = Math.max(1, Math.round(baseFontSize * (scale || 1)));

    console.log('字体大小:', baseFontSize, '->', fontSize);

    // 设置字体
    this.ctx.font = `${fontSize}px ${watermarkConfig.font || 'Roboto'}`;
    this.ctx.textBaseline = 'top';

    // 计算文本尺寸
    const textMetrics = this.ctx.measureText(watermarkConfig.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // 计算水印位置（按scale缩放边距）
    const { x, y } = this.calculateWatermarkPosition(
      watermarkConfig.position,
      textWidth,
      textHeight,
      imageWidth,
      imageHeight,
      scale,
      watermarkConfig.margin || 15
    );

    // 根据borderStyle绘制不同的效果（按scale缩放padding/边框）
    const padding = Math.round(7.33 * (scale || 1)); // 6 + 1.33pt (增加1pt的左右边距)
    const rectX = x - padding;
    const rectY = y - padding;
    const rectWidth = textWidth + padding * 2;
    const rectHeight = textHeight + padding * 2;
    const borderRadius = Math.round(6 * (scale || 1));

    if (watermarkConfig.borderStyle === 'outline') {
      if (watermarkConfig.borderColor && (watermarkConfig.borderOpacity || 100) > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = (watermarkConfig.borderOpacity || 100) / 100;
        this.ctx.strokeStyle = watermarkConfig.borderColor;
        this.ctx.lineWidth = (watermarkConfig.borderWidth || 2) * (scale || 1);
        this.drawRoundedRect(rectX, rectY, rectWidth, rectHeight, borderRadius);
        this.ctx.stroke();
        this.ctx.restore();
      }
    } else if (watermarkConfig.borderStyle === 'solid') {
      if (watermarkConfig.backgroundColor && (watermarkConfig.backgroundOpacity || 100) > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = (watermarkConfig.backgroundOpacity || 100) / 100;
        this.ctx.fillStyle = watermarkConfig.backgroundColor;
        this.drawRoundedRect(rectX, rectY, rectWidth, rectHeight, borderRadius);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    // 绘制文本
    this.ctx.fillStyle = watermarkConfig.color || '#ffffff';
    this.ctx.fillText(watermarkConfig.text, x, y);
    
    console.log('文字水印绘制完成:', watermarkConfig.text, '位置:', x, y);
  }

  // 绘制圆角矩形的辅助方法
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private async addImageWatermark(
    watermarkConfig: WatermarkConfig,
    imageWidth: number,
    imageHeight: number,
    scale: number = 1
  ) {
    if (!watermarkConfig.customImage) return;

    return new Promise<void>((resolve, reject) => {
      const watermarkImg = new Image();
      watermarkImg.onload = () => {
        try {
          const shortSide = Math.min(imageWidth, imageHeight);
          const maxWatermarkSize = shortSide * 0.15; // 最大15%的短边

          // 计算水印尺寸，保持比例
          let watermarkWidth = watermarkImg.width;
          let watermarkHeight = watermarkImg.height;

          if (watermarkWidth > maxWatermarkSize || watermarkHeight > maxWatermarkSize) {
            const ratio = Math.min(maxWatermarkSize / watermarkWidth, maxWatermarkSize / watermarkHeight);
            watermarkWidth *= ratio;
            watermarkHeight *= ratio;
          }

          // 计算水印位置（按scale缩放边距）
          const { x, y } = this.calculateWatermarkPosition(
            watermarkConfig.position,
            watermarkWidth,
            watermarkHeight,
            imageWidth,
            imageHeight,
            scale,
            watermarkConfig.margin || 15
          );

          // 绘制水印
          this.ctx.globalAlpha = (watermarkConfig.backgroundOpacity || 100) / 100;
          this.ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight);
          this.ctx.globalAlpha = 1;

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      watermarkImg.onerror = () => reject(new Error('水印图片加载失败'));
      watermarkImg.src = URL.createObjectURL(watermarkConfig.customImage!);
    });
  }

  private calculateWatermarkPosition(
    position: string,
    watermarkWidth: number,
    watermarkHeight: number,
    imageWidth: number,
    imageHeight: number,
    scale: number = 1,
    margin: number = 15
  ) {
    const scaledMargin = Math.round(margin * (scale || 1));
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top-left':
        x = scaledMargin;
        y = scaledMargin;
        break;
      case 'top-right':
        x = imageWidth - watermarkWidth - scaledMargin;
        y = scaledMargin;
        break;
      case 'bottom-left':
        x = scaledMargin;
        y = imageHeight - watermarkHeight - scaledMargin;
        break;
      case 'bottom-right':
        x = imageWidth - watermarkWidth - scaledMargin;
        y = imageHeight - watermarkHeight - scaledMargin;
        break;
    }

    return { x, y };
  }

  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('无法获取图片尺寸'));
      img.src = URL.createObjectURL(file);
    });
  }
}

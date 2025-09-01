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
          this.addWatermark(watermarkConfig, width, height, outputConfig.scale || 1)
            .then(() => {
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
            })
            .catch((error) => {
              console.error('添加水印失败:', error);
              reject(error);
            });
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

  private async addWatermark(watermarkConfig: WatermarkConfig, imageWidth: number, imageHeight: number, scale: number = 1) {
    if (watermarkConfig.type === 'text') {
      this.addTextWatermark(watermarkConfig, imageWidth, imageHeight, scale);
    } else {
      await this.addImageWatermark(watermarkConfig, imageWidth, imageHeight, scale);
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
    const padding = Math.round(9.33 * (scale || 1)); // 6 + 3.33pt (增加更多左右边距，让文字不局促)
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
    // 只处理选中的水印图片
    let selectedFile: File | undefined;
    
    if (watermarkConfig.customImages && watermarkConfig.selectedWatermarkIndex !== undefined) {
      selectedFile = watermarkConfig.customImages[watermarkConfig.selectedWatermarkIndex];
    } else if (watermarkConfig.customImage) {
      selectedFile = watermarkConfig.customImage;
    }
    
    if (!selectedFile) {
      console.log('没有选择图片水印，跳过');
      return;
    }

    console.log('开始添加选中的图片水印:', selectedFile.name, 'scale:', scale);

    // 处理选中的水印图片
    await this.drawSingleImageWatermark(selectedFile, watermarkConfig, imageWidth, imageHeight, scale, 0);
  }

  private async drawSingleImageWatermark(
    file: File,
    watermarkConfig: WatermarkConfig,
    imageWidth: number,
    imageHeight: number,
    scale: number,
    index: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const watermarkImg = new Image();
      watermarkImg.onload = () => {
        try {
          console.log(`水印图片 ${index + 1} 加载成功，原始尺寸:`, watermarkImg.width, 'x', watermarkImg.height);
          
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

          // 应用用户设置的大小调整
          const sizeMultiplier = watermarkConfig.watermarkSize || 1.0;
          watermarkWidth *= sizeMultiplier;
          watermarkHeight *= sizeMultiplier;

          console.log(`水印 ${index + 1} 最终尺寸:`, watermarkWidth, 'x', watermarkHeight);

          // 计算水印位置（使用预设位置）
          const offsetX = index * 10;
          const offsetY = index * 10;
          const { x, y } = this.calculateWatermarkPosition(
            watermarkConfig.position,
            watermarkWidth,
            watermarkHeight,
            imageWidth,
            imageHeight,
            scale,
            watermarkConfig.margin || 15,
            offsetX,
            offsetY
          );

          console.log(`水印 ${index + 1} 位置:`, x, y, '位置类型:', watermarkConfig.position);

          // 绘制水印（保持PNG透明背景）
          this.ctx.globalAlpha = 1; // 保持完全不透明，让PNG的透明部分自然显示
          this.ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight);

          console.log(`图片水印 ${index + 1} 绘制完成`);
          resolve();
        } catch (error) {
          console.error(`绘制图片水印 ${index + 1} 时出错:`, error);
          reject(error);
        }
      };

      watermarkImg.onerror = (error) => {
        console.error(`水印图片 ${index + 1} 加载失败:`, error);
        reject(new Error(`水印图片 ${index + 1} 加载失败`));
      };
      
      const objectUrl = URL.createObjectURL(file);
      console.log(`创建水印图片 ${index + 1} 对象URL:`, objectUrl);
      watermarkImg.src = objectUrl;
    });
  }

  private calculateWatermarkPosition(
    position: string,
    watermarkWidth: number,
    watermarkHeight: number,
    imageWidth: number,
    imageHeight: number,
    scale: number = 1,
    margin: number = 15,
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    const scaledMargin = Math.round(margin * (scale || 1));
    const scaledOffsetX = Math.round(offsetX * (scale || 1));
    const scaledOffsetY = Math.round(offsetY * (scale || 1));
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top-left':
        x = scaledMargin + scaledOffsetX;
        y = scaledMargin + scaledOffsetY;
        break;
      case 'top-right':
        x = imageWidth - watermarkWidth - scaledMargin - scaledOffsetX;
        y = scaledMargin + scaledOffsetY;
        break;
      case 'bottom-left':
        x = scaledMargin + scaledOffsetX;
        y = imageHeight - watermarkHeight - scaledMargin - scaledOffsetY;
        break;
      case 'bottom-right':
        x = imageWidth - watermarkWidth - scaledMargin - scaledOffsetX;
        y = imageHeight - watermarkHeight - scaledMargin - scaledOffsetY;
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

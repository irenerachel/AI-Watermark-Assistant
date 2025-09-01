# AI水印小助手

一个专为AI生成图片添加合规水印的批量处理工具，帮助自媒体创作者、设计师和内容创作者快速为AI图片添加符合法规要求的标识。

## ✨ 功能特点

### 🖼️ 图片上传
- 支持 JPG、PNG、WebP、BMP 格式
- 拖拽上传 + 点击选择文件
- 批量处理，最多支持50张图片
- 单张图片最大20MB

### 🎨 水印配置
- **文字水印**：预设"AI生成"、"人工智能生成"、"AI合成"等文本
- **自定义文本**：支持最多20字符的自定义输入
- **图片水印**：上传PNG格式的自定义水印图片
- **样式设置**：字体、颜色、背景、描边、透明度等
- **位置选择**：左上角、右上角、左下角、右下角

### ⚙️ 输出设置
- **图片质量**：保持原质量或0.5倍压缩
- **尺寸调整**：保持原尺寸或自定义尺寸
- **预设尺寸**：1080p、4K、720p等常用分辨率

### 📥 结果输出
- **预览模式**：处理前后对比
- **单张下载**：单独下载处理后的图片
- **批量下载**：ZIP格式打包下载
- **文件命名**：自动添加"_watermarked"后缀

## 🚀 快速开始

### 环境要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **UI组件库**：Ant Design 5
- **图片处理**：Canvas API
- **文件处理**：File API + JSZip
- **样式**：CSS3 + 渐变背景

## 📁 项目结构

```
src/
├── components/          # React组件
│   ├── ImageUpload.tsx      # 图片上传组件
│   ├── WatermarkConfig.tsx  # 水印配置组件
│   ├── OutputConfig.tsx     # 输出设置组件
│   ├── ProcessingProgress.tsx # 处理进度组件
│   └── ResultDisplay.tsx    # 结果展示组件
├── utils/              # 工具函数
│   ├── watermarkProcessor.ts # 水印处理核心逻辑
│   └── fileUtils.ts         # 文件处理工具
├── types/              # TypeScript类型定义
│   └── index.ts
├── App.tsx             # 主应用组件
├── main.tsx            # 应用入口
└── index.css           # 全局样式
```

## 🎯 核心算法

### 水印尺寸计算
```typescript
const shortSide = Math.min(imageWidth, imageHeight);
const watermarkHeight = Math.max(shortSide * 0.05, 30); // 最小30px
```

### 位置计算
基于选择的角落和边距自动计算水印位置，确保水印不会超出图片边界。

### 图片合成
使用Canvas API进行图片合成，支持透明度、描边等高级效果。

## 🔧 配置说明

### 水印配置
```typescript
interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  font?: string;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  customImage?: File;
}
```

### 输出配置
```typescript
interface OutputConfig {
  quality: number;
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
  };
}
```

## 🎨 界面设计

- **简洁优先**：减少不必要的装饰元素
- **步骤清晰**：用数字标识操作步骤
- **即时反馈**：配置更改立即显示预览
- **响应式设计**：支持桌面和平板使用
- **现代化UI**：渐变背景、毛玻璃效果、圆角设计

## 📱 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和设计师。

---

**AI水印小助手** - 让AI图片合规处理变得简单高效！

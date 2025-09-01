import React from 'react';
import {
  Card,
  Form,
  Radio,
  Input,
  Select,
  Slider,
  ColorPicker,
  Upload,
  Space,
  Divider,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { WatermarkConfig as WatermarkConfigType } from '../types';

const { Option } = Select;

interface WatermarkConfigProps {
  config: WatermarkConfigType;
  onConfigChange: (config: WatermarkConfigType) => void;
}

const WatermarkConfig: React.FC<WatermarkConfigProps> = ({ config, onConfigChange }) => {
  const [form] = Form.useForm();

  const handleConfigChange = (field: keyof WatermarkConfigType, value: any) => {
    const newConfig = { ...config, [field]: value };
    onConfigChange(newConfig);
  };

  const presetTexts = ['AI生成', '人工智能生成', 'AI合成'];

  return (
    <div className="watermark-config-section">
      <Card className="processing-card" title="水印设置">
        <Form form={form} layout="vertical">
          {/* 水印类型 */}
          <Form.Item label="水印类型" name="type">
            <Radio.Group
              value={config.type}
              onChange={(e) => handleConfigChange('type', e.target.value)}
            >
              <Radio.Button value="text">文字水印</Radio.Button>
              <Radio.Button value="image">图片水印</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* 位置设置 */}
          <Form.Item label="位置">
            <Radio.Group
              value={config.position}
              onChange={(e) => handleConfigChange('position', e.target.value)}
            >
              <Radio.Button value="top-left">左上角</Radio.Button>
              <Radio.Button value="top-right">右上角</Radio.Button>
              <Radio.Button value="bottom-left">左下角</Radio.Button>
              <Radio.Button value="bottom-right">右下角</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {config.type === 'text' && (
            <>
              <Divider orientation="left">文字</Divider>
              
              {/* 预设文本 */}
              <Form.Item label="文本">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio.Group
                    value={config.text}
                    onChange={(e) => handleConfigChange('text', e.target.value)}
                  >
                    {presetTexts.map(text => (
                      <Radio.Button key={text} value={text}>
                        {text}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                  <Input
                    placeholder="或输入自定义文本（最多20字符）"
                    maxLength={20}
                    value={config.text}
                    onChange={(e) => handleConfigChange('text', e.target.value)}
                    showCount
                  />
                </Space>
              </Form.Item>

              {/* 字体设置 */}
              <Form.Item label="字体">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1' }}>
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>字体</div>
                    <Select
                      value={config.font}
                      onChange={(value) => handleConfigChange('font', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="Arial">Arial</Option>
                      <Option value="Roboto">Roboto</Option>
                      <Option value="Open Sans">Open Sans</Option>
                      <Option value="Lato">Lato</Option>
                      <Option value="Source Sans Pro">Source Sans Pro</Option>
                      <Option value="Noto Sans SC">Noto Sans SC</Option>
                      <Option value="Inter">Inter</Option>
                      <Option value="Poppins">Poppins</Option>
                    </Select>
                  </div>
                  
                  <div style={{ flex: '1' }}>
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>字体颜色</div>
                    <ColorPicker
                      value={config.color}
                      onChange={(color) => handleConfigChange('color', color?.toHexString())}
                      showText
                    />
                  </div>
                </div>
              </Form.Item>

              {/* 字体大小设置 */}
              <Form.Item label="字体大小">
                <Slider
                  min={12}
                  max={72}
                  value={config.fontSize || 24}
                  onChange={(value) => handleConfigChange('fontSize', value)}
                  marks={{
                    12: '12px',
                    24: '24px',
                    36: '36px',
                    48: '48px',
                    60: '60px',
                    72: '72px'
                  }}
                />
              </Form.Item>

              {/* 背景设置 */}
              <Divider orientation="left">背景</Divider>
              
              {/* 背景样式和颜色 */}
              <Form.Item label="样式">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1' }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#999' }}>
                      当前选择: {config.borderStyle || '未设置'}
                    </div>
                    <Radio.Group
                      value={config.borderStyle || 'solid'}
                      onChange={(e) => {
                        console.log('背景样式改变:', e.target.value);
                        const style = e.target.value;
                        handleConfigChange('borderStyle', style);
                        // 根据样式设置默认值
                        if (style === 'none') {
                          handleConfigChange('backgroundOpacity', 0);
                        } else if (style === 'solid') {
                          handleConfigChange('backgroundOpacity', 100);
                        } else if (style === 'outline') {
                          handleConfigChange('backgroundOpacity', 0);
                          handleConfigChange('borderOpacity', 100);
                        }
                      }}
                    >
                      <Radio.Button value="none">无背景</Radio.Button>
                      <Radio.Button value="solid">纯色背景</Radio.Button>
                      <Radio.Button value="outline">描边边框</Radio.Button>
                    </Radio.Group>
                  </div>
                  
                  <div style={{ flex: '1' }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                      {config.borderStyle === 'outline' ? '边框颜色' : '背景颜色'}
                    </div>
                    <ColorPicker
                      value={config.backgroundColor}
                      onChange={(color) => handleConfigChange('backgroundColor', color?.toHexString())}
                      showText
                      disabled={config.borderStyle === 'none'}
                    />
                  </div>
                </div>
              </Form.Item>

              {/* 背景透明度 */}
              <Form.Item label={config.borderStyle === 'outline' ? '边框透明度' : '背景透明度'}>
                <Slider
                  min={0}
                  max={100}
                  value={config.borderStyle === 'outline' ? (config.borderOpacity || 100) : (config.backgroundOpacity || 100)}
                  onChange={(value) => {
                    if (config.borderStyle === 'outline') {
                      handleConfigChange('borderOpacity', value);
                    } else {
                      handleConfigChange('backgroundOpacity', value);
                    }
                  }}
                  marks={{
                    0: '透明',
                    50: '50%',
                    100: '不透明'
                  }}
                  disabled={config.borderStyle === 'none'}
                />
              </Form.Item>

              {/* 边框设置 - 仅在描边边框时显示 */}
              {config.borderStyle === 'outline' && (
                <>
                  <Form.Item label="边框宽度">
                    <Slider
                      min={1}
                      max={10}
                      value={config.borderWidth || 2}
                      onChange={(value) => handleConfigChange('borderWidth', value)}
                      marks={{
                        1: '1px',
                        3: '3px',
                        5: '5px',
                        7: '7px',
                        10: '10px'
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="边框透明度">
                    <Slider
                      min={0}
                      max={100}
                      value={config.borderOpacity || 100}
                      onChange={(value) => handleConfigChange('borderOpacity', value)}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%'
                      }}
                    />
                  </Form.Item>
                </>
              )}
            </>
          )}

          {config.type === 'image' && (
            <>
              <Divider orientation="left">图片</Divider>
              
              <Form.Item label="上传图片">
                <Upload
                  accept="image/png"
                  beforeUpload={(file) => {
                    handleConfigChange('customImage', file);
                    return false;
                  }}
                  showUploadList={false}
                >
                  <div className="upload-area" style={{ padding: '20px' }}>
                    <UploadOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                    <div style={{ marginTop: '8px' }}>
                      {config.customImage ? config.customImage.name : '点击上传PNG水印图片'}
                    </div>
                  </div>
                </Upload>
              </Form.Item>

              <Form.Item label="透明度">
                <Slider
                  min={0}
                  max={100}
                  value={config.backgroundOpacity || 100}
                  onChange={(value) => handleConfigChange('backgroundOpacity', value)}
                  marks={{
                    0: '透明',
                    50: '50%',
                    100: '不透明'
                  }}
                />
              </Form.Item>
            </>
                      )}
        </Form>
      </Card>
    </div>
  );
};

export default WatermarkConfig;

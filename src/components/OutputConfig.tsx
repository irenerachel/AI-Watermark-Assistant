import React from 'react';
import { Card, Form, Radio, Slider, Divider } from 'antd';
import { OutputConfig as OutputConfigType } from '../types';

interface OutputConfigProps {
  config: OutputConfigType;
  onConfigChange: (config: OutputConfigType) => void;
}

const OutputConfig: React.FC<OutputConfigProps> = ({ config, onConfigChange }) => {
  const [form] = Form.useForm();

  const handleConfigChange = (field: keyof OutputConfigType, value: any) => {
    const newConfig = { ...config, [field]: value };
    onConfigChange(newConfig);
  };

  return (
    <div className="output-config-section">
      <Card className="processing-card" title="输出设置">
        <Form form={form} layout="vertical" initialValues={config}>
          {/* 图片质量和缩放 */}
          <Form.Item label="图片质量和缩放">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1' }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>图片质量</div>
                <Select
                  value={config.quality || 1.0}
                  onChange={(value) => handleConfigChange('quality', value)}
                  style={{ width: '100%' }}
                >
                  <Option value={0.1}>10%</Option>
                  <Option value={0.3}>30%</Option>
                  <Option value={0.5}>50%</Option>
                  <Option value={0.7}>70%</Option>
                  <Option value={1.0}>100%</Option>
                </Select>
              </div>
              
              <div style={{ flex: '1' }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>缩放比例</div>
                <Select
                  value={config.scale || 1.0}
                  onChange={(value) => handleConfigChange('scale', value)}
                  style={{ width: '100%' }}
                >
                  <Option value={0.1}>10%</Option>
                  <Option value={0.5}>50%</Option>
                  <Option value={1.0}>100%</Option>
                  <Option value={1.5}>150%</Option>
                  <Option value={2.0}>200%</Option>
                </Select>
              </div>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default OutputConfig;

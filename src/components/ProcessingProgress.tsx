import React from 'react';
import { Card, Progress, Typography, Space } from 'antd';
import { ProcessingProgressData } from '../types';

const { Text } = Typography;

interface ProcessingProgressProps {
  progress: ProcessingProgressData;
  isProcessing: boolean;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progress, isProcessing }) => {
  if (!isProcessing) return null;

  return (
    <Card className="processing-card" title="处理进度">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text>正在处理: {progress.currentFileName}</Text>
        </div>
        
        <Progress
          percent={progress.percentage}
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        
        <div>
          <Text type="secondary">
            进度: {progress.current} / {progress.total} ({progress.percentage.toFixed(1)}%)
          </Text>
        </div>
        
        <div>
          <Text type="secondary">
            预计剩余时间: {Math.ceil((progress.total - progress.current) * 0.5)} 秒
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default ProcessingProgress;

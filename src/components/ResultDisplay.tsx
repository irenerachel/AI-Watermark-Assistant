import React from 'react';
import { Card, Button, Image, Space, Typography, Row, Col, Tag } from 'antd';
import { DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { ImageFile } from '../types';
import { downloadSingleFile, downloadBatchFiles, formatFileSize } from '../utils/fileUtils';

const { Text, Title } = Typography;

interface ResultDisplayProps {
  processedImages: ImageFile[];
  onClearResults: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ processedImages, onClearResults }) => {
  if (processedImages.length === 0) return null;

  const handleDownloadSingle = async (image: ImageFile) => {
    if (image.processedUrl) {
      const response = await fetch(image.processedUrl);
      const blob = await response.blob();
      await downloadSingleFile(blob, image.name);
    }
  };

  const handleDownloadAll = async () => {
    const processedData = await Promise.all(
      processedImages
        .filter(img => img.processedUrl)
        .map(async (img) => {
          const response = await fetch(img.processedUrl!);
          const blob = await response.blob();
          return { blob, originalName: img.name };
        })
    );
    
    await downloadBatchFiles(processedData);
  };

  return (
    <div className="result-section">
      <div className="step-indicator">
        <div className="step-number">4</div>
        <div className="step-text">处理结果</div>
      </div>

      <Card className="result-card" title="处理结果">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>已处理 {processedImages.length} 张图片</Title>
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadAll}
                size="large"
              >
                批量下载
              </Button>
              <Button
                icon={<DeleteOutlined />}
                onClick={onClearResults}
                size="large"
              >
                清空结果
              </Button>
            </Space>
          </div>

          <Row gutter={[16, 16]}>
            {processedImages.map((image) => (
              <Col xs={24} sm={12} md={8} lg={6} key={image.id}>
                <Card
                  size="small"
                  hoverable
                  cover={
                    <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                      <Image
                        src={image.processedUrl || image.url}
                        alt={image.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        preview={{
                          mask: <EyeOutlined />,
                          maskClassName: 'custom-mask'
                        }}
                      />
                      {image.processed && (
                        <Tag
                          color="green"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10
                          }}
                        >
                          已处理
                        </Tag>
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      key="download"
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadSingle(image)}
                      disabled={!image.processed}
                    >
                      下载
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <Text ellipsis style={{ maxWidth: '100%' }}>
                        {image.name}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {image.width && image.height ? `${image.width} × ${image.height}` : '未知尺寸'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatFileSize(image.size)}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>
    </div>
  );
};

export default ResultDisplay;

import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Row, Col, Typography, message, Skeleton } from 'antd';
import { SyncOutlined, AppstoreOutlined } from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text } = Typography;

const BlockLibrary = () => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBlocks = async () => {
        setLoading(true);
        try {
            const response = await sduiApi.getBlocks();
            setBlocks(response.data);
        } catch (error) {
            console.error('Lỗi khi tải danh sách block:', error);
            message.error('Không thể tải danh sách linh kiện');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, []);

    const handleSync = () => {
        message.loading('Đang đồng bộ cấu hình từ App...');
        fetchBlocks().then(() => {
            message.success('Đã làm mới danh mục linh kiện');
        });
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Kho Linh Kiện (SDUI Blocks)</Title>
                    <Text type="secondary">Quản lý các cấu kiện giao diện chuẩn của Mobile App</Text>
                </div>
                <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    size="large"
                    onClick={handleSync}
                    loading={loading}
                >
                    Làm mới từ App
                </Button>
            </div>

            {loading ? (
                <Row gutter={[24, 24]}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Col xs={24} sm={12} lg={8} key={i}>
                            <Card><Skeleton active /></Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                <Row gutter={[24, 24]}>
                    {blocks.map((block) => (
                        <Col xs={24} sm={12} lg={8} key={block.id}>
                            <Card
                                hoverable
                                title={<span style={{ display: 'flex', alignItems: 'center' }}><AppstoreOutlined style={{ marginRight: 8 }} /> {block.name}</span>}
                                extra={
                                    <Tag color={block.status === 'stable' ? 'green' : (block.status === 'beta' ? 'orange' : 'default')}>
                                        {(block.status || 'stable').toUpperCase()}
                                    </Tag>
                                }
                            >
                                <p style={{ color: 'rgba(0,0,0,0.45)', marginBottom: '16px', minHeight: '44px' }}>
                                    {block.description || 'Không có mô tả'}
                                </p>
                                <div style={{
                                    background: '#f5f5f5',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {block.type}
                                </div>
                            </Card>
                        </Col>
                    ))}
                    {blocks.length === 0 && (
                        <Col span={24}>
                            <Card style={{ textAlign: 'center', padding: '40px' }}>
                                <Text type="secondary">Chưa có linh kiện nào. Hãy chạy seeder trên Backend.</Text>
                            </Card>
                        </Col>
                    )}
                </Row>
            )}
        </div>
    );
};

export default BlockLibrary;

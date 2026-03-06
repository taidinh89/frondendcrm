import React, { useState, useEffect } from 'react';
import { Timeline, Card, Tag, Button, Typography, Space, Tooltip, message, Skeleton } from 'antd';
import {
    HistoryOutlined,
    RocketOutlined,
    RollbackOutlined,
    CheckCircleOutlined,
    TagOutlined,
    SyncOutlined
} from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text, Paragraph } = Typography;

const VersionHistory = () => {
    const [snapshots, setSnapshots] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const res = await sduiApi.getSnapshots();
            setSnapshots(res.data || []);
        } catch (error) {
            console.error('Lỗi khi tải snapshots:', error);
            message.error('Không thể tải lịch sử phiên bản');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, []);

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Lịch Sử Phiên Bản (Snapshots)</Title>
                    <Text type="secondary">Quản lý các bản sao lưu và hạ tầng Tagging quốc tế</Text>
                </div>
                <Space>
                    <Button icon={<SyncOutlined />} onClick={fetchSnapshots} loading={loading}>Làm mới</Button>
                    <Button type="primary" icon={<TagOutlined />} size="large">
                        Chụp Snapshot mới
                    </Button>
                </Space>
            </div>

            <Card className="shadow-sm">
                {loading ? <Skeleton active /> : (
                    <Timeline
                        mode="left"
                        items={snapshots.map((item, index) => ({
                            color: index === 0 ? 'green' : 'gray',
                            label: <div style={{ minWidth: 120 }}>{new Date(item.created_at).toLocaleString()}</div>,
                            children: (
                                <div style={{ marginBottom: 30 }}>
                                    <Card size="small" style={{ border: index === 0 ? '1px solid #b7eb8f' : '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Space direction="vertical" size={0}>
                                                <Space>
                                                    <Title level={5} style={{ margin: 0 }}>{item.tag}</Title>
                                                    {index === 0 && <Tag color="success" icon={<CheckCircleOutlined />}>LIVE - Hiện tại</Tag>}
                                                </Space>
                                                <Text type="secondary">ID: {item.id} | Phiên bản gốc</Text>
                                            </Space>
                                            <Space>
                                                <Tooltip title="Xem chi tiết cấu trúc">
                                                    <Button size="small" icon={<HistoryOutlined />}>Chi tiết</Button>
                                                </Tooltip>
                                                <Button size="small" icon={<RollbackOutlined />}>Khôi phục</Button>
                                            </Space>
                                        </div>
                                        <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                                            {item.description || "Không có mô tả"}
                                        </Paragraph>
                                    </Card>
                                </div>
                            )
                        }))}
                    />
                )}
                {!loading && snapshots.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">Chưa có bản ghi snapshot nào.</Text>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default VersionHistory;

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Statistic, Row, Col, Alert, Button, Space, Typography, List, Badge } from 'antd';
import { CheckCircleOutlined, WarningOutlined, SyncOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text } = Typography;

const AuditCenter = () => {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await sduiApi.getAuditReport();
            setReport(res.data);
        } catch (error) {
            console.error('Failed to fetch audit report', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (!report) return <div className="p-6 text-center">Đang tải báo cáo...</div>;

    const { stats, integrity, sync, timestamp } = report;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2}>Trung tâm Kiểm soát SDUI (Audit Center)</Title>
                    <Text type="secondary">Cập nhật lần cuối: {timestamp}</Text>
                </div>
                <Button
                    type="primary"
                    icon={<SyncOutlined spin={loading} />}
                    onClick={fetchReport}
                    loading={loading}
                >
                    Làm mới báo cáo
                </Button>
            </div>

            {/* Thống kê nhanh */}
            <Row gutter={16}>
                <Col span={6}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Tổng số Blocks (DB)"
                            value={stats.total_blocks}
                            prefix={<DatabaseOutlined className="text-blue-500" />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Số màn hình (Layouts)"
                            value={stats.total_layouts}
                            prefix={<SafetyCertificateOutlined className="text-green-500" />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Blocks Beta"
                            value={stats.beta_blocks}
                            valueStyle={{ color: '#faad14' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Blocks Cũ (Deprecated)"
                            value={stats.deprecated_blocks}
                            valueStyle={{ color: '#ff4d4f' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Trạng thái Đồng bộ */}
            <Card title="Trạng thái Đồng bộ & Hợp quy" className="shadow-sm">
                <Row gutter={32}>
                    <Col span={8}>
                        <div className="space-y-4">
                            <Title level={4}>SDUI Contract (Mobile App)</Title>
                            <Badge status={sync.contract.exists ? "success" : "error"} text={sync.contract.exists ? "Đã kết nối (sdui_contracts.json)" : "Thiếu file Contract"} />
                            <br />
                            <Text type="secondary">Đồng bộ cuối: {sync.contract.last_updated || "N/A"}</Text>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div className="space-y-4">
                            <Title level={4}>Xác thực Navigation</Title>
                            <Badge status={sync.navigation_synced ? "success" : "warning"} text={sync.navigation_synced ? "Đã cấu hình trong Database" : "Đang dùng Fallback (Hardcoded)"} />
                        </div>
                    </Col>
                    <Col span={8}>
                        <div className="space-y-4">
                            <Title level={4}>Tổng thể Hệ thống</Title>
                            {integrity.is_healthy ? (
                                <Alert
                                    message="Hệ thống ổn định"
                                    description="Không phát hiện lỗi không nhất quán về Block type."
                                    type="success"
                                    showIcon
                                />
                            ) : (
                                <Alert
                                    message="Phát hiện sự không nhất quán"
                                    description={`Có ${integrity.layout_warnings.length} màn hình sử dụng Block chưa đăng ký.`}
                                    type="warning"
                                    showIcon
                                />
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Danh sách cảnh báo Integrity */}
            {integrity.layout_warnings.length > 0 && (
                <Card title="Chi tiết Cảnh báo Layout" className="shadow-sm">
                    <Table
                        dataSource={integrity.layout_warnings}
                        columns={[
                            { title: 'Tên màn hình', dataIndex: 'name', key: 'name' },
                            { title: 'Slug', dataIndex: 'slug', key: 'slug', render: s => <Tag color="blue">{s}</Tag> },
                            {
                                title: 'Block chưa đăng ký',
                                dataIndex: 'missing_blocks',
                                key: 'missing_blocks',
                                render: blocks => (
                                    <>
                                        {blocks.map(b => <Tag key={b} color="red">{b}</Tag>)}
                                    </>
                                )
                            },
                        ]}
                        pagination={false}
                    />
                </Card>
            )}

            {/* Quy trình Kiểm tra (Checklist) */}
            <Card title="Hướng dẫn Kiểm tra E2E (End-to-End)" className="shadow-sm">
                <List
                    itemLayout="horizontal"
                    dataSource={[
                        { title: 'Chỉnh sửa Layout', description: 'Thay đổi 1 màn hình bất kỳ trong Screen Builder.' },
                        { title: 'Mở Mobile App', description: 'Mở app và đi đến màn hình vừa sửa (Home, CRM, v.v.).' },
                        { title: 'Kiểm tra Phản hồi', description: 'Màn hình trên Mobile phải cập nhật ngay lập tức mà không cần OTA Update.' },
                        { title: 'Kiểm tra Navigation', description: 'Thay đổi Tab Bar trong Navigation Manager và xem Tab Bar trên App có đổi không.' },
                    ]}
                    renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<CheckCircleOutlined className="text-green-500 mt-1" />}
                                title={item.title}
                                description={item.description}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
};

export default AuditCenter;

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Statistic, Row, Col, Button, Space, Typography, Switch, Modal, Select, message, Tooltip } from 'antd';
import { SyncOutlined, MobileOutlined, CheckCircleOutlined, StopOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const DeviceMonitoring = () => {
    const [loading, setLoading] = useState(true);
    const [devices, setDevices] = useState([]);
    const [stats, setStats] = useState({ total: 0, trusted: 0, active24h: 0 });

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const res = await sduiApi.getDevices();
            const data = res.data.data || res.data;
            setDevices(data);

            // Calculate stats
            const now = moment();
            setStats({
                total: data.length,
                trusted: data.filter(d => d.is_trusted).length,
                active24h: data.filter(d => moment(d.last_used_at).isAfter(now.subtract(24, 'hours'))).length
            });
        } catch (error) {
            console.error('Failed to fetch devices', error);
            message.error('Không thể tải danh sách thiết bị');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDevice = async (id, data) => {
        try {
            await sduiApi.updateDevice(id, data);
            message.success('Cập nhật thiết bị thành công');
            fetchDevices();
        } catch (error) {
            message.error('Lỗi khi cập nhật thiết bị');
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const columns = [
        {
            title: 'Thiết bị',
            key: 'device',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong><MobileOutlined /> {record.device_name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>ID: {record.device_uuid}</Text>
                </Space>
            )
        },
        {
            title: 'Người dùng',
            key: 'user',
            render: (text, record) => (
                <Space>
                    <UserOutlined />
                    <Text>{record.user?.name || 'Ẩn danh'}</Text>
                </Space>
            )
        },
        {
            title: 'Phiên bản & IP',
            key: 'version_ip',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Tag color="blue">v{record.app_version || '1.0.0'}</Tag>
                    <Text type="secondary" style={{ fontSize: '11px' }}><GlobalOutlined /> {record.ip_address || 'Unknown'}</Text>
                </Space>
            )
        },
        {
            title: 'Nhóm Target',
            dataIndex: 'target_group',
            key: 'target_group',
            render: (group, record) => (
                <Select
                    defaultValue={group || 'staff'}
                    style={{ width: 140 }}
                    onChange={(val) => handleUpdateDevice(record.id, { target_group: val })}
                >
                    <Option value="staff">Staff (Default)</Option>
                    <Option value="manager">Manager</Option>
                    <Option value="admin">Admin</Option>
                    <Option value="beta_user">Beta User</Option>
                    <Option value="qa_tester">QA Tester</Option>
                    <Option value="vip_customer">VIP Customer</Option>
                </Select>
            )
        },
        {
            title: 'Tin cậy',
            dataIndex: 'is_trusted',
            key: 'is_trusted',
            render: (trusted, record) => (
                <Tooltip title={trusted ? "Đã phê duyệt" : "Chưa tin cậy"}>
                    <Switch
                        checked={!!trusted}
                        onChange={(checked) => handleUpdateDevice(record.id, { is_trusted: checked })}
                    />
                </Tooltip>
            )
        },
        {
            title: 'Hoạt động cuối',
            dataIndex: 'last_used_at',
            key: 'last_used_at',
            render: (date) => moment(date).fromNow()
        }
    ];

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2}>Giám sát & Quản trị Thiết bị (V8.4 Elite)</Title>
                    <Text type="secondary">Quản lý định danh 1:1 cho từng thiết bị truy cập App.</Text>
                </div>
                <Button
                    type="primary"
                    icon={<SyncOutlined spin={loading} />}
                    onClick={fetchDevices}
                    loading={loading}
                >
                    Làm mới dữ liệu
                </Button>
            </div>

            {/* Thống kê nhanh */}
            <Row gutter={16}>
                <Col span={8}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Tổng thiết bị đã Sync"
                            value={stats.total}
                            prefix={<MobileOutlined className="text-blue-500" />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Thiết bị tin cậy (Trusted)"
                            value={stats.trusted}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title="Hoạt động trong 24h"
                            value={stats.active24h}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<SyncOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Bảng danh sách thiết bị */}
            <Card title="Danh sách thiết bị kết nối 1:1" className="shadow-sm">
                <Table
                    loading={loading}
                    dataSource={devices}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Card title="Hướng dẫn Quản trị" className="shadow-sm">
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    <li><strong>Trusted:</strong> Chỉ các thiết bị được bật Switch "Tin cậy" mới được nhận các Layout đặc thù theo Nhóm Target.</li>
                    <li><strong>Target Group:</strong> Giao diện Mobile App sẽ thay đổi ngay lập tức dựa trên nhóm bạn chỉ định (Phối hợp với Targeting Manager).</li>
                    <li><strong>Monitoring:</strong> Dữ liệu Phiên bản và IP được cập nhật mỗi khi người dùng mở App (Boot trigger).</li>
                </ul>
            </Card>
        </div>
    );
};

export default DeviceMonitoring;

import React, { useState, useEffect } from 'react';
import {
    Card, Table, Tag, Row, Col, Button, Space, Typography,
    Select, message, Modal, Input, Badge, Switch, List
} from 'antd';
import {
    SyncOutlined, DeleteOutlined, BugOutlined,
    MobileOutlined, UserOutlined, ClockCircleOutlined,
    SearchOutlined, FilterOutlined, SettingOutlined,
    ThunderboltOutlined, BellOutlined, ApiOutlined,
    LayoutOutlined
} from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const RemoteLogManager = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [filters, setFilters] = useState({ level: null, platform: null, search: '' });
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Remote Debug Modal State
    const [debugModalVisible, setDebugModalVisible] = useState(false);
    const [currentDevice, setCurrentDevice] = useState(null);
    const [debugConfigs, setDebugConfigs] = useState({});
    const [updatingFlag, setUpdatingFlag] = useState(false);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const res = await sduiApi.getAppLogs({
                page,
                level: filters.level,
                platform: filters.platform,
                search: filters.search
            });

            const body = res.data;
            const logsArray = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
            setLogs(logsArray);

            const pagInfo = body?.meta?.pagination || body;
            if (pagInfo?.total_items || pagInfo?.total) {
                setPagination({
                    current: pagInfo.current_page || 1,
                    pageSize: pagInfo.per_page || 20,
                    total: pagInfo.total_items || pagInfo.total || 0
                });
            }
        } catch (error) {
            message.error('Không thể tải logs từ App');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDebug = async (record) => {
        setCurrentDevice(record);
        setDebugModalVisible(true);
        try {
            const res = await sduiApi.getAppDebugConfigs(record.device_id);
            setDebugConfigs(res.data?.data || {});
        } catch (error) {
            message.error('Không thể tải cấu hình debug của thiết bị');
        }
    };

    const handleToggleDebug = async (module, enabled) => {
        setUpdatingFlag(true);
        try {
            await sduiApi.toggleAppDebugConfig(currentDevice.device_id, module, enabled);
            setDebugConfigs({ ...debugConfigs, [module]: enabled });
            message.success(`Đã cập nhật Debug ${module}`);
        } catch (error) {
            message.error('Lỗi khi cập nhật cấu hình');
        } finally {
            setUpdatingFlag(false);
        }
    };

    const handleClearLogs = () => {
        Modal.confirm({
            title: 'Xác nhận xóa sạch Logs?',
            content: 'Hành động này sẽ xóa vĩnh viễn toàn bộ biên bản lỗi từ các thiết bị mobile trong Database. Bạn có chắc chắn?',
            okText: 'Xóa sạch',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await sduiApi.clearAppLogs();
                    message.success('Đã xóa sạch Logs thành công');
                    fetchLogs();
                    setSelectedRowKeys([]);
                } catch (error) {
                    message.error('Lỗi khi xóa Logs');
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedRowKeys.length === 0) return;

        Modal.confirm({
            title: `Xác nhận xóa ${selectedRowKeys.length} logs đã chọn?`,
            okText: 'Xóa mục đã chọn',
            okType: 'danger',
            onOk: async () => {
                try {
                    await sduiApi.bulkDeleteAppLogs(selectedRowKeys);
                    message.success(`Đã xóa ${selectedRowKeys.length} logs thành công`);
                    setSelectedRowKeys([]);
                    fetchLogs(pagination.current);
                } catch (error) {
                    message.error('Lỗi khi xóa logs đã chọn');
                }
            }
        });
    };

    useEffect(() => {
        fetchLogs();
    }, [filters.level, filters.platform]);

    const getLevelColor = (level) => {
        switch (level) {
            case 'FATAL': return '#722ed1';
            case 'ERROR': return '#f5222d';
            case 'WARN': return '#faad14';
            case 'INFO': return '#1890ff';
            default: return '#8c8c8c';
        }
    };

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'time',
            width: 170,
            render: (date) => (
                <Space direction="vertical" size={0}>
                    <Text size="small" type="secondary">{moment(date).format('DD/MM/YYYY')}</Text>
                    <Text strong>{moment(date).format('HH:mm:ss')}</Text>
                </Space>
            )
        },
        {
            title: 'Uptime',
            dataIndex: 'context',
            key: 'uptime',
            width: 90,
            render: (context) => (
                <Tag color="blue" bordered={false}>
                    {context?.uptime || 'N/A'}
                </Tag>
            )
        },
        {
            title: 'Mức độ',
            dataIndex: 'level',
            key: 'level',
            width: 100,
            render: (level) => (
                <Tag color={getLevelColor(level)} style={{ fontWeight: 'bold' }}>
                    {level}
                </Tag>
            )
        },
        {
            title: 'Thông điệp lỗi / Log Message',
            dataIndex: 'message',
            key: 'message',
            render: (text) => <Text strong style={{ color: '#1a1a1a' }}>{text}</Text>
        },
        {
            title: 'Thiết bị & User',
            key: 'metadata',
            width: 250,
            render: (_, record) => (
                <div style={{ fontSize: '12px' }}>
                    <div><UserOutlined /> {record.user?.email || 'Guest'}</div>
                    <div style={{ color: '#8c8c8c' }}>
                        <MobileOutlined /> {record.platform} | ID: {record.device_id?.slice(0, 8)}...
                    </div>
                </div>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            Modal.info({
                                title: 'Chi tiết Context Lỗi',
                                width: 800,
                                content: (
                                    <pre style={{
                                        background: '#f1f5f9',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        maxHeight: '500px',
                                        overflow: 'auto',
                                        fontSize: '12px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {JSON.stringify(record.context, null, 2)}
                                    </pre>
                                )
                            });
                        }}
                    >
                        Chi tiết
                    </Button>
                    <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => handleOpenDebug(record)}
                    >
                        Debug
                    </Button>
                </Space>
            )
        }
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const debugModules = [
        { key: 'socket', label: 'Realtime Socket', icon: <ThunderboltOutlined style={{ color: '#faad14' }} />, desc: 'Trace kết nối Reverb, Reconnect, Heartbeat' },
        { key: 'push', label: 'Push Notification', icon: <BellOutlined style={{ color: '#f5222d' }} />, desc: 'Trace đăng ký token, nhận thông báo' },
        { key: 'api', label: 'API Tracer', icon: <ApiOutlined style={{ color: '#1890ff' }} />, desc: 'Trace toàn bộ request/response (Nặng)' },
        { key: 'sdui', label: 'SDUI Layout', icon: <LayoutOutlined style={{ color: '#52c41a' }} />, desc: 'Trace lỗi render Block, Schema validation' },
    ];

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2}><BugOutlined /> Mobile Remote Log Center</Title>
                    <Text type="secondary">Giám sát lỗi runtime và dấu vết hệ thống từ ứng dụng QVC Mobile V9.3</Text>
                </div>
                <Space>
                    {selectedRowKeys.length > 0 && (
                        <Button
                            danger
                            type="primary"
                            icon={<DeleteOutlined />}
                            onClick={handleBulkDelete}
                        >
                            Xóa {selectedRowKeys.length} mục đã chọn
                        </Button>
                    )}
                    <Button
                        icon={<SyncOutlined spin={loading} />}
                        onClick={() => fetchLogs(pagination.current)}
                    >
                        Làm mới
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleClearLogs}
                    >
                        Dọn dẹp Logs
                    </Button>
                </Space>
            </div>

            <Card className="shadow-sm mb-4">
                <Row gutter={16} align="middle">
                    <Col span={6}>
                        <Text strong className="block mb-1"><FilterOutlined /> Lọc Mức độ</Text>
                        <Select
                            placeholder="Tất cả Levels"
                            style={{ width: '100%' }}
                            allowClear
                            onChange={val => {
                                setFilters({ ...filters, level: val });
                                setSelectedRowKeys([]);
                            }}
                        >
                            <Option value="FATAL">FATAL (Cực nghiêm trọng)</Option>
                            <Option value="ERROR">ERROR (Lỗi app)</Option>
                            <Option value="WARN">WARN (Cảnh báo)</Option>
                            <Option value="INFO">INFO (Thông tin)</Option>
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Text strong className="block mb-1"><MobileOutlined /> Nền tảng</Text>
                        <Select
                            placeholder="Tất cả OS"
                            style={{ width: '100%' }}
                            allowClear
                            onChange={val => {
                                setFilters({ ...filters, platform: val });
                                setSelectedRowKeys([]);
                            }}
                        >
                            <Option value="ios">Apple iOS</Option>
                            <Option value="android">Android OS</Option>
                        </Select>
                    </Col>
                    <Col span={12}>
                        <Text strong className="block mb-1"><SearchOutlined /> Tìm kiếm nội dung</Text>
                        <Input.Search
                            placeholder="Tìm theo tin nhắn lỗi, email, device ID..."
                            onSearch={val => {
                                setFilters({ ...filters, search: val });
                                setSelectedRowKeys([]);
                                fetchLogs(1);
                            }}
                        />
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} className="shadow-sm">
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={logs}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        onChange: (page) => fetchLogs(page),
                        showTotal: (total) => `Tổng cộng ${total} logs`
                    }}
                    rowClassName={(record) => record.level === 'FATAL' ? 'bg-purple-50' : record.level === 'ERROR' ? 'bg-red-50' : ''}
                />
            </Card>

            {/* Modal Debug Control */}
            <Modal
                title={<span><SettingOutlined /> Remote Debug Control — Device: {currentDevice?.device_id?.slice(0, 16)}...</span>}
                visible={debugModalVisible}
                onCancel={() => setDebugModalVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setDebugModalVisible(false)}>
                        Hoàn tất
                    </Button>
                ]}
            >
                <div className="mb-4">
                    <Text type="secondary">Cấu hình sẽ có hiệu lực ngay trong lần tiếp theo App gọi Bootstrap (thường là khi mở lại App hoặc Reload).</Text>
                </div>
                <List
                    dataSource={debugModules}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Switch
                                    loading={updatingFlag}
                                    checked={debugConfigs[item.key]}
                                    onChange={(checked) => handleToggleDebug(item.key, checked)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={item.icon}
                                title={item.label}
                                description={item.desc}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <Card title="Hướng dẫn xử lý lỗi" className="shadow-sm">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <Badge status="error" text="Hành động khi có ERROR/FATAL:" />
                        <ul className="mt-2 text-gray-500 text-sm">
                            <li>Chọn từng log hoặc chọn tất cả để xóa hàng loạt (Bulk Delete).</li>
                            <li>Bấm vào <strong>Chi tiết</strong> để xem mã lỗi hoặc Payload sai cấu trúc.</li>
                            <li>Bật <strong>Debug</strong> cho thiết bị cụ thể để theo dõi luồng dữ liệu INFO chi tiết hơn.</li>
                        </ul>
                    </div>
                    <div>
                        <Badge status="processing" text="Giải thích Uptime:" />
                        <ul className="mt-2 text-gray-500 text-sm">
                            <li><strong>Uptime</strong> cho biết lỗi xảy ra sau bao nhiêu giây kể từ khi mở App.</li>
                            <li>Nếu uptime {'< 5s'}: Thường là lỗi khởi tạo (Bootstrap/Push).</li>
                            <li>Nếu uptime {'> 60s'}: Thường là lỗi tương tác người dùng hoặc Socket Timeout.</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default RemoteLogManager;

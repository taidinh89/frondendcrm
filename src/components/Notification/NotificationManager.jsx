import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Input, Button, Table, Tag, Space, Form, Select, Typography, message, Popconfirm, Tabs, Avatar, Tooltip, Drawer, Row, Col, Alert, Spin, Divider, Statistic, Empty, Modal } from 'antd';
import { SendOutlined, HistoryOutlined, NotificationOutlined, SearchOutlined, DeleteOutlined, MobileOutlined, AppleOutlined, AndroidOutlined, GlobalOutlined, PlusOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import chatApi from '../../services/chatApi';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Helper bọc JSON.parse để tránh crash trang nếu backend gửi data lỗi
 */
const safeParse = (data, fallback = {}) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.warn('[NotificationManager] SafeParse failed:', e);
        return fallback;
    }
};

const NotificationManager = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // --- State: General ---
    const initialTab = searchParams.get('tab') || '1';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Đồng bộ activeTab với URL searchParams
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (key) => {
        setActiveTab(key);
        setSearchParams({ tab: key });
    };

    // --- State: Data Dictionaries ---
    const [allUsers, setAllUsers] = useState([]);
    const [userGroups, setUserGroups] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(false);

    // --- State: Broadcast History ---
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyType, setHistoryType] = useState('all');
    const [historyError, setHistoryError] = useState(null); // Explicit error logging

    // --- State: Broadcast Drawer ---
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [sending, setSending] = useState(false);
    const [form] = Form.useForm();

    // --- State: Devices ---
    const [devices, setDevices] = useState([]);
    const [deviceLoading, setDeviceLoading] = useState(false);
    const [deviceSearch, setDeviceSearch] = useState('');
    const [devicePlatform, setDevicePlatform] = useState('all');
    const [devicePagination, setDevicePagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [deviceError, setDeviceError] = useState(null); // Explicit error logging

    // --- State: Queue Monitor ---
    const [queueJobs, setQueueJobs] = useState([]);
    const [queueLoading, setQueueLoading] = useState(false);
    const [isForcing, setIsForcing] = useState(false);
    const [isClearingQueue, setIsClearingQueue] = useState(false);
    const [queueError, setQueueError] = useState(null);
    const [forceOutput, setForceOutput] = useState(null);
    const [isOutputModalVisible, setIsOutputModalVisible] = useState(false);

    // --- State: Delivery Details (Tracing) ---
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [currentDetails, setCurrentDetails] = useState(null);

    // --- Fetch Initialization ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === '1') fetchHistory();
        if (activeTab === '2') fetchDevices();
        if (activeTab === '3') fetchQueue();
    }, [activeTab]);

    const fetchInitialData = async () => {
        setIsInitialLoading(true);
        try {
            const [usersRes, groupsRes] = await Promise.all([
                chatApi.get('v1/internal/users/all?limit=1000'), // Load all for broadcasting selection
                chatApi.get('v1/internal/user-groups')
            ]);
            const rawUsers = usersRes.data;
            setAllUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data || []));
            setUserGroups(groupsRes.data || []);
        } catch (err) {
            console.error('Initial data fetch error:', err);
            message.error('Không thể tải dữ liệu danh mục nhân viên và phòng ban. Hãy kiểm tra kết nối.');
        } finally {
            setIsInitialLoading(false);
        }
    };

    // --- Fetch Data Methods ---
    const fetchHistory = async (search = historySearch, type = historyType) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const res = await chatApi.get('v1/notifications/history', {
                params: { search, type }
            });

            if (!res || !res.data) {
                throw new Error("Lỗi cấu trúc mạng: Response không chứa trường 'data'. Kiểm tra lại CORS hoặc Network Firewall.");
            }

            let items = [];
            const data = res.data;

            if (Array.isArray(data)) {
                items = data;
            } else if (data?.data && Array.isArray(data.data)) {
                items = data.data;
            } else if (data?.items && Array.isArray(data.items)) {
                items = data.items;
            } else {
                // Nếu không ra kiểu gì, ít nhất không crash trang
                items = [];
            }

            setHistory(items);
        } catch (err) {
            console.error('History fetch error:', err);
            setHistoryError(err.message || "Lỗi không xác định khi gọi API History.");
            message.error({ content: 'Lỗi đồng bộ Dữ Liệu Lịch sử. Vui lòng xem Error Log bên dưới.', key: 'errH', duration: 3 });
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchDevices = async (page = 1, search = deviceSearch, platform = devicePlatform) => {
        setDeviceLoading(true);
        setDeviceError(null);
        try {
            const res = await chatApi.get('v1/notifications/admin/devices', {
                params: { page, search, platform }
            });

            if (!res || !res.data) {
                throw new Error("Lỗi cấu trúc mạng: Response không chứa trường 'data'.");
            }

            let items = [];
            let paginationData = { current: 1, pageSize: 20, total: 0 };
            const data = res.data;

            if (Array.isArray(data)) {
                items = data;
                const meta = data._meta?.pagination || {};
                paginationData = {
                    current: meta.current_page || 1,
                    pageSize: meta.per_page || 20,
                    total: meta.total_items || 0
                };
            } else if (data?.data && Array.isArray(data.data)) {
                items = data.data;
                paginationData = {
                    current: data.current_page || 1,
                    pageSize: data.per_page || 20,
                    total: data.total || 0
                };
            }

            setDevices(items);
            setDevicePagination(paginationData);
        } catch (err) {
            console.error('Devices fetch error:', err);
            setDeviceError(err.message || "Lỗi không xác định khi gọi API Devices.");
            message.error({ content: 'Lỗi đồng bộ Dữ Liệu Thiết bị. Vui lòng xem Error Log.', key: 'errD', duration: 3 });
        } finally {
            setDeviceLoading(false);
        }
    };

    const fetchQueue = async () => {
        setQueueLoading(true);
        setQueueError(null);
        try {
            const res = await chatApi.get('v1/notifications/admin/queue');
            setQueueJobs(res.data?.jobs || []);
        } catch (err) {
            console.error('Queue fetch error:', err);
            setQueueError("Không thể kết nối đến máy chủ để kiểm tra hàng đợi.");
        } finally {
            setQueueLoading(false);
        }
    };

    const handleForceRunQueue = async () => {
        setIsForcing(true);
        const hide = message.loading('Đang ép xung xử lý Hàng đợi... (Artisan queue:work)', 0);
        try {
            const res = await chatApi.post('v1/notifications/admin/queue/force');
            // Unwrap meta: res.data is already the payload (thanks to chatApi interceptor)
            setForceOutput(res.data);
            setIsOutputModalVisible(true);

            message.success(res.data?._meta?.message || 'Lệnh đã hoàn tất.');
            fetchQueue();
        } catch (err) {
            console.error('Force queue error:', err);
            const errorMsg = err.response?.data?.message || 'Lỗi khi kích hoạt Queue. Hãy kiểm tra Log Server.';
            message.error(errorMsg);

            if (err.response?.data) {
                setForceOutput(err.response.data);
                setIsOutputModalVisible(true);
            }
        } finally {
            hide();
            setIsForcing(false);
        }
    };

    const handleClearQueue = async () => {
        setIsClearingQueue(true);
        try {
            await chatApi.post('v1/notifications/admin/queue/clear');
            message.success('Đã xóa sạch hàng đợi.');
            fetchQueue();
        } catch (err) {
            message.error('Không thể xóa hàng đợi.');
        } finally {
            setIsClearingQueue(false);
        }
    };

    const handleFetchDetails = async (notificationId) => {
        setDetailsLoading(true);
        setIsDetailsModalVisible(true);
        setCurrentDetails(null);
        try {
            const res = await chatApi.get(`v1/notifications/history/${notificationId}/details`);
            // res.data is already the payload: { batch_id, total, logs }
            setCurrentDetails(res.data || null);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Không thể lấy chi tiết đợt gửi này.';
            message.error(errorMsg);
            setIsDetailsModalVisible(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    // --- Actions ---
    const handleSendBroadcast = async (values) => {
        setSending(true);
        try {
            let finalUserIds = values.user_ids || [];

            // Xử lý logic theo nhóm
            if (values.target === 'specific_groups' && values.group_ids) {
                const selectedGroups = userGroups.filter(g => values.group_ids.includes(g.id));
                const groupUserIds = selectedGroups.flatMap(g => g.members?.map(m => m.id) || []);
                finalUserIds = [...new Set([...finalUserIds, ...groupUserIds])];
            }

            // Map target type for backend validation
            const mappedTarget = values.target === 'all_staff' ? 'all_staff' : 'specific_users';

            const payload = {
                title: values.title,
                body: values.body,
                type: values.type || 'info',
                url: values.url || '',
                target: mappedTarget,
                user_ids: finalUserIds
            };

            await chatApi.post('v1/notifications/broadcast', payload);

            message.success({ content: 'Gửi thông báo đẩy (Push Notification) đến các máy thành công!', key: 'broadcastMsg' });
            setIsDrawerVisible(false);
            form.resetFields();
            fetchHistory(); // Refresh table

        } catch (err) {
            console.error('Send broadcast error:', err);
            message.error({ content: 'Gửi thông báo thất bại. Vui lòng kiểm tra lại thiết lập JSON hoặc Mạng.', key: 'broadcastMsg' });
        } finally {
            setSending(false);
        }
    };

    const handleDeleteHistory = async (id) => {
        try {
            await chatApi.delete(`v1/notifications/${id}`);
            message.success('Đã xóa bản ghi lịch sử gửi.');
            fetchHistory();
        } catch (err) {
            console.error('Delete history error:', err);
            message.error('Lỗi khi xóa lịch sử. Có thể do kết nối mạng hoặc không đủ quyền Admin.');
        }
    };

    const handleQuickPush = (record) => {
        const user = record.user;
        if (!user || (!user.id && user.id !== 0)) {
            message.warning("Thiết bị này không có thông tin Chủ thể hợp lệ.");
            return;
        }
        form.setFieldsValue({
            target: 'specific_users',
            user_ids: [user.id],
            group_ids: [],
            title: '',
            body: '',
            url: '',
            type: 'info'
        });
        setIsDrawerVisible(true);
    };

    const handleDeleteDevice = async (id) => {
        try {
            await chatApi.delete(`v1/notifications/admin/devices/${id}`);
            message.success('Đã ngắt kết nối thiết bị! Từ nay hệ thống sẽ bỏ qua Token FCM này.');
            fetchDevices(devicePagination.current);
        } catch (err) {
            console.error('Delete device error:', err);
            message.error('Có lỗi xảy ra khi ngắt kết nối thiết bị.');
        }
    };

    // --- Columns Definition ---
    const historyColumns = [
        {
            title: 'Nội dung thông báo (Payload)',
            key: 'content',
            width: '45%',
            render: (_, record) => {
                const json = safeParse(record.data);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Text strong style={{ fontSize: 15, color: '#1f2937' }}>{json.title || 'Không có tiêu đề'}</Text>
                        <Text type="secondary" style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {json.body || 'Không có mô tả nội dung.'}
                        </Text>
                        {json.url && json.url !== '/' && (
                            <div style={{ marginTop: 4 }}>
                                <a href={json.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0f5ff', padding: '2px 8px', borderRadius: 4 }}>
                                    <GlobalOutlined /> {json.url}
                                </a>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Phân hạng',
            key: 'type',
            width: '15%',
            align: 'center',
            render: (_, record) => {
                let type = 'info';
                try {
                    const json = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                    type = json?.type || 'info';
                } catch (e) { }

                const typeConfig = {
                    info: { color: 'processing', text: 'THÔNG TIN' },
                    warning: { color: 'warning', text: 'CẢNH BÁO' },
                    error: { color: 'error', text: 'KHẨN CẤP' }
                };
                const conf = typeConfig[type] || typeConfig.info;
                return <Tag color={conf.color} style={{ borderRadius: 12, padding: '2px 12px', fontWeight: 500 }}>{conf.text}</Tag>;
            }
        },
        {
            title: 'Ngày phát sóng',
            dataIndex: 'created_at',
            key: 'created_at',
            width: '20%',
            render: (date) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{new Date(date).toLocaleDateString('vi-VN')}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{new Date(date).toLocaleTimeString('vi-VN')}</Text>
                </div>
            )
        },
        {
            title: 'Phủ sóng (Reach)',
            key: 'reach',
            width: 150,
            render: (_, record) => {
                const payload = safeParse(record.data);
                const hasBatch = !!payload?.batch_id;

                if (!hasBatch) return <Text type="secondary" style={{ fontSize: 12 }}>N/A (Cũ)</Text>;

                return (
                    <Button
                        size="small"
                        icon={<SearchOutlined />}
                        onClick={() => handleFetchDetails(record.id)}
                    >
                        Soi chi tiết
                    </Button>
                );
            }
        },
        {
            title: 'Thu hồi',
            key: 'action',
            width: '10%',
            align: 'right',
            render: (_, record) => (
                <Popconfirm title="Bạn có chắc chắn muốn xóa lưu vết lịch sử này?" onConfirm={() => handleDeleteHistory(record.id)} placement="left">
                    <Tooltip title="Xóa lịch sử">
                        <Button type="text" danger icon={<DeleteOutlined />} shape="circle" size="large" />
                    </Tooltip>
                </Popconfirm>
            )
        }
    ];

    const deviceColumns = [
        {
            title: 'Tài khoản Đăng nhập (Chủ thể)',
            key: 'user',
            render: (_, record) => {
                const user = record.user || {};
                return (
                    <Space size="middle">
                        <Avatar src={user.avatar} size="large" style={{ backgroundColor: '#1677ff', fontSize: 16 }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text strong style={{ fontSize: 14 }}>{user.name || 'Hệ thống ẩn danh'}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{user.email || 'No email'}</Text>
                        </div>
                    </Space>
                );
            }
        },
        {
            title: 'Role',
            dataIndex: ['user', 'role'],
            key: 'role',
            width: 120,
            render: (role) => {
                if (!role) return <Text type="secondary">-</Text>;
                return <Tag color={role === 'admin' ? 'magenta' : 'geekblue'} bordered={false}>{role.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Loại Thiết Bị (Platform)',
            key: 'platform',
            render: (_, record) => {
                const isIos = record.platform?.toLowerCase() === 'ios';
                const isAnd = record.platform?.toLowerCase() === 'android';

                let icon = <GlobalOutlined />;
                let color = 'cyan';
                if (isIos) { icon = <AppleOutlined />; color = 'default'; }
                if (isAnd) { icon = <AndroidOutlined />; color = 'success'; }

                return (
                    <Space direction="vertical" size={2}>
                        <Tag icon={icon} color={color} bordered={false} style={{ fontSize: 13, padding: '2px 8px' }}>
                            {record.platform?.toUpperCase() || 'TRÌNH DUYỆT WEB'}
                        </Tag>
                        {record.device_model && (
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.device_model}</Text>
                        )}
                    </Space>
                );
            }
        },
        {
            title: 'Firebase Token (FCM)',
            dataIndex: 'token',
            key: 'token',
            render: (t) => (
                <Tooltip title={t} placement="topLeft">
                    <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#f5f5f5', padding: '6px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#666', border: '1px solid #e8e8e8' }}>
                        {t}
                    </div>
                </Tooltip>
            )
        },
        {
            title: 'Đăng ký lần cuối',
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 180,
            render: (date) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text>{new Date(date).toLocaleDateString('vi-VN')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{new Date(date).toLocaleTimeString('vi-VN')}</Text>
                </div>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title={`Gửi Push Nhanh cho ${record.user?.name || 'User này'}`}>
                        <Button type="primary" icon={<NotificationOutlined />} size="middle" onClick={() => handleQuickPush(record)}>Gửi</Button>
                    </Tooltip>
                    <Popconfirm title="Gỡ thiết bị nhận Push?" description="Người dùng sẽ bị xóa FCM Token khỏi CSDL, ngưng nhận thông báo đẩy cho đến khi Login lại." onConfirm={() => handleDeleteDevice(record.id)} placement="left">
                        <Tooltip title="Thu hồi / Khóa thiết bị nhận Push">
                            <Button type="primary" danger icon={<DeleteOutlined />} size="middle" ghost />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const queueColumns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Tên Job (Công việc)',
            dataIndex: 'name',
            key: 'name',
            render: (name) => {
                const friendlyName = name.split('\\').pop();
                return (
                    <Space>
                        <SyncOutlined spin={name.includes('Sync')} style={{ color: '#1677ff' }} />
                        <Tooltip title={name}>
                            <Text strong>{friendlyName}</Text>
                        </Tooltip>
                    </Space>
                );
            }
        },
        {
            title: 'Hàng đợi (Queue)',
            dataIndex: 'queue',
            key: 'queue',
            render: (q) => <Tag color="blue">{q}</Tag>
        },
        {
            title: 'Số lần thử (Attempts)',
            dataIndex: 'attempts',
            key: 'attempts',
            width: 150,
            render: (a) => <Tag color={a > 0 ? 'orange' : 'default'}>{a} lần</Tag>
        },
        {
            title: 'Đang xử lý lúc (Reserved)',
            dataIndex: 'reserved_at',
            key: 'reserved_at',
            width: 200,
            render: (date) => date ? <Tag color="processing">{date}</Tag> : <Text type="secondary">-</Text>
        },
        {
            title: 'Thời điểm tạo Job',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 200,
            render: (date) => <Text type="secondary">{date}</Text>
        }
    ];

    // --- Filter Helpers ---
    const filteredHistory = history.filter(item => {
        let json = {};
        try { json = typeof item.data === 'string' ? JSON.parse(item.data) : item.data; } catch (e) { }
        const matchesSearch = ((json.title || '') + (json.body || '')).toLowerCase().includes(historySearch.toLowerCase());
        return matchesSearch;
    });

    // --- Renderers ---
    const renderDrawerForm = () => (
        <Drawer
            title={
                <Space>
                    <NotificationOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Cấu hình Gửi Thông báo Đẩy (Push)</span>
                </Space>
            }
            placement="right"
            width={720}
            onClose={() => setIsDrawerVisible(false)}
            open={isDrawerVisible}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <Button size="large" onClick={() => setIsDrawerVisible(false)}>Đóng lại</Button>
                    <Button size="large" type="primary" onClick={() => form.submit()} loading={sending} icon={<SendOutlined />}>
                        Kiểm Tra & Thực Thi Phát Push
                    </Button>
                </div>
            }
        >
            <Alert
                message="Ban Chỉ Đạo & Điều Hành Khẩn Cấp"
                description="Bộ công cụ gửi Push Notification sẽ bắn tín hiệu TCP Socket và TCP Firebase tới thiết bị Android/iOS. Chú ý nội dung phải chuẩn xác và không chứa mã độc HTML."
                type="warning"
                showIcon
                style={{ marginBottom: 24, padding: '12px 16px' }}
            />

            <Spin spinning={isInitialLoading} tip="Đang kết nối kho dữ liệu nhân sự...">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSendBroadcast}
                    initialValues={{ target: 'all_staff', type: 'info' }}
                    requiredMark={true}
                    size="large"
                >
                    <Row gutter={24}>
                        <Col span={16}>
                            <Form.Item name="title" label={<Text strong>Tiêu đề tóm tắt (Title)</Text>} rules={[{ required: true, message: 'Bạn chưa nhập tiêu đề!' }]}>
                                <Input placeholder="Vd: Công ty sẽ tổ chức team building vào cuối tuần..." />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="type" label={<Text strong>Mức độ phân loại</Text>} rules={[{ required: true }]}>
                                <Select>
                                    <Option value="info"><span style={{ color: '#1677ff', fontWeight: 500 }}>🔵 Thông báo chuẩn</span></Option>
                                    <Option value="warning"><span style={{ color: '#faad14', fontWeight: 500 }}>🟠 Mang tính Cảnh báo</span></Option>
                                    <Option value="error"><span style={{ color: '#ff4d4f', fontWeight: 500 }}>🔴 Báo động Đỏ / Lỗi</span></Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="body" label={<Text strong>Nội dung đầy đủ (Mô tả body)</Text>} rules={[{ required: true, message: 'Body không được để trống' }]}>
                        <Input.TextArea rows={6} placeholder="Nhập text thuần túy. Hệ điều hành Android/iOS sẽ cắt gọn nếu text quá dài. Nếu cần dài hãy dẫn link bài viết ở mục bên dưới." showCount maxLength={800} />
                    </Form.Item>

                    <Form.Item name="url" label={<Text strong>Đường dẫn đính kèm (Deep-Link / URL Extension)</Text>} tooltip="Nhấn vào Notification trên điện thoại sẽ tự chuyển trang web/app đến đường dẫn này. Bỏ trống nếu không cần mở form/trang cụ thể.">
                        <Input prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://example.com/tin-tuc-no... hoặc /business/orders/123" />
                    </Form.Item>

                    <Divider dashed orientation="left" plain><Text type="secondary">Phân luồng đối tượng (Targeting)</Text></Divider>

                    <Form.Item name="target" label={<Text strong>Quy mô nhận thông báo</Text>} rules={[{ required: true }]}>
                        <Select onChange={(val) => form.setFieldsValue({ target: val, user_ids: [], group_ids: [] })}>
                            <Option value="all_staff">Phát cho Toàn Trạm (All Staff - Broadcast)</Option>
                            <Option value="specific_groups">Chỉ gửi cho Nhóm / Phòng ban chọn lọc</Option>
                            <Option value="specific_users">Ping trực tiếp Từng Cá nhân</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.target !== currentValues.target}>
                        {({ getFieldValue }) => {
                            const target = getFieldValue('target');
                            if (target === 'specific_groups') {
                                return (
                                    <Form.Item name="group_ids" rules={[{ required: true, message: 'Phải chọn ít nhất 1 phòng ban.' }]}>
                                        <Select mode="multiple" placeholder="Nhấn vào đây để chỉ định phòng / khối nhóm..." optionFilterProp="label" maxTagCount="responsive">
                                            {userGroups.map(g => (
                                                <Option key={g.id} value={g.id} label={g.name}>{g.name}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            if (target === 'specific_users') {
                                return (
                                    <Form.Item name="user_ids" rules={[{ required: true, message: 'Chưa có thông tin nhận.' }]}>
                                        <Select mode="multiple" placeholder="Gõ tìm họ tên nhân viên hoặc email..." optionFilterProp="label" showSearch maxTagCount="responsive">
                                            {allUsers.map(u => (
                                                <Option key={u.id} value={u.id} label={`${u.name} - ${u.email}`}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{u.name}</span>
                                                        <span style={{ color: '#aaa', fontSize: 13 }}>{u.email}</span>
                                                    </div>
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>
                </Form>
            </Spin>
        </Drawer>
    );

    return (
        <div style={{ padding: '32px 40px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
            {/* Header Area */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ background: '#1677ff', borderRadius: 12, width: 48, height: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 14px rgba(22,119,255,0.3)' }}>
                            <NotificationOutlined style={{ color: '#ffffff', fontSize: 24 }} />
                        </div>
                        Tổng Đài Quản Lý Push & Realtime Notifications
                    </Title>
                    <Text type="secondary" style={{ fontSize: 15, marginTop: 8, display: 'block', marginLeft: 62 }}>
                        Giao diện chỉ huy Trung tâm điều hành. Bắn tín hiệu Notification tới iOS App, Android App, Web C-Panel đồng loạt.
                    </Text>
                </div>

                {activeTab === '1' && (
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsDrawerVisible(true)} style={{ borderRadius: 8, padding: '0 24px', height: 44, fontSize: 15, fontWeight: 500, boxShadow: '0 4px 10px rgba(22,119,255,0.2)' }}>
                        Thực thi Lệnh Broadcast Mới
                    </Button>
                )}

                {activeTab === '3' && (
                    <Space>
                        <Popconfirm
                            title="Xóa toàn bộ hàng đợi?"
                            description="Tất cả các lệnh đang chờ sẽ bị hủy bỏ vĩnh viễn (Phòng trường hợp bị kẹt hàng nghìn lệnh)."
                            onConfirm={handleClearQueue}
                            okText="Đồng ý xóa"
                            cancelText="Hủy"
                        >
                            <Button size="large" danger icon={<DeleteOutlined />} loading={isClearingQueue}>Xóa sạch Queue</Button>
                        </Popconfirm>
                        <Button size="large" icon={<ReloadOutlined />} onClick={fetchQueue}>Làm mới</Button>
                        <Button
                            type="primary"
                            danger
                            size="large"
                            icon={<SendOutlined />}
                            loading={isForcing}
                            onClick={handleForceRunQueue}
                            style={{ borderRadius: 8, height: 44, fontWeight: 600 }}
                        >
                            Ép xung gửi Push ngay (Fire Now)
                        </Button>
                    </Space>
                )}
            </div>

            {/* Main Card with Tabs */}
            <Card bodyStyle={{ padding: 0 }} bordered={false} className="shadow-sm" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    size="large"
                    tabBarStyle={{ padding: '0 24px', margin: 0, backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' }}
                    items={[
                        {
                            key: '1',
                            label: <span style={{ fontSize: 16, fontWeight: 500 }}><HistoryOutlined style={{ marginRight: 8 }} /> Lịch sử Phát Trạm (History Log)</span>,
                            children: (
                                <div style={{ background: '#fff' }}>
                                    {/* Action bar for History */}
                                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                                        <Space size="large">
                                            <Input.Search
                                                placeholder="Lọc từ khóa nội dung/tiêu đề..."
                                                allowClear
                                                onSearch={val => {
                                                    setHistorySearch(val);
                                                    fetchHistory(val, historyType);
                                                }}
                                                style={{ width: 320 }}
                                                size="large"
                                            />
                                            <Select
                                                value={historyType}
                                                style={{ width: 180 }}
                                                size="large"
                                                onChange={val => {
                                                    setHistoryType(val);
                                                    fetchHistory(historySearch, val);
                                                }}
                                            >
                                                <Option value="all">Tất cả Phân loại cấp độ</Option>
                                                <Option value="info">Chỉ Thông tin thường</Option>
                                                <Option value="warning">Chỉ loại Cảnh báo</Option>
                                                <Option value="error">Chỉ loại Lỗi/Khẩn cấp</Option>
                                            </Select>
                                        </Space>
                                        <Button size="large" icon={<ReloadOutlined />} onClick={() => fetchHistory()}>Tải lại Data</Button>
                                    </div>

                                    {historyError && (
                                        <div style={{ padding: '0 24px 16px 24px' }}>
                                            <Alert message="Lỗi Nghiêm Trọng (Fatal Error)" description={historyError} type="error" showIcon action={<Button size="small" danger onClick={() => fetchHistory()}>Thử lại</Button>} />
                                        </div>
                                    )}
                                    {/* Table for History */}
                                    <Table
                                        dataSource={filteredHistory}
                                        columns={historyColumns}
                                        rowKey="id"
                                        loading={historyLoading}
                                        pagination={{ pageSize: 15, showSizeChanger: true }}
                                        style={{ padding: historyError ? '0 24px 24px 24px' : '12px 24px 24px 24px' }}
                                    />
                                </div>
                            )
                        },
                        {
                            key: '2',
                            label: <span style={{ fontSize: 16, fontWeight: 500 }}><MobileOutlined style={{ marginRight: 8 }} /> Bảng Điều Khiển Thiết Bị (Device Endpoints)</span>,
                            children: (
                                <div style={{ background: '#fff' }}>
                                    {/* Action bar for Devices */}
                                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                                        <Space size="large">
                                            <Input.Search
                                                placeholder="Tra cứu theo Tên Chủ Thể hoặc Thư Điện Tử (Email)..."
                                                allowClear
                                                onSearch={val => {
                                                    setDeviceSearch(val);
                                                    fetchDevices(1, val, devicePlatform);
                                                }}
                                                style={{ width: 400 }}
                                                size="large"
                                            />
                                            <Select
                                                value={devicePlatform}
                                                size="large"
                                                onChange={val => {
                                                    setDevicePlatform(val);
                                                    fetchDevices(1, deviceSearch, val);
                                                }}
                                                style={{ width: 220 }}
                                            >
                                                <Option value="all">Tra cứu Tất cả Nền tảng</Option>
                                                <Option value="ios">Chỉ Môi trường iOS</Option>
                                                <Option value="android">Chỉ Môi trường Android</Option>
                                                <Option value="web">Chỉ Trình duyệt Web</Option>
                                            </Select>
                                        </Space>
                                        <Button size="large" icon={<ReloadOutlined />} onClick={() => fetchDevices(devicePagination.current, deviceSearch, devicePlatform)}>Tải lại Node Data</Button>
                                    </div>

                                    <div style={{ padding: '20px 24px 0 24px', marginBottom: deviceError ? 0 : 12 }}>
                                        <Alert
                                            message="Xác Đăng Ký Hệ Thống Push Mạng Đa Phương Tiện (FCM Google Core)"
                                            description="Giám sát mọi thiết bị client cấp phép push API. Việc gỡ bỏ một nút mạng mang tính chất cưỡng chế hủy đăng ký, token mã trên app bị xóa nên app sẽ câm nín vĩnh viễn với luồng báo này (Chỉ mở lại khi App chủ động gọi API xin cấp lại quyền)."
                                            type="info"
                                            showIcon
                                        />
                                    </div>

                                    {deviceError && (
                                        <div style={{ padding: '16px 24px' }}>
                                            <Alert message="Khác Hành Vi Dữ Liệu (Code Mismatch)" description={deviceError} type="error" showIcon action={<Button size="small" danger onClick={() => fetchDevices(devicePagination.current)}>Thử lại</Button>} />
                                        </div>
                                    )}

                                    {/* Table for Devices */}
                                    <Table
                                        dataSource={devices}
                                        columns={deviceColumns}
                                        rowKey="id"
                                        loading={deviceLoading}
                                        pagination={{
                                            ...devicePagination,
                                            showSizeChanger: false,
                                            onChange: (page) => fetchDevices(page, deviceSearch, devicePlatform)
                                        }}
                                        style={{ padding: deviceError ? '0 24px 24px 24px' : '12px 24px 24px 24px' }}
                                    />
                                </div>
                            )
                        },
                        {
                            key: '3',
                            label: <span style={{ fontSize: 16, fontWeight: 500 }}><SyncOutlined style={{ marginRight: 8 }} /> Quản lý Hàng đợi (Queue Monitor)</span>,
                            children: (
                                <div style={{ background: '#fff' }}>
                                    <div style={{ padding: '24px' }}>
                                        <Alert
                                            message={<Text strong style={{ fontSize: 16 }}>Giám sát Tiến trình Hàng đợi (Laravel Queue System)</Text>}
                                            description={
                                                <div>
                                                    <p>Hệ thống đang sử dụng cơ chế xử lý ngầm (Asynchronous). Khi sếp bấm gửi Broadcast, các lệnh sẽ được xếp vào bảng này.</p>
                                                    <p>Nếu thấy danh sách bên dưới có dữ liệu dừng lâu, sếp hãy bấm nút <b>"Ép xung gửi Push ngay"</b> ở phía trên để cưỡng chế máy chủ xử lý ngay lập tức.</p>
                                                </div>
                                            }
                                            type="warning"
                                            showIcon
                                            style={{ marginBottom: 24 }}
                                        />

                                        {queueError && (
                                            <Alert message="Lỗi kết nối Queue" description={queueError} type="error" showIcon style={{ marginBottom: 16 }} />
                                        )}

                                        <Table
                                            dataSource={queueJobs}
                                            columns={queueColumns}
                                            rowKey="id"
                                            loading={queueLoading}
                                            pagination={false}
                                            locale={{ emptyText: 'Hiện tại không có lệnh nào đang chờ (Hàng đợi sạch).' }}
                                        />
                                    </div>
                                </div>
                            )
                        }
                    ]}
                />
            </Card>

            {renderDrawerForm()}
            <Modal
                title={
                    <Space>
                        <SyncOutlined spin={isForcing} />
                        <span>Kết quả thực thi Hàng đợi</span>
                    </Space>
                }
                open={isOutputModalVisible}
                onCancel={() => setIsOutputModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsOutputModalVisible(false)}>Đóng</Button>
                ]}
                width={700}
            >
                {forceOutput ? (
                    <div style={{ maxHeight: 400, overflow: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {typeof forceOutput === 'string' ? forceOutput : JSON.stringify(forceOutput, null, 2)}
                    </div>
                ) : (
                    <Text type="secondary">Không có dữ liệu kết quả.</Text>
                )}
            </Modal>

            <Modal
                title={
                    <Space>
                        <NotificationOutlined />
                        <span>Chi tiết Phủ sóng & Nhận tin (Tracing)</span>
                    </Space>
                }
                open={isDetailsModalVisible}
                onCancel={() => setIsDetailsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>
                ]}
                width={800}
            >
                {detailsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" tip="Đang soi danh sách..." /></div>
                ) : currentDetails ? (
                    <div>
                        <div style={{ marginBottom: 16, background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
                            <Space size="large">
                                <Statistic title="Tổng mục tiêu" value={currentDetails.total} />
                                <Statistic
                                    title="Thành công"
                                    value={currentDetails.logs.filter(l => l.status === 'sent' || l.status === 'delivered').length}
                                    valueStyle={{ color: '#3f8600' }}
                                />
                                <Statistic
                                    title="Thất bại"
                                    value={currentDetails.logs.filter(l => l.status === 'failed').length}
                                    valueStyle={{ color: '#cf1322' }}
                                />
                            </Space>
                        </div>
                        <Table
                            dataSource={currentDetails.logs}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                            expandable={{
                                expandedRowRender: (log) => (
                                    <div style={{ padding: '8px 48px', background: '#fcfcfc', border: '1px solid #eee', borderRadius: 4 }}>
                                        <div style={{ marginBottom: 8 }}>
                                            <Text strong style={{ fontSize: 12, color: '#666' }}>USER AGENT (UA):</Text>
                                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', marginTop: 4, background: '#fff', padding: 8, border: '1px dashed #ddd' }}>
                                                {log.ua || 'Không thu thập được UA.'}
                                            </div>
                                        </div>
                                        {log.raw && (
                                            <div>
                                                <Text strong style={{ fontSize: 12, color: '#666' }}>RAW RESPONSE (Kỹ thuật):</Text>
                                                <pre style={{ fontSize: 10, background: '#1e1e1e', color: '#66bb6a', padding: 12, borderRadius: 4, overflow: 'auto', marginTop: 4 }}>
                                                    {typeof log.raw === 'string' ? log.raw : JSON.stringify(log.raw, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ),
                                rowExpandable: (log) => !!log.ua || !!log.raw,
                            }}
                            columns={[
                                {
                                    title: 'Người nhận',
                                    key: 'user',
                                    render: (_, log) => (
                                        <Space>
                                            <Avatar src={log.user_avatar} size="small">{log.user_name?.[0]}</Avatar>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <Text style={{ fontSize: 13 }}>{log.user_name}</Text>
                                                {log.ua && <Text type="secondary" style={{ fontSize: 10 }} ellipsis={{ tooltip: log.ua }}>{log.ua.substring(0, 30)}...</Text>}
                                            </div>
                                        </Space>
                                    )
                                },
                                {
                                    title: 'Thiết bị',
                                    key: 'device',
                                    render: (_, log) => {
                                        let icon = <GlobalOutlined />;
                                        if (log.platform?.includes('ios')) icon = <AppleOutlined />;
                                        if (log.platform?.includes('android')) icon = <AndroidOutlined />;
                                        return (
                                            <Tag icon={icon} bordered={false}>
                                                {log.platform?.toUpperCase() || (log.channel === 'socket' ? 'WEBSITE' : 'KHÔNG RÕ')}
                                            </Tag>
                                        );
                                    }
                                },
                                {
                                    title: 'Kênh',
                                    dataIndex: 'channel',
                                    render: (c) => <Tag color={c === 'socket' ? 'blue' : 'orange'}>{c === 'socket' ? 'Online (Web)' : 'Push (FCM)'}</Tag>
                                },
                                {
                                    title: 'Trạng thái',
                                    dataIndex: 'status',
                                    render: (s, log) => {
                                        if (s === 'delivered') return <Tag color="success">Đã tới máy</Tag>;
                                        if (s === 'sent') return <Tag color="processing">Đã đẩy đi</Tag>;
                                        return (
                                            <Tooltip title={log.error}>
                                                <Tag color="error">Thất bại</Tag>
                                            </Tooltip>
                                        );
                                    }
                                },
                                {
                                    title: 'Thời gian',
                                    dataIndex: 'sent_at',
                                    render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>
                                }
                            ]}
                        />
                    </div>
                ) : (
                    <Empty description="Không có dữ liệu truy vết cho tin này." />
                )}
            </Modal>
        </div>
    );
};

export default NotificationManager;

import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Space, Card, Typography, Divider, Checkbox, List, Avatar, Progress } from 'antd';
import { PlusOutlined, FacebookFilled, MessageOutlined, DeleteOutlined, EditOutlined, UserOutlined, SafetyCertificateOutlined, ApiOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import chatApi from '../../services/chatApi';

const { Title, Text } = Typography;
const { Option } = Select;

const ChannelManager = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [form] = Form.useForm();
    const [allUsers, setAllUsers] = useState([]);
    const [userGroups, setUserGroups] = useState([]);

    // FB Syncing State
    const [fbPages, setFbPages] = useState([]);
    const [isFbSyncModalOpen, setIsFbSyncModalOpen] = useState(false);
    const [selectedPageIds, setSelectedPageIds] = useState([]);
    const [syncLoading, setSyncLoading] = useState(false);

    // Audit State
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const response = await chatApi.get('v1/omnichannel/channels');
            setChannels(response.data);

            // Lấy danh sách user và group để gán rule
            const [userRes, groupRes] = await Promise.all([
                chatApi.get('v1/internal/users/all?limit=1000'),
                chatApi.get('v1/internal/user-groups')
            ]);
            const rawUsers = userRes.data;
            setAllUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data || []));
            setUserGroups(groupRes.data);
        } catch (error) {
            message.error('Không thể tải danh sách kênh');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChannels();

        // Lắng nghe Message từ cửa sổ Popup Facebook Auth
        const handleMessage = (event) => {
            if (event.data.type === 'FB_AUTH_SUCCESS') {
                const { token } = event.data;
                handleFetchFbPages(token);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // [NEW] Xử lý Deep Link từ thông báo (chờ channels tải xong)
    useEffect(() => {
        if (channels.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const targetChannelId = params.get('channel_id');
            const autoAudit = params.get('auto_open') === 'true';

            if (targetChannelId) {
                const target = channels.find(c => c.id == targetChannelId || c.channel_id == targetChannelId);
                if (target && autoAudit && target.platform === 'facebook') {
                    // Tự động mở Audit nếu là lỗi kết nối FB
                    handleAudit(target);
                }
            }
        }
    }, [channels.length]); // Chỉ chạy khi channels đã load xong

    const handleFetchFbPages = async (token) => {
        setLoading(true);
        try {
            const res = await chatApi.get(`/v1/omnichannel/channels/facebook/get-pages?token=${token}`);
            const { pages, token: finalToken } = res.data;
            setFbPages(pages);
            setSelectedPageIds(pages.map(p => p.id));
            setIsFbSyncModalOpen(true);
        } catch (err) {
            message.error('Lỗi lấy danh sách fanpage');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncSelected = async () => {
        if (selectedPageIds.length === 0) {
            message.warning('Vui lòng chọn ít nhất một fanpage');
            return;
        }
        setSyncLoading(true);
        try {
            const selectedPages = fbPages.filter(p => selectedPageIds.includes(p.id));
            await chatApi.post('/v1/omnichannel/channels/facebook/sync-pages', { pages: selectedPages });
            message.success(`Đã đồng bộ ${selectedPages.length} Fanpage thành công.`);
            setIsFbSyncModalOpen(false);
            fetchChannels();
        } catch (err) {
            message.error('Đồng bộ thất bại');
        } finally {
            setSyncLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingChannel(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingChannel(record);
        form.setFieldsValue({
            ...record,
            ...record,
            assigned_user_ids: record.metadata?.assigned_user_ids || [],
            assigned_group_ids: record.metadata?.assigned_group_ids || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await chatApi.delete(`/v1/omnichannel/channels/${id}`);
            message.success('Đã xóa kênh');
            fetchChannels();
        } catch (error) {
            message.error('Lỗi khi xóa kênh');
        }
    };

    const handleSubmit = async (values) => {
        const { assigned_user_ids, ...rest } = values;
        const payload = {
            ...rest,
            metadata: {
                ...(editingChannel?.metadata || {}),
                ...(editingChannel?.metadata || {}),
                assigned_user_ids: values.assigned_user_ids,
                assigned_group_ids: values.assigned_group_ids
            }
        };

        try {
            if (editingChannel) {
                await chatApi.put(`/v1/omnichannel/channels/${editingChannel.id}`, payload);
                message.success('Cập nhật thành công');
            } else {
                await chatApi.post('/v1/omnichannel/channels', payload);
                message.success('Thêm kênh mới thành công');
            }
            setIsModalOpen(false);
            fetchChannels();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleConnectFacebook = () => {
        const w = 600, h = 700;
        const left = (window.screen.width / 2) - (w / 2);
        const top = (window.screen.height / 2) - (h / 2);
        const authUrl = `https://chat.maytinhquocviet.com/api/channels/facebook/auth`;
        window.open(authUrl, 'Facebook Connect', `width=${w},height=${h},top=${top},left=${left}`);
    };

    const columns = [
        {
            title: 'Nền tảng',
            dataIndex: 'platform',
            key: 'platform',
            render: (text) => (
                <Tag color={text === 'facebook' ? 'blue' : 'green'} icon={text === 'facebook' ? <FacebookFilled /> : <MessageOutlined />}>
                    {text.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Tên Kênh/Page',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.metadata?.picture} icon={<UserOutlined />} />
                    <div>
                        <Text strong>{record.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 10 }}>{record.metadata?.category || 'No category'}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'ID Kênh',
            dataIndex: 'channel_id',
            key: 'channel_id',
            render: (text) => <Text code>{text}</Text>,
        },
        {
            title: 'Quota / Giới hạn',
            key: 'quota',
            render: (_, record) => {
                const limit = record.quota_config?.day_limit || 1000;
                const used = record.quota_usage?.today_count || 0;
                const percent = Math.min((used / limit) * 100, 100);
                return (
                    <div style={{ width: 140 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                            <span>{used}/{limit} hôm nay</span>
                        </div>
                        <Progress
                            percent={percent}
                            size="small"
                            status={percent >= 100 ? 'exception' : (percent > 80 ? 'active' : 'success')}
                            showInfo={false}
                            strokeColor={percent > 80 ? '#faad14' : '#52c41a'}
                        />
                    </div>
                );
            }
        },
        {
            title: 'Quy tắc phân phối',
            key: 'rules',
            render: (_, record) => {
                const staffIds = record.metadata?.assigned_user_ids || [];
                if (staffIds.length === 0) return <Tag>Mặc định (Tất cả Staff)</Tag>;
                return staffIds.map(id => {
                    const user = allUsers.find(u => u.id === id);
                    return user ? <Tag key={id} color="cyan">{user.name}</Tag> : null;
                });
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active, record) => (
                <Space direction="vertical" size={0}>
                    <Tag color={active ? 'success' : 'error'}>
                        {active ? 'Đang hoạt động' : (record.metadata?.last_error ? 'Bị lỗi / Ngưng' : 'Tạm dừng')}
                    </Tag>
                    {!active && record.metadata?.last_error && (
                        <Text type="danger" style={{ fontSize: 10, display: 'block', maxWidth: 150 }} ellipsis={{ tooltip: record.metadata.last_error }}>
                            {record.metadata.last_error}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
                </Space>
            ),
        },
        {
            title: 'Logs',
            key: 'logs',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={() => handleViewLogs(record)}
                        title="Xem lịch sử API"
                    />
                    {record.platform === 'facebook' && (
                        <Button
                            size="small"
                            icon={<SafetyCertificateOutlined />}
                            onClick={() => handleAudit(record)}
                            title="Kiểm tra quyền Token"
                        />
                    )}
                </Space>
            )
        }
    ];

    // --- Log Viewer Logic ---
    const [viewingLogsChannel, setViewingLogsChannel] = useState(null);
    const [apiLogs, setApiLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const handleViewLogs = (channel) => {
        setViewingLogsChannel(channel);
        fetchApiLogs(channel.id);
    };

    const fetchApiLogs = async (channelId) => {
        setLogsLoading(true);
        try {
            const res = await chatApi.get(`/v1/omnichannel/channels/${channelId}/logs`);
            // chatApi interceptor unwraps 'data', so res.data is the array of logs
            // Pagination info is in res.data._meta if needed
            setApiLogs(res.data);
        } catch (err) {
            message.error('Không thể tải logs');
        } finally {
            setLogsLoading(false);
        }
    };

    const logColumns = [
        { title: 'Thời gian', dataIndex: 'created_at', key: 'time', render: t => dayjs(t).format('HH:mm:ss DD/MM') },
        { title: 'Hành động', dataIndex: 'action', key: 'action', render: t => <Tag color="blue">{t}</Tag> },
        { title: 'Phương thức', dataIndex: 'method', key: 'method', render: t => <Tag>{t}</Tag> },
        {
            title: 'Trạng thái',
            dataIndex: 'status_code',
            key: 'status',
            render: (code) => (
                <Tag color={code >= 200 && code < 300 ? 'success' : 'error'}>
                    {code || 'N/A'}
                </Tag>
            )
        },
        { title: 'Thời lượng', dataIndex: 'duration_ms', key: 'duration', render: t => `${t}ms` },
    ];

    const handleAudit = async (channel) => {
        setAuditLoading(true);
        try {
            const res = await chatApi.get(`/v1/omnichannel/channels/${channel.id}/audit`);
            setAuditData(res.data);
            setIsAuditModalOpen(true);
        } catch (err) {
            message.error('Lỗi khi kiểm tra Token');
        } finally {
            setAuditLoading(false);
        }
    };

    const renderAuditContent = () => {
        if (!auditData) return null;

        const { debug, permissions } = auditData;
        const expiresAt = debug?.expires_at ? dayjs.unix(debug.expires_at).format('DD/MM/YYYY HH:mm') : 'Vĩnh viễn (System User/Long-lived)';

        return (
            <div>
                <Card size="small" title="Thông tin Token (Debug)" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><Text type="secondary">App:</Text> <Text strong>{debug?.application || 'N/A'}</Text></div>
                        <div><Text type="secondary">Hết hạn:</Text> <Text strong color={debug?.is_valid ? 'green' : 'red'}>{expiresAt}</Text></div>
                        <div><Text type="secondary">Trạng thái:</Text> <Tag color={debug?.is_valid ? 'success' : 'error'}>{debug?.is_valid ? 'Hợp lệ' : 'Vô hiệu'}</Tag></div>
                    </div>
                </Card>

                <Title level={5}>Quyền hạn được cấp (Permissions)</Title>
                <Table
                    size="small"
                    dataSource={permissions}
                    pagination={false}
                    rowKey="permission"
                    columns={[
                        {
                            title: 'Quyền (Permission)',
                            dataIndex: 'permission',
                            key: 'permission',
                            render: p => <Text code>{p}</Text>
                        },
                        {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            key: 'status',
                            render: s => <Tag color={s === 'granted' ? 'success' : 'error'}>{s.toUpperCase()}</Tag>
                        }
                    ]}
                />

                <div style={{ marginTop: 16 }}>
                    <Text type="secondary" italic>
                        * Lưu ý: Để chat và lấy thông tin khách, cần tối thiểu quyền: <b>pages_messaging</b>, <b>pages_show_list</b>, <b>pages_read_engagement</b>.
                    </Text>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
            <Card bordered={false} className="shadow-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <Title level={3}>Cấu hình Quy tắc Phân phối & Kênh Kết nối</Title>
                        <Text type="secondary">Tích hợp Fanpage và thiết lập nhân viên phụ trách cho từng kênh.</Text>
                    </div>
                    <Space size="middle">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                            style={{ height: 40, borderRadius: 8 }}
                        >
                            Thêm Kênh (Thủ công)
                        </Button>
                        <Button
                            icon={<ApiOutlined />}
                            onClick={() => {
                                const token = prompt("Vui lòng dán Facebook User Token:");
                                if (token) handleFetchFbPages(token);
                            }}
                            style={{ height: 40, borderRadius: 8, backgroundColor: '#00b894', color: 'white', border: 'none' }}
                        >
                            Kết nối bằng Token
                        </Button>
                        <Button
                            icon={<FacebookFilled />}
                            onClick={handleConnectFacebook}
                            style={{ height: 40, borderRadius: 8, backgroundColor: '#1877f2', color: 'white', border: 'none' }}
                        >
                            Đăng nhập Facebook
                        </Button>
                    </Space>
                </div>

                <Divider />

                <Table
                    columns={columns}
                    dataSource={channels}
                    loading={loading}
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            {/* Log Viewer Modal */}
            <Modal
                title={`Lịch sử API: ${viewingLogsChannel?.name || ''}`}
                open={!!viewingLogsChannel}
                onCancel={() => setViewingLogsChannel(null)}
                width={1000}
                footer={null}
            >
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button icon={<HistoryOutlined />} onClick={() => fetchApiLogs(viewingLogsChannel.id)}>Làm mới</Button>
                </div>
                <Table
                    dataSource={apiLogs}
                    columns={logColumns}
                    rowKey="id"
                    loading={logsLoading}
                    pagination={{ pageSize: 10 }}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <Text strong>Payload (Gửi đi):</Text>
                                    <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                                        <pre style={{ fontSize: 11, margin: 0 }}>{JSON.stringify(record.payload, null, 2)}</pre>
                                    </div>
                                </div>
                                <div>
                                    <Text strong>Response (Nhận về):</Text>
                                    <div style={{ background: '#fff1f0', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto', border: '1px solid #ffa39e' }}>
                                        <pre style={{ fontSize: 11, margin: 0 }}>{JSON.stringify(record.response, null, 2)}</pre>
                                        {record.error_message && (
                                            <div style={{ color: 'red', marginTop: 8, fontWeight: 'bold' }}>
                                                Error: {record.error_message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }}
                />
            </Modal>

            <Modal
                title={editingChannel ? `Thiết lập quy tắc: ${editingChannel.name}` : "Thêm kênh mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                destroyOnClose
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ platform: 'facebook', is_active: true, assigned_user_ids: [] }}
                >
                    {!editingChannel && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name="platform" label="Nền tảng" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="facebook">Facebook Messenger</Option>
                                    <Option value="zalo">Zalo OA</Option>
                                    <Option value="telegram">Telegram Bot</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="channel_id" label="Page ID / Channel ID" rules={[{ required: true }]}>
                                <Input placeholder="ID định danh" />
                            </Form.Item>
                        </div>
                    )}

                    <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="VD: Fanpage Quốc Việt 2026" />
                    </Form.Item>

                    <Card size="small" style={{ marginBottom: 24, backgroundColor: '#f9f9f9', borderLeft: '4px solid #1890ff' }}>
                        <Form.Item
                            name="assigned_user_ids"
                            label={<Text strong>Quy tắc phân phối (Distribution Rule)</Text>}
                            tooltip="Chỉ những người được chọn mới thấy tin nhắn mới từ Fanpage này. Admin mặc định luôn thấy tất cả các phòng chat."
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn nhân viên phụ trách..."
                                style={{ width: '100%' }}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={allUsers.map(u => ({
                                    label: `${u.name} (${u.role})`,
                                    value: u.id,
                                    role: u.role
                                }))}
                                optionRender={(option) => (
                                    <Space>
                                        <span>{option.data.role === 'admin' ? '🛡️' : '👨‍💻'}</span>
                                        {option.data.label}
                                    </Space>
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            name="assigned_group_ids"
                            label={<Text strong>Hoặc gán theo Nhóm (User Groups)</Text>}
                            tooltip="Chọn nhóm nhân viên (VD: Sales Team). Tất cả thành viên trong nhóm sẽ được gán."
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn nhóm nhân viên..."
                                style={{ width: '100%' }}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={userGroups.map(g => ({
                                    label: g.name,
                                    value: g.id,
                                    color: g.color || '#1890ff'
                                }))}
                                optionRender={(option) => (
                                    <Space>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: option.data.color }} />
                                        {option.data.label}
                                    </Space>
                                )}
                            />
                        </Form.Item>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                            * Nếu để trống cả 2 mục trên, hệ thống sẽ tự động gán cho toàn bộ Nhân viên (Staff).
                        </Text>
                    </Card>

                    <Card size="small" title="Cấu hình giới hạn (Quota)" style={{ marginBottom: 24, background: '#fff1f0', borderLeft: '4px solid #ff4d4f' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name={['quota_config', 'day_limit']} label="Giới hạn tin nhắn / ngày" initialValue={1000}>
                                <Input type="number" suffix="tin" />
                            </Form.Item>
                            <Form.Item name={['quota_config', 'safe_mode']} label="Chế độ an toàn" valuePropName="checked" initialValue={true}>
                                <Checkbox>Bật (Cảnh báo khi đạt 80%)</Checkbox>
                            </Form.Item>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            * Hệ thống sẽ ngừng gửi tin nhắn phản hồi khi đạt giới hạn để tránh bị khóa Fanpage.
                        </Text>
                    </Card>

                    <Form.Item name="access_token" label="Access Token" rules={[{ required: true }]}>
                        <Input.Password placeholder="Nhập Token truy cập (Long-lived)" />
                    </Form.Item>

                    <Form.Item name="is_active" label="Trạng thái">
                        <Select>
                            <Option value={true}>Hoạt động</Option>
                            <Option value={false}>Tạm ngưng</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Chọn Fanpage để kết nối"
                open={isFbSyncModalOpen}
                onCancel={() => setIsFbSyncModalOpen(false)}
                onOk={handleSyncSelected}
                confirmLoading={syncLoading}
                width={600}
                okText="Đồng bộ ngay"
                cancelText="Hủy"
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Vui lòng chọn các Page muốn tích hợp vào hệ thống Chat.</Text>
                </div>
                <Divider />
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    <Checkbox.Group
                        style={{ width: '100%' }}
                        value={selectedPageIds}
                        onChange={(list) => setSelectedPageIds(list)}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={fbPages}
                            renderItem={item => (
                                <List.Item style={{ padding: '12px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                                        <Checkbox value={item.id} />
                                        <Avatar src={item.picture?.data?.url} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                            <div style={{ fontSize: 12, color: '#999' }}>{item.category}</div>
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Checkbox.Group>
                </div>
            </Modal>

            {/* Audit Modal */}
            <Modal
                title={`Kiểm tra Quyền & Token: ${auditData?.channel_name || ''}`}
                open={isAuditModalOpen}
                onCancel={() => setIsAuditModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsAuditModalOpen(false)}>Đóng</Button>
                ]}
                width={700}
            >
                {auditLoading ? (
                    <div style={{ padding: '40px text-align: center' }}>
                        <Progress percent={99} status="active" />
                        <Text>Đang liên hệ Facebook để kiểm tra...</Text>
                    </div>
                ) : renderAuditContent()}
            </Modal>
        </div >
    );
};

export default ChannelManager;

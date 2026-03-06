import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Space, Card, Typography, Divider, Avatar, Tooltip, Popconfirm } from 'antd';
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import chatApi from '../../services/chatApi';

const { Title, Text } = Typography;

const UserGroupManager = () => {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [groupRes, userRes] = await Promise.all([
                chatApi.get('v1/internal/user-groups'),
                chatApi.get('v1/internal/users/all?limit=500') // Load all for management
            ]);
            setGroups(groupRes.data);
            const rawUsers = userRes.data;
            setUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data || []));
        } catch (error) {
            message.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingGroup(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingGroup(record);
        form.setFieldsValue({
            ...record,
            user_ids: record.members?.map(m => m.id) || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await chatApi.delete(`v1/internal/user-groups/${id}`);
            message.success('Đã xóa nhóm');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa nhóm');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingGroup) {
                await chatApi.put(`v1/internal/user-groups/${editingGroup.id}`, values);
                message.success('Cập nhật nhóm thành công');
            } else {
                await chatApi.post('v1/internal/user-groups', values);
                message.success('Tạo nhóm mới thành công');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const columns = [
        {
            title: 'Tên nhóm',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: record.color }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Thành viên',
            key: 'members',
            render: (_, record) => (
                <Avatar.Group maxCount={5} size="small">
                    {record.members?.map(m => (
                        <Tooltip title={m.name} key={m.id}>
                            <Avatar src={m.avatar} icon={<UserOutlined />} />
                        </Tooltip>
                    ))}
                </Avatar.Group>
            )
        },
        {
            title: 'Số lượng',
            key: 'count',
            render: (_, record) => <Tag color="blue">{record.members?.length || 0} người</Tag>
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Xóa nhóm này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card bordered={false} className="shadow-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <Title level={3}><TeamOutlined /> Quản lý Nhóm Nhân viên</Title>
                        <Text type="secondary">Tạo nhóm (Sales, Support, Admin...) để phân phối hội thoại nhanh chóng.</Text>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                        Tạo nhóm mới
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={groups}
                    loading={loading}
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            <Modal
                title={editingGroup ? "Chỉnh sửa nhóm" : "Tạo nhóm nhân viên mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                destroyOnClose
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}>
                        <Input placeholder="VD: Đội Sales Miền Bắc" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả nhiệm vụ của nhóm..." />
                    </Form.Item>

                    <Form.Item name="color" label="Màu sắc nhận diện" initialValue="#1890ff">
                        <Input type="color" style={{ width: 100, padding: 0, border: 'none', height: 40 }} />
                    </Form.Item>

                    <Form.Item
                        name="user_ids"
                        label="Thành viên trong nhóm (Active only)"
                        tooltip="Chỉ những nhân viên đang hoạt động (Status='active') mới được hiển thị tại đây."
                    >
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Chọn nhân viên tham gia nhóm..."
                            optionFilterProp="label"
                            options={users.map(u => ({
                                label: u.name,
                                value: u.id,
                                avatar: u.avatar
                            }))}
                            optionRender={(option) => (
                                <Space>
                                    <Avatar size="small" src={option.data.avatar} icon={<UserOutlined />} />
                                    {option.data.label}
                                </Space>
                            )}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserGroupManager;

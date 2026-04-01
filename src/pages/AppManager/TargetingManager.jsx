import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Card, Typography, Switch, message, Skeleton, Modal, Form, Input, InputNumber, Select, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text } = Typography;
const { Option } = Select;

const TargetingManager = () => {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [screens, setScreens] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [targetsRes, screensRes] = await Promise.all([
                sduiApi.getTargets(),
                sduiApi.getScreens()
            ]);
            setTargets(targetsRes.data || []);
            setScreens(screensRes.data || []);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            message.error('Không thể tải danh sách quy tắc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (values) => {
        setSubmitting(true);
        try {
            await sduiApi.saveTarget(values);
            message.success('Tạo quy tắc mới thành công');
            setIsModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Không thể tạo quy tắc');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            title: 'Ưu tiên',
            dataIndex: 'priority',
            key: 'priority',
            render: (val) => <Tag color="blue">#{val}</Tag>
        },
        {
            title: 'Tên quy tắc',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Loại điều kiện',
            dataIndex: 'condition_type',
            key: 'condition_type',
            render: (type) => <Tag color="purple">{type?.toUpperCase()}</Tag>
        },
        {
            title: 'Layout chỉ định',
            dataIndex: 'layout_slug',
            key: 'layout_slug',
            render: (slug) => <Tag color="geekblue">{slug}</Tag>
        },
        {
            title: 'Kích hoạt',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active) => <Switch checked={!!active} />
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: () => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Phân Phối & Nhắm Mục Tiêu (Targeting)</Title>
                    <Text type="secondary">Điều phối giao diện theo từng nhóm người dùng và thiết bị</Text>
                </div>
                <Space>
                    <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>Tạo luật mới</Button>
                </Space>
            </div>

            <Card className="shadow-sm">
                {loading ? <Skeleton active /> : (
                    <Table
                        dataSource={targets}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                    />
                )}
            </Card>

            <Modal
                title="Tạo Quy tắc Nhắm mục tiêu Mới"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={submitting}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ priority: 10, is_active: true }}>
                    <Form.Item name="name" label="Tên quy tắc" rules={[{ required: true }]}>
                        <Input placeholder="Ví dụ: Giao diện cho Đội Kinh doanh" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="priority" label="Độ ưu tiên (Càng thấp càng ưu tiên)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="condition_type" label="Loại điều kiện" rules={[{ required: true }]}>
                                <Select placeholder="Chọn loại điều kiện">
                                    <Option value="role">Chức vụ (Role)</Option>
                                    <Option value="user_id">Mã người dùng (User ID)</Option>
                                    <Option value="platform">Nền tảng (iOS/Android)</Option>
                                    <Option value="app_version">Phiên bản App</Option>
                                    <Option value="device_id">Mã thiết bị (Device ID)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="condition_value" label="Giá trị điều kiện" rules={[{ required: true }]}>
                        <Select mode="tags" placeholder="Nhập giá trị (VD: admin, ios, 3.1.0)" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="layout_slug" label="Layout chỉ định" rules={[{ required: true }]}>
                        <Select placeholder="Chọn màn hình áp dụng">
                            {screens.map(s => <Option key={s.slug} value={s.slug}>{s.name} ({s.slug})</Option>)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TargetingManager;

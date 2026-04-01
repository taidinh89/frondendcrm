import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, List, Typography, Space, Divider, message, Alert, Tooltip, Tag, Row, Col } from 'antd';
import { SaveOutlined, ReloadOutlined, ThunderboltOutlined, InfoCircleOutlined, SecurityScanOutlined } from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text, Paragraph } = Typography;

const AppConfigManager = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [meta, setMeta] = useState({});

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await sduiApi.getAppConfigs();
            const { settings, meta } = res.data.data || res.data;

            // Format data for form
            form.setFieldsValue({
                qa_device_ids: settings.qa_device_ids || '',
                beta_user_ids: settings.beta_user_ids || '',
                maintenance_mode: settings.maintenance_mode === 'true' || settings.maintenance_mode === true,
                app_announcement: settings.app_announcement || '',
                sdui_version: settings.sdui_version || 'v8.0.0',
            });
            setMeta(meta);
        } catch (error) {
            message.error('Không thể tải cấu hình App');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values) => {
        setSaving(true);
        try {
            // Convert boolean back to string for DB
            const payload = {
                ...values,
                maintenance_mode: values.maintenance_mode ? 'true' : 'false'
            };
            await sduiApi.updateAppConfigs(payload);
            message.success('Đã lưu cấu hình và đồng bộ Socket thành công!');
            fetchConfigs();
        } catch (error) {
            message.error('Lỗi khi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const handleForcePush = async () => {
        try {
            await sduiApi.forcePushAppUpdate();
            message.success('Đã cưỡng chế làm mới Layout trên toàn mạng lưới App!');
        } catch (error) {
            message.error('Lỗi khi bắn tín hiệu Force Push');
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2}>Cấu hình Hệ thống App (V8.4 Elite)</Title>
                    <Text type="secondary">Quản lý các thông số vận hành cốt lõi, danh sách Tester và chế độ bảo trì.</Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>Tải lại</Button>
                    <Button
                        danger
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={handleForcePush}
                    >
                        Force Refresh toàn App
                    </Button>
                </Space>
            </div>

            <Row gutter={24}>
                <Col span={16}>
                    <Card title="Cài đặt Vận hành" className="shadow-sm">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                        >
                            <Form.Item
                                name="maintenance_mode"
                                label={<Text strong>Chế độ Bảo trì (Maintenance Mode)</Text>}
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                            </Form.Item>

                            <Form.Item
                                name="app_announcement"
                                label={<Text strong>Thông báo Toàn App (Global Banner)</Text>}
                            >
                                <Input.TextArea rows={2} placeholder="Nhập nội dung thông báo hiện ở đầu App..." />
                            </Form.Item>

                            <Divider orientation="left">Quản lý Tester (Whitelist)</Divider>

                            <Form.Item
                                name="qa_device_ids"
                                label={
                                    <Space>
                                        <Text strong>Danh sách ID Thiết bị QA (QA Devices)</Text>
                                        <Tooltip title="Các ID thiết bị này sẽ luôn thấy giao diện QA/Draft. Cách nhau bằng dấu phẩy.">
                                            <InfoCircleOutlined />
                                        </Tooltip>
                                    </Space>
                                }
                            >
                                <Input placeholder="Vd: d6d6f..., a8b9c..." />
                            </Form.Item>

                            <Form.Item
                                name="beta_user_ids"
                                label={
                                    <Space>
                                        <Text strong>Danh sách ID Người dùng Beta (Beta Users)</Text>
                                        <Tooltip title="Các ID user này sẽ thấy giao diện Beta. Cách nhau bằng dấu phẩy.">
                                            <InfoCircleOutlined />
                                        </Tooltip>
                                    </Space>
                                }
                            >
                                <Input placeholder="Vd: 1, 15, 203" />
                            </Form.Item>

                            <Divider orientation="left">Thông tin Phiên bản</Divider>

                            <Form.Item name="sdui_version" label={<Text strong>SDUI Version String</Text>}>
                                <Input placeholder="v8.4.1" />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" size="large" icon={<SaveOutlined />} htmlType="submit" loading={saving} block>
                                    LƯU CẤU HÌNH & PHÁT TÍN HIỆU CẬP NHẬT 🚀
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Trạng thái Live" className="shadow-sm">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <Text type="secondary">SDUI Meta Version:</Text>
                                <Tag color="blue">{meta.sdui_version || 'N/A'}</Tag>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <Text type="secondary">Last Sync:</Text>
                                <Text strong>{meta.last_sync || 'N/A'}</Text>
                            </div>
                            <div className="p-3 border rounded-lg">
                                <Title level={5}><SecurityScanOutlined /> Chỉ dẫn Elite</Title>
                                <Paragraph style={{ fontSize: '13px' }}>
                                    Khi bạn thay đổi bất kỳ cấu hình nào ở đây, Backend sẽ tự động phát một
                                    <strong> Socket Event (AppUpdate)</strong>.
                                    Mọi máy đang mở App sẽ tự động làm mới Layout ngay tức thì.
                                </Paragraph>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AppConfigManager;

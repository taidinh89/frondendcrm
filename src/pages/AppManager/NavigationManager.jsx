import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Space, Tag, Divider, Switch, Row, Col, message, Skeleton } from 'antd';
import {
    MenuOutlined,
    PlusOutlined,
    HomeOutlined,
    UserOutlined,
    CustomerServiceOutlined,
    MessageOutlined,
    EditOutlined,
    SaveOutlined,
    RocketOutlined
} from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text } = Typography;

const NavigationManager = () => {
    const [tabs, setTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchNavigation = async () => {
        setLoading(true);
        try {
            const response = await sduiApi.getNavigation();
            // Backend trả về mảng trực tiếp từ JSON định danh 'bottom_navigation'
            setTabs(response.data || []);
        } catch (error) {
            console.error('Lỗi khi tải navigation:', error);
            message.error('Không thể tải cấu hình Tab Bar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNavigation();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await sduiApi.saveNavigation(tabs);
            message.success('Đã cập nhật Tab Bar thành công. App sẽ nhận thay đổi khi reload.');
        } catch (error) {
            message.error('Không thể lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const toggleTab = (name) => {
        setTabs(tabs.map(t => t.name === name ? { ...t, is_hidden: !t.is_hidden } : t));
    };

    const getIcon = (iconName) => {
        switch (iconName?.toLowerCase()) {
            case 'layouttemplate': return <HomeOutlined />;
            case 'briefcase': return <CustomerServiceOutlined />;
            case 'messagecircle': return <MessageOutlined />;
            case 'user': return <UserOutlined />;
            case 'layoutgrid': return <PlusOutlined />;
            default: return <RocketOutlined />;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Thanh Điều Hướng (Bottom Tab Bar)</Title>
                    <Text type="secondary">Cấu hình menu chính dưới đáy ứng dụng (Server-Driven)</Text>
                </div>
                <Space>
                    <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave} type="primary" size="large">
                        Lưu thay đổi
                    </Button>
                    <Button icon={<PlusOutlined />} size="large">Thêm Tab</Button>
                </Space>
            </div>

            <Row gutter={24}>
                <Col span={14}>
                    <Card title="Cấu hình Tabs (Kéo thả để sắp xếp)">
                        {loading ? <Skeleton active /> : (
                            <List
                                itemLayout="horizontal"
                                dataSource={tabs}
                                renderItem={(item) => (
                                    <List.Item
                                        actions={[
                                            <Button type="text" icon={<EditOutlined />} key="edit" />,
                                            <Switch
                                                size="small"
                                                checked={!item.is_hidden}
                                                onChange={() => toggleTab(item.name)}
                                                key="active"
                                            />
                                        ]}
                                        style={{
                                            padding: '16px',
                                            background: item.is_hidden ? '#f5f5f5' : '#fafafa',
                                            marginBottom: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #f0f0f0',
                                            opacity: item.is_hidden ? 0.6 : 1
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={<div style={{ fontSize: '20px', color: '#1890ff' }}>{getIcon(item.icon)}</div>}
                                            title={<Text strong>{item.label}</Text>}
                                            description={
                                                <Space>
                                                    <Tag color="blue">Router Name: {item.name}</Tag>
                                                    {item.screen_slug && <Tag color="cyan">SDUI: {item.screen_slug}</Tag>}
                                                    {item.is_hidden && <Tag color="default">Hidden</Tag>}
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                <Col span={10}>
                    <Card title="Giao diện xem trước trên Mobile">
                        <div style={{
                            height: '400px',
                            background: '#f0f2f5',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            border: '1px solid #d9d9d9',
                            padding: '20px',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'absolute', top: 20, textAlign: 'center' }}>
                                <Text type="secondary">Mockup iPhone 15 Pro</Text>
                            </div>

                            <div style={{
                                width: '100%',
                                height: '60px',
                                background: '#fff',
                                borderRadius: '30px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                padding: '0 10px'
                            }}>
                                {tabs.filter(t => !t.is_hidden).map(tab => (
                                    <div key={tab.name} style={{ textAlign: 'center', color: '#bfbfbf' }}>
                                        <div style={{ fontSize: '18px' }}>{getIcon(tab.icon)}</div>
                                        <div style={{ fontSize: '9px' }}>{tab.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: 24 }}>
                            <Divider orientation="left">Quy tắc Vận hành</Divider>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text italic type="secondary">• Thay đổi tại đây sẽ cập nhật App tức thời mà không cần đẩy Store.</Text>
                                <Text italic type="secondary">• Thứ tự các Tab nên khớp với `app-contracts.json`.</Text>
                            </Space>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default NavigationManager;

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Button, Space, Divider, List, Tag, message, Skeleton, Empty } from 'antd';
import {
    MobileOutlined,
    SaveOutlined,
    EyeOutlined,
    PlusOutlined,
    DragOutlined,
    SettingOutlined,
    DeleteOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import sduiApi from '../../api/sduiApi';

const { Title, Text } = Typography;

// --- Helper: Realistic Block Preview ---
const RenderBlockPreview = ({ block }) => {
    const type = block.type || '';

    if (type.includes('ProfileHeader')) {
        return (
            <div style={{ background: 'linear-gradient(135deg, #1890ff, #096dd9)', padding: '20px', borderRadius: '12px', color: '#white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                    <div>
                        <div style={{ fontSize: '12px', opacity: 0.8, color: 'white' }}>Chào buổi sáng,</div>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>Người dùng QVC</div>
                    </div>
                </div>
            </div>
        );
    }

    if (type.includes('GridMenu')) {
        return (
            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ height: '15px', width: '60px', background: '#ddd', marginBottom: '10px', borderRadius: '4px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ aspectRatio: '1/1', background: '#eee', borderRadius: '8px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (type.includes('Banner')) {
        return (
            <div style={{ height: '120px', background: '#e6f7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #91d5ff' }}>
                <EyeOutlined style={{ fontSize: 24, color: '#1890ff', opacity: 0.5 }} />
            </div>
        );
    }

    if (type.includes('SummaryCard')) {
        return (
            <div style={{ padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ height: '10px', width: '80px', background: '#eee', marginBottom: '15px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ height: '20px', width: '40px', background: '#1890ff', borderRadius: '4px' }} />
                    <div style={{ height: '20px', width: '40px', background: '#52c41a', borderRadius: '4px' }} />
                </div>
            </div>
        );
    }

    if (type.includes('Story')) {
        return (
            <div style={{ padding: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #1890ff', padding: '2px', flexShrink: 0 }}>
                            <div style={{ width: '100%', height: '100%', background: '#eee', borderRadius: '50%' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type.includes('SocialFeed')) {
        return (
            <div style={{ padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: '#eee', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ height: '8px', width: '40%', background: '#eee', marginBottom: '4px' }} />
                        <div style={{ height: '6px', width: '20%', background: '#f5f5f5' }} />
                    </div>
                </div>
                <div style={{ height: '60px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ height: '10px', width: '30px', background: '#f5f5f5' }} />
                    <div style={{ height: '10px', width: '30px', background: '#f5f5f5' }} />
                </div>
            </div>
        );
    }

    if (type.includes('Html')) {
        return (
            <div style={{ padding: '15px', background: '#333', borderRadius: '12px', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}>
                &lt;div class="custom-html"&gt;...&lt;/div&gt;
            </div>
        );
    }

    if (type.includes('ActionBtn') || type.includes('TaskBoard') || type.includes('FormInput') || type.includes('Upload')) {
        let title = "Nút bấm / Hành động";
        let icon = <PlusOutlined style={{ color: '#1890ff' }} />;

        if (type.includes('TaskBoard')) { title = "Bảng Công Việc (Kanban)"; icon = <DragOutlined style={{ color: '#fa8c16' }} />; }
        if (type.includes('FormInput')) { title = "Khung Nhập Liệu (Form)"; icon = <settingOutlined style={{ color: '#52c41a' }} />; }
        if (type.includes('Upload')) { title = "Khung Tải Lên (Upload)"; icon = <PlusOutlined style={{ color: '#722ed1' }} />; }

        return (
            <div style={{ padding: '15px', background: '#f0f5ff', borderRadius: '12px', border: '1px dashed #1890ff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0050b3' }}>{title}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>Hiển thị chức năng tĩnh (CMS Mock)</div>
                </div>
            </div>
        );
    }

    // Default Fallback
    return (
        <div style={{ padding: '12px', border: '1px dashed #d9d9d9', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="cyan">{type}</Tag>
                <Text type="secondary" style={{ fontSize: '10px' }}>{block.id}</Text>
            </div>
        </div>
    );
};

const ScreenBuilder = () => {
    const [screens, setScreens] = useState([]);
    const [selectedScreen, setSelectedScreen] = useState(null);
    const [screenBlocks, setScreenBlocks] = useState([]);
    const [libraryBlocks, setLibraryBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingScreen, setLoadingScreen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [screensRes, blocksRes] = await Promise.all([
                sduiApi.getScreens(),
                sduiApi.getBlocks()
            ]);

            const screensData = screensRes.data || [];
            setScreens(screensData);
            setLibraryBlocks(blocksRes.data || []);

            if (screensData.length > 0 && !selectedScreen) {
                const defaultScreen = screensData.find(s => s.slug === 'goto_feed') || screensData[0];
                handleSelectScreen(defaultScreen.slug);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu builder:', error);
            message.error('Không thể tải cấu hình Builder');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectScreen = async (slug) => {
        setSelectedScreen(slug);
        setLoadingScreen(true);
        try {
            const response = await sduiApi.getScreen(slug);
            const blocks = response.data?.blocks_json
                ? JSON.parse(response.data.blocks_json)
                : [];
            setScreenBlocks(blocks);
        } catch (error) {
            message.error('Lỗi khi tải màn hình');
        } finally {
            setLoadingScreen(false);
        }
    };

    const handleSave = async () => {
        if (!selectedScreen) return;
        setSaving(true);
        try {
            await sduiApi.saveScreen(selectedScreen, {
                blocks_json: JSON.stringify(screenBlocks)
            });
            message.success('Đã lưu cấu hình màn hình thành công');
        } catch (error) {
            message.error('Lỗi khi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    const addBlockToScreen = (blockTemplate) => {
        const newBlock = {
            id: `block_${Date.now()}`,
            type: blockTemplate.type,
            data: JSON.parse(blockTemplate.sample_payload || '{}').data || {}
        };
        setScreenBlocks([...screenBlocks, newBlock]);
        message.success(`Đã thêm ${blockTemplate.name}`);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Thiết Kế Màn Hình (Screen Builder)</Title>
                    <Text type="secondary">Cấu hình giao diện App bằng cấu trúc Server-Driven</Text>
                </div>
                <Space size="middle">
                    <Button icon={<EyeOutlined />} size="large">Preview (QR Scan)</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        size="large"
                        loading={saving}
                        onClick={handleSave}
                        disabled={!selectedScreen}
                    >
                        Lưu Thay Đổi
                    </Button>
                </Space>
            </div>

            {loading ? <Skeleton active /> : (
                <Row gutter={24}>
                    {/* Cột trái: Danh sách màn hình */}
                    <Col span={5}>
                        <Card title="Danh sách màn hình" size="small" style={{ borderRadius: '12px' }}>
                            <List
                                dataSource={screens}
                                renderItem={item => (
                                    <List.Item
                                        style={{
                                            cursor: 'pointer',
                                            background: selectedScreen === item.slug ? '#e6f7ff' : 'transparent',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '4px',
                                            border: selectedScreen === item.slug ? '1px solid #91d5ff' : '1px solid transparent'
                                        }}
                                        onClick={() => handleSelectScreen(item.slug)}
                                    >
                                        <Text strong={selectedScreen === item.slug}>{item.name}</Text>
                                    </List.Item>
                                )}
                            />
                            <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 12, borderRadius: '8px' }}>
                                Thêm màn hình
                            </Button>
                        </Card>
                    </Col>

                    {/* Cột giữa: Giả lập Phone */}
                    <Col span={10} style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '320px',
                            height: '640px',
                            background: '#1a1a1a',
                            borderRadius: '40px',
                            padding: '10px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            border: '10px solid #333'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#fff',
                                borderRadius: '25px',
                                overflowY: 'auto',
                                position: 'relative'
                            }}>
                                <div style={{ height: '24px', background: '#fff', padding: '0 15px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                                    <span>9:41</span>
                                    <div>🔋 📶</div>
                                </div>

                                {loadingScreen ? (
                                    <div style={{ display: 'flex', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
                                        <LoadingOutlined style={{ fontSize: 24 }} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '10px' }}>
                                        {screenBlocks.length === 0 ? (
                                            <Empty description="Màn hình trống" style={{ marginTop: 40 }} />
                                        ) : (
                                            screenBlocks.map((block, index) => (
                                                <div key={block.id} style={{
                                                    marginBottom: '12px',
                                                    position: 'relative'
                                                }}>
                                                    <RenderBlockPreview block={block} />
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 5,
                                                        right: 5,
                                                        zIndex: 10,
                                                        display: 'flex',
                                                        gap: '4px'
                                                    }}>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            shape="circle"
                                                            icon={<DeleteOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newBlocks = [...screenBlocks];
                                                                newBlocks.splice(index, 1);
                                                                setScreenBlocks(newBlocks);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Cột phải: Block Library */}
                    <Col span={9}>
                        <Card title="Thư viện Blocks" size="small" style={{ borderRadius: '12px' }}>
                            <Text type="secondary" block style={{ marginBottom: 16 }}>Nhấn (+) để thêm vào màn hình</Text>
                            <Row gutter={[12, 12]} style={{ maxHeight: '540px', overflowY: 'auto' }}>
                                {libraryBlocks.map(block => (
                                    <Col span={12} key={block.type}>
                                        <Card
                                            size="small"
                                            hoverable
                                            style={{ background: '#f9f9f9', borderRadius: '8px' }}
                                            onClick={() => addBlockToScreen(block)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <Text strong style={{ fontSize: '11px', display: 'block' }}>{block.name}</Text>
                                                    <Text type="secondary" style={{ fontSize: '9px' }}>{block.type}</Text>
                                                </div>
                                                <Button size="small" type="primary" shape="circle" icon={<PlusOutlined />} />
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default ScreenBuilder;

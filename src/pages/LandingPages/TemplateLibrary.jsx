import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Tag, Spin, Empty, Button, Input } from 'antd';
import { CheckOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Search } = Input;

const TemplateLibrary = ({ visible, onSelect, onCancel }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (visible) {
            fetchTemplates();
        }
    }, [visible]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v2/web/landing-pages/templates');
            if (response.data.code === 200) {
                setTemplates(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load templates', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );

    const getCategoryColor = (category) => {
        const colors = {
            product: 'blue',
            pricing: 'green',
            testimonial: 'purple',
            campaign: 'red',
            signup: 'orange'
        };
        return colors[category] || 'default';
    };

    const handleSelect = () => {
        if (selectedId) {
            const template = templates.find(t => t.id === selectedId);
            onSelect(template);
        }
    };

    return (
        <Modal
            title="📚 Template Library"
            open={visible}
            onCancel={onCancel}
            onOk={handleSelect}
            okText="Chọn Template"
            cancelText="Hủy"
            width={1200}
            okButtonProps={{ disabled: !selectedId }}
            bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                    <p style={{ marginTop: 16 }}>Đang tải templates...</p>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: 24 }}>
                        <Search
                            placeholder="Tìm template theo tên, mô tả, category..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%' }}
                            prefix={<SearchOutlined />}
                            allowClear
                        />
                    </div>

                    {filteredTemplates.length === 0 ? (
                        <Empty description="Không tìm thấy template" />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {filteredTemplates.map(template => (
                                <Col span={8} key={template.id}>
                                    <Card
                                        hoverable
                                        className={selectedId === template.id ? 'template-selected' : ''}
                                        onClick={() => setSelectedId(template.id)}
                                        style={{
                                            border: selectedId === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                            position: 'relative',
                                            height: '100%'
                                        }}
                                        cover={
                                            <div style={{
                                                height: 200,
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: 48,
                                                fontWeight: 'bold'
                                            }}>
                                                {template.icon || '📄'}
                                            </div>
                                        }
                                    >
                                        {selectedId === template.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                background: '#1890ff',
                                                borderRadius: '50%',
                                                width: 32,
                                                height: 32,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10
                                            }}>
                                                <CheckOutlined style={{ color: 'white', fontSize: 18 }} />
                                            </div>
                                        )}

                                        <Card.Meta
                                            title={<strong>{template.name}</strong>}
                                            description={
                                                <div>
                                                    <Tag color={getCategoryColor(template.category)}>
                                                        {template.category}
                                                    </Tag>
                                                    <p style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                                                        {template.description}
                                                    </p>

                                                    {template.variables_used && template.variables_used.length > 0 && (
                                                        <div style={{ marginTop: 12 }}>
                                                            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                                                                Variables:
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                {template.variables_used.slice(0, 3).map((v, i) => (
                                                                    <Tag key={i} style={{ fontSize: 10, margin: 0 }}>
                                                                        {v}
                                                                    </Tag>
                                                                ))}
                                                                {template.variables_used.length > 3 && (
                                                                    <Tag style={{ fontSize: 10, margin: 0 }}>
                                                                        +{template.variables_used.length - 3} more
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </>
            )}

            <style>{`
        .template-selected {
          box-shadow: 0 0 0 2px #1890ff;
          transform: scale(1.02);
          transition: all 0.3s ease;
        }
      `}</style>
        </Modal>
    );
};

export default TemplateLibrary;

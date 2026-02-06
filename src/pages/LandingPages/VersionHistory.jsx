import React, { useState, useEffect } from 'react';
import { Card, Space, Tag, Timeline, Button, Tooltip, Popconfirm, Empty, Spin } from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined, CopyOutlined,
    DeleteOutlined, EyeOutlined, HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const VersionHistory = ({ landingPageId, activeVersionId, onVersionSelect, onVersionActivate }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [limit, setLimit] = useState(3);

    useEffect(() => {
        if (landingPageId) {
            fetchVersions();
        }
    }, [landingPageId, limit]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v2/landing-pages/${landingPageId}/versions?limit=${limit}`);
            if (response.data.code === 200) {
                setVersions(response.data.data);
                setTotalCount(response.data.meta?.total_count || 0);
            }
        } catch (error) {
            console.error('Failed to load versions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShowAll = () => {
        setLimit('all');
    };

    const handleClone = async (versionId) => {
        try {
            const response = await axios.post(
                `/api/v2/landing-pages/${landingPageId}/versions/${versionId}/clone`
            );
            if (response.data.code === 200) {
                fetchVersions();
            }
        } catch (error) {
            console.error('Clone failed', error);
        }
    };

    const handleCreateSnapshot = async (versionId) => {
        try {
            const response = await axios.post(
                `/api/v2/landing-pages/${landingPageId}/versions/${versionId}/snapshot`
            );
            if (response.data.code === 200) {
                fetchVersions();
            }
        } catch (error) {
            console.error('Snapshot failed', error);
        }
    };

    const handleActivate = async (versionId) => {
        try {
            const response = await axios.post(
                `/api/v2/landing-pages/${landingPageId}/versions/${versionId}/activate`
            );
            if (response.data.code === 200) {
                fetchVersions();
                if (onVersionActivate) {
                    onVersionActivate(versionId);
                }
            }
        } catch (error) {
            console.error('Activate failed', error);
        }
    };

    const handleDelete = async (versionId) => {
        try {
            await axios.delete(`/api/v2/landing-pages/${landingPageId}/versions/${versionId}`);
            fetchVersions();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    if (loading) {
        return (
            <Card title={<><HistoryOutlined /> Version History</>}>
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <Spin />
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={<><HistoryOutlined /> Version History</>}
            extra={<Tag color="blue">{versions.length} / {totalCount}</Tag>}
        >
            {versions.length === 0 ? (
                <Empty description="Chưa có version nào" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Timeline mode="left">
                        {versions.map((version, index) => (
                            <Timeline.Item
                                key={version.id}
                                dot={
                                    version.is_active ? (
                                        <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                                    ) : version.is_snapshot ? (
                                        <HistoryOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                                    ) : (
                                        <ClockCircleOutlined style={{ fontSize: 16 }} />
                                    )
                                }
                                color={version.is_active ? 'green' : version.is_snapshot ? 'blue' : 'gray'}
                            >
                                <Card
                                    size="small"
                                    style={{
                                        marginBottom: 8,
                                        background: version.id === activeVersionId ? '#f0f5ff' : 'white',
                                        border: version.is_active ? '2px solid #52c41a' : '1px solid #d9d9d9'
                                    }}
                                    onClick={() => onVersionSelect && onVersionSelect(version)}
                                >
                                    <div>
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            {/* Version Tag */}
                                            <div>
                                                <strong>{version.version_tag}</strong>
                                                {version.is_active && (
                                                    <Tag color="success" style={{ marginLeft: 8 }}>ACTIVE</Tag>
                                                )}
                                                {version.is_snapshot && (
                                                    <Tag color="blue" style={{ marginLeft: 8 }}>SNAPSHOT</Tag>
                                                )}
                                                {version.ab_test_group && (
                                                    <Tag color="purple">A/B {version.ab_test_group}</Tag>
                                                )}
                                            </div>

                                            {/* Changelog */}
                                            {version.changelog && (
                                                <div style={{ fontSize: 12, color: '#666' }}>
                                                    {version.changelog}
                                                </div>
                                            )}

                                            {/* Meta */}
                                            <div style={{ fontSize: 11, color: '#999' }}>
                                                {moment(version.created_at).format('DD/MM/YYYY HH:mm')}
                                                {version.creator && ` • ${version.creator.name}`}
                                            </div>

                                            {/* A/B Stats */}
                                            {version.ab_test_group && (
                                                <div style={{ fontSize: 11 }}>
                                                    <EyeOutlined /> {version.ab_view_count} views
                                                    <span style={{ marginLeft: 8 }}>
                                                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> {version.ab_conversion_count} conversions
                                                    </span>
                                                    {version.ab_view_count > 0 && (
                                                        <span style={{ marginLeft: 8, color: '#999' }}>
                                                            ({((version.ab_conversion_count / version.ab_view_count) * 100).toFixed(2)}%)
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <Space size="small">
                                                {!version.is_active && (
                                                    <Popconfirm
                                                        title="Activate version này?"
                                                        onConfirm={() => handleActivate(version.id)}
                                                        okText="Yes"
                                                        cancelText="No"
                                                    >
                                                        <Button size="small" type="primary" ghost>
                                                            <CheckCircleOutlined /> Activate
                                                        </Button>
                                                    </Popconfirm>
                                                )}

                                                <Tooltip title="Clone version này">
                                                    <Button
                                                        size="small"
                                                        icon={<CopyOutlined />}
                                                        onClick={() => handleClone(version.id)}
                                                    >
                                                        Clone
                                                    </Button>
                                                </Tooltip>

                                                {!version.is_snapshot && (
                                                    <Tooltip title="Tạo snapshot từ version này">
                                                        <Button
                                                            size="small"
                                                            icon={<HistoryOutlined />}
                                                            onClick={() => handleCreateSnapshot(version.id)}
                                                        >
                                                            Snapshot
                                                        </Button>
                                                    </Tooltip>
                                                )}

                                                {!version.is_active && (
                                                    <Popconfirm
                                                        title="Xóa version này?"
                                                        onConfirm={() => handleDelete(version.id)}
                                                        okText="Xóa"
                                                        okType="danger"
                                                        cancelText="Hủy"
                                                    >
                                                        <Button size="small" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                )}
                                            </Space>
                                        </Space>
                                    </div>
                                </Card>
                            </Timeline.Item>
                        ))}
                    </Timeline>
                    {limit !== 'all' && versions.length < totalCount && (
                        <Button
                            block
                            type="dashed"
                            onClick={handleShowAll}
                            style={{ marginTop: 8 }}
                            icon={<HistoryOutlined />}
                        >
                            Xem thêm bản ghi ({totalCount - versions.length} bản khác)
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
};

export default VersionHistory;

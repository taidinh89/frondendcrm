import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Table, Button, Tag, Space, Input, Select, Modal, message,
    Tooltip, Statistic, Card, Row, Col
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
    CopyOutlined, CheckCircleOutlined, ClockCircleOutlined,
    FileOutlined, SearchOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Search } = Input;

const LandingPageList = () => {
    const navigate = useNavigate();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [sites, setSites] = useState([]); // [NEW] Dynamic sites
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        site_code: 'all'
    });
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        draft: 0,
        totalViews: 0,
        totalConversions: 0
    });

    // Fetch pages
    const fetchSites = async () => {
        try {
            const response = await axios.get('/api/v2/security/sites');
            if (response.data.data) {
                setSites(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sites filter');
        }
    };

    const fetchPages = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.pageSize,
                ...(filters.search && { search: filters.search }),
                ...(filters.status !== 'all' && { status: filters.status }),
                ...(filters.site_code !== 'all' && { site_code: filters.site_code })
            };

            const response = await axios.get('/api/v2/landing-pages', { params });

            if (response.data.code === 200) {
                setPages(response.data.data);
                setPagination({
                    ...pagination,
                    current: response.data.meta.pagination.current_page,
                    total: response.data.meta.pagination.total_items
                });

                // Calculate stats
                calculateStats(response.data.data);
            }
        } catch (error) {
            message.error('Failed to load landing pages');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const stats = data.reduce((acc, page) => {
            acc.total++;
            if (page.status === 'published') acc.published++;
            if (page.status === 'draft') acc.draft++;
            acc.totalViews += page.view_count || 0;
            acc.totalConversions += page.conversion_count || 0;
            return acc;
        }, { total: 0, published: 0, draft: 0, totalViews: 0, totalConversions: 0 });

        setStats(stats);
    };

    useEffect(() => {
        fetchSites();
        fetchPages();
    }, [filters]);

    // Delete page
    const handleDelete = (id) => {
        if (!id) {
            message.error('Invalid ID');
            return;
        }
        Modal.confirm({
            title: 'Xóa Landing Page?',
            content: 'Bạn có chắc muốn xóa trang này? Hành động này có thể khôi phục được.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await axios.delete(`/api/v2/landing-pages/${id}`);
                    message.success('Đã xóa landing page');
                    fetchPages(pagination.current);
                } catch (error) {
                    message.error('Xóa thất bại');
                }
            }
        });
    };

    // Publish/Unpublish
    const handleTogglePublish = async (id, currentStatus) => {
        if (!id) {
            message.error('Invalid ID');
            return;
        }
        const action = currentStatus === 'published' ? 'unpublish' : 'publish';
        try {
            await axios.post(`/api/v2/landing-pages/${id}/${action}`);
            message.success(`Đã ${action === 'publish' ? 'publish' : 'unpublish'} trang`);
            fetchPages(pagination.current);
        } catch (error) {
            message.error(`${action === 'publish' ? 'Publish' : 'Unpublish'} thất bại`);
        }
    };

    // Copy public URL
    const copyPublicUrl = (slug) => {
        const url = `${window.location.origin}/landing/${slug}`;
        navigator.clipboard.writeText(url);
        message.success('Đã copy URL');
    };

    // Table columns
    const handleClone = async (id) => {
        if (!id) {
            message.error('Invalid ID');
            return;
        }

        try {
            const response = await axios.post(`/api/v2/landing-pages/${id}/clone`);
            if (response.data.code === 200 || response.data.code === 201) {
                message.success('Nhân bản thành công!');
                fetchPages(); // Refresh the list
                // Optionally navigate to the editor of the new page
                navigate(`/landing-pages/${response.data.data.id}/edit`);
            }
        } catch (error) {
            console.error('Clone failed:', error);
            message.error('Không thể nhân bản landing page.');
        }
    };

    const columns = [
        {
            title: 'Tiêu đề Landing Page',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <div style={{ padding: '8px 0' }}>
                    <Link to={`/landing-pages/${record.id}/edit`} style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                        {text}
                    </Link>
                    <div style={{ marginTop: 4 }}>
                        <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>
                            /landing/{record.slug}
                        </code>
                    </div>
                </div>
            )
        },
        {
            title: 'Site',
            dataIndex: 'site',
            key: 'site',
            width: 100,
            render: (site) => site ? <Tag color="blue">{site.code}</Tag> : <Tag>ALL</Tag>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => (
                <Tag color={status === 'published' ? 'green' : 'orange'}>
                    {status === 'published' ? 'Published' : 'Draft'}
                </Tag>
            )
        },
        {
            title: 'Hiệu suất',
            key: 'stats',
            width: 200,
            render: (_, record) => (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                        <EyeOutlined /> {record.view_count?.toLocaleString() || 0} views
                    </div>
                    <div>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> {record.conversion_count || 0} conversions
                        {record.view_count > 0 && (
                            <span style={{ marginLeft: 8, color: '#999' }}>
                                ({((record.conversion_count / record.view_count) * 100).toFixed(2)}%)
                            </span>
                        )}
                    </div>
                </Space>
            )
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 120,
            render: (date) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => navigate(`/landing-pages/${record.id}/edit`)}
                        />
                    </Tooltip>

                    <Tooltip title="Xem preview">
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => window.open(`/preview/landing/${record.id}`, '_blank')}
                        />
                    </Tooltip>

                    <Tooltip title="Copy URL">
                        <Button
                            type="link"
                            icon={<CopyOutlined />}
                            onClick={() => copyPublicUrl(record.slug)}
                        />
                    </Tooltip>

                    <Tooltip title="Nhân bản (Clone)">
                        <Button
                            type="link"
                            icon={<CopyOutlined style={{ color: '#722ed1' }} />}
                            onClick={() => handleClone(record.id)}
                        />
                    </Tooltip>

                    <Tooltip title={record.status === 'published' ? 'Unpublish' : 'Publish'}>
                        <Button
                            type="link"
                            icon={record.status === 'published' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                            onClick={() => handleTogglePublish(record.id, record.status)}
                        />
                    </Tooltip>

                    <Tooltip title="Xóa">
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px 40px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Premium Header */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
                        🚀 Hệ thống Landing Page
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4, fontSize: '15px' }}>
                        Chào mừng bạn trở lại! Hôm nay có <b>{stats.totalViews}</b> lượt xem mới.
                    </p>
                </div>
                <Space size="middle">
                    <Link to="/landing-pages/create">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            style={{
                                borderRadius: '12px',
                                height: '48px',
                                padding: '0 24px',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                                fontWeight: 700
                            }}
                        >
                            Tạo Landing Page Mới
                        </Button>
                    </Link>
                </Space>
            </div>

            {/* Stats Grid */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col span={6}>
                    <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <Statistic
                            title={<span style={{ color: '#64748b', fontWeight: 600 }}>TỔNG SỐ TRANG</span>}
                            value={stats.total}
                            prefix={<FileOutlined style={{ color: '#4f46e5', marginRight: 8 }} />}
                            valueStyle={{ fontWeight: 800, color: '#1e293b' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <Statistic
                            title={<span style={{ color: '#64748b', fontWeight: 600 }}>ĐÃ XUẤT BẢN</span>}
                            value={stats.published}
                            prefix={<CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />}
                            valueStyle={{ fontWeight: 800, color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <Statistic
                            title={<span style={{ color: '#64748b', fontWeight: 600 }}>TỔNG LƯỢT XEM</span>}
                            value={stats.totalViews}
                            prefix={<EyeOutlined style={{ color: '#f59e0b', marginRight: 8 }} />}
                            valueStyle={{ fontWeight: 800, color: '#1e293b' }}
                        />
                        <div style={{ fontSize: '12px', color: '#10b981', marginTop: 4 }}>
                            ↑ 12% so với tuần trước
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                        <Statistic
                            title={<span style={{ color: '#64748b', fontWeight: 600 }}>TỔNG CHUYỂN ĐỔI</span>}
                            value={stats.totalConversions}
                            prefix={<PlusOutlined style={{ color: '#f43f5e', marginRight: 8 }} />}
                            valueStyle={{ fontWeight: 800, color: '#f43f5e' }}
                        />
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>
                            Tỷ lệ CVR trung bình: <b>{stats.totalViews > 0 ? ((stats.totalConversions / stats.totalViews) * 100).toFixed(1) : 0}%</b>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space size="middle" style={{ width: '100%' }}>
                    <Search
                        placeholder="Tìm trang..."
                        style={{ width: 300 }}
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                        onSearch={() => fetchPages(1)}
                        allowClear
                    />

                    <Select
                        style={{ width: 150 }}
                        value={filters.status}
                        onChange={status => setFilters({ ...filters, status })}
                    >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value="published">Published</Option>
                        <Option value="draft">Draft</Option>
                        <Option value="archived">Archived</Option>
                    </Select>

                    <Select
                        style={{ width: 150 }}
                        value={filters.site_code}
                        onChange={site_code => setFilters({ ...filters, site_code })}
                    >
                        <Option value="all">Tất cả Sites</Option>
                        {sites.map(s => (
                            <Option key={s.code} value={s.code}>{s.name} ({s.code})</Option>
                        ))}
                    </Select>
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={pages}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} trang`,
                        onChange: (page, pageSize) => {
                            setPagination({ ...pagination, pageSize });
                            fetchPages(page);
                        }
                    }}
                />
            </Card>
        </div>
    );
};

export default LandingPageList;

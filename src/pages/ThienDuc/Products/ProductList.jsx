import React, { useEffect, useRef, useCallback } from 'react';
import { Table, Input, Tag, Space, Button, Typography, Tooltip, message } from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    CloudSyncOutlined,
    SearchOutlined,
    EditOutlined,
    SyncOutlined
} from '@ant-design/icons';
import { useThienDucStore } from '../../../stores/useThienDucStore';
import { thienducApi } from '../../../api/thienducApi';
import ProductEditDrawer from './components/ProductEditDrawer';

const { Text } = Typography;

const ProductList = () => {
    const {
        products,
        page,
        hasMore,
        loading,
        filters,
        setProducts,
        appendProducts,
        setPage,
        setFilters,
        setLoading
    } = useThienDucStore();

    const [drawerVisible, setDrawerVisible] = React.useState(false);
    const [selectedProductId, setSelectedProductId] = React.useState(null);
    const observer = useRef();

    const loadData = useCallback(async (isAppending = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const response = await thienducApi.getProducts({
                page: isAppending ? page + 1 : 1,
                search: filters.search,
                sync_status: filters.sync_status
            });

            // Handle unwrapped response from axiosGlobal interceptor
            // axiosGlobal returns body.data in response.data, and original body.meta in response.data._meta
            const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            const meta = response.data?._meta || response.data?.meta;

            // Laravel Pagination structure: meta.total OR body.total
            const totalItems = meta?.total || meta?.pagination?.total || 0;

            if (isAppending) {
                appendProducts(data, totalItems);
                setPage(page + 1);
            } else {
                setProducts(data, totalItems);
                setPage(1);
            }
        } catch (error) {
            console.error('TD Load error:', error);
            if (error.name !== 'CanceledError') {
                message.error('Không thể tải danh sách sản phẩm');
            }
            // Stop looping on error by effectively "pausing" infinite scroll
            // If it was an appending request, we don't want to keep trying page 2 forever
            if (isAppending) {
                // If we want to allow retry, we shouldn't set hasMore to false
                // but we need a way to stop the observer from triggering immediately.
                // Setting loading to false and hasMore to true is the trigger.
                // Let's at least ensure we don't loop if the error is persistent.
            }
        } finally {
            setLoading(false);
        }
    }, [page, filters, loading, appendProducts, setProducts, setPage, setLoading]);

    // Infinite Scroll Observer
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadData(true);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadData]);

    useEffect(() => {
        loadData();
        return () => {
            // Cancel pending requests if necessary
        };
    }, [filters]);

    const handleSearch = (value) => {
        setFilters({ ...filters, search: value });
    };

    const showDrawer = (id) => {
        setSelectedProductId(id);
        setDrawerVisible(true);
    };

    const renderStatus = (record) => {
        // Logic mapping status based on Plan
        // record.sync_status: 'synced' | 'mismatch' | 'none'
        if (record.sync_status === 'synced') {
            return (
                <Tooltip title="Đã đồng bộ & Khớp 100%">
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                </Tooltip>
            );
        }
        if (record.sync_status === 'mismatch' || record.is_sync_outdated) {
            return (
                <Tooltip title="Có sự thay đổi chưa đẩy lên VPS">
                    <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '18px' }} />
                </Tooltip>
            );
        }
        return (
            <Tooltip title="Chưa từng đẩy lên VPS">
                <CloudSyncOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
            </Tooltip>
        );
    };

    const columns = [
        {
            title: 'TT',
            key: 'status',
            width: 60,
            align: 'center',
            render: (_, record) => renderStatus(record),
        },
        {
            title: 'Sản phẩm',
            key: 'product',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.name || record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>SKU: {record.sku}</Text>
                </Space>
            ),
        },
        {
            title: 'Giá VPS',
            key: 'price',
            width: 150,
            render: (_, record) => {
                const price = record.price?.current_price ?? record.price_web ?? 0;
                return <Text>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}</Text>
            }
        },
        {
            title: 'Kho',
            key: 'quantity',
            width: 100,
            render: (_, record) => {
                const qty = record.stock?.quantity ?? record.quantity_web ?? 0;
                return <Tag color={qty > 0 ? 'blue' : 'red'}>{qty} SP</Tag>
            }
        },
        {
            title: 'Đã sửa',
            dataIndex: 'overridden_fields',
            width: 120,
            render: (fields) => fields?.length > 0 ? <Tag color="orange">{fields.length} trường</Tag> : <Text type="secondary">-</Text>
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => showDrawer(record.id)}
                    >
                        Sửa
                    </Button>
                    <Button
                        icon={<SyncOutlined spin={loading && selectedProductId === record.id} />}
                        onClick={() => thienducApi.pushToVps(record.id).then(() => message.success('Đã gửi yêu cầu đồng bộ'))}
                    >
                        Sync
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Title level={2}>Quản lý Sản phẩm Thiên Đức V4</Typography.Title>
                <Space>
                    <Input
                        placeholder="Tìm theo tên, SKU..."
                        prefix={<SearchOutlined />}
                        onPressEnter={(e) => handleSearch(e.target.value)}
                        style={{ width: 300 }}
                    />
                    <Button type="primary" icon={<SyncOutlined />} onClick={() => loadData()}>
                        Làm mới
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                pagination={false}
                loading={loading && products.length === 0}
                sticky
            />

            {/* Infinite Scroll Anchor */}
            <div ref={lastElementRef} style={{ height: '20px', margin: '20px 0', textAlign: 'center' }}>
                {loading && products.length > 0 && <SyncOutlined spin />}
                {!hasMore && products.length > 0 && <Text type="secondary">Đã hiển thị toàn bộ sản phẩm</Text>}
            </div>

            <ProductEditDrawer
                id={selectedProductId}
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                onSuccess={() => loadData()}
            />
        </div>
    );
};

export default ProductList;

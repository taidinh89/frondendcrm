import React, { useEffect, useState } from 'react';
import {
    Drawer,
    Tabs,
    Form,
    Input,
    InputNumber,
    Switch,
    Button,
    Space,
    message,
    Divider,
    Typography,
    Card,
    Table,
    Select,
    Tooltip
} from 'antd';
import {
    SaveOutlined,
    SyncOutlined,
    LockOutlined,
    UnlockOutlined,
    PlusOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { thienducApi } from '../../../../api/thienducApi';

const { TabPane } = Tabs;
const { Text, Title, Paragraph } = Typography;

const ProductEditDrawer = ({ id, visible, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState(null);
    const [overriddenFields, setOverriddenFields] = useState([]);
    const [specData, setSpecData] = useState([]);

    useEffect(() => {
        if (visible && id) {
            fetchProduct();
        }
    }, [visible, id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const resp = await thienducApi.getProductDetail(id);
            // Handle unwrapped response from axiosGlobal
            const data = resp.data;

            // Map structured V4 data back to flat form fields if needed
            const formData = {
                ...data,
                price_web: data.price?.current_price ?? data.price_web,
                quantity_web: data.stock?.quantity ?? data.quantity_web,
                product_name: data.name ?? data.product_name
            };

            setProduct(data);
            setOverriddenFields(data.overridden_fields || []);
            setSpecData(data.specifications || []);
            form.setFieldsValue(formData);
        } catch (error) {
            console.error('Fetch error:', error);
            message.error('Không thể lấy chi tiết sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (changedFields) => {
        const fieldName = Object.keys(changedFields)[0];
        if (fieldName && !overriddenFields.includes(fieldName)) {
            setOverriddenFields([...overriddenFields, fieldName]);
        }
    };

    const toggleOverride = (fieldName) => {
        let newFields = [];
        if (overriddenFields.includes(fieldName)) {
            newFields = overriddenFields.filter(f => f !== fieldName);
        } else {
            newFields = [...overriddenFields, fieldName];
        }
        setOverriddenFields(newFields);
        // Optional: Call API immediately if you want persistence without "Save" button
    };

    const handleSave = async (pushToVps = false) => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                ...values,
                specifications: specData,
                overridden_fields: overriddenFields
            };

            await thienducApi.updateProduct(id, payload);

            if (pushToVps) {
                await thienducApi.pushToVps(id);
                message.success('Đã lưu và đồng bộ lên VPS');
            } else {
                message.success('Đã lưu cấu hình');
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            message.error('Có lỗi khi lưu dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const SpecBuilder = () => {
        const columns = [
            {
                title: 'Tên thông số',
                dataIndex: 'key',
                render: (val, record, index) => (
                    <Input
                        value={val}
                        onChange={e => updateSpec(index, 'key', e.target.value)}
                        placeholder="VD: CPU"
                    />
                )
            },
            {
                title: 'Giá trị',
                dataIndex: 'value',
                render: (val, record, index) => (
                    <Input
                        value={val}
                        onChange={e => updateSpec(index, 'value', e.target.value)}
                        placeholder="VD: Intel Core i9"
                    />
                )
            },
            {
                title: '',
                key: 'action',
                width: 50,
                render: (_, __, index) => (
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeSpec(index)} />
                )
            }
        ];

        const updateSpec = (index, field, value) => {
            const newSpecs = [...specData];
            newSpecs[index][field] = value;
            setSpecData(newSpecs);
            if (!overriddenFields.includes('specifications')) {
                setOverriddenFields([...overriddenFields, 'specifications']);
            }
        };

        const addSpec = () => {
            setSpecData([...specData, { key: '', value: '' }]);
        };

        const removeSpec = (index) => {
            setSpecData(specData.filter((_, i) => i !== index));
            if (!overriddenFields.includes('specifications')) {
                setOverriddenFields([...overriddenFields, 'specifications']);
            }
        };

        return (
            <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <Text strong>Cấu hình thông số kỹ thuật</Text>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={addSpec}>Thêm thông số</Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={specData}
                    pagination={false}
                    size="small"
                    rowKey={(r, i) => i}
                />
            </div>
        );
    };

    const renderFieldLabel = (label, fieldName) => (
        <Space>
            <Text>{label}</Text>
            <Tooltip title={overriddenFields.includes(fieldName) ? "Đang Ghi đè (QVC không thể thay đổi)" : "Đang Kế thừa từ QVC"}>
                <Button
                    type="text"
                    size="small"
                    icon={overriddenFields.includes(fieldName) ? <LockOutlined style={{ color: '#ff4d4f' }} /> : <UnlockOutlined style={{ color: '#52c41a' }} />}
                    onClick={() => toggleOverride(fieldName)}
                    style={{ padding: 0 }}
                />
            </Tooltip>
        </Space>
    );

    return (
        <Drawer
            title={`Chỉnh sửa: ${product?.name || product?.product_name || 'Đang tải...'}`}
            width={720}
            onClose={onClose}
            open={visible}
            extra={
                <Space>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => handleSave(false)}>
                        Lưu
                    </Button>
                    <Button type="primary" danger icon={<SyncOutlined />} loading={loading} onClick={() => handleSave(true)}>
                        Lưu & Đẩy VPS
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onValuesChange={handleFieldChange}
            >
                <Tabs defaultActiveKey="1">
                    <TabPane tab="Thông tin chung" key="1">
                        <Form.Item name="product_name" label={renderFieldLabel('Tên hiển thị', 'product_name')}>
                            <Input placeholder="Tên sản phẩm trên Thiên Đức" />
                        </Form.Item>
                        <Form.Item name="slug" label={renderFieldLabel('Đường dẫn (Slug)', 'slug')}>
                            <Input placeholder="man-hinh-gaming-lg" />
                        </Form.Item>
                        <Form.Item name="summary" label={renderFieldLabel('Mô tả ngắn', 'summary')}>
                            <Input.TextArea rows={4} />
                        </Form.Item>
                    </TabPane>

                    <TabPane tab="Giá & Kho" key="2">
                        <Card title="Cấu hình giá bán" size="small" style={{ marginBottom: '16px' }}>
                            <Form.Item name="price_web" label={renderFieldLabel('Giá Web (VND)', 'price_web')}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                            <Form.Item name="is_on" label={renderFieldLabel('Trạng thái hiển thị', 'is_on')} valuePropName="checked">
                                <Switch checkedChildren="BẬT" unCheckedChildren="TẮT" />
                            </Form.Item>
                        </Card>
                    </TabPane>

                    <TabPane tab="Thông số" key="3">
                        <SpecBuilder />
                    </TabPane>

                    <TabPane tab="SEO" key="4">
                        <Form.Item name="seo_title" label={renderFieldLabel('Thẻ tiêu đề (SEO Title)', 'seo_title')}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="seo_description" label={renderFieldLabel('Thẻ mô tả (Meta Description)', 'seo_description')}>
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item name="canonical" label={renderFieldLabel('URL Canonical', 'canonical')}>
                            <Input placeholder="https://thienduc.vn/pro/..." />
                        </Form.Item>

                        <Divider>Preview Google</Divider>
                        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                            <div style={{ color: '#1a0dab', fontSize: '18px', marginBottom: '4px' }}>
                                {form.getFieldValue('seo_title') || product?.product_name}
                            </div>
                            <div style={{ color: '#006621', fontSize: '14px', marginBottom: '4px' }}>
                                https://thienduc.vn/pro/{form.getFieldValue('slug') || product?.slug}
                            </div>
                            <div style={{ color: '#545454', fontSize: '13px' }}>
                                {form.getFieldValue('seo_description') || 'Chưa có mô tả SEO...'}
                            </div>
                        </div>
                    </TabPane>
                </Tabs>
            </Form>
        </Drawer>
    );
};

export default ProductEditDrawer;

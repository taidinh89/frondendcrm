import React, { useState, useEffect } from 'react';
import { Table, Card, DatePicker, Input, Space, Tag, Typography } from 'antd';
import { SearchOutlined, ArrowDownOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const CashPaymentsList = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState([moment().startOf('month'), moment().endOf('month')]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v2/finance/cash-transactions', {
                params: {
                    type: 'payment',
                    start_date: dateRange[0].format('Y-m-d'),
                    end_date: dateRange[1].format('Y-m-d'),
                    search: searchText
                }
            });
            setData(response.data.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange, searchText]);

    const columns = [
        {
            title: 'Ngày',
            dataIndex: 'transaction_date',
            key: 'transaction_date',
            render: (date) => moment(date).format('DD/MM/YYYY'),
            sorter: (a, b) => moment(a.transaction_date).unix() - moment(b.transaction_date).unix(),
        },
        {
            title: 'Số chứng từ',
            dataIndex: 'voucher_no',
            key: 'voucher_no',
            render: (text) => <Text copyable>{text}</Text>,
        },
        {
            title: 'Đối tượng',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.partner_name}</div>
                    <Tag color="volcano">{record.partner_code}</Tag>
                </div>
            ),
        },
        {
            title: 'Tài khoản',
            dataIndex: 'account_name',
            key: 'account_name',
        },
        {
            title: 'Diễn giải',
            dataIndex: 'description',
            key: 'description',
            width: 300,
        },
        {
            title: 'Số tiền Chi',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (val) => <Text style={{ color: '#f5222d', fontWeight: 'bold' }}>{new Intl.NumberFormat('vi-VN').format(val)} đ</Text>,
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: 'Người tạo/sửa',
            render: (_, record) => (
                <div style={{ fontSize: '11px', color: '#888' }}>
                    <div><UserOutlined /> Tạo: {record.creator_name} ({moment(record.created_at_ecount).format('DD/MM HH:mm')})</div>
                    {record.editor_name && (
                        <div><UserOutlined /> Sửa: {record.editor_name} ({moment(record.edited_at_ecount).format('DD/MM HH:mm')})</div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Card title={<span><ArrowDownOutlined style={{ color: '#f5222d' }} /> NHẬT KÝ CHI TIỀN (ECOUNT)</span>}>
            <Space style={{ marginBottom: 16 }}>
                <RangePicker 
                    value={dateRange} 
                    onChange={(dates) => setDateRange(dates)} 
                    format="DD/MM/YYYY" 
                />
                <Input
                    placeholder="Tìm tên đối tượng, diễn giải..."
                    prefix={<SearchOutlined />}
                    onPressEnter={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                />
            </Space>
            <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                size="small"
                bordered
            />
        </Card>
    );
};

export default CashPaymentsList;

// src/pages/Business/QuotationList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Input, Tag,
    Space, Card, Tooltip, Modal,
    Popconfirm, message, Badge,
    Dropdown, Menu, Spin, Empty
} from 'antd';
import {
    Search, Plus, FileText,
    Printer, MoreVertical, Trash2,
    Edit, Copy, Filter,
    Eye, Download, DownloadCloud,
    Calendar, User, CheckCircle2,
    Clock, AlertCircle, RefreshCw,
    X, FileDown
} from 'lucide-react';
import dayjs from 'dayjs';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData.jsx';
import { QuotationFormNew } from './QuotationFormNew.jsx';
import { exportToExcel } from '../../utils/exportUtils.js';

// --- UTILS ---
const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
const formatDate = (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-';

export const QuotationList = ({ setAppTitle }) => {
    // --- STATE ---
    const [search, setSearch] = useState('');
    const [pageState, setPageState] = useState('LIST'); // LIST | ADD | EDIT
    const [selectedId, setSelectedId] = useState(null);
    const [filters, setFilters] = useState({
        q: '',
        date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
        date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
    });

    // --- API DATA ---
    const { data: quotations = [], isLoading, refetch: refresh } = useApiData('/api/v2/quotations', filters, 300);

    useEffect(() => {
        setAppTitle('Danh sách Báo Giá');
    }, [setAppTitle]);

    // --- HANDLERS ---
    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/v2/quotations/${id}`);
            message.success('Đã xóa báo giá thành công');
            refresh();
        } catch (err) {
            message.error('Không thể xóa báo giá');
        }
    };

    const handleCopy = async (id) => {
        try {
            await axios.post(`/api/v2/quotations/${id}/copy`);
            message.success('Đã sao chép báo giá mới');
            refresh();
        } catch (err) {
            message.error('Lỗi khi sao chép báo giá');
        }
    };

    const handlePrint = (id) => {
        window.open(`/api/v2/quotations/${id}/print`, '_blank');
    };

    const handleExportExcel = async () => {
        if (!quotations || quotations.length === 0) {
            message.warning('Không có dữ liệu để xuất Excel');
            return;
        }

        const excelData = quotations.map((q, idx) => ({
            "STT": idx + 1,
            "Số Phiếu": q.code,
            "Ngày Báo Giá": formatDate(q.date),
            "Khách Hàng": q.customer_name,
            "Số Điện Thoại": q.customer_phone || '-',
            "Tổng Tiền": q.subtotal,
            "Chiết Khấu": q.total_discount || 0,
            "Thuế GTGT": q.total_vat,
            "Tổng Thanh Toán": q.total_amount,
            "Trạng Thái": q.status_text || q.status,
            "Người Tạo": q.creator?.name || q.user_name,
            "Ngày Tạo": formatDate(q.created_at)
        }));

        try {
            await exportToExcel([{ sheetName: "Danh_Sach_Bao_Gia", data: excelData }], `DS_BaoGia_${dayjs().format('YYYYMMDD')}`);
            message.success('Đã xuất file Excel thành công');
        } catch (err) {
            message.error('Lỗi khi xuất file Excel');
        }
    };

    // --- COLUMN DEFINITION ---
    const columns = [
        {
            title: '#',
            width: 50,
            render: (_, __, idx) => <span className="text-gray-400 font-mono text-[10px]">{idx + 1}</span>,
            align: 'center'
        },
        {
            title: 'SỐ PHIẾU',
            dataIndex: 'code',
            key: 'code',
            width: 140,
            render: (text) => <span className="font-black text-blue-600 tracking-tight">{text}</span>,
            sorter: (a, b) => (a.code || '').localeCompare(b.code || '')
        },
        {
            title: 'NGÀY CT',
            dataIndex: 'date',
            key: 'date',
            width: 100,
            render: (date) => <div className="flex flex-col"><span className="text-xs font-bold text-gray-700">{formatDate(date)}</span></div>,
            sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
        },
        {
            title: 'KHÁCH HÀNG / CÔNG TY',
            key: 'customer',
            ellipsis: true,
            render: (_, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight">{row.customer_name || 'Khách lẻ'}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        {row.customer_phone && <span className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded">{row.customer_phone}</span>}
                        {row.customer_code && <span className="text-[10px] text-blue-400 font-mono">{row.customer_code}</span>}
                    </div>
                </div>
            )
        },
        {
            title: 'TỔNG THANH TOÁN',
            dataIndex: 'total_amount',
            key: 'total_amount',
            width: 180,
            align: 'right',
            render: (val) => <span className="font-mono font-black text-gray-800">{formatCurrency(val)}</span>,
            sorter: (a, b) => a.total_amount - b.total_amount
        },
        {
            title: 'NV PHỤ TRÁCH',
            dataIndex: 'creator',
            key: 'creator',
            width: 150,
            render: (creator) => <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 font-bold uppercase">{creator?.name?.charAt(0)}</div><span className="text-xs font-medium text-gray-600">{creator?.name}</span></div>
        },
        {
            title: 'TRẠNG THÁI',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (_, row) => {
                const colors = { 'draft': 'default', 'pending': 'warning', 'approved': 'success', 'rejected': 'error' };
                const label = row.status_text || row.status || 'Mới';
                return <Tag color={colors[row.status] || 'default'} className="rounded-full px-3 text-[10px] font-bold border-0 uppercase">{label}</Tag>
            }
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, row) => (
                <Space size="small">
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            size="small"
                            icon={<Edit size={14} className="text-blue-500" />}
                            onClick={() => { setSelectedId(row.id); setPageState('EDIT'); }}
                        />
                    </Tooltip>
                    <Dropdown
                        overlay={
                            <Menu onClick={({ key }) => {
                                if (key === 'print') handlePrint(row.id);
                                if (key === 'copy') handleCopy(row.id);
                                if (key === 'delete') handleDelete(row.id);
                                if (key === 'view') { setSelectedId(row.id); setPageState('EDIT'); }
                            }}>
                                <Menu.Item key="view" icon={<Eye size={14} />}>Chi tiết</Menu.Item>
                                <Menu.Item key="print" icon={<Printer size={14} />}>In báo giá</Menu.Item>
                                <Menu.Item key="copy" icon={<Copy size={14} />}>Sao chép</Menu.Item>
                                <Menu.Divider />
                                <Menu.Item key="delete" icon={<Trash2 size={14} />} danger>Xóa vĩnh viễn</Menu.Item>
                            </Menu>
                        }
                    >
                        <Button type="text" size="small" icon={<MoreVertical size={14} className="text-gray-400" />} />
                    </Dropdown>
                </Space>
            )
        }
    ];

    if (pageState === 'ADD' || pageState === 'EDIT') {
        return (
            <QuotationFormNew
                quotationId={selectedId}
                onBack={() => { setPageState('LIST'); setSelectedId(null); refresh(); }}
                onSaveSuccess={() => { setPageState('LIST'); setSelectedId(null); refresh(); }}
            />
        );
    }

    return (
        <div className="p-6 bg-[#f8fafc] min-h-full font-inter animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2 m-0 uppercase">
                        Dự Phóng Doanh Thu <span className="text-blue-500">& Báo Giá</span>
                    </h1>
                    <p className="text-xs text-gray-400 font-medium m-0 flex items-center gap-1.5 mt-1">
                        <Clock size={12} /> Cập nhật lúc: {dayjs().format('HH:mm:ss')} • <span className="text-blue-500 font-bold">{quotations.length}</span> báo giá trong tháng
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        icon={<FileDown size={16} />}
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 font-bold h-10 bg-white border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-200"
                    >
                        Xuất Excel
                    </Button>
                    <Button
                        type="primary"
                        size="large"
                        icon={<Plus size={18} />}
                        onClick={() => { setSelectedId(null); setPageState('ADD'); }}
                        className="flex items-center gap-2 font-bold h-10 px-6 shadow-blue-200 shadow-lg border-0 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        TẠO BÁO GIÁ
                    </Button>
                </div>
            </div>

            {/* Filter Hub */}
            <Card className="mb-6 shadow-sm border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Tìm kiếm thông minh</label>
                        <Input
                            prefix={<Search size={16} className="text-gray-300" />}
                            placeholder="Số phiếu, Tên khách hàng, SĐT hoặc Mã NV..."
                            className="rounded-xl border-gray-100 bg-gray-50/50 p-2.5 hover:bg-white focus:bg-white transition-all text-sm h-11"
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setFilters(prev => ({ ...prev, q: e.target.value }));
                            }}
                            allowClear
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Khoảng ngày</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                className="rounded-xl border-gray-100 bg-gray-50/50 h-11 text-xs font-bold w-36"
                                value={filters.date_from}
                                onChange={e => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                            />
                            <div className="h-px w-2 bg-gray-300"></div>
                            <Input
                                type="date"
                                className="rounded-xl border-gray-100 bg-gray-50/50 h-11 text-xs font-bold w-36"
                                value={filters.date_to}
                                onChange={e => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex items-end h-full">
                        <Button
                            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
                            onClick={refresh}
                            type="text"
                            className="h-11 w-11 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-blue-500 hover:bg-white transition-all mt-6"
                        />
                    </div>
                </div>
            </Card>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[500px]">
                <Table
                    columns={columns}
                    dataSource={quotations}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        pageSizeOptions: ['15', '30', '50', '100'],
                        position: ['bottomRight'],
                        className: "px-6 py-4"
                    }}
                    rowClassName={() => "group cursor-pointer hover:bg-blue-50/20 transition-all h-[70px]"}
                    onRow={(record) => ({
                        onClick: () => { setSelectedId(record.id); setPageState('EDIT'); }
                    })}
                    locale={{
                        emptyText: <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                            <FileText size={48} strokeWidth={1} className="mb-3" />
                            <p className="text-sm font-medium">Chưa có kết quả báo giá nào trong khoảng này</p>
                            <Button type="link" onClick={() => { setSearch(''); setFilters({ date_from: '', date_to: '', q: '' }) }}>Xóa bộ lọc</Button>
                        </div>
                    }}
                />
            </div>

            {/* Footer / Dev Note */}
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hỗ trợ kỹ thuật</span>
                        <span className="text-xs font-bold text-gray-600">Dev team: 0944.xxx.xxx</span>
                    </div>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sẵn sàng xuất kho</span>
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> Auto Sync Active</span>
                    </div>
                </div>
                <div className="text-[10px] font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    POWERED BY <span className="text-blue-500 font-black">TAIDINH89</span> • SYSTEM VERSION 2.1
                </div>
            </div>
        </div>
    );
};

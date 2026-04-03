// src/pages/Business/QuotationFormNew.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Button, Input, Card, Table,
    Modal, Select, Checkbox,
    Tabs, Tooltip, Badge,
    Divider, Spin, Empty,
    Popconfirm, Dropdown, Menu,
    message
} from 'antd';
import {
    Search, Plus, Trash2, Printer,
    Save, ArrowLeft, Image as ImageIcon,
    PlusCircle, MinusCircle, Copy,
    ChevronDown, ChevronUp, Settings, AlertTriangle,
    Info, FileText, CheckCircle2,
    Calendar, User, Globe, Calculator,
    Package, Filter, X
} from 'lucide-react';
import dayjs from 'dayjs';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData.jsx';
import { CustomerSearch } from '../../components/Trading/CustomerSearch';

// --- CÁC COMPONENT CON ---
const ProductSearch = ({ onSelect, type = 'sale' }) => {
    const [search, setSearch] = useState('');
    const { data: products, isLoading } = useApiData('/api/v2/quotations/products/search', { search: search, limit: 10 }, 300);

    const formatCurrencyLocal = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    return (
        <div className="relative w-full">
            <Input
                prefix={<Search size={16} className="text-gray-400" />}
                placeholder="Tìm sản phẩm (Mã, Tên, Barcode)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
                className="hover:border-blue-500 focus:border-blue-500 transition-all rounded-xl h-10 border-slate-300 shadow-sm"
            />
            {search && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden z-[999]">
                    <ul className="max-h-[50vh] overflow-y-auto custom-scrollbar p-1.5 divide-y divide-slate-50">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-400 italic">
                                <Spin size="small" className="mr-2" /> Đang tìm hàng...
                            </div>
                        ) : products?.length > 0 ? (
                            products.map((p) => (
                                <li
                                    key={p.product_code}
                                    className="p-3.5 hover:bg-slate-50 cursor-pointer flex flex-col gap-1.5 rounded-xl active:bg-blue-50 active:scale-[0.98] transition-all"
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // CHỐNG LỖI MẤT FOCUS
                                        onSelect(p);
                                        setSearch('');
                                    }}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <span className="font-bold text-sm text-slate-800 leading-snug">{p.display_name}</span>
                                        <span className="font-black text-blue-600 text-sm whitespace-nowrap">{formatCurrencyLocal(p.prices?.retail || 0)}</span>
                                    </div>
                                    <div className="flex gap-2 text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{p.product_code}</span>
                                        <span>Tồn: <strong className={(p.inventory?.total || 0) > 0 ? 'text-emerald-600' : 'text-rose-500'}>{p.inventory?.total || 0}</strong></span>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-400 font-medium border-none shadow-none">
                                <Empty description="Không tìm thấy sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT CHÍNH ---
export const QuotationFormNew = ({ quotationId, onBack, onSaveSuccess }) => {
    const isEdit = !!quotationId;
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false); // Điều khiển đóng mở Header trên Mobile

    // --- SAFARI SCROLL LOGIC CHO THANH TÌM KIẾM ---
    const [showStickySearch, setShowStickySearch] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY; // Đo lường thanh cuộn của toàn trang
            
            // Vuốt xuống (Qua 50px mới tính để tránh giật) -> Ẩn thanh tìm kiếm
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                if (showStickySearch) setShowStickySearch(false);
            } 
            // Vuốt lên -> Hiện lại thanh tìm kiếm
            else if (currentScrollY < lastScrollY.current) {
                if (!showStickySearch) setShowStickySearch(true);
            }
            
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showStickySearch]);

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    // --- STATE DỮ LIỆU ---
    const [formData, setFormData] = useState({
        ngay_ct: dayjs().format('YYYY-MM-DD'),
        ma_kh: '',
        ten_kh: '',
        dien_thoai: '',
        dia_chi: '',
        email: '',
        ma_nt: 'VND',
        ty_gia: 1,
        dien_giai: '',
        han_thanh_toan: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        tong_tien: 0,
        tong_thue: 0,
        tong_ck: 0,
        tong_thanh_toan: 0,
        display_options: {
            show_vat: false
        },
        details: []
    });

    // --- LOAD DỮ LIỆU NẾU LÀ EDIT ---
    useEffect(() => {
        if (isEdit) {
            fetchQuotationDetail();
        }
    }, [quotationId]);

    const fetchQuotationDetail = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v2/quotations/${quotationId}`);
            if (res.data) {
                // Map dữ liệu từ V2 backend về frontend state
                const data = res.data;
                setFormData({
                    ...data,
                    ngay_ct: data.date,
                    ma_kh: data.customer_id,
                    ten_kh: data.customer_name,
                    dien_giai: data.note,
                    details: (data.items || []).map(it => ({
                        ...it,
                        id: it.id,
                        ma_vt: it.product_code,
                        ten_vt: it.product_name,
                        sl: parseFloat(it.quantity) || 0,
                        gia: parseFloat(it.price) || 0,
                        thue_suat: parseFloat(it.vat_rate) || 0,
                        ck: 0, 
                        loai_ck: '%'
                    }))
                });
            }
        } catch (err) {
            message.error('Không thể tải thông tin báo giá');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- TÍNH TOÁN TỔNG HỢP ---
    const updateTotals = (details) => {
        let t_tien = 0;
        let t_ck = 0;
        let t_thue = 0;

        details.forEach(item => {
            const tierSum = (item.gia || 0) * (item.sl || 0);
            const ckVal = item.loai_ck === '%' ? (tierSum * (item.ck || 0) / 100) : (item.ck || 0);
            const afterCk = tierSum - ckVal;
            const thueVal = (afterCk * (item.thue_suat || 0) / 100);

            t_tien += tierSum;
            t_ck += ckVal;
            t_thue += thueVal;
        });

        setFormData(prev => ({
            ...prev,
            details,
            tong_tien: t_tien,
            tong_ck: t_ck,
            tong_thue: t_thue,
            tong_thanh_toan: t_tien - t_ck + t_thue
        }));
    };

    // --- HANDLERS ---
    const handleAddProduct = (p) => {
        const product_code = p.product_code || p.ma_mat_hang;
        const exists = formData.details.find(d => d.ma_vt === product_code);
        if (exists) {
            message.info(`Sản phẩm ${product_code} đã có trong danh sách`);
            return;
        }

        const newItem = {
            id: `new_${Date.now()}`,
            ma_vt: product_code,
            ten_vt: p.display_name || p.ten_mat_hang,
            dvt: p.unit || p.dvt || 'Cái',
            sl: 1,
            gia: p.prices?.retail || p.don_gia_1 || 0,
            thue_suat: p.vat_rate || 0,
            ck: 0,
            loai_ck: '%',
            ghi_chu: '',
            thumb: null,
            original_data: p
        };

        updateTotals([...formData.details, newItem]);
    };

    const handleUpdateItem = (id, field, value) => {
        const newDetails = formData.details.map(item => {
            if (item.id === id) return { ...item, [field]: value };
            return item;
        });
        updateTotals(newDetails);
    };

    const handleRemoveItem = (id) => {
        updateTotals(formData.details.filter(i => i.id !== id));
    };

    const handleSave = async (isPrint = false) => {
        if (!formData.ma_kh && !formData.ten_kh) {
            message.warning('Vui lòng chọn hoặc nhập tên khách hàng');
            return;
        }
        if (formData.details.length === 0) {
            message.warning('Vui lòng thêm ít nhất một sản phẩm');
            return;
        }

        setSaving(true);
        try {
            // MAPPING PAYLOAD CHO V2 API
            const payload = {
                customer_id: formData.ma_kh,
                customer_name: formData.ten_kh,
                date: formData.ngay_ct,
                note: formData.dien_giai,
                warehouse_code: '02',
                items: formData.details.map(item => ({
                    product_code: item.ma_vt,
                    product_name: item.ten_vt,
                    unit: item.dvt,
                    quantity: item.sl,
                    price: item.gia,
                    vat_rate: item.thue_suat,
                    note: item.ghi_chu || '',
                    original_data: item.original_data || {}
                }))
            };

            const url = isEdit ? `/api/v2/quotations/${quotationId}` : '/api/v2/quotations';
            const method = isEdit ? 'put' : 'post';
            const res = await axios[method](url, payload);

            message.success(res.data.message || 'Đã lưu báo giá thành công');
            if (isPrint) {
                handlePrint(res.data.id || quotationId);
            }
            if (!isPrint && onSaveSuccess) onSaveSuccess();
        } catch (err) {
            console.error('Lỗi khi lưu báo giá:', err);
            const msg = err.response?.data?.message || 'Lỗi khi lưu báo giá';
            message.error(msg);
            
            // Xử lý hiển thị chi tiết lỗi validation nếu có
            if (err.response?.data?.errors) {
                Object.values(err.response.data.errors).forEach(errs => {
                    errs.forEach(e => message.error(e));
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = (id) => {
        window.open(`/api/v2/quotations/${id}/print`, '_blank');
    };

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50/50">
            <Spin size="large" tip="Đang tải dữ liệu báo giá..." />
        </div>
    );

    const columns = [
        {
            title: '#',
            width: 50,
            render: (_, __, index) => <span className="text-slate-400 font-bold">{index + 1}</span>,
            align: 'center'
        },
        {
            title: 'Sản phẩm',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-slate-800">{record.ten_vt}</div>
                    <div className="text-[10px] text-slate-400 font-black font-mono mt-0.5">{record.ma_vt}</div>
                </div>
            )
        },
        {
            title: 'ĐVT',
            dataIndex: 'dvt',
            width: 80,
            align: 'center',
            render: (val) => <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-black text-slate-600 uppercase">{val}</span>
        },
        {
            title: 'Số lượng',
            dataIndex: 'sl',
            width: 120,
            render: (val, record) => (
                <Input 
                    type="number" 
                    value={val} 
                    onChange={e => handleUpdateItem(record.id, 'sl', parseFloat(e.target.value) || 0)}
                    className="text-center font-black h-9 border-slate-200"
                />
            )
        },
        {
            title: 'Đơn giá',
            dataIndex: 'gia',
            width: 160,
            render: (val, record) => (
                <Input 
                    type="number" 
                    value={val} 
                    onChange={e => handleUpdateItem(record.id, 'gia', parseFloat(e.target.value) || 0)}
                    className="text-right font-black text-blue-600 bg-blue-50/30 border-blue-100 h-9"
                />
            )
        },
        {
            title: 'Thành tiền',
            align: 'right',
            width: 150,
            render: (_, record) => <span className="font-black text-slate-800">{formatCurrency(record.sl * record.gia)}</span>
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                <button onClick={() => handleRemoveItem(record.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                    <Trash2 size={16} />
                </button>
            ),
            align: 'center'
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden font-inter animate-in fade-in duration-500">
            {/* ================================================================= */}
            {/* HEADER: GỌN GÀNG TRÊN MOBILE - RỘNG RÃI TRÊN DESKTOP */}
            {/* ================================================================= */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between shadow-sm z-30 sticky top-0">
                
                {/* Trái: Nút Back + Tiêu đề */}
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <button 
                        onClick={onBack} 
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 m-0 truncate">
                            {isEdit ? <span>Báo Giá <span className="text-blue-600">#{formData.so_ct || quotationId}</span></span> : 'TẠO BÁO GIÁ MỚI'}
                            {formData.status === 'approved' && <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />}
                        </h2>
                        <p className="hidden md:block text-[10px] uppercase font-black text-slate-400 mt-0.5 tracking-widest">Phần mềm quản lý kinh doanh</p>
                    </div>
                </div>

                {/* Phải: Các nút thao tác */}
                <div className="flex items-center gap-2 shrink-0">
                    
                    {/* NHÓM NÚT IN (Chỉ hiện khi đang ở chế độ Edit) */}
                    {isEdit && (
                        <div className="flex items-center gap-1 md:gap-2">
                            {/* Mobile View: Chỉ hiện Icon In nhỏ gọn */}
                            <div className="flex md:hidden gap-1.5">
                                <button onClick={() => window.open(`/api/v2/quotations/${quotationId}/print`, '_blank')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 active:bg-indigo-100 text-indigo-600 shadow-sm transition-colors"><Printer size={16}/></button>
                                <button onClick={() => window.open(`/api/v2/quotations/${quotationId}/contract`, '_blank')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-50 active:bg-amber-100 text-amber-600 shadow-sm transition-colors"><FileText size={16}/></button>
                            </div>
                            
                            {/* Desktop View: Hiện full Text */}
                            <div className="hidden md:flex gap-2">
                                <Button icon={<Printer size={16} />} onClick={() => window.open(`/api/v2/quotations/${quotationId}/print`, '_blank')} className="rounded-xl border-slate-200 font-bold h-9 bg-indigo-50/30 text-indigo-700 hover:bg-indigo-50">In Báo giá</Button>
                                <Button icon={<FileText size={16} />} onClick={() => window.open(`/api/v2/quotations/${quotationId}/contract`, '_blank')} className="rounded-xl border-slate-200 font-bold h-9 bg-amber-50/30 text-amber-700 hover:bg-amber-50">In Hợp đồng</Button>
                            </div>
                        </div>
                    )}

                    {/* NÚT LƯU TOP: ẨN TRÊN MOBILE VÌ ĐÃ CÓ BOTTOM BAR */}
                    <Button 
                        type="primary" 
                        icon={<Save size={16} />} 
                        onClick={() => handleSave(false)} 
                        loading={saving} 
                        className="hidden md:flex rounded-xl bg-blue-600 font-bold h-9 shadow-sm shadow-blue-100"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu Báo Giá'}
                    </Button>
                </div>
            </div>



            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
                <div className="grid grid-cols-12 gap-4 md:gap-6 pb-32">

                    {/* Panel Trái: Thông tin chung & Sản phẩm */}
                    <div className="col-span-12 lg:col-span-8 space-y-4 md:space-y-6">

                        {/* ================================================================= */}
                        {/* 1. KHU VỰC THÔNG TIN BÁO GIÁ (MOBILE: ACCORDION, DESKTOP: GRID) */}
                        {/* ================================================================= */}
                        {/* KHỐI THÔNG TIN CƠ BẢN (COMPACT MODE) */}
                        <div className="bg-white md:rounded-2xl shadow-sm border-b md:border border-slate-200 mb-4 p-3 md:p-4 -mx-4 md:mx-0">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Tìm khách hàng */}
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Khách hàng</label>
                                    <div className="relative z-50">
                                        <CustomerSearch 
                                            selectedCustomer={formData.ma_kh ? { 
                                                ma_khncc: formData.ma_kh, 
                                                ten_cong_ty_khach_hang: formData.ten_kh 
                                            } : null}
                                            onSelect={(cust) => {
                                                if (cust) {
                                                    setFormData({
                                                        ...formData,
                                                        ma_kh: cust.ma_khncc,
                                                        ten_kh: cust.ten_cong_ty_khach_hang,
                                                        dien_thoai: cust.dien_thoai_1,
                                                        dia_chi: cust.dia_chi
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        ma_kh: '',
                                                        ten_kh: '',
                                                        dien_thoai: '',
                                                        dia_chi: ''
                                                    });
                                                }
                                            }} 
                                        />
                                    </div>
                                </div>

                                {/* Ngày tháng (Xếp 2 cột trên Mobile) */}
                                <div className="grid grid-cols-2 gap-4 md:w-1/3 shrink-0">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ngày Báo Giá</label>
                                        <Input type="date" value={formData.ngay_ct} onChange={(e) => setFormData({ ...formData, ngay_ct: e.target.value })} className="w-full h-11 font-bold text-sm bg-slate-50 border-slate-200 rounded-xl"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Hiệu lực</label>
                                        <Input type="date" value={formData.han_thanh_toan} onChange={(e) => setFormData({ ...formData, han_thanh_toan: e.target.value })} className="w-full h-11 font-bold text-sm bg-slate-50 border-slate-200 rounded-xl"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ================================================================= */}
                        {/* 2. THANH TÌM KIẾM SẢN PHẨM (AUTO-HIDE SAFARI STYLE TRÊN MOBILE) */}
                        {/* ================================================================= */}
                        <div className={`sticky top-[58px] md:top-auto z-[90] bg-white/95 backdrop-blur-md pb-3 pt-2 md:pb-4 md:bg-transparent md:relative border-b md:border-none border-slate-200 shadow-sm md:shadow-none mb-4 -mx-4 px-4 md:mx-0 md:px-0 transition-all duration-300 ease-in-out origin-top ${
                            !showStickySearch 
                                ? '-translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto' 
                                : 'translate-y-0 opacity-100'
                        }`}>
                            <div className="relative shadow-sm rounded-xl overflow-visible z-50"> 
                                <ProductSearch onSelect={handleAddProduct} />
                            </div>
                        </div>

                        {/* ================================================================= */}
                        {/* DANH SÁCH SẢN PHẨM (HYBRID: TABLE CHO PC - CARD CHO MOBILE) */}
                        {/* ================================================================= */}
                        <div className="w-full mt-4">
                            {/* Tiêu đề & Badge (Chỉ hiện trên PC để tăng tính chuyên nghiệp) */}
                            <div className="hidden md:flex items-center gap-2 text-slate-800 mb-3 px-1">
                                <Package size={18} className="text-blue-600" />
                                <span className="font-black text-xs uppercase tracking-widest">Danh sách sản phẩm</span>
                                <Badge count={formData.details.length} showZero offset={[5, -2]} style={{ backgroundColor: '#3b82f6', fontWeight: 900, fontSize: '10px' }} />
                            </div>

                            {/* 🖥️ DESKTOP VIEW: Giữ nguyên Table của Ant Design */}
                            <div className="hidden md:block bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                                <Table
                                    columns={columns}
                                    dataSource={formData.details}
                                    rowKey={(record) => record.id || (record.ma_vt + Math.random())}
                                    pagination={false}
                                    bordered
                                    size="small"
                                    className="custom-antd-table"
                                />
                            </div>

                            {/* 📱 MOBILE VIEW: Giỏ hàng dạng Thẻ (Card Layout) */}
                            <div className="block md:hidden space-y-3 pb-24">
                                {formData.details.length === 0 ? (
                                    <div className="p-10 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm font-bold">Chưa có sản phẩm nào</p>
                                    </div>
                                ) : (
                                    formData.details.map((item, index) => (
                                        <div key={item.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 relative">
                                            {/* Nút Xóa góc phải */}
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="absolute top-3 right-3 text-rose-400 p-1.5 bg-rose-50 rounded-lg active:bg-rose-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            {/* Tên & Mã SP */}
                                            <div className="pr-10 mb-3">
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.ten_vt}</h4>
                                                <span className="text-[10px] font-black font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1.5 inline-block tracking-widest">
                                                    {item.ma_vt}
                                                </span>
                                            </div>

                                            {/* Grid Nhập Số lượng & Giá */}
                                            <div className="grid grid-cols-2 gap-3 items-end border-t border-slate-50 pt-3">
                                                {/* Stepper Số lượng */}
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Số lượng ({item.dvt})</label>
                                                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-10 w-full bg-white shadow-sm">
                                                        <button onClick={() => handleUpdateItem(item.id, 'sl', Math.max(1, (item.sl || 1) - 1))} className="w-10 h-full flex justify-center items-center bg-slate-50 active:bg-slate-200 text-slate-600 font-bold border-r border-slate-200">-</button>
                                                        <input 
                                                            type="number" 
                                                            value={item.sl}
                                                            onChange={(e) => handleUpdateItem(item.id, 'sl', parseFloat(e.target.value) || 0)}
                                                            className="flex-1 w-full text-center font-black text-sm outline-none m-0 p-0" 
                                                            style={{ WebkitAppearance: 'none' }}
                                                        />
                                                        <button onClick={() => handleUpdateItem(item.id, 'sl', Number(item.sl || 0) + 1)} className="w-10 h-full flex justify-center items-center bg-slate-50 active:bg-slate-200 text-slate-600 font-bold border-l border-slate-200">+</button>
                                                    </div>
                                                </div>

                                                {/* Input Đơn giá */}
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Đơn giá (VNĐ)</label>
                                                    <input 
                                                        type="number"
                                                        value={item.gia}
                                                        onChange={(e) => handleUpdateItem(item.id, 'gia', parseFloat(e.target.value) || 0)}
                                                        className="w-full h-10 px-2 border border-slate-200 rounded-xl text-right font-black text-sm text-blue-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Thành tiền dòng */}
                                            <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thành tiền</span>
                                                <span className="font-black text-slate-800">{formatCurrency(item.sl * item.gia)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {formData.details.length > 0 && (
                                    <div className="text-center pt-4 pb-2">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest border-b border-slate-200 pb-1">
                                            Hết danh sách sản phẩm
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Ghi chú & Điều khoản */}
                        <Card className="shadow-sm border-gray-100 rounded-xl">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-tight flex items-center gap-2">
                                    <FileText size={14} /> Ghi chú nội bộ
                                </label>
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Ghi chú về khách hàng, đối thủ hoặc lý do giảm giá..."
                                    className="rounded-xl border-gray-100 bg-gray-50/50 p-4 focus:bg-white transition-all text-sm"
                                    value={formData.dien_giai}
                                    onChange={e => setFormData({ ...formData, dien_giai: e.target.value })}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Panel Phải: Tổng hợp & Cấu hình */}
                    <div className="col-span-12 lg:col-span-4 space-y-6 pb-20 md:pb-0">

                        {/* 1. Cấu hình chứng từ (Desktop Only - Mobile version moved to top) */}
                        <Card
                            title={<div className="flex items-center gap-2 text-blue-700"><Calculator size={18} /><span>Thiết lập Phiếu</span></div>}
                            className="hidden md:block shadow-sm border-gray-100 rounded-xl"
                        >
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Ngày báo giá</label>
                                        <Input
                                            type="date"
                                            value={formData.ngay_ct}
                                            onChange={e => setFormData({ ...formData, ngay_ct: e.target.value })}
                                            className="rounded-lg h-9 border-gray-200 text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Hạn hiệu lực</label>
                                        <Input
                                            type="date"
                                            value={formData.han_thanh_toan}
                                            onChange={e => setFormData({ ...formData, han_thanh_toan: e.target.value })}
                                            className="rounded-lg h-9 border-gray-200 text-sm font-bold text-orange-600"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Loại tiền tệ</label>
                                    <div className="flex gap-2">
                                        <Select
                                            className="flex-1 h-9"
                                            defaultValue="VND"
                                            onChange={val => setFormData({ ...formData, ma_nt: val })}
                                        >
                                            <Select.Option value="VND">VND - Việt Nam Đồng</Select.Option>
                                            <Select.Option value="USD">USD - Đô la Mỹ</Select.Option>
                                        </Select>
                                        <Input
                                            type="number"
                                            className="w-24 h-9 rounded-lg border-gray-200 text-sm font-bold text-gray-400"
                                            value={formData.ty_gia}
                                            disabled={formData.ma_nt === 'VND'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* 2. Tổng cộng tiền (Desktop View) */}
                        <div className="hidden md:block">
                            <Card className="shadow-lg border-blue-100 border-2 rounded-xl bg-gradient-to-br from-white to-blue-50/30 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <Calculator size={120} strokeWidth={1} />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                        <span>Tổng tiền hàng</span>
                                        <span className="font-mono">{new Intl.NumberFormat('vi-VN').format(formData.tong_tien)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium text-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100">
                                        <span className="flex items-center gap-1">Tổng chiết khấu <Info size={12} className="cursor-help" title="Cộng dồn chiết khấu từng dòng" /></span>
                                        <span className="font-mono font-bold">- {new Intl.NumberFormat('vi-VN').format(formData.tong_ck)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                        <span>Thuế GTGT</span>
                                        <span className="font-mono">{new Intl.NumberFormat('vi-VN').format(formData.tong_thue)}</span>
                                    </div>
                                    <Divider className="my-2 border-gray-200" />
                                    <div className="space-y-1">
                                        <div className="text-xs font-black text-blue-600 uppercase tracking-widest text-right">Tổng thanh toán</div>
                                        <div className="text-3xl font-black text-right text-gray-800 font-mono tracking-tighter">
                                            {formatCurrency(formData.tong_thanh_toan)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 italic text-right mt-1">Đã bao gồm VAT & Chiết khấu</div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* 3. Information Alert */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                            <AlertTriangle className="shrink-0" size={18} />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-tight mb-1">Cần lưu ý</div>
                                <p className="text-[11px] leading-relaxed m-0 opacity-80">
                                    Báo giá này sẽ có hiệu lực trong vòng <b>7 ngày</b>.
                                    Sau thời gian này, giá có thể thay đổi tùy thuộc vào biến động thị trường hoặc chương trình khuyến mãi.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- MOBILE STICKY BOTTOM BAR (TỔNG THANH TOÁN) --- */}
            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-[100] md:hidden pb-safe">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng thanh toán</div>
                        <div className="text-xl font-black text-blue-600 truncate font-mono">
                            {formatCurrency(formData.tong_thanh_toan)}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleSave(false)} 
                        className="bg-slate-800 active:bg-slate-900 active:scale-95 transition-all text-white font-black px-8 py-3.5 rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-slate-200"
                    >
                        Chốt Đơn
                    </button>
                </div>
            </div>

            {/* Footer Status Bar (Desktop Only) */}
            <div className="hidden md:flex bg-gray-100 border-t border-gray-200 px-6 py-2 items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest z-30">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Hệ thống ổn định</span>
                    <span>Tài liệu: {formData.details.length} dòng</span>
                </div>
                <div>ID: {isEdit ? `EDIT_${quotationId}` : 'DRAFT_NEW'} | Dev by Taidinh89</div>
            </div>
        </div>
    );
};

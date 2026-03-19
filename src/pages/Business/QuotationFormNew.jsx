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
    ChevronDown, Settings, AlertTriangle,
    Info, FileText, CheckCircle2,
    Calendar, User, Globe, Calculator,
    Package, Filter, X
} from 'lucide-react';
import dayjs from 'dayjs';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData.jsx';

// --- CÁC COMPONENT CON ---
const ProductSearch = ({ onSelect, type = 'sale' }) => {
    const [search, setSearch] = useState('');
    const { data: products, isLoading } = useApiData('/api/v2/products/search', { q: search, limit: 10 }, 300);

    return (
        <div className="relative w-full">
            <Input
                prefix={<Search size={16} className="text-gray-400" />}
                placeholder="Tìm sản phẩm (Mã, Tên, Barcode)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
                className="hover:border-blue-500 focus:border-blue-500 transition-all rounded-lg h-9"
            />
            {search && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-400"><Spin size="small" className="mr-2" /> Đang tìm kiếm...</div>
                    ) : products?.length > 0 ? (
                        products.map(p => (
                            <div
                                key={p.id}
                                className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => { onSelect(p); setSearch(''); }}
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center overflow-hidden shrink-0">
                                    {p.thumb ? <img src={p.thumb} alt={p.ten_vt} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 truncate text-sm">{p.ma_vt} - {p.ten_vt}</div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-blue-600 font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.gia_ban_le || 0)}</span>
                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Tồn: <span className="font-bold">{p.ton_hien_tai || 0}</span> {p.dvt}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-400">
                            <Empty description="Không tìm thấy sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    )}
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
                setFormData(res.data);
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
        const exists = formData.details.find(d => d.ma_vt === p.ma_vt);
        if (exists) {
            message.info(`Sản phẩm ${p.ma_vt} đã có trong danh sách`);
            return;
        }

        const newItem = {
            id: `new_${Date.now()}`,
            ma_vt: p.ma_vt,
            ten_vt: p.ten_vt,
            dvt: p.dvt,
            sl: 1,
            gia: p.gia_ban_le || 0,
            thue_suat: p.thue_suat || 0,
            ck: 0,
            loai_ck: '%',
            ghi_chu: '',
            thumb: p.thumb
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
            const url = isEdit ? `/api/v2/quotations/${quotationId}` : '/api/v2/quotations';
            const method = isEdit ? 'put' : 'post';
            const res = await axios[method](url, formData);

            message.success('Đã lưu báo giá thành công');
            if (isPrint) {
                handlePrint(res.data.id || quotationId);
            }
            if (!isPrint && onSaveSuccess) onSaveSuccess();
        } catch (err) {
            message.error('Lỗi khi lưu báo giá');
            console.error(err);
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

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden font-inter animate-in fade-in duration-500">
            {/* Header Sticky */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-blue-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2 m-0">
                            {isEdit ? 'CHỈNH SỬA BÁO GIÁ' : 'TẠO BÁO GIÁ MỚI'}
                            {isEdit && <span className="text-blue-600">#{formData.so_ct || quotationId}</span>}
                        </h1>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider m-0">Quản lý báo giá & đàm phán khách hàng</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        icon={<Printer size={16} />}
                        onClick={() => handleSave(true)}
                        className="flex items-center gap-2 font-bold h-9 bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                    >
                        Lưu & In
                    </Button>
                    <Button
                        type="primary"
                        icon={<Save size={16} />}
                        loading={saving}
                        onClick={() => handleSave(false)}
                        className="flex items-center gap-2 font-bold h-9 shadow-blue-200 shadow-md"
                    >
                        Lưu Báo Giá
                    </Button>
                </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="grid grid-cols-12 gap-6 pb-20">

                    {/* Panel Trái: Thông tin chung */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">

                        {/* 1. Thông tin khách hàng */}
                        <Card
                            title={<div className="flex items-center gap-2 text-blue-700"><User size={18} /><span>Thông tin Khách hàng</span></div>}
                            className="shadow-sm border-gray-100 rounded-xl overflow-hidden"
                            bodyStyle={{ padding: '20px' }}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Tên Khách hàng / Công ty <span className="text-red-500">*</span></label>
                                    <Input
                                        placeholder="Nhập tên khách hàng..."
                                        value={formData.ten_kh}
                                        onChange={e => setFormData({ ...formData, ten_kh: e.target.value })}
                                        className="rounded-lg h-9 border-gray-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Số điện thoại</label>
                                    <Input
                                        placeholder="09xx xxx xxx"
                                        value={formData.dien_thoai}
                                        onChange={e => setFormData({ ...formData, dien_thoai: e.target.value })}
                                        className="rounded-lg h-9 border-gray-200"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Địa chỉ giao hàng / Gửi báo giá</label>
                                    <Input
                                        placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                                        value={formData.dia_chi}
                                        onChange={e => setFormData({ ...formData, dia_chi: e.target.value })}
                                        className="rounded-lg h-9 border-gray-200"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* 2. Chi tiết sản phẩm */}
                        <Card
                            title={
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2 text-blue-700"><Package size={18} /><span>Sản phẩm & Dịch vụ</span></div>
                                    <div className="w-80"><ProductSearch onSelect={handleAddProduct} /></div>
                                </div>
                            }
                            className="shadow-sm border-gray-100 rounded-xl overflow-hidden"
                            bodyStyle={{ padding: 0 }}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50/80 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sản phẩm</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">ĐVT</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">Số lượng</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-36">Đơn giá</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32">Chiết khấu</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-40">Thành tiền</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {formData.details.length > 0 ? formData.details.map((item, idx) => {
                                            const lineTien = (item.gia || 0) * (item.sl || 0);
                                            const lineCk = item.loai_ck === '%' ? (lineTien * (item.ck || 0) / 100) : (item.ck || 0);
                                            const lineTotal = lineTien - lineCk;

                                            return (
                                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-4 text-center text-xs text-gray-400 font-bold">{idx + 1}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-100 rounded border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-blue-200 transition-all">
                                                                {item.thumb ? <img src={item.thumb} alt={item.ten_vt} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-300" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-gray-800 truncate" title={item.ten_vt}>{item.ten_vt}</div>
                                                                <div className="text-[10px] text-gray-400 font-mono italic mt-0.5">{item.ma_vt}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">{item.dvt}</span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <Input
                                                            type="number"
                                                            value={item.sl}
                                                            onChange={e => handleUpdateItem(item.id, 'sl', parseFloat(e.target.value) || 0)}
                                                            className="text-center h-8 rounded-lg font-bold border-gray-200"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <Input
                                                            type="number"
                                                            value={item.gia}
                                                            onChange={e => handleUpdateItem(item.id, 'gia', parseFloat(e.target.value) || 0)}
                                                            className="text-right h-8 rounded-lg font-mono font-bold text-blue-600 bg-blue-50/30 border-blue-100"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={item.ck}
                                                                onChange={e => handleUpdateItem(item.id, 'ck', parseFloat(e.target.value) || 0)}
                                                                className="text-right h-8 rounded-lg border-gray-200 w-full"
                                                            />
                                                            <select
                                                                className="text-[10px] font-bold border rounded-md h-8 px-1 bg-gray-50 text-gray-500"
                                                                value={item.loai_ck}
                                                                onChange={e => handleUpdateItem(item.id, 'loai_ck', e.target.value)}
                                                            >
                                                                <option value="%">%</option>
                                                                <option value="đ">đ</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="text-sm font-black text-gray-800 font-mono">
                                                            {new Intl.NumberFormat('vi-VN').format(lineTotal)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="8" className="py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-300">
                                                        <PlusCircle size={48} strokeWidth={1} className="mb-3" />
                                                        <p className="text-sm font-medium">Chưa có sản phẩm nào. Hãy tìm kiếm để thêm.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* 3. Ghi chí & Điều khoản */}
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
                    <div className="col-span-12 lg:col-span-4 space-y-6">

                        {/* 1. Cấu hình chứng từ */}
                        <Card
                            title={<div className="flex items-center gap-2 text-blue-700"><Calculator size={18} /><span>Thiết lập Phiếu</span></div>}
                            className="shadow-sm border-gray-100 rounded-xl"
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

                        {/* 2. Tổng cộng tiền */}
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
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.tong_thanh_toan)}
                                    </div>
                                    <div className="text-[10px] text-gray-400 italic text-right mt-1">Đã bao gồm VAT & Chiết khấu</div>
                                </div>
                            </div>
                        </Card>

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

            {/* Footer Status Bar */}
            <div className="bg-gray-100 border-t border-gray-200 px-6 py-2 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest z-30">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Hệ thống ổn định</span>
                    <span>Tài liệu: {formData.details.length} dòng</span>
                </div>
                <div>ID: {isEdit ? `EDIT_${quotationId}` : 'DRAFT_NEW'} | Dev by Taidinh89</div>
            </div>
        </div>
    );
};

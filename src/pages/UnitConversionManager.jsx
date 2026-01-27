import React, { useState, useEffect } from 'react';
import { Icon, Button, Modal, Input, Pagination } from '../components/ui';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * UnitConversionManager.jsx - Quản lý Trí tuệ Quy đổi Đơn vị (V2.2)
 * Giải quyết lỗi Unit Watchdog và làm sạch 11.000 lỗi âm kho ảo.
 */
const UnitConversionManager = () => {
    // --- 1. STATES ---
    const [conversions, setConversions] = useState([]); // Danh sách quy đổi hiện có
    const [pendingUnits, setPendingUnits] = useState([]); // Đơn vị lỗi từ Watchdog
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState(null);
    
    // State cho Modal thêm/sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        product_code: '',
        unit_name: '',
        factor: 1,
        is_verified: true
    });

    // --- 2. LOAD DATA ---
    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            // Lấy danh sách quy đổi đã lưu và danh sách đang chờ (Watchdog)
            const [listRes, pendingRes] = await Promise.all([
                axios.get(`/api/v2/unit-conversions?page=${page}`),
                axios.get('/api/v2/unit-watchdog/list')
            ]);
            
            setConversions(listRes.data.data);
            setPagination(listRes.data.meta || listRes.data);
            setPendingUnits(pendingRes.data.data.anomalies || []);
        } catch (error) {
            toast.error("Lỗi tải dữ liệu quy đổi đơn vị");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- 3. ACTIONS ---
    const handleSave = async () => {
        if (!formData.product_code || !formData.unit_name || !formData.factor) {
            return toast.warning("Vui lòng nhập đầy đủ thông tin");
        }

        try {
            if (editingItem) {
                await axios.put(`/api/v2/unit-conversions/${editingItem.id}`, formData);
                toast.success("Cập nhật quy đổi thành công");
            } else {
                await axios.post('/api/v2/unit-conversions', formData);
                toast.success("Đã thêm quy đổi mới vào hệ thống");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi lưu dữ liệu");
        }
    };

    const openCreateModal = (prefill = null) => {
        setEditingItem(null);
        setFormData({
            product_code: prefill?.product_code || '',
            unit_name: prefill?.detected_unit || '',
            factor: 1,
            is_verified: true
        });
        setIsModalOpen(true);
    };

    const deleteConversion = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa quy đổi này?")) return;
        try {
            await axios.delete(`/api/v2/unit-conversions/${id}`);
            toast.success("Đã xóa quy đổi");
            fetchData();
        } catch (error) {
            toast.error("Không thể xóa dữ liệu");
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-orange-500 text-white rounded-2xl shadow-lg">⚖️</span>
                        Trí tuệ Quy đổi Đơn vị (V2.2)
                    </h1>
                    <p className="text-slate-400 text-xs mt-1 font-bold">Giải quyết lỗi sai ĐVT - Nguồn gốc âm kho ảo [cite: 406, 441]</p>
                </div>
                <Button onClick={() => openCreateModal()} className="rounded-2xl px-6 py-3 bg-indigo-600 font-black shadow-lg uppercase text-xs">
                    + Thêm quy đổi mới
                </Button>
            </div>

            {/* 1. KHU VỰC CẢNH BÁO WATCHDOG (Vùng Nóng) */}
            {pendingUnits.length > 0 && (
                <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2.5rem] shadow-sm animate-fade-in-down">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="text-4xl">🐕</div>
                        <div>
                            <h3 className="text-red-800 font-black uppercase text-sm tracking-widest">Danh sách Watchdog đang báo lỗi</h3>
                            <p className="text-red-600 text-[10px] font-bold">Phát hiện Đơn vị tính mới từ Excel chưa được cấu hình [cite: 442, 462]</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingUnits.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-red-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <div className="text-xs font-black text-slate-800">{item.prod_cd}</div>
                                    <div className="text-[10px] text-red-500 font-bold uppercase mt-1">
                                        Lỗi: "{item.detected_unit}" vs Chuẩn "{item.standard_unit}"
                                    </div>
                                </div>
                                <Button size="xs" onClick={() => openCreateModal(item)} className="bg-red-600 text-white font-black rounded-xl">
                                    Vá lỗi ngay
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. BẢNG DANH MỤC QUY ĐỔI ĐÃ XÁC THỰC */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Từ điển quy đổi hiện hành [cite: 407]</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b">
                                <th className="px-8 py-4">Mã Sản Phẩm</th>
                                <th className="px-6 py-4">Tên Sản Phẩm</th>
                                <th className="px-6 py-4">Đơn vị quy đổi</th>
                                <th className="px-6 py-4">Tỷ lệ (Factor)</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-8 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {conversions.length > 0 ? conversions.map((item) => (
                                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-8 py-4 font-black text-indigo-600 text-sm">{item.product_code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.product_name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
                                            {item.unit_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-800">
                                        x {item.factor}
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.is_verified ? (
                                            <span className="text-[10px] font-black uppercase text-green-500 flex items-center gap-1">
                                                ● Đã xác thực 
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-orange-500">○ Chờ duyệt</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 text-right space-x-2">
                                        <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className="text-indigo-400 hover:text-indigo-600 font-bold text-xs uppercase">Sửa</button>
                                        <button onClick={() => deleteConversion(item.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase">Xóa</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-slate-400 italic">Chưa có dữ liệu quy đổi nào được thiết lập.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/30">
                    <Pagination pagination={pagination} onPageChange={(p) => fetchData(p)} />
                </div>
            </div>

            {/* 3. MODAL THIẾT LẬP QUY ĐỔI */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? "SỬA QUY ĐỔI ĐƠN VỊ" : "THIẾT LẬP QUY ĐỔI MỚI"}
                footer={
                    <div className="flex gap-3 p-4">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button variant="primary" onClick={handleSave}>Lưu cấu hình</Button>
                    </div>
                }
            >
                <div className="p-6 space-y-5">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-[11px] text-indigo-700 font-medium">
                        Công thức: $Số lượng chuẩn = Số lượng nhập \times Tỷ lệ (Factor)$ [cite: 411]
                    </div>
                    <Input 
                        label="Mã Sản phẩm (Chuẩn)" 
                        placeholder="VD: SP001" 
                        value={formData.product_code}
                        onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Đơn vị quy đổi" 
                            placeholder="VD: Thùng" 
                            value={formData.unit_name}
                            onChange={(e) => setFormData({...formData, unit_name: e.target.value})}
                        />
                        <Input 
                            label="Tỷ lệ quy đổi (Factor)" 
                            type="number"
                            placeholder="VD: 24" 
                            value={formData.factor}
                            onChange={(e) => setFormData({...formData, factor: e.target.value})}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                        * Ví dụ: Nếu nhập 1 Thùng tương đương 24 Cái, hãy điền Factor là 24.
                    </p>
                </div>
            </Modal>

        </div>
    );
};

export default UnitConversionManager;
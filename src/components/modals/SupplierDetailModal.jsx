import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Modal, Button, Icon } from '../ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';
import { PurchaseOrderDetailModal } from '../Modals/PurchaseOrderDetailModal.jsx';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// --- COMPONENT CON: DANH SÁCH ĐƠN NHẬP (Lịch sử) ---
// const PurchaseHistoryList = ({ supplierCode }) => {
//     // Sử dụng hook phân trang để lấy dữ liệu đơn mua hàng
//     const { data: orders, isLoading } = useV2Paginator('/api/v2/purchase-orders', { ma_khncc: supplierCode, per_page: 5 });
//     const [viewingOrder, setViewingOrder] = useState(null);

//     return (
//         <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
//             <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-sm uppercase flex justify-between items-center">
//                 <span>Lịch sử 5 lần nhập gần nhất</span>
//             </div>
//             <div className="flex-1 overflow-auto">
//                 <table className="min-w-full text-sm">
//                     <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
//                         <tr>
//                             <th className="px-4 py-3 text-left">Ngày</th>
//                             <th className="px-4 py-3 text-left">Số Phiếu</th>
//                             <th className="px-4 py-3 text-right">Tổng Tiền</th>
//                             <th className="px-4 py-3 text-right"></th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {orders.map(order => (
//                             <tr key={order.id} className="hover:bg-blue-50 transition-colors">
//                                 <td className="px-4 py-3 text-gray-600">{formatDate(order.ngay)}</td>
//                                 <td className="px-4 py-3 font-mono text-blue-600 font-medium">{order.so_phieu}</td>
//                                 <td className="px-4 py-3 text-right font-bold text-gray-800">
//                                     {formatPrice(order.tong_tien_truoc_thue || order.total_amount)}
//                                 </td>
//                                 <td className="px-4 py-3 text-right">
//                                     <button className="text-gray-400 hover:text-blue-600" onClick={() => setViewingOrder(order.id)}>
//                                         <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-4 h-4"/>
//                                     </button>
//                                 </td>
//                             </tr>
//                         ))}
//                         {!isLoading && orders.length === 0 && (
//                             <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Chưa có lịch sử nhập hàng.</td></tr>
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//             {viewingOrder && <PurchaseOrderDetailModal orderIdentifier={viewingOrder} onClose={() => setViewingOrder(null)} />}
//         </div>
//     );
// };
// --- COMPONENT CON: DANH SÁCH ĐƠN NHẬP (Lịch sử) ---
// --- COMPONENT CON: DANH SÁCH ĐƠN NHẬP (Lịch sử) ---
// --- COMPONENT CON: DANH SÁCH ĐƠN NHẬP (Lịch sử) ---
const PurchaseHistoryList = ({ supplierCode }) => {
    // Sử dụng hook phân trang
    const { data: orders, isLoading } = useV2Paginator('/api/v2/purchase-orders', { ma_khncc: supplierCode, per_page: 10 }); // Tăng lên 10 dòng xem cho đã
    const [viewingOrder, setViewingOrder] = useState(null);

    // Hàm tô màu trạng thái
    const getStatusStyle = (status) => {
        if (!status) return 'bg-gray-100 text-gray-600';
        const s = status.toLowerCase();
        if (s.includes('hoàn thành') || s.includes('đã nhập')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('hủy')) return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-orange-50 text-orange-700 border-orange-100'; // Trạng thái chờ/đang xử lý
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-sm uppercase flex justify-between items-center">
                <span>Lịch sử nhập hàng</span>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 text-left w-28">Ngày</th>
                            <th className="px-4 py-3 text-left w-32">Số Phiếu</th>
                            <th className="px-4 py-3 text-left">Trạng Thái</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Người tạo</th>
                            <th className="px-4 py-3 text-right">Tổng Tiền</th>
                            <th className="px-4 py-3 text-center w-24">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => setViewingOrder(order.id)}>
                                {/* 1. Ngày tháng */}
                                <td className="px-4 py-3 text-gray-600 font-medium">
                                    {formatDate(order.ngay || order.created_at)}
                                </td>
                                
                                {/* 2. Số phiếu (Bold) */}
                                <td className="px-4 py-3">
                                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {order.so_phieu}
                                    </span>
                                </td>

                                {/* 3. [MỚI] Trạng thái (Badge màu) */}
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[11px] font-bold border uppercase tracking-wider ${getStatusStyle(order.hien_trang)}`}>
                                        {order.hien_trang || 'Mới'}
                                    </span>
                                </td>

                                {/* 4. [MỚI] Người phụ trách */}
                                <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">
                                    <div className="flex items-center gap-1">
                                        <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" className="w-3 h-3 text-gray-400"/>
                                        {order.nguoi_phu_trach || '---'}
                                    </div>
                                </td>

                                {/* 5. Tổng tiền (To & Rõ) */}
                                <td className="px-4 py-3 text-right font-bold text-gray-800 text-base">
                                    {formatPrice(order.tong_cong || order.total_amount || 0)}
                                </td>

                                {/* 6. Nút bấm (Button thay vì Icon bé) */}
                                <td className="px-4 py-3 text-center">
                                    <button 
                                        className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded font-bold shadow-sm transition-all flex items-center justify-center gap-1 mx-auto"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Tránh click đúp với row
                                            setViewingOrder(order.id);
                                        }}
                                    >
                                        <span>Chi tiết</span>
                                        <Icon path="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" className="w-3 h-3"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && orders.length === 0 && (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-400 flex flex-col items-center justify-center">
                                <Icon path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" className="w-10 h-10 mb-2 opacity-20"/>
                                <span>Chưa có lịch sử nhập hàng nào.</span>
                            </td></tr>
                        )}
                        {isLoading && (
                             <tr><td colSpan="6" className="p-10 text-center text-blue-500">Đang tải dữ liệu...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {viewingOrder && <PurchaseOrderDetailModal orderIdentifier={viewingOrder} onClose={() => setViewingOrder(null)} />}
        </div>
    );
};
// --- COMPONENT CON: PHÂN TÍCH CƠ CẤU & CHẤT LƯỢNG (MỚI) ---
const CategoryStructureAnalysis = ({ data }) => {
    if (!data || data.length === 0) return <div className="p-12 text-center text-gray-400 border-2 border-dashed rounded-lg">Không có dữ liệu phân nhóm cho NCC này.</div>;

    // Chuẩn bị dữ liệu biểu đồ tròn
    const chartData = data.map(item => ({ name: item.category_name, value: item.net_revenue }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Cột 1: Biểu đồ tròn (Tỷ trọng nhập hàng) */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                <h4 className="font-bold text-gray-700 text-sm mb-4 w-full text-left border-b pb-2">Tỷ trọng Nhập hàng theo Nhóm</h4>
                <div className="w-full h-64">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(val) => formatPrice(val)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}/>
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '11px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cột 2: Bảng chi tiết chất lượng (Soi % Trả hàng) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                <div className="p-3 border-b bg-gray-50 font-bold text-gray-700 text-sm flex justify-between items-center">
                    <span>Chi tiết Chất lượng từng nhóm</span>
                    <span className="text-xs font-normal text-gray-500 italic">*Cảnh báo nếu trả lại {'>'} 5%</span>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="min-w-full text-sm">
                        <thead className="bg-white text-xs uppercase text-gray-500 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhóm Hàng</th>
                                <th className="px-4 py-3 text-right">Doanh Số</th>
                                <th className="px-4 py-3 text-center">% Trả Lại</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((cat, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-800">{cat.category_name}</td>
                                    <td className="px-4 py-3 text-right font-mono text-blue-600">{formatPrice(cat.net_revenue)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {/* Logic tô màu cảnh báo nếu tỷ lệ lỗi cao */}
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${cat.return_rate_percent > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {cat.return_rate_percent}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- MODAL CHÍNH ---
export const SupplierDetailModal = ({ supplierIdentifier, supplierName, onClose }) => {
    const [activeTab, setActiveTab] = useState('structure'); // Mặc định vào tab Phân tích
    const [supplierData, setSupplierData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch dữ liệu chi tiết NCC từ API mới
    useEffect(() => {
        if (!supplierIdentifier) return;
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(`/api/v2/supplier-analysis/${supplierIdentifier}`);
                setSupplierData(res.data);
            } catch (err) {
                console.error("Lỗi tải chi tiết NCC:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [supplierIdentifier]);

    const info = supplierData?.supplier || {};
    const categories = supplierData?.category_breakdown || [];

    return (
        <Modal 
            isOpen={!!supplierIdentifier} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600 border border-orange-200">
                        <Icon path="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375M9 17.25h6.375" className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 leading-none">{info.ten_cong_ty_khach_hang || supplierName}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-normal mt-1">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono border border-gray-300">CODE: {supplierIdentifier}</span>
                            {info.dien_thoai_1 && <span className="flex items-center gap-1"><Icon path="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" className="w-3 h-3"/> {info.dien_thoai_1}</span>}
                        </div>
                    </div>
                </div>
            }
            maxWidthClass="max-w-6xl"
        >
            <div className="p-6 bg-gray-50 min-h-[500px] flex flex-col">
                {/* THANH TAB NAVIGATION */}
                <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200 mb-6 w-fit shadow-sm">
                    <button 
                        onClick={() => setActiveTab('structure')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'structure' ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <span>📊</span> Cơ cấu & Chất lượng
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <span>📦</span> Lịch sử Nhập hàng
                    </button>
                </div>

                {/* NỘI DUNG CHÍNH */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <svg className="animate-spin h-8 w-8 text-orange-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Đang phân tích dữ liệu NCC...</span>
                        </div>
                    ) : (
                        activeTab === 'structure' ? (
                            <CategoryStructureAnalysis data={categories} />
                        ) : (
                            <PurchaseHistoryList supplierCode={supplierIdentifier} />
                        )
                    )}
                </div>
            </div>
        </Modal>
    );
};
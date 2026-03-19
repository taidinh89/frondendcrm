import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Modal, Button, Icon } from '../ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';
import { PurchaseOrderDetailModal } from '../modals/PurchaseOrderDetailModal.jsx';
import { ProductDetailModal } from '../modals/ProductDetailModal.jsx';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// --- COMPONENT CON: LỊCH SỬ NHẬP HÀNG ---
const PurchaseHistoryList = ({ supplierCode }) => {
    const { data: orders, isLoading } = useV2Paginator('/api/v2/purchase-orders', { ma_khncc: supplierCode, per_page: 10 });
    const [viewingOrder, setViewingOrder] = useState(null);

    const getStatusStyle = (status) => {
        if (!status) return 'bg-gray-100 text-gray-600';
        const s = status.toLowerCase();
        if (s.includes('hoàn thành') || s.includes('đã nhập')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('hủy')) return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-orange-50 text-orange-700 border-orange-100';
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-sm uppercase">Lịch sử nhập hàng</div>
            <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 text-left w-28">Ngày</th>
                            <th className="px-4 py-3 text-left w-32">Số Phiếu</th>
                            <th className="px-4 py-3 text-left">Trạng Thái</th>
                            <th className="px-4 py-3 text-right">Tổng Tiền</th>
                            <th className="px-4 py-3 text-center w-24">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic-row-hover">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => setViewingOrder(order.id)}>
                                <td className="px-4 py-3 text-gray-600 font-medium">{formatDate(order.ngay || order.created_at)}</td>
                                <td className="px-4 py-3">
                                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {order.so_phieu}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[11px] font-bold border uppercase tracking-wider ${getStatusStyle(order.hien_trang)}`}>
                                        {order.hien_trang || 'Mới'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-black text-gray-800 text-base">{formatPrice(order.tong_cong || order.total_amount || 0)}</td>
                                <td className="px-4 py-3 text-center">
                                    <Icon path="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" className="w-5 h-5 text-blue-500 mx-auto group-hover:scale-110 transition-transform" />
                                </td>
                            </tr>
                        ))}
                        {!isLoading && orders.length === 0 && (
                            <tr><td colSpan="5" className="p-20 text-center text-gray-400 italic">Chưa có lịch sử nhập hàng.</td></tr>
                        )}
                        {isLoading && (
                            <tr><td colSpan="5" className="p-10 text-center text-blue-500">Đang tải...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {viewingOrder && <PurchaseOrderDetailModal orderIdentifier={viewingOrder} onClose={() => setViewingOrder(null)} />}
        </div>
    );
};

// --- COMPONENT CON: DANH SÁCH CẦN NHẬP ---
const RestockItemList = ({ data, onProductClick, days = 90 }) => {
    if (!data || data.length === 0) return (
        <div className="p-20 text-center text-gray-400 border-2 border-dashed rounded-xl bg-white flex flex-col items-center">
            <Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-12 h-12 mb-4 text-green-400 opacity-50" />
            <p className="font-bold text-slate-600">Tuyệt vời! Nhà cung cấp này hiện chưa có mã nào cần nhập gấp.</p>
            <p className="text-sm">Mọi sản phẩm vẫn đảm bảo tồn kho an toàn cho 30 ngày tới.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b bg-rose-50/30 flex justify-between items-center">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                    <span className="text-rose-500">🔥</span> Sản phẩm gợi ý nhập hàng
                </h4>
                <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{data.length} Mã hàng</span>
            </div>
            <div className="overflow-auto flex-1">
                <table className="min-w-full text-sm">
                    <thead className="bg-white text-xs font-bold uppercase text-slate-400 border-b sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-left">Sản Phẩm</th>
                            <th className="px-6 py-4 text-right">Tồn Kho</th>
                            <th className="px-6 py-4 text-right truncate">Bán {days}N</th>
                            <th className="px-6 py-4 text-right">Doanh Thu</th>
                            <th className="px-6 py-4 text-right text-rose-600">Gợi ý Nhập</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((item, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div onClick={() => onProductClick(item.product_code)} className="flex flex-col cursor-pointer group-hover:translate-x-1 transition-transform">
                                        <span className="font-bold text-slate-800 uppercase tracking-tight group-hover:text-blue-600">{item.product_name}</span>
                                        <code className="text-xs text-slate-400 font-mono tracking-widest mt-0.5">{item.product_code}</code>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-600">{formatPrice(item.stock_quantity)}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600">{formatPrice(item.sold_period)}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatPrice(item.sold_value)}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-base font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                                        {formatPrice(item.suggested_reorder)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
                            <Tooltip formatter={(val) => formatPrice(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
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

// --- COMPONENT CON: THÔNG TIN CHI TIẾT NCC (MỚI) ---
const SupplierInfoTab = ({ info, extra }) => {
    const details = [
        { label: 'Tên Công ty', value: info.ten_cong_ty_khach_hang, icon: 'office-building' },
        { label: 'Mã số thuế', value: extra.tax_code, icon: 'identification' },
        { label: 'Địa chỉ', value: extra.address, icon: 'location-marker' },
        { label: 'Email', value: extra.email, icon: 'mail' },
        { label: 'Cá nhân liên hệ / Giám đốc', value: extra.contact_person, icon: 'user' },
        { label: 'Số điện thoại 1', value: info.dien_thoai_1, icon: 'phone' },
        { label: 'Số điện thoại 2', value: extra.phone_2, icon: 'phone' },
        { label: 'Zalo', value: extra.zalo, icon: 'chat-alt' },
        { label: 'Ghi chú', value: extra.note, icon: 'document-text', fullWidth: true },
    ].filter(item => item.value);

    return (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[500px]">
            <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
                <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6 text-blue-500" />
                Hồ sơ Nhà cung cấp
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {details.map((item, idx) => (
                    <div key={idx} className={`flex flex-col gap-1 ${item.fullWidth ? 'md:col-span-2 bg-slate-50 p-4 rounded-lg' : ''}`}>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                        <span className={`text-slate-700 font-semibold ${item.fullWidth ? 'whitespace-pre-wrap' : ''}`}>
                            {item.value || '---'}
                        </span>
                    </div>
                ))}
            </div>
            {details.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">Không có thông tin chi tiết được ghi nhận.</div>
            )}
        </div>
    );
};

// --- MODAL CHÍNH ---
export const SupplierDetailModal = ({ supplierIdentifier, supplierName, days = 90, onClose }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('structure'); // Mặc định vào tab Phân tích
    const [supplierData, setSupplierData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingProductId, setViewingProductId] = useState(null);

    // Fetch dữ liệu chi tiết NCC từ API mới
    useEffect(() => {
        if (!supplierIdentifier) return;
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(`/api/v2/supplier-analysis/${supplierIdentifier}?days=${days}`);
                setSupplierData(res.data);

                // Mặc định chuyển sang tab 'restock' nếu có hàng cần nhập
                if (res.data?.restock_items?.length > 0) {
                    setActiveTab('restock');
                }
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
                        <Icon path="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375M9 17.25h6.375" className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 leading-none">{info.ten_cong_ty_khach_hang || supplierName}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-normal mt-1">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono border border-gray-300">CODE: {supplierIdentifier}</span>
                            {info.current_debt > 0 && (
                                <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-xs font-black border border-rose-200">
                                    NỢ: {formatPrice(info.current_debt)} VNĐ
                                </span>
                            )}
                            {info.dien_thoai_1 && <span className="flex items-center gap-1"><Icon path="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" className="w-3 h-3" /> {info.dien_thoai_1}</span>}
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate(`/partner-analysis?supplier_code=${supplierIdentifier}`);
                                }}
                                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors ml-2 shadow-sm"
                            >
                                <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-3 h-3" />
                                Phân tích chuyên sâu Trang Độc Lập
                            </button>
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
                        onClick={() => setActiveTab('restock')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-tight rounded-md transition-all ${activeTab === 'restock' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>🔥</span> Cần Nhập
                        {supplierData?.restock_items?.length > 0 && <span className="ml-1 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{supplierData.restock_items.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('structure')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-tight rounded-md transition-all ${activeTab === 'structure' ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>📊</span> Cơ cấu & Chất lượng
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-tight rounded-md transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>📦</span> Lịch sử Nhập hàng
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-tight rounded-md transition-all ${activeTab === 'info' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span>ℹ️</span> Thông tin NCC
                    </button>
                </div>

                {/* NỘI DUNG CHÍNH */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <svg className="animate-spin h-8 w-8 text-orange-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Đang phân tích dữ liệu NCC...</span>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {activeTab === 'restock' && <RestockItemList days={days} data={supplierData?.restock_items} onProductClick={(id) => setViewingProductId(id)} />}
                            {activeTab === 'structure' && <CategoryStructureAnalysis data={categories} />}
                            {activeTab === 'history' && <PurchaseHistoryList supplierCode={supplierIdentifier} />}
                            {activeTab === 'info' && <SupplierInfoTab info={info} extra={info.extra_info || {}} />}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal con cho drill-down sản phẩm */}
            {viewingProductId && (
                <ProductDetailModal
                    productIdentifier={viewingProductId}
                    onClose={() => setViewingProductId(null)}
                />
            )}
        </Modal>
    );
};

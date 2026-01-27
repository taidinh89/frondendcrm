import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Modal, Button, Icon } from './ui.jsx';
import { useV2Paginator } from '../hooks/useV2Paginator.js';

// Import modal chi tiết đơn hàng (để soi đơn khi cần)
import { SalesOrderDetailModal } from './SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from './PurchaseOrderDetailModal.jsx';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';

// --- COMPONENT CON: LIST ĐƠN HÀNG (Tái sử dụng logic cũ của bạn) ---
const CustomerOrdersList = ({ apiEndpoint, customerCode, title }) => {
    const { data: orders, isLoading } = useV2Paginator(apiEndpoint, { ma_khncc: customerCode, per_page: 5 });
    const [viewingOrder, setViewingOrder] = useState(null);
    const DetailModal = apiEndpoint.includes('sales') ? SalesOrderDetailModal : PurchaseOrderDetailModal;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-700 text-sm uppercase">{title}</h4>
                <span className="text-xs text-gray-500">5 đơn gần nhất</span>
            </div>
            <div className="overflow-auto flex-1">
                <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-blue-50">
                                <td className="p-3 text-gray-600">{formatDate(order.ngay)}</td>
                                <td className="p-3 font-mono font-medium text-blue-600">{order.so_phieu}</td>
                                <td className="p-3 text-right font-medium text-gray-800">
                                    {formatPrice(order.tong_tien_truoc_thue || order.total_amount)}
                                </td>
                                <td className="p-3 text-right">
                                    <button className="text-gray-400 hover:text-blue-600" onClick={() => setViewingOrder(order.id)}>
                                        <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-4 h-4"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && orders.length === 0 && (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-400 italic">Chưa có dữ liệu</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {viewingOrder && <DetailModal orderIdentifier={viewingOrder} onClose={() => setViewingOrder(null)} />}
        </div>
    );
};

// --- COMPONENT CHÍNH: MODAL PHÂN TÍCH ---
export const CustomerAnalysisModal = ({ customerIdentifier, onClose }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch dữ liệu phân tích sâu
    useEffect(() => {
        if (!customerIdentifier) return;
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`/api/v2/customer-analysis/${customerIdentifier}`);
                setData(response.data);
            } catch (err) {
                console.error("Lỗi tải chi tiết:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [customerIdentifier]);

    if (isLoading) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Đang tải hồ sơ 360..." maxWidthClass="max-w-6xl">
                <div className="h-96 flex items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            </Modal>
        );
    }

    if (!data) return null;

    const { profile, stats, chart_history, top_products } = data;

    return (
        <Modal 
            isOpen={!!customerIdentifier} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" className="w-6 h-6"/></div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 leading-none">{profile.ten_cong_ty_khach_hang}</h3>
                        <span className="text-sm text-gray-500 font-normal">Mã: {profile.ma_khncc}</span>
                    </div>
                </div>
            }
            maxWidthClass="max-w-7xl"
        >
            <div className="p-6 bg-gray-50 min-h-[500px] space-y-6">
                
                {/* 1. THẺ KPI (STATS CARDS) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Tổng chi tiêu (LTV)</span>
                        <div className="text-2xl font-bold text-blue-700 mt-1">{formatPrice(stats.lifetime_value)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Tổng đơn hàng</span>
                        <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total_orders}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Trạng thái</span>
                        <div className={`text-lg font-bold mt-1 ${stats.days_inactive <= 30 ? 'text-green-600' : 'text-red-500'}`}>
                            {stats.days_inactive <= 30 ? '🔥 Đang mua' : `💤 ${stats.days_inactive} ngày chưa mua`}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Liên hệ</span>
                        <div className="text-sm font-medium text-gray-800 mt-1 truncate" title={profile.dia_chi_cong_ty_1}>
                            📞 {profile.dien_thoai_1 || '---'}
                        </div>
                    </div>
                </div>

                {/* 2. KHU VỰC PHÂN TÍCH (BIỂU ĐỒ & TOP SẢN PHẨM) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cột trái: Biểu đồ xu hướng */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-xl border shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Icon path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" className="w-5 h-5 text-blue-500 mr-2"/>
                            Xu hướng mua sắm (12 tháng gần nhất)
                        </h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chart_history}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tick={{fontSize: 12}} />
                                    <YAxis hide />
                                    <Tooltip formatter={(val) => formatPrice(val)} contentStyle={{borderRadius: '8px'}} />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cột phải: Top Sản phẩm */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Icon path="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" className="w-5 h-5 text-yellow-500 mr-2"/>
                            Top Sản phẩm ưa thích
                        </h4>
                        <div className="space-y-4">
                            {top_products.map((prod, idx) => (
                                <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0">
                                    <div className="flex-1 pr-2">
                                        <div className="text-sm font-medium text-gray-800 line-clamp-1" title={prod.name}>{prod.name}</div>
                                        <div className="text-xs text-gray-400">{prod.code}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-blue-600">{prod.qty}</div>
                                        <div className="text-[10px] text-gray-400">cái</div>
                                    </div>
                                </div>
                            ))}
                            {top_products.length === 0 && <div className="text-center text-gray-400 italic text-sm">Chưa có dữ liệu</div>}
                        </div>
                    </div>
                </div>

                {/* 3. KHU VỰC CHI TIẾT ĐƠN HÀNG (INTEGRATION) */}
                <h4 className="font-bold text-gray-700 text-lg mt-6 mb-3">Lịch sử giao dịch gần nhất</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CustomerOrdersList 
                        title="Đơn Bán Hàng" 
                        apiEndpoint="/api/v2/sales-orders" 
                        customerCode={profile.ma_khncc} 
                    />
                    <CustomerOrdersList 
                        title="Đơn Mua Hàng" 
                        apiEndpoint="/api/v2/purchase-orders" 
                        customerCode={profile.ma_khncc} 
                    />
                </div>

            </div>
        </Modal>
    );
};
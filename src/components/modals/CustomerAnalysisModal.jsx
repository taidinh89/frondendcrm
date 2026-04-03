import React, { useState, useEffect, Fragment, useRef } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Modal, Button, Icon } from '../ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';

// Import modal chi tiết đơn hàng (để soi đơn khi cần)
import { SalesOrderDetailModal } from '../modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../modals/PurchaseOrderDetailModal.jsx';
import { ProductDetailModal } from '../modals/ProductDetailModal.jsx';
import { SupplierDetailModal } from '../modals/SupplierDetailModal.jsx';

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
                                <td className="p-3">
                                    <span className="font-mono font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => setViewingOrder(order.id)}>{order.so_phieu}</span>
                                </td>
                                <td className="p-3 text-right font-medium text-gray-800">
                                    {formatPrice(order.tong_tien_truoc_thue || order.total_amount)}
                                </td>
                                <td className="p-3 text-right">
                                    <button className="text-gray-400 hover:text-blue-600" onClick={() => setViewingOrder(order.id)}>
                                        <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-4 h-4" />
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

// --- COMPONENT CON: BIỂU ĐỒ XU HƯỚNG MUA (MỚI) ---
const PurchaseTrendCharts = ({ data }) => {
    if (!data || data.length === 0) return <div className="p-20 text-center text-gray-400 border-2 border-dashed rounded-xl">Chưa có đủ dữ liệu giao dịch trong 12 tháng qua để vẽ xu hướng.</div>;

    return (
        <div className="space-y-6 overflow-auto max-h-[600px] p-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
                    <span className="text-blue-500">📈</span> Biến động doanh thu (12 Tháng)
                </h4>
                <div className="h-72 w-full">
                    <ResponsiveContainer>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={v => (v/1e6).toFixed(0) + 'M'} />
                            <Tooltip formatter={(v) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
                    <span className="text-emerald-500">📊</span> Tần suất mua hàng (Số đơn/Tháng)
                </h4>
                <div className="h-48 w-full">
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="order_count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CON: CHI TIẾT CÔNG NỢ & RỦI RO ---
const DebtRiskTab = ({ debt, evidence, onViewOrder }) => {
    return (
        <div className="flex flex-col h-full gap-6 overflow-auto">
            {/* Header KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border-l-4 border-rose-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Công nợ phải thu</div>
                    <div className="text-2xl font-black text-rose-600 tracking-tight">{formatPrice(debt)} VNĐ</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-amber-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đơn hàng chưa thu hết</div>
                    <div className="text-2xl font-black text-amber-600 tracking-tight">{evidence.length} Phiếu</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tuổi nợ TB</div>
                    <div className="text-2xl font-black text-blue-600 tracking-tight">
                        {evidence.length > 0 ? Math.round(evidence.reduce((a,b)=>a+b.days_old,0)/evidence.length) : 0} Ngày
                    </div>
                </div>
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                        <span className="text-rose-500">📌</span> Đối soát hóa đơn nợ
                    </h4>
                </div>
                <table className="min-w-full text-sm">
                    <thead className="bg-white text-xs font-bold uppercase text-slate-400 border-b sticky top-0">
                        <tr>
                            <th className="px-6 py-4 text-left">Ngày</th>
                            <th className="px-6 py-4 text-left">Số Phiếu</th>
                            <th className="px-6 py-4 text-right">Giá trị đơn</th>
                            <th className="px-6 py-4 text-right text-rose-600">Còn nợ</th>
                            <th className="px-6 py-4 text-center">Tuổi nợ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {evidence.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500">{formatDate(item.ngay)}</td>
                                <td className="px-6 py-4">
                                    <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline cursor-pointer" onClick={() => onViewOrder && onViewOrder(item.id)}>{item.so_phieu}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-400">{formatPrice(item.tong)}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-black text-rose-600">{formatPrice(item.allocated)}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black border ${item.days_old > 30 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {item.days_old} Ngày
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {evidence.length === 0 && (
                            <tr><td colSpan="5" className="p-20 text-center text-slate-300 italic">Hiện khách hàng không có nợ quá hạn.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH: MODAL PHÂN TÍCH ---
export const CustomerAnalysisModal = ({ customerIdentifier, onClose }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    
    // TABS CONFIG FOR SWIPING
    const TABS_ORDER = ['summary', 'info', 'charts', 'debt', 'history'];
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);

    const handleTouchStart = (e) => { touchStartX.current = e.targetTouches[0].clientX; };
    const handleTouchMove = (e) => { touchEndX.current = e.targetTouches[0].clientX; };
    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diff = touchStartX.current - touchEndX.current;
        const curIdx = TABS_ORDER.indexOf(activeTab);
        
        if (Math.abs(diff) > 70) { // Threshold for swipe
            if (diff > 0 && curIdx < TABS_ORDER.length - 1) setActiveTab(TABS_ORDER[curIdx + 1]);
            else if (diff < 0 && curIdx > 0) setActiveTab(TABS_ORDER[curIdx - 1]);
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    // States for modals
    const [viewingProduct, setViewingProduct] = useState(null);
    const [viewingDebtOrder, setViewingDebtOrder] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);

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
    
    // Đảm bảo bóc tách dữ liệu an toàn với default values (TRÁNH LỖI Object.values Ở VENDOR)
    const profile = data.profile || {};
    const stats = data.stats || { current_debt: 0, lifetime_value: 0, total_orders: 0, days_inactive: 0 };
    const chart_history = Array.isArray(data.chart_history) ? data.chart_history.map(c => ({...c, total_revenue: parseFloat(c.total_revenue || 0)})) : [];
    const top_products = Array.isArray(data.top_products) ? data.top_products : [];
    const debt_evidence = Array.isArray(data.debt_evidence) ? data.debt_evidence : [];

    return (
        <Modal
            isOpen={!!customerIdentifier}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{profile.ten_cong_ty_khach_hang}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">CODE: {profile.ma_khncc}</span>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{profile.nhom_chuc_nang_khncc}</span>
                        </div>
                    </div>
                </div>
            }
            maxWidthClass="max-w-7xl"
        >
            <div className="bg-slate-50 h-[85vh] md:h-[80vh] flex flex-col overflow-hidden">
                
                {/* Header KPI Quick View - Responsive Grid */}
                <div className="p-4 md:p-6 border-b border-slate-200 bg-white shadow-sm shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Mobile Optimized Tabs Scrollable */}
                        <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0 no-scrollbar">
                            <button onClick={() => setActiveTab('summary')} className={`flex items-center gap-2 px-4 py-2 mod-tab ${activeTab === 'summary' ? 'active-tab bg-blue-600 text-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}>🏟️ <span className="whitespace-nowrap uppercase tracking-widest text-[10px] font-black">Tổng quan</span></button>
                            <button onClick={() => setActiveTab('info')} className={`flex items-center gap-2 px-4 py-2 mod-tab ${activeTab === 'info' ? 'active-tab bg-indigo-600 text-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}>📄 <span className="whitespace-nowrap uppercase tracking-widest text-[10px] font-black">Hồ sơ</span></button>
                            <button onClick={() => setActiveTab('charts')} className={`flex items-center gap-2 px-4 py-2 mod-tab ${activeTab === 'charts' ? 'active-tab bg-blue-600 text-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}>📈 <span className="whitespace-nowrap uppercase tracking-widest text-[10px] font-black">Biểu đồ</span></button>
                            <button onClick={() => setActiveTab('debt')} className={`flex items-center gap-2 px-4 py-2 mod-tab ${activeTab === 'debt' ? 'active-tab bg-rose-500 text-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}>💸 <span className="whitespace-nowrap uppercase tracking-widest text-[10px] font-black">Công nợ</span></button>
                            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 py-2 mod-tab ${activeTab === 'history' ? 'active-tab bg-slate-800 text-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}>📑 <span className="whitespace-nowrap uppercase tracking-widest text-[10px] font-black">Lịch sử</span></button>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-2xl border border-slate-100 md:border-0">
                            <div className="text-left md:text-right">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Công nợ hiện tại</div>
                                <div className="text-lg md:text-xl font-black text-rose-600 leading-none">{formatPrice(stats.current_debt)}<span className="text-[10px] ml-0.5">đ</span></div>
                            </div>
                            <button onClick={() => setViewingSupplier(customerIdentifier)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95 whitespace-nowrap">
                                📊 <span className="hidden sm:inline">Phân tích như nhà cung cấp</span>
                                <span className="sm:hidden">NCC</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div 
                    className="flex-1 overflow-auto p-4 md:p-6 min-h-0 scrollbar-thin"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <style>{`
                        .mod-tab { @apply rounded-xl transition-all duration-200 border border-transparent shadow-sm; }
                        .active-tab { @apply shadow-lg border-white/20; }
                    `}</style>
                    {activeTab === 'summary' && (
                        <div className="flex flex-col gap-6 h-full p-1 pb-10 md:pb-0">
                            {/* KPI Tiles - Responsive Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-3xl border shadow-sm border-l-8 border-blue-500 hover:scale-[1.02] transition-transform duration-200">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Lifetime Value</div>
                                    <div className="text-2xl font-black text-blue-700 tracking-tighter">{formatPrice(stats.lifetime_value)} <span className="text-[10px] text-slate-400">đ</span></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border shadow-sm border-l-8 border-emerald-500 hover:scale-[1.02] transition-transform duration-200">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng Đơn Hàng</div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tighter">{stats.total_orders} <span className="text-xs text-slate-400 font-bold">Phiếu</span></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border shadow-sm border-l-8 border-amber-500 hover:scale-[1.02] transition-transform duration-200">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tình trạng mua</div>
                                    <div className={`text-xl font-black mt-1 ${stats.days_inactive <= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {stats.days_inactive <= 30 ? 'Hoạt động mạnh' : `${stats.days_inactive} ngày chưa về`}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border shadow-sm border-l-8 border-indigo-500 hover:scale-[1.02] transition-transform duration-200">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Quản lý bởi</div>
                                    <div className="text-lg font-black text-indigo-600 leading-tight truncate">{profile.nhan_vien_phu_trach || 'Chưa gán'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Top Products */}
                            <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
                                <h4 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2"><span>⭐</span> Sản phẩm ưa thích nhất</h4>
                                <div className="space-y-4">
                                    {top_products.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0 cursor-pointer hover:bg-blue-50/50 rounded-lg -mx-2 px-2 pt-2 transition-colors group" onClick={() => setViewingProduct(p.code || p.ma_mat_hang)}>
                                            <div className="flex-1 pr-4">
                                                <div className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:text-blue-700 transition-colors">{p.name || p.ten_mat_hang}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">{p.code || p.ma_mat_hang}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-blue-600">{parseInt(p.qty || p.total_qty, 10)}</div>
                                                <div className="text-[10px] font-bold text-slate-400">Lượt lấy</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chart Preview */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
                                <h4 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2"><span>📉</span> Lịch sử doanh thu (Hồi quy)</h4>
                                <div className="h-64">
                                    {chart_history && chart_history.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chart_history}>
                                                <defs><linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="month" axisLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                <YAxis axisLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={v => (v/1e6).toFixed(0) + 'M'} />
                                                <Tooltip formatter={(v) => formatPrice(v)} />
                                                <Area type="monotone" dataKey="total_revenue" stroke="#3b82f6" fill="url(#cRev)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                                            Chưa có dữ liệu giao dịch 12 tháng
                                        </div>
                                    )}
                                </div>
                            </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'info' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-auto h-full">
                            <h4 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
                                <span className="text-indigo-500">📄</span> Chi tiết hồ sơ doanh nghiệp
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Tên khách hàng / Đơn vị</span>
                                    <div className="font-black text-slate-800 text-lg uppercase">{profile.ten_cong_ty_khach_hang}</div>
                                </div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Mã tham chiếu</span><div className="font-bold text-slate-800">{profile.ma_khncc}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Mã số thuế</span><div className="font-bold text-slate-800 font-mono">{profile.ma_so_thue || 'Chưa cập nhật'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Phân vị nhóm KH</span><div className="font-bold text-slate-800 text-indigo-600">{profile.nhom_chuc_nang_khncc || 'Chưa phân nhóm'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Khu vực địa lý</span><div className="font-bold text-slate-800">{profile.nhom_dia_ly || 'Chưa biểu vị'}</div></div>
                                <div className="border-b border-slate-100 pb-3 md:col-span-2"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Địa chỉ ĐKKD</span><div className="font-bold text-slate-800 leading-relaxed">{profile.dia_chi_cong_ty_1 || 'Chưa cập nhật'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Điện thoại 1</span><div className="font-bold text-slate-800">{profile.dien_thoai_1 || 'Chưa cập nhật'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Điện thoại 2</span><div className="font-bold text-slate-800">{profile.dien_thoai_2 || 'Chưa cập nhật'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Người đại diện (Giám đốc)</span><div className="font-bold text-slate-800">{profile.ten_kh_lien_he_giam_doc || 'Chưa cập nhật'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Nhân sự phụ trách (AM)</span><div className="font-black text-blue-600">{profile.nhan_vien_phu_trach || 'Chưa gán'}</div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Ngày lập User</span><div className="font-bold text-slate-800">{profile.ngay_tao_dau_tien || 'N/A'} <span className="text-xs font-normal text-slate-400 ml-1">bởi {profile.nguoi_tao_dau_tien}</span></div></div>
                                <div className="border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Ngày cập nhật gần nhất</span><div className="font-bold text-slate-800">{profile.ngay_sua_cuoi_cung || 'N/A'}</div></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'charts' && <PurchaseTrendCharts data={chart_history} />}
                    {activeTab === 'debt' && <DebtRiskTab debt={stats.current_debt} evidence={debt_evidence || []} onViewOrder={setViewingDebtOrder} />}
                    {activeTab === 'history' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-auto p-1">
                            <CustomerOrdersList title="Đơn Bán Hàng" apiEndpoint="/api/v2/sales-orders" customerCode={profile.ma_khncc} />
                            <CustomerOrdersList title="Đơn Trả Hàng" apiEndpoint="/api/v2/purchase-orders" customerCode={profile.ma_khncc} />
                        </div>
                    )}
                </div>
            </div>

            {viewingProduct && <ProductDetailModal productIdentifier={viewingProduct} onClose={() => setViewingProduct(null)} />}
            {viewingDebtOrder && <SalesOrderDetailModal orderIdentifier={viewingDebtOrder} onClose={() => setViewingDebtOrder(null)} />}
            {viewingSupplier && <SupplierDetailModal supplierIdentifier={viewingSupplier} onClose={() => setViewingSupplier(null)} />}
        </Modal>
    );
};

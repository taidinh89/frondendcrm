import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { Modal, Button, Icon } from '../ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';
import { PurchaseOrderDetailModal } from '../modals/PurchaseOrderDetailModal.jsx';
import { ProductDetailModal } from '../modals/ProductDetailModal.jsx';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
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
    const [showRaw, setShowRaw] = useState(false);

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
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[500px] relative">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6 text-blue-500" />
                    Hồ sơ Nhà cung cấp
                </h4>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${showRaw ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                >
                    {showRaw ? 'Ẩn Raw Data' : 'Xem Raw Data'}
                </button>
            </div>

            {showRaw ? (
                <div className="bg-slate-900 rounded-xl p-4 overflow-auto">
                    <pre className="text-green-400 text-[10px] font-mono leading-relaxed">
                        {JSON.stringify({ ...info, extra_info: extra }, null, 4)}
                    </pre>
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
};

// --- COMPONENT CON: TẤT CẢ SẢN PHẨM (MỚI) ---
const AllSupplierProductsList = ({ data, onProductClick, days = 90 }) => {
    const [search, setSearch] = useState('');

    const filtered = data.filter(item =>
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.product_code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                    <span className="text-blue-500">📦</span> Danh mục sản phẩm đã nhập
                </h4>
                <div className="relative w-full md:w-72">
                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm tên hoặc mã hàng..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-auto flex-1">
                <table className="min-w-full text-sm">
                    <thead className="bg-white text-xs font-bold uppercase text-slate-400 border-b sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-left">Sản Phẩm</th>
                            <th className="px-6 py-4 text-right">Tồn Kho</th>
                            <th className="px-6 py-4 text-right">Bán {days}N</th>
                            <th className="px-6 py-4 text-right">Doanh Thu</th>
                            <th className="px-6 py-4 text-right">Gợi ý</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
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
                                    {item.suggested_reorder > 0 ? (
                                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 italic">
                                            + {formatPrice(item.suggested_reorder)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 uppercase font-black">Đủ tồn</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="5" className="p-20 text-center text-slate-400 italic">Không tìm thấy sản phẩm nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENT CON: BIỂU ĐỒ XU HƯỚNG GIAO DỊCH (MỚI) ---
const PurchaseTrendCharts = ({ data }) => {
    if (!data || data.length === 0) return <div className="p-20 text-center text-gray-400 border-2 border-dashed rounded-xl">Chưa có đủ dữ liệu giao dịch trong 12 tháng qua để vẽ xu hướng.</div>;

    return (
        <div className="space-y-6 overflow-auto max-h-[600px] p-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm font-inter">
                <h4 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
                    <span className="text-blue-500">📈</span> Biến động giá trị giao dịch (12 Tháng)
                </h4>
                <div className="h-72 w-full">
                    <ResponsiveContainer>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPur" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={v => (v/1e6).toFixed(0) + 'M'} />
                            <Tooltip formatter={(v) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" name="Nhập hàng" dataKey="total_purchase" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPur)" />
                            <Area type="monotone" name="Bán hàng" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
                    <span className="text-emerald-500">📊</span> Tần suất giao dịch (Số Đơn/Tháng)
                </h4>
                <div className="h-48 w-full">
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar name="Đơn nhập" dataKey="purchase_count" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar name="Đơn bán" dataKey="order_count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CON: CHI TIẾT CÔNG NỢ & RỦI RO (MỚI) ---
const DebtRiskTab = ({ debt, evidence }) => {
    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border-l-4 border-rose-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng Nợ Hiện Tại</div>
                    <div className="text-2xl font-black text-rose-600 tracking-tight">{formatPrice(debt)} VNĐ</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-amber-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hóa đơn còn nợ</div>
                    <div className="text-2xl font-black text-amber-600 tracking-tight">{evidence.length} Phiếu</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-500 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Độ trễ TB</div>
                    <div className="text-2xl font-black text-blue-600 tracking-tight">
                        {evidence.length > 0 ? Math.round(evidence.reduce((a,b)=>a+b.days_old,0)/evidence.length) : 0} Ngày
                    </div>
                </div>
            </div>

            {/* Chi tiết từng đơn */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                        <span className="text-rose-500">📌</span> Đối soát hóa đơn chưa thanh toán
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold italic italic-text">*Lưu ý: Dữ liệu dựa trên nợ thực tế so với hóa đơn gần nhất</span>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="min-w-full text-sm">
                        <thead className="bg-white text-xs font-bold uppercase text-slate-400 border-b sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left">Ngày đơn</th>
                                <th className="px-6 py-4 text-left">Số Phiếu</th>
                                <th className="px-6 py-4 text-right">Giá trị đơn</th>
                                <th className="px-6 py-4 text-right text-rose-600">Còn nợ</th>
                                <th className="px-6 py-4 text-center">Tuổi nợ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {evidence.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(item.ngay)}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {item.so_phieu}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-400">{formatPrice(item.tong)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-black text-rose-600 text-base">{formatPrice(item.allocated)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${item.days_old > 30 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {item.days_old} Ngày
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {evidence.length === 0 && (
                                <tr><td colSpan="5" className="p-20 text-center text-slate-300 italic">Hiện không có dư nợ với nhà cung cấp này.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export const SupplierDetailModal = ({ supplierIdentifier, supplierName, days = 90, onClose }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('gs_pref_supplier_detail_tab') || 'structure');
    
    // Lưu tab hiện tại vào localStorage (với prefix 'gs_pref_' để dễ quản lý/xóa sạch khi logout)
    useEffect(() => {
        localStorage.setItem('gs_pref_supplier_detail_tab', activeTab);
    }, [activeTab]);

    const [supplierData, setSupplierData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingProductId, setViewingProductId] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: moment().subtract(90, 'days').format('YYYY-MM-DD'),
        end: moment().format('YYYY-MM-DD')
    });
    const [dateMode, setDateMode] = useState('90_days');

    const handleQuickDate = (mode) => {
        setDateMode(mode);
        let start = moment();
        let end = moment();
        switch(mode) {
            case '7_days': start = moment().subtract(7, 'days'); break;
            case '30_days': start = moment().subtract(30, 'days'); break;
            case '90_days': start = moment().subtract(90, 'days'); break;
            case '6_months': start = moment().subtract(6, 'months'); break;
            case 'this_month': start = moment().startOf('month'); end = moment().endOf('month'); break;
            case 'last_month': start = moment().subtract(1, 'month').startOf('month'); end = moment().subtract(1, 'month').endOf('month'); break;
            case 'this_quarter': start = moment().startOf('quarter'); end = moment().endOf('quarter'); break;
            case 'last_quarter': start = moment().subtract(1, 'quarter').startOf('quarter'); end = moment().subtract(1, 'quarter').endOf('quarter'); break;
            case 'this_year': start = moment().startOf('year'); end = moment().endOf('year'); break;
            case 'last_year': start = moment().subtract(1, 'year').startOf('year'); end = moment().subtract(1, 'year').endOf('year'); break;
            case 'all': start = moment('2020-01-01'); end = moment(); break;
            default: start = moment().subtract(90, 'days');
        }
        setDateRange({ start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') });
    };

    // Fetch dữ liệu chi tiết NCC từ API mới
    useEffect(() => {
        if (!supplierIdentifier && !supplierName) return;
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const code = (supplierIdentifier && supplierIdentifier !== 'null') ? supplierIdentifier : 'null';
                const res = await axios.get(`/api/v2/supplier-analysis/${code}`, {
                    params: { days, date_from: dateRange.start, date_to: dateRange.end, name: supplierName }
                });
                setSupplierData(res.data);

                // Chỉ tự động chuyển tab nếu là lần đầu mở modal (không có activeTab lưu trữ)
                if (!localStorage.getItem('gs_pref_supplier_detail_tab')) {
                    if (res.data?.restock_items?.length > 0) {
                        setActiveTab('restock');
                    } else if (res.data?.all_items?.length > 0) {
                        setActiveTab('products');
                    }
                }
            } catch (err) {
                console.error("Lỗi tải chi tiết NCC:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [supplierIdentifier, days, dateRange]);

    const info = supplierData?.supplier || {};
    const categories = supplierData?.category_breakdown || [];

    return (
        <Modal
            isOpen={!!supplierIdentifier || !!supplierName}
            onClose={onClose}
            title={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full pr-4">
                    {/* Trai: Thông tin NCC */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-full text-orange-600 border border-orange-200 shrink-0">
                            <Icon path="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375M9 17.25h6.375" className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-800 leading-tight truncate">{info.ten_cong_ty_khach_hang || supplierName}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-normal mt-0.5 whitespace-nowrap overflow-x-auto">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono border border-gray-300">CODE: {info.ma_khncc || supplierIdentifier || 'N/A'}</span>
                                {info.current_debt > 0 && (
                                    <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black border border-rose-200 uppercase">
                                        NỢ: {formatPrice(info.current_debt)}
                                    </span>
                                )}
                                {info.dien_thoai_1 && (
                                    <span className="flex items-center gap-1">
                                        <Icon path="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" className="w-3 h-3" />
                                        {info.dien_thoai_1}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Phải: Bộ lọc ngày (Đưa lên Header) */}
                    <div className="flex items-center gap-2 self-end md:self-auto ml-auto md:ml-0">
                        <div className="relative group">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
                            </div>
                            <select 
                                value={dateMode}
                                onChange={(e) => handleQuickDate(e.target.value)}
                                className="appearance-none bg-slate-50 hover:bg-white text-slate-600 pl-8 pr-7 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border border-slate-200 focus:ring-2 focus:ring-blue-500 shadow-sm w-[130px]"
                            >
                                <option value="30_days">30 Ngày qua</option>
                                <option value="7_days">7 Ngày qua</option>
                                <option value="90_days">90 Ngày qua</option>
                                <option value="6_months">6 Tháng qua</option>
                                <option value="this_month">Tháng này</option>
                                <option value="last_month">Tháng trước</option>
                                <option value="this_quarter">Quý này</option>
                                <option value="last_quarter">Quý trước</option>
                                <option value="this_year">Năm nay</option>
                                <option value="last_year">Năm ngoái</option>
                                <option value="all">Tất cả</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Icon path="M19.5 8.25l-7.5 7.5-7.5-7.5" className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                            <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 focus:outline-none w-24" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                            <span className="text-slate-300 font-bold shrink-0">→</span>
                            <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 focus:outline-none w-24" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                        </div>
                    </div>
                </div>
            }
            maxWidthClass="max-w-7xl"
        >
            <div className="p-0 bg-slate-50 h-[85vh] max-h-[90vh] flex flex-col overflow-hidden">
                {/* THANH TAB NAVIGATION - Full Width & Premium */}
                <div className="bg-white border-b px-6 py-2 flex items-center justify-between shrink-0 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex space-x-1">
                        {[
                            { id: 'restock', label: 'Cần Nhập', icon: '🔥', count: supplierData?.restock_items?.length, color: 'rose' },
                            { id: 'charts', label: 'Biểu đồ', icon: '📈', color: 'blue' },
                            { id: 'debt', label: 'Công nợ', icon: '💸', color: 'rose' },
                            { id: 'products', label: 'Sản phẩm', icon: '📦', color: 'indigo' },
                            { id: 'history', label: 'Đơn hàng', icon: '📑', color: 'slate' },
                            { id: 'structure', label: 'Phân tích', icon: '📊', color: 'orange' },
                            { id: 'info', label: 'Hồ sơ NCC', icon: 'ℹ️', color: 'indigo' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap 
                                    ${activeTab === tab.id 
                                        ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-200 scale-105 z-10` 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                            >
                                <span>{tab.icon}</span> 
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.count > 0 && <span className={`ml-1 ${activeTab === tab.id ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'} text-[9px] px-1.5 py-0.5 rounded-full shrink-0`}>{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            onClose();
                            navigate(`/partner-analysis?supplier_code=${supplierIdentifier}`);
                        }}
                        className="hidden md:flex bg-white text-blue-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm items-center gap-2 shrink-0"
                    >
                        <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-4 h-4" />
                        Trang Độc Lập
                    </button>
                </div>

                {/* NỘI DUNG CHÍNH - Thêm padding để thoáng hơn */}
                <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <svg className="animate-spin h-8 w-8 text-orange-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Đang phân tích dữ liệu NCC...</span>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {activeTab === 'restock' && <RestockItemList days={days} data={supplierData?.restock_items} onProductClick={(id) => setViewingProductId(id)} />}
                            {activeTab === 'charts' && <PurchaseTrendCharts data={supplierData?.purchase_trend} />}
                            {activeTab === 'debt' && <DebtRiskTab debt={info.current_debt} evidence={supplierData?.debt_evidence || []} />}
                            {activeTab === 'products' && <AllSupplierProductsList days={days} data={supplierData?.all_items || []} onProductClick={(id) => setViewingProductId(id)} />}
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

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Modal, Button, Icon } from '../ui.jsx';
import { SalesOrderDetailModal } from '../modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../modals/PurchaseOrderDetailModal.jsx';
import { ProductDetailModal } from '../modals/ProductDetailModal.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
const formatCompact = (val) => {
    if (!val) return '0';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'tr';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
};

const StatCard = ({ label, value, unit, color = 'blue', subValue }) => (
    <div className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black text-${color}-600 tracking-tighter`}>{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
        </div>
        {subValue && <p className="text-[10px] text-slate-400 mt-1 italic">{subValue}</p>}
    </div>
);

const CustomerOrdersList = ({ apiEndpoint, customerCode, dateRange, title }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(apiEndpoint, { 
                    params: { 
                        ma_khncc: customerCode,
                        date_from: dateRange.start,
                        date_to: dateRange.end,
                        per_page: 50 
                    } 
                });
                setOrders(res.data.data || []);
            } catch (err) {
                console.error("Lỗi fetch đơn:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [customerCode, apiEndpoint, dateRange]);

    const DetailModal = apiEndpoint.includes('sales') ? SalesOrderDetailModal : PurchaseOrderDetailModal;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-100 rounded-xl shadow-inner">
             <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
                <h4 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest">{title}</h4>
            </div>
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold animate-pulse uppercase">Đang tải lịch sử...</div>
                ) : orders.length > 0 ? (
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">Ngày</th>
                                <th className="px-4 py-3 text-left">Số Phiếu</th>
                                <th className="px-4 py-3 text-right">Tổng Tiền</th>
                                <th className="px-4 py-3 text-center">Xem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => setViewingOrder(order.id)}>
                                    <td className="px-4 py-3 text-slate-500">{formatDate(order.ngay)}</td>
                                    <td className="px-4 py-3 font-black text-indigo-600">{order.so_phieu}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-700">{formatPrice(order.tong_cong)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all mx-auto">
                                            <Icon name="external-link" className="w-3 h-3" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-20 text-center text-slate-300 italic">Trống</div>
                )}
            </div>
            {viewingOrder && <DetailModal orderIdentifier={viewingOrder} onClose={() => setViewingOrder(null)} />}
        </div>
    );
};

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
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={v => (v/1e6).toFixed(0) + 'M'} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="order_count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const DebtRiskTab = ({ debt, evidence, onOrderClick }) => {
    return (
        <div className="flex flex-col h-full gap-6 overflow-auto">
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
                            <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onOrderClick(item.id || item.so_phieu)}>
                                <td className="px-6 py-4 text-slate-500">{formatDate(item.ngay)}</td>
                                <td className="px-6 py-4 font-mono font-bold text-blue-600 group-hover:underline">{item.so_phieu}</td>
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

const CustomerProfileTab = ({ profile, stats }) => {
    const infoItems = [
        { label: 'Mã Đối Tác (KH/NCC)', value: profile.ma_khncc, icon: '🆔' },
        { label: 'Tên Công Ty', value: profile.ten_cong_ty_khach_hang, icon: '🏢', fullWidth: true },
        { label: 'Mã Số Thuế', value: profile.ma_so_thue || 'N/A', icon: '🧾' },
        { label: 'Người Đại Diện', value: profile.ten_kh_lien_he_giam_doc || 'N/A', icon: '👤' },
        { label: 'Điện Thoại 1', value: profile.dien_thoai_1 || 'N/A', icon: '📞' },
        { label: 'Điện Thoại 2', value: profile.dien_thoai_2 || 'N/A', icon: '📱' },
        { label: 'Số Zalo', value: profile.so_zalo || 'N/A', icon: '💬' },
        { label: 'Email', value: profile.email || 'N/A', icon: '📧' },
        { label: 'Kịch bản Giá', value: profile.nhom_chuc_nang_khncc || 'N/A', icon: '🏷️' },
        { label: 'Khu vực', value: profile.nhom_dia_ly || 'N/A', icon: '📍' },
        { label: 'Nhân viên phụ trách', value: profile.nhan_vien_phu_trach || 'N/A', icon: '👨‍💼' },
        { label: 'Người tạo đầu tiên', value: profile.nguoi_tao_dau_tien || 'N/A', icon: '✍️' },
        { label: 'Fanpage/Facebook', value: profile.link_facebook || 'N/A', icon: '🌐', isLink: true },
        { label: 'Địa chỉ chính', value: profile.dia_chi_cong_ty_1 || 'N/A', icon: '🏠', fullWidth: true },
        { label: 'Địa chỉ phụ', value: profile.dia_chi_cong_ty_2 || 'N/A', icon: '🚚', fullWidth: true },
        { label: 'Ghi chú hệ thống', value: profile.ghi_chu || 'Trống', icon: '📝', fullWidth: true, isNote: true },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-auto p-2">
            <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl shadow-sm border border-indigo-200">💎</div>
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase">Hồ sơ định danh Đối tác (KH/NCC)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thông tin này được đồng bộ từ Ecount Cloud</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hạn mức (KH)/Nợ NCC</div>
                    <div className="text-sm font-black text-rose-600">{formatPrice(profile.han_muc_tin_dung || 0)} VNĐ</div>
                </div>
            </div>

            {infoItems.map((item, idx) => (
                <div key={idx} className={`${item.fullWidth ? 'md:col-span-2' : ''} bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 transition-all`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                        <span>{item.icon}</span> {item.label}
                    </p>
                    {item.isLink ? (
                        <a href={item.value} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline line-clamp-1">{item.value}</a>
                    ) : item.isNote ? (
                        <div className="text-sm font-medium text-slate-600 italic whitespace-pre-wrap leading-relaxed">{item.value}</div>
                    ) : (
                        <div className="text-md font-bold text-slate-800">{item.value}</div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const CustomerDetailModal = ({ customerIdentifier, onClose }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('gs_pref_customer_detail_tab') || 'summary');
    
    // Lưu tab hiện tại vào localStorage (với prefix 'gs_pref_' để dễ quản lý/xóa sạch khi logout)
    useEffect(() => {
        localStorage.setItem('gs_pref_customer_detail_tab', activeTab);
    }, [activeTab]);
    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingOrderId, setViewingOrderId] = useState(null);
    
    // Mặc định xem 90 ngày cho nhanh & "nâng cấp"
    const [dateRange, setDateRange] = useState({
        start: moment().subtract(90, 'days').format('YYYY-MM-DD'),
        end: moment().format('YYYY-MM-DD')
    });
    const [dateMode, setDateMode] = useState('90_days');

    const handleQuickDate = (mode) => {
        setDateMode(mode);
        let start = moment();
        let end = moment();
        switch (mode) {
            case '7_days': start = moment().subtract(7, 'days'); break;
            case '30_days': start = moment().subtract(30, 'days'); break;
            case '90_days': start = moment().subtract(90, 'days'); break;
            case '180_days': start = moment().subtract(180, 'days'); break;
            case 'this_month': start = moment().startOf('month'); break;
            case 'last_month':
                start = moment().subtract(1, 'month').startOf('month');
                end = moment().subtract(1, 'month').endOf('month');
                break;
            case 'this_quarter': start = moment().startOf('quarter'); break;
            case 'last_quarter':
                start = moment().subtract(1, 'quarter').startOf('quarter');
                end = moment().subtract(1, 'quarter').endOf('quarter');
                break;
            case 'this_year': start = moment().startOf('year'); break;
            case 'last_year':
                start = moment().subtract(1, 'year').startOf('year');
                end = moment().subtract(1, 'year').endOf('year');
                break;
            case 'all':
                start = moment('2020-01-01');
                end = moment();
                break;
            default: start = moment().subtract(90, 'days');
        }
        setDateRange({ start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') });
    };

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/v2/customer-analysis/${customerIdentifier}`);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Lỗi tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (customerIdentifier) fetchData();
    }, [customerIdentifier]);

    if (!customerIdentifier) return null;

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full pr-4">
                    {/* Trai: Thông tin Khách hàng */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 border border-indigo-200 shrink-0">
                            <Icon name="user" className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-800 leading-tight truncate">{data?.profile?.ten_cong_ty_khach_hang || 'Phân tích Đối tác'}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-normal mt-0.5 whitespace-nowrap overflow-x-auto">
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black border border-indigo-100 uppercase">{data?.profile?.ma_khncc}</span>
                                {data?.stats?.current_debt > 0 && (
                                    <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black border border-rose-200 uppercase">
                                        NỢ: {formatPrice(data.stats.current_debt)}
                                    </span>
                                )}
                                {data?.profile?.dien_thoai_1 && <span className="flex items-center gap-1"><Icon name="phone" className="w-3 h-3" /> {data.profile.dien_thoai_1}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Phải: Bộ lọc ngày (Đưa lên Header) */}
                    <div className="flex items-center gap-2 self-end md:self-auto ml-auto md:ml-0">
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Icon name="clock" className="w-3.5 h-3.5" />
                            </div>
                             <select 
                                value={dateMode}
                                onChange={(e) => handleQuickDate(e.target.value)}
                                className="appearance-none bg-slate-50 hover:bg-white text-slate-600 pl-9 pr-7 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm w-[130px]"
                            >
                                <option value="30_days">30 Ngày qua</option>
                                <option value="7_days">7 Ngày qua</option>
                                <option value="90_days">90 Ngày qua</option>
                                <option value="180_days">6 Tháng qua</option>
                                <option value="this_month">Tháng này</option>
                                <option value="last_month">Tháng trước</option>
                                <option value="this_quarter">Quý này</option>
                                <option value="last_quarter">Quý trước</option>
                                <option value="this_year">Năm nay</option>
                                <option value="last_year">Năm trước</option>
                                <option value="all">Tất cả</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Icon name="chevronDown" className="w-3.5 h-3.5" />
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
            <div className="bg-slate-50 h-[85vh] flex flex-col overflow-hidden">
                {/* THANH TAB NAVIGATION - Full Width & Premium */}
                <div className="bg-white border-b px-6 py-2 flex items-center shrink-0 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex space-x-1">
                        {[
                            { id: 'summary', label: 'Tổng quan', icon: '🏟️', color: 'blue' },
                            { id: 'products', label: 'Sản phẩm', icon: '🛒', color: 'indigo' },
                            { id: 'profile', label: 'Hồ sơ', icon: '🆔', color: 'amber' },
                            { id: 'charts', label: 'Biểu đồ', icon: '📈', color: 'indigo' },
                            { id: 'debt', label: 'Công nợ', icon: '💸', color: 'rose' },
                            { id: 'sales', label: 'Lịch sử', icon: '📑', color: 'slate' },
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
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area - Thêm padding thoáng */}
                <div className="flex-1 p-6 md:p-8 overflow-hidden flex flex-col min-h-0">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Đang nạp hồ sơ 360...</div>
                    ) : (
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'summary' && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full overflow-auto p-1">
                                    <StatCard label="Tổng Doanh Thu" value={formatCompact(data.stats?.lifetime_value)} unit="đ" color="blue" subValue={`Từ ${formatDate(data.stats?.first_buy)}`} />
                                    <StatCard label="Tổng Phiếu Bán" value={data.stats?.total_orders} unit="Phiếu" color="slate" />
                                    <StatCard label="Sản phẩm Top" value={data.top_products?.[0]?.name ? data.top_products[0].name.split(' ').slice(0, 2).join(' ') + '...' : 'N/A'} unit="" color="amber" subValue={`${Number(data.top_products?.[0]?.qty || 0).toLocaleString('vi-VN')} lượt lấy`} />
                                    <StatCard label="Tình trạng" value={data.stats?.days_inactive} unit="Ngày" color={data.stats?.days_inactive > 30 ? 'rose' : 'emerald'} subValue={data.stats?.days_inactive > 30 ? 'Cần tương tác' : 'Thường xuyên'} />

                                    <div className="md:col-span-1 bg-white p-6 rounded-2xl border shadow-sm h-fit">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-black text-slate-800 text-xs uppercase flex items-center gap-2"><span>⭐</span> Top Sản Phẩm</h4>
                                            <button onClick={() => setActiveTab('products')} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Tất cả</button>
                                        </div>
                                        <div className="space-y-4">
                                            {data.top_products?.slice(0,5).map((p, idx) => (
                                                <div key={idx} onClick={() => setViewingProductId(p.code)} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0 cursor-pointer group hover:bg-slate-50 transition-all">
                                                    <div className="flex-1 pr-4">
                                                        <div className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:text-blue-600">{p.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{p.code}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-rose-600">{Number(p.qty || 0).toLocaleString('vi-VN')}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SL</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!data.top_products || data.top_products.length === 0) && <div className="text-center text-slate-300 italic py-10">Chưa có dữ liệu sản phẩm</div>}
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 bg-white p-6 rounded-2xl border shadow-sm h-96">
                                        <h4 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2"><span>📈</span> Xu hướng doanh thu</h4>
                                        <ResponsiveContainer width="100%" height="80%">
                                            <AreaChart data={data.chart_history}>
                                                <defs><linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="month" hide />
                                                <YAxis axisLine={false} tick={{fontSize:10, fill: '#94a3b8'}} tickFormatter={v => (v/1e6).toFixed(0) + 'M'} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#cRev)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                 </div>
                             )}
                             {activeTab === 'products' && (
                                 <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                                     <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                                         <h4 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><span>🛒</span> Phân tích sản phẩm từng mua</h4>
                                         <div className="text-[10px] font-black text-slate-400 uppercase">Tổng cộng: {data.top_products?.length || 0} mã hàng</div>
                                     </div>
                                     <div className="flex-1 overflow-auto">
                                         <table className="min-w-full text-sm">
                                             <thead className="bg-white text-[10px] font-black uppercase text-slate-400 border-b sticky top-0 z-10">
                                                 <tr>
                                                     <th className="px-6 py-4 text-left">Sản phẩm</th>
                                                     <th className="px-6 py-4 text-right">Mã hàng</th>
                                                     <th className="px-6 py-4 text-right">Tổng số lượng</th>
                                                     <th className="px-6 py-4 text-center">Thao tác</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-slate-50">
                                                 {data.top_products?.map((p, idx) => (
                                                     <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                                         <td className="px-6 py-4">
                                                             <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{p.name || p.ten_mat_hang}</div>
                                                         </td>
                                                         <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{p.code || p.ma_mat_hang}</td>
                                                         <td className="px-6 py-4 text-right">
                                                             <span className="text-sm font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 italic">
                                                                 {Number(p.qty || p.total_qty || 0).toLocaleString('vi-VN')}
                                                             </span>
                                                         </td>
                                                         <td className="px-6 py-4 text-center">
                                                             <button onClick={() => setViewingProductId(p.code || p.ma_mat_hang)} className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-tighter">Xem chi tiết</button>
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>
                             )}
                             {activeTab === 'profile' && <CustomerProfileTab profile={data.profile || {}} stats={data.stats || {}} />}
                             {activeTab === 'charts' && <PurchaseTrendCharts data={data.chart_history} />}
                             {activeTab === 'debt' && <DebtRiskTab debt={data.stats?.current_debt} evidence={data.debt_evidence || []} onOrderClick={(id) => setViewingOrderId(id)} />}
                             {activeTab === 'sales' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden text-xs">
                                     <CustomerOrdersList title="Đơn Bán Hàng" apiEndpoint="/api/v2/sales-orders" customerCode={customerIdentifier} dateRange={dateRange} />
                                     <CustomerOrdersList title="Đơn Trả Hàng" apiEndpoint="/api/v2/purchase-orders" customerCode={customerIdentifier} dateRange={dateRange} />
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} onClose={() => setViewingProductId(null)} />}
            {viewingOrderId && <SalesOrderDetailModal orderIdentifier={viewingOrderId} onClose={() => setViewingOrderId(null)} />}
        </Modal>
    );
};

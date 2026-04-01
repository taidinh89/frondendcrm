// src/components/modals/ProductDetailModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Modal, Icon } from '../ui.jsx';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, BarChart, Bar, ComposedChart, Area
} from 'recharts';
import moment from 'moment';

// Import Modal con để drill-down
import { SalesOrderDetailModal } from '../modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../modals/PurchaseOrderDetailModal.jsx';
import { CustomerDetailModal } from '../modals/CustomerDetailModal.jsx';
import { SupplierDetailModal } from '../modals/SupplierDetailModal.jsx';

// Helpers format
const formatDate = (ds) => {
    if (!ds) return '';
    return moment(ds).format('DD/MM/YYYY');
};
const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(val || 0)));
const formatCompact = (val) => {
    if (!val || val === 0) return '-';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'tr';
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return formatNumber(val);
};

// Safe unwrap paginated resource collection
const unwrapList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    return [];
};

// Helper component: Xem JSON Raw
const RawDataViewer = ({ data, onClose }) => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-80 p-4">
        <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-gray-100">
                <h3 className="font-mono font-bold text-gray-700 text-sm">RAW API DATA INSPECTOR</h3>
                <button onClick={onClose} className="text-red-600 hover:text-red-800 font-bold px-3 text-sm">ĐÓNG [X]</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-relaxed">
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    </div>
);

// Ledger type badge
const LedgerTypeBadge = ({ type }) => {
    const cfg = {
        SALE:     { label: 'Xuất bán',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
        PURCHASE: { label: 'Nhập mua',   bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
        ADJUST_IN:  { label: 'Điều chỉnh +', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
        ADJUST_OUT: { label: 'Điều chỉnh -', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
        TRANSFER_IN:  { label: 'Chuyển vào', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
        TRANSFER_OUT: { label: 'Chuyển ra',  bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
    };
    const c = cfg[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    return (
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${c.bg} ${c.text} ${c.border}`}>
            {c.label}
        </span>
    );
};

export const ProductDetailModal = ({ productIdentifier, onClose }) => {
    // 1. State Filters & Pagination
    const [dates, setDates] = useState({
        start: moment().subtract(90, 'days').format('YYYY-MM-DD'),
        end: moment().format('YYYY-MM-DD')
    });
    const [dateMode, setDateMode] = useState('90_days');

    const [pages, setPages] = useState({ sales: 1, purchases: 1 });
    const [hasMore, setHasMore] = useState({ sales: true, purchases: true });

    // 2. State Data
    const [info, setInfo] = useState(null);
    const [activity, setActivity] = useState({ sales: [], purchases: [] });
    const [apiSummary, setApiSummary] = useState(null);
    const [rawData, setRawData] = useState(null);

    // Ledger state
    const [ledger, setLedger] = useState([]);
    const [ledgerSummary, setLedgerSummary] = useState(null);
    const [ledgerMeta, setLedgerMeta] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Web state
    const [webData, setWebData] = useState(null);
    const [webLoading, setWebLoading] = useState(false);

    // 3. State UI
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('gs_pref_product_detail_tab') || 'analytics');
    
    // Lưu tab hiện tại vào localStorage (với prefix 'gs_pref_' để dễ quản lý/xóa sạch khi logout)
    useEffect(() => {
        localStorage.setItem('gs_pref_product_detail_tab', activeTab);
    }, [activeTab]);

    // 4. State Drill-down
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedPartner, setSelectedPartner] = useState(null); // { ma_khncc, type: 'cu'|'su' }
    const [filterDate, setFilterDate] = useState(null);

    // Tổng hợp bán/mua cho period summary (Ưu tiên dùng summary từ API trả về cho độ chính xác tuyệt đối trên toàn bộ kỳ)
    const salesTotal = useMemo(() => apiSummary?.total_sales_qty ?? activity.sales.reduce((a,s) => a + (Number(s.items?.[0]?.so_luong) || 0), 0), [activity.sales, apiSummary]);
    const purchasesTotal = useMemo(() => apiSummary?.total_purchases_qty ?? activity.purchases.reduce((a,p) => a + (Number(p.items?.[0]?.so_luong) || 0), 0), [activity.purchases, apiSummary]);
    const salesRevenue = useMemo(() => apiSummary?.total_sales_revenue ?? activity.sales.reduce((a,s) => {
        const price = Number(s.tong_cong || 0) || (Number(s.items?.[0]?.so_luong || 0) * Number(s.items?.[0]?.don_gia || 0));
        return a + price;
    }, 0), [activity.sales, apiSummary]);

    // 4.1. Quick Date Logic
    const handleQuickDate = (mode) => {
        setDateMode(mode);
        let start = moment();
        let end = moment();
        switch (mode) {
            case '7_days': start = moment().subtract(7, 'days'); break;
            case '30_days': start = moment().subtract(30, 'days'); break;
            case '90_days': start = moment().subtract(90, 'days'); break;
            case '6_months': start = moment().subtract(6, 'months'); break;
            case 'this_month': start = moment().startOf('month'); break;
            case 'last_month':
                start = moment().subtract(1, 'month').startOf('month');
                end = moment().subtract(1, 'month').endOf('month');
                break;
            case 'this_quarter': start = moment().startOf('quarter'); end = moment().endOf('quarter'); break;
            case 'last_quarter': start = moment().subtract(1, 'quarter').startOf('quarter'); end = moment().subtract(1, 'quarter').endOf('quarter'); break;
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
        setDates({ start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') });
    };

    const handleChartClick = (data) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const clickedDate = data.activePayload[0].payload.date;
            setFilterDate(clickedDate);
            setActiveTab('sales');
        }
    };

    const handleOrderClick = (id, type) => {
        if (id) setSelectedOrder({ id, type });
    };

    const handlePartnerClick = (ma_khncc, type, name = null) => {
        // Nếu không có mã, dùng tên làm fallback
        const identifier = ma_khncc || name;
        if (identifier) setSelectedPartner({ ma_khncc: identifier, type });
    };

    // 5. Fetch Logic
    const fetchInfo = async () => {
        try {
            const res = await axios.get('/api/v2/inventory', {
                params: { search: productIdentifier, per_page: 1 }
            });
            const invDataRaw = res.data;
            const productData = invDataRaw.data && invDataRaw.data.length > 0 ? invDataRaw.data[0] : {};
            const inventorySummary = productData.inventorySummary || {};
            setInfo({
                name: productData.display_name || productData.dataSources?.ecount?.name || productIdentifier,
                code: productData.ecount_code || productData.logical_id || productIdentifier,
                brand: productData.brand_code || 'N/A',
                category: productData.category_code || 'N/A',
                unit: productData.dataSources?.ecount?.unit || 'Cái',
                totalStock: inventorySummary.total_ecount_quantity ?? productData.total_quantity ?? 0,
                locations: inventorySummary.locations || []
            });
            return invDataRaw;
        } catch (e) { console.error("Info error", e); return null; }
    };

    const fetchActivity = async (type, page = 1, refresh = false) => {
        if (!refresh && !hasMore[type]) return;
        setIsActionLoading(true);
        try {
            const res = await axios.get('/api/v2/context/product-activity', {
                params: {
                    product_code: productIdentifier,
                    start_date: dates.start,
                    end_date: dates.end,
                    type: type,
                    page: page,
                    per_page: 20
                }
            });
            // API trả về paginated resource: { sales_orders: { data: [...] }, ... }
            const raw = type === 'sales' ? res.data.sales_orders : res.data.purchase_orders;
            const data = unwrapList(raw);

            setActivity(prev => ({
                ...prev,
                [type]: refresh ? data : [...prev[type], ...data]
            }));
            if (res.data.summary) setApiSummary(res.data.summary);
            const totalCount = raw?.total ?? data.length;
            const perPage = raw?.per_page ?? 20;
            setHasMore(p => ({ ...p, [type]: data.length >= perPage }));
            return res.data;
        } catch (e) {
            console.error(`Activity error (${type})`, e);
            return null;
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchLedger = async (page = 1, append = false) => {
        setLedgerLoading(true);
        try {
            const res = await axios.get('/api/v1/stock-ledger', {
                params: {
                    product_code: productIdentifier,
                    start_date: dates.start,
                    end_date: dates.end,
                    page,
                    per_page: 50,
                }
            });
            setLedgerSummary(res.data.summary);
            setLedgerMeta(res.data.meta);
            setLedger(prev => append ? [...prev, ...(res.data.data || [])] : (res.data.data || []));
        } catch (e) {
            console.error('Ledger error', e);
        } finally {
            setLedgerLoading(false);
        }
    };

    // First load or date change
    useEffect(() => {
        if (!productIdentifier) return;
        const init = async () => {
            setIsLoading(true);
            setPages({ sales: 1, purchases: 1 });
            const [invRaw, actRaw] = await Promise.all([
                fetchInfo(),
                axios.get('/api/v2/context/product-activity', {
                    params: {
                        product_code: productIdentifier,
                        start_date: dates.start,
                        end_date: dates.end
                    }
                }).catch(err => {
                    console.error('Activity API Error:', err);
                    return { data: { sales_orders: [], purchase_orders: [] } };
                })
            ]);

            setRawData({ INVENTORY_API: invRaw, ACTIVITY_API: actRaw?.data });

            // Unwrap paginated results
            const salesData = unwrapList(actRaw?.data?.sales_orders);
            const purchasesData = unwrapList(actRaw?.data?.purchase_orders);
            setActivity({ sales: salesData, purchases: purchasesData });
            if (actRaw?.data?.summary) setApiSummary(actRaw.data.summary);

            const salesPerPage = actRaw?.data?.sales_orders?.per_page ?? 10;
            const purcPerPage  = actRaw?.data?.purchase_orders?.per_page ?? 10;
            setHasMore({
                sales:     salesData.length >= salesPerPage,
                purchases: purchasesData.length >= purcPerPage,
            });

            setIsLoading(false);
        };
        init();
    }, [productIdentifier, dates]);

    // Fetch ledger when tab activated
    useEffect(() => {
        if (activeTab === 'ledger' && productIdentifier) {
            setLedger([]);
            fetchLedger(1);
        }
    }, [activeTab, productIdentifier, dates]);

    // Lazy load web data when tab is 'web'
    useEffect(() => {
        if (activeTab === 'web' && webData === null && !webLoading) {
            setWebLoading(true);
            axios.get('/api/v2/products-new', { params: { search: productIdentifier, is_master: 1, limit: 1 } })
                .then(res => {
                    const extracted = unwrapList(res.data);
                    setWebData(extracted.length > 0 ? extracted[0] : false);
                })
                .catch(e => {
                    console.error("Web info error:", e);
                    setWebData(false);
                })
                .finally(() => setWebLoading(false));
        }
    }, [activeTab, productIdentifier, webData, webLoading]);

    const handleLoadMore = () => {
        if (activeTab === 'sales' || activeTab === 'purchases') {
            const nextPage = pages[activeTab] + 1;
            setPages(p => ({ ...p, [activeTab]: nextPage }));
            fetchActivity(activeTab, nextPage);
        }
        if (activeTab === 'ledger' && ledgerMeta) {
            const nextPage = (ledgerMeta.current_page || 1) + 1;
            fetchLedger(nextPage, true);
        }
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!activity.sales.length && !activity.purchases.length) return [];
        const dataMap = {};

        activity.sales.forEach(s => {
            const d = moment(s.ngay).format('YYYY-MM-DD');
            if (!dataMap[d]) dataMap[d] = { date: d, salesQty: 0, saleRevenue: 0, purchaseQty: 0, purchaseValue: 0, name: moment(s.ngay).format('DD/MM'), salePrices: [] };
            const qty = Number(s.items?.[0]?.so_luong) || 0;
            const price = Number(s.items?.[0]?.don_gia) || 0;
            const revenue = Number(s.tong_cong || 0) || (qty * price);
            dataMap[d].salesQty += qty;
            dataMap[d].saleRevenue += revenue;
            if (price > 0) dataMap[d].salePrices.push(price);
        });

        activity.purchases.forEach(p => {
            const d = moment(p.ngay).format('YYYY-MM-DD');
            if (!dataMap[d]) dataMap[d] = { date: d, salesQty: 0, saleRevenue: 0, purchaseQty: 0, purchaseValue: 0, name: moment(p.ngay).format('DD/MM'), salePrices: [] };
            const qty = Number(p.items?.[0]?.so_luong) || 0;
            const value = Number(p.tong_cong || 0) || (qty * Number(p.items?.[0]?.don_gia || 0));
            dataMap[d].purchaseQty += qty;
            dataMap[d].purchaseValue += value;
        });

        return Object.values(dataMap).map(item => {
            const avgPrice = item.salePrices.length > 0 
                ? item.salePrices.reduce((a, b) => a + b, 0) / item.salePrices.length 
                : 0;
            return { ...item, avgUnitPrice: avgPrice };
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [activity]);

    const hasMoreLedger = ledgerMeta ? ledgerMeta.current_page < ledgerMeta.last_page : false;

    return (
        <React.Fragment>
            <Modal
                isOpen={true}
                onClose={onClose}
                title={
                    <div className="flex items-center justify-between w-full pr-8">
                        <span className="truncate max-w-md">Analytics Dashboard v4.0: <span className="font-mono text-indigo-700">{productIdentifier}</span></span>
                        <div className="flex items-center gap-4">
                             {/* --- QUICK DATE SELECT (DROPDOWN) --- */}
                             <div className="relative group min-w-[120px]">
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
                                </div>
                                <select 
                                    value={dateMode}
                                    onChange={(e) => handleQuickDate(e.target.value)}
                                    className="appearance-none bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 pl-8 pr-8 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm w-full"
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
                                    <option value="all">Tất cả lịch sử</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Icon path="M19.5 8.25l-7.5 7.5-7.5-7.5" className="w-3 h-3" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                                <input
                                    type="date"
                                    className="text-[10px] bg-transparent border-none outline-none font-bold text-slate-600 px-1"
                                    value={dates.start}
                                    onChange={e => setDates(p => ({ ...p, start: e.target.value }))}
                                />
                                <span className="text-[10px] text-slate-400">→</span>
                                <input
                                    type="date"
                                    className="text-[10px] bg-transparent border-none outline-none font-bold text-slate-600 px-1"
                                    value={dates.end}
                                    onChange={e => setDates(p => ({ ...p, end: e.target.value }))}
                                />
                            </div>
                            {!isLoading && (
                                <button onClick={() => setShowRaw(true)} className="text-[10px] font-bold flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all active:scale-95 shadow-sm">
                                    <Icon path="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" className="w-3.5 h-3.5" />
                                    DEBUG
                                </button>
                            )}
                        </div>
                    </div>
                }
                maxWidthClass="max-w-7xl"
            >
                <div className="bg-slate-50 font-sans h-[85vh]">

                    {/* --- HEADER INFO CARD --- */}
                    {info && (
                        <div className="bg-white p-5 border-b shadow-sm flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 w-full text-center md:text-left">
                                <label className="text-[9px] uppercase text-indigo-400 font-black tracking-[0.2em] mb-1 block">Tên sản phẩm Master</label>
                                <div className="font-extrabold text-slate-800 text-lg leading-tight uppercase line-clamp-2">{info.name}</div>
                            </div>
                            <div className="shrink-0 flex gap-6 px-6 border-l border-slate-100 hidden md:flex">
                                <div className="text-center">
                                    <label className="text-[9px] uppercase text-slate-400 font-bold block mb-1">Brand</label>
                                    <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{info.brand}</span>
                                </div>
                                <div className="text-center">
                                    <label className="text-[9px] uppercase text-slate-400 font-bold block mb-1">Category</label>
                                    <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{info.category}</span>
                                </div>
                            </div>
                            <div className="shrink-0 bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100 min-w-[140px] text-center transition-all hover:scale-105">
                                <label className="text-[9px] uppercase text-indigo-200 font-black tracking-widest block mb-0.5">Tổng Tồn Kho</label>
                                <div className="text-2xl font-black">
                                    {formatNumber(info.totalStock)} <span className="text-[10px] font-bold opacity-70 uppercase">{info.unit}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PERIOD SUMMARY --- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b">
                        {[
                            { label: 'Tổng Bán (Kỳ)', value: salesTotal, unit: info?.unit, color: 'emerald' },
                            { label: 'Tổng Mua (Kỳ)', value: purchasesTotal, unit: info?.unit, color: 'purple' },
                            {
                                label: 'Doanh thu Bán',
                                value: salesRevenue,
                                unit: 'VNĐ',
                                color: 'blue',
                                compact: true,
                            },
                            {
                                label: 'Gia nhập/bán TB',
                                value: (() => {
                                    const avgSale = activity.sales.length ? (activity.sales.reduce((a, b) => a + Number(b.items?.[0]?.don_gia || 0), 0) / activity.sales.filter(s => s.items?.[0]?.don_gia > 0).length || 0) : 0;
                                    const avgBuy = activity.purchases.length ? (activity.purchases.reduce((a, b) => a + Number(b.items?.[0]?.don_gia || 0), 0) / activity.purchases.filter(p => p.items?.[0]?.don_gia > 0).length || 0) : 0;
                                    if (!avgSale && !avgBuy) return 'N/A';
                                    return `${formatCompact(Math.round(avgBuy))} / ${formatCompact(Math.round(avgSale))}`;
                                })(),
                                unit: 'VNĐ',
                                color: 'amber'
                            }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                <label className={`text-[8px] font-black uppercase text-${stat.color}-400 mb-1`}>{stat.label}</label>
                                <div className="text-sm font-black text-slate-800">
                                    {typeof stat.value === 'number'
                                        ? (stat.compact ? formatCompact(Math.round(stat.value)) : formatNumber(Math.round(stat.value)))
                                        : stat.value}
                                    <span className="text-[8px] ml-1 text-slate-400">{stat.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- NAVIGATION TABS (STICKY) --- */}
                    <div className="sticky top-0 z-[20] flex bg-white px-6 pt-2 border-b gap-3 overflow-x-auto no-scrollbar items-center shadow-sm">
                        {[
                            { id: 'analytics', label: 'Phân tích & Xu hướng', icon: 'bar-chart', color: 'indigo' },
                            { id: 'sales',     label: `Lịch sử Bán (${activity.sales.length})`, icon: 'activity', color: 'emerald' },
                            { id: 'purchases', label: `Lịch sử Mua (${activity.purchases.length})`, icon: 'shopping-cart', color: 'purple' },
                            { id: 'ledger',    label: `Thẻ Kho`, icon: 'list', color: 'orange' },
                            { id: 'web',       label: `Web & Media`, icon: 'globe', color: 'pink' },
                            { id: 'info',      label: `Chi tiết Kho (${info?.locations?.length || 0})`, icon: 'package', color: 'blue' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-3.5 px-5 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? `border-${tab.color}-600 text-${tab.color}-600 bg-${tab.color}-50/30`
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Icon name={tab.icon} className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                        {filterDate && (
                            <div className="ml-auto flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full animate-pulse">
                                <span className="text-[10px] font-black text-rose-600 uppercase">Lọc: {formatDate(filterDate)}</span>
                                <button onClick={() => setFilterDate(null)} className="text-rose-400 hover:text-rose-600">
                                    <Icon name="x" className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- CONTENT AREA --- */}
                    <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 240px)' }}>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-black text-xs uppercase tracking-widest text-indigo-600">Đang đồng bộ dữ liệu...</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">

                                {/* TAB 0: ANALYTICS (CHART) */}
                                {activeTab === 'analytics' && (
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                                            <div className="flex justify-between items-center mb-8">
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Biểu đồ Xu hướng Bán - Mua</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Dữ liệu từ {formatDate(dates.start)} đến {formatDate(dates.end)} • Bấm vào điểm để lọc</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">BÁN (SL)</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">MUA (SL)</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">DT BÁN</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-rose-400 border-t border-dashed border-rose-600"></div><span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">ĐƠN GIÁ TB</span></div>
                                                </div>
                                            </div>
                                            <div className="h-[400px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart data={chartData} onClick={(data) => handleChartClick(data)} cursor="pointer">
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                                        <YAxis yAxisId="left" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} label={{ value: 'Số lượng', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                                                        <YAxis yAxisId="right" orientation="right" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => (val / 1_000_000).toFixed(1) + 'tr'} label={{ value: 'Doanh thu', angle: 90, position: 'insideRight', fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '4px' }}
                                                            labelStyle={{ fontWeight: '900', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}
                                                            formatter={(value, name) => {
                                                                const labels = {
                                                                    salesQty: 'SL Bán',
                                                                    purchaseQty: 'SL Mua',
                                                                    saleRevenue: 'DT Bán (VNĐ)',
                                                                    purchaseValue: 'GT Mua (VNĐ)',
                                                                    avgUnitPrice: 'Đơn giá TB (VNĐ)'
                                                                };
                                                                return [formatNumber(Math.round(value)), labels[name] || name];
                                                            }}
                                                        />
                                                        <Area yAxisId="left" type="monotone" dataKey="salesQty" fill="#10b98120" stroke="#10b981" strokeWidth={3} />
                                                        <Area yAxisId="left" type="monotone" dataKey="purchaseQty" fill="#a855f720" stroke="#a855f7" strokeWidth={3} />
                                                        <Line yAxisId="right" type="monotone" dataKey="saleRevenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, stroke: '#3b82f6', fill: '#fff' }} activeDot={{ r: 6 }} />
                                                        <Line
                                                            yAxisId="price"
                                                            type="stepAfter"
                                                            dataKey="avgUnitPrice"
                                                            stroke="#f43f5e"
                                                            strokeWidth={2}
                                                            strokeDasharray="5 5"
                                                            dot={false}
                                                            connectNulls
                                                         />
                                                         <YAxis yAxisId="price" orientation="right" hide domain={['auto', 'auto']} />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 1: LỊCH SỬ BÁN */}
                                {activeTab === 'sales' && (
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-slate-50 text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Thời gian</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Chứng từ</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Đối tác / Ghi chú</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Phụ trách</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Đơn giá</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Tổng tiền</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                                {activity.sales.filter(o => !filterDate || moment(o.ngay).format('YYYY-MM-DD') === filterDate).length > 0
                                                    ? activity.sales.filter(o => !filterDate || moment(o.ngay).format('YYYY-MM-DD') === filterDate).map((order, idx) => {
                                                        const qty = Number(order.items?.[0]?.so_luong) || 0;
                                                        const unitPrice = Number(order.items?.[0]?.don_gia) || 0;
                                                        const total = Number(order.tong_cong) || (qty * unitPrice);
                                                        return (
                                                            <tr key={idx} className="hover:bg-emerald-50/20 group transition-all">
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{formatDate(order.ngay)}</td>
                                                                <td className="px-6 py-4">
                                                                    <button onClick={() => handleOrderClick(order.id || order.unique_order_key, 'sale')} className="text-indigo-600 hover:text-indigo-800 font-black text-xs font-mono bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95">
                                                                        {order.so_phieu}
                                                                    </button>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div 
                                                                        onClick={() => handlePartnerClick(order.ma_khncc, 'customer', order.ten_khncc)} 
                                                                        className="font-extrabold text-xs text-slate-800 uppercase line-clamp-1 cursor-pointer hover:text-indigo-600 transition-colors hover:underline"
                                                                    >
                                                                        {order.ten_khncc}
                                                                    </div>
                                                                    {order.ghi_chu_tren_phieu && <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">{order.ghi_chu_tren_phieu}</div>}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{order.nguoi_phu_trach}</td>
                                                                <td className="px-6 py-4 text-right text-xs font-black text-slate-700">
                                                                    {unitPrice > 0 ? formatNumber(unitPrice) : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-xs font-black text-emerald-600">
                                                                    {total > 0 ? formatCompact(total) : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                                                        {qty > 0 ? formatNumber(qty) : '-'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }) : <tr><td colSpan="7" className="py-20 text-center opacity-40"><p className="font-black text-xs text-slate-400 uppercase tracking-widest">Không có dữ liệu trong kỳ này</p></td></tr>}
                                            </tbody>
                                        </table>
                                        {hasMore.sales && (
                                            <div className="p-4 bg-slate-50 border-t flex justify-center">
                                                <button onClick={handleLoadMore} disabled={isActionLoading} className="px-8 py-2.5 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                                    {isActionLoading ? 'ĐANG ĐỒNG BỘ...' : 'XEM THÊM LỊCH SỬ BÁN'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: LỊCH SỬ MUA */}
                                {activeTab === 'purchases' && (
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-slate-50 text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Thời gian</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Số phiếu</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Nhà cung cấp</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">NV</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Đơn giá</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Tổng tiền</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {activity.purchases.filter(p => !filterDate || moment(p.ngay).format('YYYY-MM-DD') === filterDate).length > 0
                                                    ? activity.purchases.filter(p => !filterDate || moment(p.ngay).format('YYYY-MM-DD') === filterDate).map((item, idx) => {
                                                        const qty = Number(item.items?.[0]?.so_luong) || 0;
                                                        const unitPrice = Number(item.items?.[0]?.don_gia) || 0;
                                                        const total = Number(item.tong_cong) || (qty * unitPrice);
                                                        return (
                                                            <tr key={idx} className="hover:bg-purple-50/20 group transition-all">
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{formatDate(item.ngay)}</td>
                                                                <td className="px-6 py-4">
                                                                    <button onClick={() => handleOrderClick(item.id || item.unique_order_key, 'purchase')} className="text-purple-600 hover:text-purple-800 font-black text-xs font-mono bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 shadow-sm">
                                                                        {item.so_phieu}
                                                                    </button>
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 font-extrabold text-xs text-slate-800 uppercase cursor-pointer hover:text-purple-600 transition-colors hover:underline" 
                                                                    onClick={() => handlePartnerClick(item.ma_khncc, 'supplier', item.ten_khncc)}
                                                                >
                                                                    {item.ten_khncc}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{item.nguoi_phu_trach}</td>
                                                                <td className="px-6 py-4 text-right text-xs font-black text-slate-700">
                                                                    {unitPrice > 0 ? formatNumber(unitPrice) : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-xs font-black text-purple-600">
                                                                    {total > 0 ? formatCompact(total) : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-sm font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                                                                        {qty > 0 ? formatNumber(qty) : '-'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }) : <tr><td colSpan="7" className="py-20 text-center opacity-40"><p className="font-black text-xs text-slate-400 uppercase tracking-widest">Không có dữ liệu mua hàng</p></td></tr>}
                                            </tbody>
                                        </table>
                                        {hasMore.purchases && (
                                            <div className="p-4 bg-slate-50 border-t flex justify-center">
                                                <button onClick={handleLoadMore} disabled={isActionLoading} className="px-8 py-2.5 bg-white text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-purple-100 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                                    {isActionLoading ? 'ĐANG ĐỒNG BỘ...' : 'XEM THÊM LỊCH SỬ MUA'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: THẺ KHO */}
                                {activeTab === 'ledger' && (
                                    <div className="space-y-5">
                                        {/* Summary cards */}
                                        {ledgerSummary && (
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                {[
                                                    { label: 'Tồn đầu kỳ',     value: ledgerSummary.opening_balance, color: 'slate',   icon: '📦' },
                                                    { label: 'Tổng nhập',      value: ledgerSummary.total_in,        color: 'emerald', icon: '⬆️' },
                                                    { label: 'Tổng xuất',      value: ledgerSummary.total_out,       color: 'red',     icon: '⬇️' },
                                                    { label: 'Tồn cuối kỳ',    value: ledgerSummary.closing_balance, color: 'indigo',  icon: '🏁' },
                                                    { label: 'Số giao dịch',   value: ledgerSummary.total_txn,       color: 'orange',  icon: '📋', noFormat: true },
                                                ].map((s, i) => (
                                                    <div key={i} className={`bg-white p-4 rounded-2xl border shadow-sm text-center border-${s.color}-100`}>
                                                        <div className="text-lg mb-1">{s.icon}</div>
                                                        <div className={`text-[9px] font-black uppercase text-${s.color}-400 mb-1`}>{s.label}</div>
                                                        <div className={`text-base font-black text-${s.color}-600 tabular-nums`}>
                                                            {s.noFormat ? s.value : formatNumber(Math.abs(s.value))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {ledgerLoading && !ledger.length ? (
                                            <div className="py-20 text-center">
                                                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Đang nạp thẻ kho...</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                                <table className="min-w-full">
                                                    <thead className="bg-slate-50 text-slate-400 sticky top-0">
                                                        <tr>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">Ngày</th>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">Chứng từ</th>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">Loại</th>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">Đối tác</th>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">Kho</th>
                                                            <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Nhập</th>
                                                            <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Xuất</th>
                                                            <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Tồn sau</th>
                                                            <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Tổng tiền</th>
                                                            <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Đơn giá</th>
                                                            <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest">NV</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {ledger.length === 0 ? (
                                                            <tr><td colSpan="10" className="py-20 text-center"><p className="font-black text-xs text-slate-300 uppercase tracking-widest">Không có dữ liệu thẻ kho trong kỳ này</p></td></tr>
                                                        ) : ledger.map((txn, idx) => {
                                                            const isIn = txn.type === 'PURCHASE';
                                                            const qty = isIn ? Number(txn.qty_in) : Number(txn.qty_out);
                                                            return (
                                                                <tr key={idx} className={`transition-all group ${isIn ? 'hover:bg-emerald-50/30' : 'hover:bg-red-50/30'}`}>
                                                                    <td className="px-5 py-3.5 text-xs font-bold text-slate-500">
                                                                        {formatDate(txn.txn_date)}
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <button
                                                                            onClick={() => handleOrderClick(txn.order_id, isIn ? 'purchase' : 'sale')}
                                                                            className={`font-black text-[11px] font-mono px-3 py-1 rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${!isIn ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-purple-700 bg-purple-50 border-purple-100'}`}
                                                                        >
                                                                            {txn.slip_no || txn.order_id}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <LedgerTypeBadge type={txn.type} />
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-xs text-slate-600 max-w-[160px] truncate" title={txn.partner}>
                                                                        <span 
                                                                            onClick={() => handlePartnerClick(txn.partner_code, txn.type === 'PURCHASE' ? 'supplier' : 'customer', txn.partner)}
                                                                            className="cursor-pointer hover:text-blue-600 hover:underline transition-all font-bold"
                                                                        >
                                                                            {txn.partner || <span className="text-slate-300">-</span>}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded font-mono">{txn.warehouse || '-'}</code>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        {isIn ? (
                                                                            <span className="text-sm font-black text-emerald-600 tabular-nums">+{formatNumber(qty)}</span>
                                                                        ) : <span className="text-slate-200">-</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        {!isIn ? (
                                                                            <span className="text-sm font-black text-red-500 tabular-nums">-{formatNumber(qty)}</span>
                                                                        ) : <span className="text-slate-200">-</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        <span className={`text-xs font-black tabular-nums ${Number(txn.qty_after) < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                                                            {formatNumber(txn.qty_after)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right text-xs font-black text-slate-600 tabular-nums">
                                                                        {txn.subtotal > 0 ? formatCompact(txn.subtotal) : <span className="text-slate-200">-</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                                                                        {txn.unit_price > 0 ? formatNumber(txn.unit_price) : <span className="text-slate-200">-</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-xs text-slate-400 max-w-[100px] truncate">
                                                                        {txn.staff || '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {hasMoreLedger && (
                                                    <div className="p-4 bg-slate-50 border-t flex justify-center">
                                                        <button onClick={handleLoadMore} disabled={ledgerLoading} className="px-8 py-2.5 bg-white text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-orange-100 hover:bg-orange-500 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                                            {ledgerLoading ? 'ĐANG TẢI...' : 'XEM THÊM GIAO DỊCH CŨ HƠN'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB NEW: THÔNG TIN WEB */}
                                {activeTab === 'web' && (
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 text-center min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
                                        {webLoading ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4 shadow-xl"></div>
                                                <p className="text-xs font-black text-pink-500 uppercase tracking-[0.2em] animate-pulse">ĐANG NẠP THÔNG TIN WEBSITE...</p>
                                            </div>
                                        ) : webData ? (
                                            <div className="flex flex-col items-center max-w-lg relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                                <div className="relative group mb-8">
                                                    <div className="w-48 h-48 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-50 relative group-hover:scale-105 transition-all duration-300">
                                                        {webData.proThum || (webData.media && webData.media.length > 0) ? (
                                                            <img 
                                                                src={webData.proThum || webData.media?.[0]?.full_url || webData.media?.[0]?.displayUrl || webData.media?.[0]?.url} 
                                                                className="w-full h-full object-cover" 
                                                                alt={webData.proName} 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Icon name="image" className="w-16 h-16 opacity-50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2 mb-4">
                                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${webData.isOn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {webData.isOn ? '🟢 ONLINE' : '🔴 OFFLINE'}
                                                    </span>
                                                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-indigo-100 text-indigo-700">
                                                        {webData.site_code || 'QVC'}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight">{webData.proName}</h3>
                                                <p className="text-sm font-bold text-pink-600 mb-8 tabular-nums">
                                                    💵 Giá Web: {formatNumber(webData.price_web || webData.price)} đ
                                                </p>

                                                <div className="flex gap-4">
                                                    {webData.url && (
                                                        <a 
                                                            href={`https://qvc.vn/${webData.url}.html`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 hover:shadow-xl hover:shadow-pink-500/30 transition-all active:scale-95"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                            Mở xem Website
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-20 flex flex-col items-center">
                                                <div className="w-16 h-16 bg-slate-50 text-slate-300 flex items-center justify-center rounded-2xl mb-4 p-4">
                                                    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                </div>
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sản phẩm chưa có trên Website</h3>
                                                <p className="text-xs text-slate-300 font-bold mt-2">Dữ liệu không tồn tại trong CSDL Web (QVC).</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB FIN: TỒN KHO CHI TIẾT */}
                                {activeTab === 'info' && (
                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-2">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="text-slate-400">
                                                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em]">Cơ sở / Warehouse</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em]">Tồn thực tế</th>
                                                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em]">Nguồn dữ liệu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {info?.locations?.length > 0 ? info.locations.map((loc, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-all group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                    <Icon name="home" className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{loc.warehouse_name}</div>
                                                                    <code className="text-[10px] text-slate-400 font-mono tracking-widest">#{loc.warehouse_code}</code>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className="text-lg font-black text-indigo-600 tabular-nums">{formatNumber(loc.quantity)}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="px-4 py-1.5 rounded-xl bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-slate-200">
                                                                {loc.source}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan="3" className="py-20 text-center italic text-slate-300">Chưa có phân bổ chi tiết.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* DEBUG RAW VIEW */}
            {showRaw && rawData && <RawDataViewer data={rawData} onClose={() => setShowRaw(false)} />}

            {/* DRILL-DOWN MODALS */}
            {selectedOrder && selectedOrder.type === 'sale' && (
                <SalesOrderDetailModal orderIdentifier={selectedOrder.id} onClose={() => setSelectedOrder(null)} />
            )}
            {selectedOrder && selectedOrder.type === 'purchase' && (
                <PurchaseOrderDetailModal orderIdentifier={selectedOrder.id} onClose={() => setSelectedOrder(null)} />
            )}
            
            {selectedPartner && selectedPartner.type === 'supplier' && (
                <SupplierDetailModal supplierIdentifier={selectedPartner.ma_khncc} onClose={() => setSelectedPartner(null)} />
            )}
            {selectedPartner && selectedPartner.type === 'customer' && (
                <CustomerDetailModal customerIdentifier={selectedPartner.ma_khncc} onClose={() => setSelectedPartner(null)} />
            )}
        </React.Fragment>
    );
};

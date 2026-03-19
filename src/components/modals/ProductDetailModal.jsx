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

// Helpers format
const formatDate = (ds) => {
    if (!ds) return '';
    return moment(ds).format('DD/MM/YYYY');
};
const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

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

export const ProductDetailModal = ({ productIdentifier, onClose }) => {
    // 1. State Filters & Pagination
    const [dates, setDates] = useState({
        start: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        end: moment().format('YYYY-MM-DD')
    });

    const [pages, setPages] = useState({ sales: 1, purchases: 1 });
    const [hasMore, setHasMore] = useState({ sales: true, purchases: true });

    // 2. State Data
    const [info, setInfo] = useState(null);
    const [activity, setActivity] = useState({ sales: [], purchases: [] });
    const [rawData, setRawData] = useState(null);

    // 3. State UI
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [activeTab, setActiveTab] = useState('analytics');

    // 4. State Drill-down
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterDate, setFilterDate] = useState(null);

    // 4.1. Quick Date Logic
    const handleQuickDate = (mode) => {
        let start = moment();
        let end = moment();

        switch (mode) {
            case 'this_month':
                start = moment().startOf('month');
                break;
            case 'last_month':
                start = moment().subtract(1, 'month').startOf('month');
                end = moment().subtract(1, 'month').endOf('month');
                break;
            case '90_days':
                start = moment().subtract(90, 'days');
                break;
            case 'this_year':
                start = moment().startOf('year');
                break;
            case 'last_year':
                start = moment().subtract(1, 'year').startOf('year');
                end = moment().subtract(1, 'year').endOf('year');
                break;
            default:
                start = moment().subtract(30, 'days');
        }

        setDates({
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        });
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
                    type: type, // sale | purchase
                    page: page,
                    per_page: 20
                }
            });

            const data = (type === 'sales' ? res.data.sales_orders : res.data.purchase_orders) || [];

            setActivity(prev => ({
                ...prev,
                [type]: refresh ? data : [...prev[type], ...data]
            }));

            if (data.length < 20) {
                setHasMore(p => ({ ...p, [type]: false }));
            } else {
                setHasMore(p => ({ ...p, [type]: true }));
            }

            return res.data;
        } catch (e) {
            console.error(`Activity error (${type})`, e);
            return null;
        } finally {
            setIsActionLoading(false);
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
                })
            ]);

            setRawData({ INVENTORY_API: invRaw, ACTIVITY_API: actRaw?.data });
            setActivity({
                sales: actRaw?.data?.sales_orders || [],
                purchases: actRaw?.data?.purchase_orders || []
            });

            setHasMore({
                sales: (actRaw?.data?.sales_orders?.length || 0) >= 20,
                purchases: (actRaw?.data?.purchase_orders?.length || 0) >= 20
            });

            setIsLoading(false);
        };

        init();
    }, [productIdentifier, dates]);

    const handleLoadMore = () => {
        if (activeTab === 'sales' || activeTab === 'purchases') {
            const nextPage = pages[activeTab] + 1;
            setPages(p => ({ ...p, [activeTab]: nextPage }));
            fetchActivity(activeTab, nextPage);
        }
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!activity.sales.length && !activity.purchases.length) return [];

        const dataMap = {};

        // Process Sales
        activity.sales.forEach(s => {
            const d = moment(s.ngay).format('YYYY-MM-DD');
            if (!dataMap[d]) dataMap[d] = { date: d, salesQty: 0, salePrice: 0, purchaseQty: 0, buyPrice: 0, name: moment(s.ngay).format('DD/MM') };
            const qty = s.items?.[0]?.so_luong || 0;
            const price = s.items?.[0]?.don_gia || 0;
            dataMap[d].salesQty += qty;
            dataMap[d].salePrice = price; // Lấy giá cuối trong ngày
        });

        // Process Purchases
        activity.purchases.forEach(p => {
            const d = moment(p.ngay).format('YYYY-MM-DD');
            if (!dataMap[d]) dataMap[d] = { date: d, salesQty: 0, salePrice: 0, purchaseQty: 0, buyPrice: 0, name: moment(p.ngay).format('DD/MM') };
            const qty = p.items?.[0]?.so_luong || 0;
            const price = p.items?.[0]?.don_gia || 0;
            dataMap[d].purchaseQty += qty;
            dataMap[d].buyPrice = price;
        });

        return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
    }, [activity]);

    return (
        <React.Fragment>
            <Modal
                isOpen={true}
                onClose={onClose}
                title={
                    <div className="flex items-center justify-between w-full pr-8">
                        <span className="truncate max-w-md">Analytics Dashboard v4.0: <span className="font-mono text-indigo-700">{productIdentifier}</span></span>
                        <div className="flex items-center gap-4">
                            {/* --- QUICK DATE SELECT --- */}
                            <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-xl border border-slate-200 shadow-inner">
                                {[
                                    { label: '30N', mode: 'default' },
                                    { label: '90N', mode: '90_days' },
                                    { label: 'Tháng này', mode: 'this_month' },
                                    { label: 'Tháng trước', mode: 'last_month' },
                                    { label: 'Năm nay', mode: 'this_year' },
                                    { label: 'Năm ngoái', mode: 'last_year' }
                                ].map(btn => (
                                    <button
                                        key={btn.mode}
                                        onClick={() => handleQuickDate(btn.mode)}
                                        className="text-[9px] font-black uppercase px-2 py-1 rounded-lg hover:bg-white hover:text-indigo-600 transition-all text-slate-500"
                                    >
                                        {btn.label}
                                    </button>
                                ))}
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

                    {/* --- PERIOD SUMMARY (NHẢY SỐ LOOK) --- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b">
                        {[
                            { label: 'Tổng Bán (Kỳ)', value: activity.sales.reduce((a, b) => a + (Number(b.items?.[0]?.so_luong) || 0), 0), unit: info?.unit, color: 'emerald' },
                            { label: 'Tổng Mua (Kỳ)', value: activity.purchases.reduce((a, b) => a + (Number(b.items?.[0]?.so_luong) || 0), 0), unit: info?.unit, color: 'purple' },
                            {
                                label: 'Đơn giá TB',
                                value: (() => {
                                    const totalQty = activity.sales.reduce((a, b) => a + (Number(b.items?.[0]?.so_luong) || 0), 0);
                                    const totalRev = activity.sales.reduce((a, b) => a + (Number(b.items?.[0]?.so_luong) * Number(b.items?.[0]?.don_gia || 0)), 0);
                                    return totalQty > 0 ? (totalRev / totalQty) : 0;
                                })(),
                                unit: 'VNĐ',
                                color: 'blue'
                            },
                            {
                                label: 'Lợi nhuận gộp',
                                value: (() => {
                                    const avgSale = activity.sales.length ? (activity.sales.reduce((a, b) => a + Number(b.items?.[0]?.don_gia || 0), 0) / activity.sales.length) : 0;
                                    const avgBuy = activity.purchases.length ? (activity.purchases.reduce((a, b) => a + Number(b.items?.[0]?.don_gia || 0), 0) / activity.purchases.length) : 0;
                                    if (!avgSale || !avgBuy) return 'N/A';
                                    const margin = ((avgSale - avgBuy) / avgSale) * 100;
                                    return margin.toFixed(1);
                                })(),
                                unit: '%',
                                color: 'amber'
                            }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                <label className={`text-[8px] font-black uppercase text-${stat.color}-400 mb-1`}>{stat.label}</label>
                                <div className="text-sm font-black text-slate-800">
                                    {typeof stat.value === 'number' ? formatNumber(Math.round(stat.value)) : stat.value}
                                    <span className="text-[8px] ml-1 text-slate-400">{stat.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- NAVIGATION TABS (STICKY) --- */}
                    <div className="sticky top-0 z-[20] flex bg-white px-6 pt-2 border-b gap-3 overflow-x-auto no-scrollbar items-center shadow-sm">
                        {[
                            { id: 'analytics', label: 'Phân tích & Xu hướng', icon: 'bar-chart', color: 'indigo' },
                            { id: 'sales', label: `Lịch sử Bán (${activity.sales.length})`, icon: 'activity', color: 'emerald' },
                            { id: 'purchases', label: `Lịch sử Mua (${activity.purchases.length})`, icon: 'shopping-cart', color: 'purple' },
                            { id: 'info', label: `Chi tiết Kho (${info?.locations?.length || 0})`, icon: 'package', color: 'blue' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-3.5 px-5 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? `border-${tab.color}-600 text-${tab.color}-600 bg-${tab.color}-50/30`
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Icon name={tab.id === 'analytics' ? 'bar-chart' : (tab.id === 'sales' ? 'activity' : (tab.id === 'purchases' ? 'shopping-cart' : 'package'))} className="w-4 h-4" />
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

                    {/* --- CONTENT AREA AREA --- */}
                    <div className="p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-black text-xs uppercase tracking-widest text-indigo-600">Đang đồng bộ dữ liệu V3.5...</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">

                                {/* TAB 0: ANALYTICS (CHART) */}
                                {activeTab === 'analytics' && (
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                                            <div className="flex justify-between items-center mb-8">
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Biểu đồ Xu hướng Bán - Mua - Giá</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Dữ liệu từ {formatDate(dates.start)} đến {formatDate(dates.end)}</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                        <span className="text-[10px] font-bold text-slate-500">BÁN</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                        <span className="text-[10px] font-bold text-slate-500">MUA</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                                        <span className="text-[10px] font-bold text-slate-500">GIÁ BÁN</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-[400px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart
                                                        data={chartData}
                                                        onClick={(data) => handleChartClick(data)}
                                                        cursor="pointer"
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis
                                                            dataKey="name"
                                                            fontSize={10}
                                                            fontWeight="bold"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#64748b' }}
                                                        />
                                                        <YAxis
                                                            yAxisId="left"
                                                            fontSize={10}
                                                            fontWeight="bold"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#64748b' }}
                                                            label={{ value: 'Số lượng', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                                                        />
                                                        <YAxis
                                                            yAxisId="right"
                                                            orientation="right"
                                                            fontSize={10}
                                                            fontWeight="bold"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: '#94a3b8' }}
                                                            tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                                                            label={{ value: 'Đơn giá', angle: 90, position: 'insideRight', fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '4px' }}
                                                            labelStyle={{ fontWeight: '900', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}
                                                            formatter={(value, name) => [formatNumber(value), name === 'salesQty' ? 'Số lượng Bán' : (name === 'purchaseQty' ? 'Số lượng Mua' : (name === 'salePrice' ? 'Giá Bán (VNĐ)' : 'Giá Nhập (VNĐ)'))]}
                                                        />
                                                        <Area yAxisId="left" type="monotone" dataKey="salesQty" fill="#10b98120" stroke="#10b981" strokeWidth={3} />
                                                        <Area yAxisId="left" type="monotone" dataKey="purchaseQty" fill="#a855f720" stroke="#a855f7" strokeWidth={3} />
                                                        <Line yAxisId="right" type="stepAfter" dataKey="salePrice" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, stroke: '#3b82f6', fill: '#fff' }} activeDot={{ r: 6 }} />
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
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                                {activity.sales.filter(o => !filterDate || moment(o.ngay).format('YYYY-MM-DD') === filterDate).length > 0
                                                    ? activity.sales.filter(o => !filterDate || moment(o.ngay).format('YYYY-MM-DD') === filterDate).map((order, idx) => (
                                                        <tr key={idx} className="hover:bg-emerald-50/20 group transition-all">
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{formatDate(order.ngay)}</td>
                                                            <td className="px-6 py-4">
                                                                <button onClick={() => handleOrderClick(order.id || order.unique_order_key, 'sale')} className="text-indigo-600 hover:text-indigo-800 font-black text-xs font-mono bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95">
                                                                    {order.so_phieu}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-extrabold text-xs text-slate-800 uppercase line-clamp-1">{order.ten_khncc}</div>
                                                                {order.ghi_chu_tren_phieu && <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">{order.ghi_chu_tren_phieu}</div>}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{order.nguoi_phu_trach}</td>
                                                            <td className="px-6 py-4 text-right text-xs font-black text-slate-900">{order.items?.[0] ? formatNumber(order.items[0].don_gia) : '-'}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                                                    {order.items?.[0]?.so_luong || '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : <tr><td colSpan="6" className="py-20 text-center opacity-40"><p className="font-black text-xs text-slate-400 uppercase tracking-widest">Không có dữ liệu trong tuần này</p></td></tr>}
                                            </tbody>
                                        </table>
                                        {hasMore.sales && (
                                            <div className="p-4 bg-slate-50 border-t flex justify-center">
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={isActionLoading}
                                                    className="px-8 py-2.5 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                                >
                                                    {isActionLoading ? 'ĐANG ĐỒNG BỘ...' : 'XEM THÊM LỊCH SỬ BÁN'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: LỊCH SỬ MUA (Tương tự Sales) */}
                                {activeTab === 'purchases' && (
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="min-w-full">
                                            <thead className="bg-slate-50 text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Thời gian</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Số phiếu</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Nhà cung cấp</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">NV</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {activity.purchases.filter(p => !filterDate || moment(p.ngay).format('YYYY-MM-DD') === filterDate).length > 0
                                                    ? activity.purchases.filter(p => !filterDate || moment(p.ngay).format('YYYY-MM-DD') === filterDate).map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-purple-50/20 group transition-all">
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{formatDate(item.ngay)}</td>
                                                            <td className="px-6 py-4">
                                                                <button onClick={() => handleOrderClick(item.id || item.unique_order_key, 'purchase')} className="text-purple-600 hover:text-purple-800 font-black text-xs font-mono bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 shadow-sm">
                                                                    {item.so_phieu}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 font-extrabold text-xs text-slate-800 uppercase">{item.ten_khncc}</td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{item.nguoi_phu_trach}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="text-sm font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                                                                    {item.items?.[0]?.so_luong || '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : <tr><td colSpan="5" className="py-20 text-center opacity-40"><p className="font-black text-xs text-slate-400 uppercase tracking-widest">Không có dữ liệu mua hàng</p></td></tr>}
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

                                {/* TAB 3: TỒN KHO CHI TIẾT */}
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
                                                            <span className="text-lg font-black text-indigo-600 tabular-nums">
                                                                {formatNumber(loc.quantity)}
                                                            </span>
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
        </React.Fragment>
    );
};

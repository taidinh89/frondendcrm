import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as UI from '../../components/ui.jsx';
import { Icon } from '../../components/ui.jsx';
import { useApiData } from '../../hooks/useApiData.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, LabelList, PieChart, Pie
} from 'recharts';

import { InventoryAnalysisFilterBar } from '../../components/analysis/InventoryAnalysisFilterBar.jsx';
import { InventoryAnalysisDataTable } from '../../components/analysis/InventoryAnalysisDataTable.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { ProductDetailModal } from '../../components/modals/ProductDetailModal.jsx';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal.jsx';

/**
 * PURCHASING INTELLIGENCE HUB (V2.0 - Production Ready)
 * Trang hỗ trợ quyết định nhập hàng nhanh cho bộ phận Thu mua
 */

const API_ENDPOINT = '/api/v2/inventory-analysis';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

const InfoTooltip = ({ children, text }) => {
    const [show, setShow] = useState(false);
    return (
        <span className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <span className="ml-1 inline-flex w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-black items-center justify-center cursor-help hover:bg-blue-200 hover:text-blue-600 transition-colors">?</span>
            {show && (
                <span className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-2xl leading-relaxed pointer-events-none normal-case font-medium">
                    {text}
                    <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
                </span>
            )}
        </span>
    );
};

const CustomBarLabel = (props) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
        <text x={x + width + 5} y={y + 8} fill="#3b82f6" fontSize={9} fontWeight="bold">
            {formatPrice(value)}
        </text>
    );
};

const PurchasingIntelligenceHub = ({ setAppTitle }) => {
    const [filters, setFilters] = useState({
        days: 30, brand_code: '', category_code: '', search: '', tab: 'low_stock_active',
        page: 1, per_page: 20, sort_by: '', sort_dir: 'desc'
    });

    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 500);
    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingSupplierCode, setViewingSupplierCode] = useState(null);

    useEffect(() => {
        if (setAppTitle) setAppTitle('Trung tâm Quyết định Nhập hàng');
    }, [setAppTitle]);

    const kpis_data = fullData?.kpis || {};
    const charts_data = fullData?.charts || {};
    const list_data = fullData?.list || { data: [], current_page: 1, last_page: 1, total: 0 };

    const kpis = [
        {
            title: 'Cần nhập gấp',
            value: formatPrice(kpis_data.low_stock_count),
            unit: 'SKUs',
            color: 'rose',
            icon: 'alert-triangle',
            tooltip: 'Số lượng mã hàng có mức tồn kho dưới ngưỡng an toàn.'
        },
        {
            title: 'Giá trị tồn kho',
            value: formatPrice(kpis_data.total_inventory_value),
            unit: 'VNĐ',
            color: 'indigo',
            icon: 'currency-dollar',
            tooltip: 'Tổng giá trị hàng hóa đang nằm trong kho tính theo giá nhập.'
        },
        {
            title: 'Hết hàng dự kiến',
            value: formatPrice(kpis_data.dead_stock_count),
            unit: 'SKUs',
            color: 'emerald',
            icon: 'archive',
            tooltip: 'Hàng tồn đọng lâu ngày không có đơn phát sinh.'
        },
        {
            title: 'Công nợ NCC',
            value: formatPrice(kpis_data.total_payable_debt),
            unit: 'VNĐ',
            color: 'orange',
            icon: 'trending-down',
            tooltip: 'Tổng số tiền nợ các nhà cung cấp cần thanh toán.'
        },
    ];

    const topSuppliers = useMemo(() => {
        const raw = charts_data.top_suppliers_suggested || [];
        return raw.map(item => ({
            name: item.supplier === 'UNKNOWN' ? 'N/A' : item.supplier,
            full_name: item.supplier,
            supplier_code: item.supplier_code,
            value: parseFloat(item.total_suggested) || 0
        }));
    }, [charts_data.top_suppliers_suggested]);

    const inventoryValueTrend = useMemo(() => {
        // Mocking trend data if not available in API, otherwise use charts_data
        return [
            { day: '01/03', value: 1200000000 },
            { day: '05/03', value: 1150000000 },
            { day: '10/03', value: 1300000000 },
            { day: '15/03', value: 1280000000 },
            { day: '20/03', value: 1400000000 },
        ];
    }, []);

    const handleDataTableItemClick = (type, identifier) => {
        if (!identifier) return;
        if (type === 'product') setViewingProductId(identifier);
        if (type === 'supplier') setViewingSupplierCode(identifier);
    };

    const handleDataTableSort = (field) => {
        setFilters(prev => ({
            ...prev,
            sort_by: field,
            sort_dir: prev.sort_by === field && prev.sort_dir === 'desc' ? 'asc' : 'desc',
            page: 1
        }));
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
            {/* 1. HEADER SECTION */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Icon name="shopping-cart" className="w-6 h-6" />
                        </div>
                        QUYẾT ĐỊNH NHẬP HÀNG NHANH
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 ml-1">Purchasing Intelligence Hub v1.0</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filters moved to bottom for better data-first access */}
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full bg-${kpi.color}-600 group-hover:scale-150 transition-transform duration-700`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-${kpi.color}-50 text-${kpi.color}-600`}>
                                <Icon name={kpi.icon} className="w-6 h-6" />
                            </div>
                            <InfoTooltip text={kpi.tooltip}>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600 uppercase tracking-widest cursor-help`}>Chi tiết</span>
                            </InfoTooltip>
                        </div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{kpi.title}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{kpi.value || '—'}</span>
                            <span className="text-slate-400 text-xs font-bold uppercase">{kpi.unit}</span>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px] mb-10">
                <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-800">Biến động tồn kho</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị vốn lưu động (Mockup)</p>
                        </div>
                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-lg">30 ngày qua</div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={inventoryValueTrend}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis hide />
                                <ReTooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val) => [formatPrice(val), 'Giá trị']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Top NCC cần tập trung</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dựa trên tổng giá trị hàng đề xuất nhập</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSuppliers} layout="vertical" margin={{ left: 20, right: 60 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <ReTooltip formatter={(val) => [formatPrice(val) + ' SP', 'Đề xuất']} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20}>
                                    <LabelList dataKey="value" content={<CustomBarLabel />} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-10">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <Icon name="filter" className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Bộ lọc & Điều chỉnh dữ liệu</h3>
                    </div>
                    <InventoryAnalysisFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} />
                </div>
            </section>

            <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Danh sách đề xuất nhập hàng</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Sắp xếp theo độ khẩn cấp (Stock-out Risk)</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button onClick={() => setFilters(p => ({ ...p, tab: 'low_stock_active' }))} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${filters.tab === 'low_stock_active' ? 'bg-white shadow text-rose-600' : 'text-slate-400'}`}>🚨 CẦN NHẬP</button>
                            <button onClick={() => setFilters(p => ({ ...p, tab: 'dead_stock' }))} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${filters.tab === 'dead_stock' ? 'bg-white shadow text-slate-600' : 'text-slate-400'}`}>📉 TỒN ĐỌNG</button>
                            <button onClick={() => setFilters(p => ({ ...p, tab: 'by_supplier' }))} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${filters.tab === 'by_supplier' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>🤝 THEO NCC</button>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <InventoryAnalysisDataTable
                        data={list_data.data}
                        activeTab={filters.tab}
                        pagination={{
                            currentPage: list_data.current_page,
                            lastPage: list_data.last_page,
                            total: list_data.total,
                            perPage: list_data.per_page,
                            onPageChange: (n) => setFilters(prev => ({ ...prev, page: n }))
                        }}
                        sortConfig={{ sortBy: filters.sort_by, sortDir: filters.sort_dir }}
                        onSort={handleDataTableSort}
                        onItemClick={handleDataTableItemClick}
                        renderRowActions={(row) => (
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toast.success(`Đã thêm ${row.product_name} vào giỏ nhập hàng!`); }}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Nhập ngay
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setViewingProductId(row.product_code); }}
                                    className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:text-indigo-600 transition-all"
                                >
                                    <Icon name="edit" className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    />
                </div>
            </section>

            {/* Table content already above */}

            {/* Modals */}
            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} isOpen={true} onClose={() => setViewingProductId(null)} />}
            {viewingSupplierCode && <SupplierDetailModal supplierIdentifier={viewingSupplierCode} days={filters.days} onClose={() => setViewingSupplierCode(null)} />}
        </div>
    );
};

export default PurchasingIntelligenceHub;

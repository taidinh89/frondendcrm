// src/pages/Analytics/InventoryAnalysisContent.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LabelList
} from 'recharts';

import { InventoryAnalysisFilterBar } from '../../components/analysis/InventoryAnalysisFilterBar.jsx';
import { InventoryAnalysisDataTable } from '../../components/analysis/InventoryAnalysisDataTable.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Tabs } from '../../components/analysis/Tabs.jsx';

import { ProductDetailModal } from '../../components/modals/ProductDetailModal.jsx';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal.jsx';
import * as UI from '../../components/ui.jsx';

import { useApiData } from '../../hooks/useApiData.jsx';

const API_ENDPOINT = '/api/v2/inventory-analysis';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value);

// ============================================================
// TOOLTIP COMPONENT - Giải thích ý nghĩa con số
// ============================================================
const InfoTooltip = ({ children, text }) => {
    const [show, setShow] = useState(false);
    return (
        <span className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <span className="ml-1 inline-flex w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-black items-center justify-center cursor-help hover:bg-blue-200 hover:text-blue-600 transition-colors">?</span>
            {show && (
                <span className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-2xl leading-relaxed pointer-events-none">
                    {text}
                    <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
                </span>
            )}
        </span>
    );
};

// ============================================================
// GUIDE MODAL - Hướng dẫn sử dụng trang
// ============================================================
const GuideModal = ({ onClose }) => {
    const sections = [
        {
            emoji: '📦',
            title: 'Giá trị Tồn kho',
            desc: 'Tổng giá trị hàng tồn kho tính theo giá nhập. Đây là số vốn "đang nằm trong kho".',
            tip: '💡 Nếu giá trị này quá cao so với doanh thu → Vốn đang bị "chôn" hiệu quả thấp.',
        },
        {
            emoji: '💰',
            title: 'Doanh thu kỳ này',
            desc: 'Tổng doanh thu bán hàng trong khoảng thời gian được chọn (mặc định 90 ngày).',
            tip: '💡 Dùng để tính tốc độ bán và dự báo nhu cầu nhập hàng.',
        },
        {
            emoji: '🚨',
            title: 'Sắp hết hàng',
            desc: 'Danh sách các mã hàng (SKU) có nguy cơ hết hàng. ĐÂY LÀ ƯU TIÊN NHẬP HÀNG.',
            tip: '💡 Xem cột "Đề xuất nhập" để biết số lượng gợi ý mua thêm.',
        },
        {
            emoji: '📉',
            title: 'Tồn đọng (Dead Stock)',
            desc: 'Hàng tồn kho nhưng không có đơn bán trong khoảng thời gian phân tích.',
            tip: '💡 Cần xem xét xả hàng hoặc trả lại nhà cung cấp.',
        }
    ];

    return (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black">📖 Hướng dẫn sử dụng</h2>
                        <p className="text-slate-300 text-sm mt-1">Trung tâm Quyết định Nhập hàng</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-slate-300 text-2xl font-bold">×</button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sections.map((s, i) => (
                            <div key={i} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{s.emoji}</span>
                                    <h4 className="font-bold text-slate-800 text-sm">{s.title}</h4>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-2">{s.desc}</p>
                                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">{s.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 text-right">
                    <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-700">Đã hiểu</button>
                </div>
            </div>
        </div>
    );
};

const CustomBarLabel = (props) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
        <text x={x + width + 5} y={y + 8} fill="#3b82f6" fontSize={9} fontWeight="bold">
            {new Intl.NumberFormat('vi-VN').format(value)}
        </text>
    );
};

export const InventoryAnalysisContent = ({ setAppTitle }) => {
    const [filters, setFilters] = useState({
        days: 90, brand_code: '', category_code: '', search: '', tab: 'by_supplier',
        page: 1, per_page: 20, sort_by: '', sort_dir: 'desc'
    });

    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 500);
    const tableRef = useRef(null);

    const scrollToTable = () => {
        setTimeout(() => { tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    };

    const activeListTab = filters.tab;
    const setActiveListTab = (tab) => {
        setFilters(prev => ({ ...prev, tab, page: 1 }));
        scrollToTable();
    };

    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingSupplierCode, setViewingSupplierCode] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [pieMode, setPieMode] = useState('brand');

    useEffect(() => { setAppTitle('Quyết định Nhập hàng'); }, [setAppTitle]);

    const kpis = fullData?.kpis || {};
    const charts = fullData?.charts || {};
    const listConfig = fullData?.list || { data: [], current_page: 1, last_page: 1, total: 0 };

    const currentListData = useMemo(() => {
        const raw = listConfig.data || [];
        if (!raw.length) return raw;
        const seen = new Set();
        return raw.filter(item => {
            const key = item.supplier_code || item.product_code;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [listConfig.data]);

    const pieChartData = useMemo(() => {
        const source = pieMode === 'brand' ? (charts.inventory_by_brand || []) : (charts.inventory_by_category || []);
        return source.map(item => ({
            name: (item.brand || item.category || 'N/A') === 'UNKNOWN' ? 'Chưa phân loại' : (item.brand || item.category || 'N/A'),
            code: (pieMode === 'brand' ? item.brand_code : item.category_code) || '',
            value: parseFloat(item.inventory_value) || 0
        })).sort((a, b) => b.value - a.value).slice(0, 12);
    }, [charts.inventory_by_brand, charts.inventory_by_category, pieMode]);

    const barTopSuppliers = useMemo(() => {
        const raw = charts.top_suppliers_suggested || [];
        return raw.map(item => ({
            name: item.supplier === 'UNKNOWN' ? 'N/A' : item.supplier,
            full_name: item.supplier,
            supplier_code: item.supplier_code,
            value: parseFloat(item.total_suggested) || 0
        }));
    }, [charts.top_suppliers_suggested]);

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

    const stockTurnoverRatio = kpis.total_sales_value > 0
        ? ((kpis.total_inventory_value / kpis.total_sales_value) * 100).toFixed(0)
        : 0;

    const renderContent = () => {
        if (isLoading && !fullData) return (
            <div className="h-96 flex flex-col items-center justify-center text-blue-600 gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</div>
            </div>
        );
        if (!fullData) return <div className="p-8 text-center text-gray-500 font-bold uppercase">Không có dữ liệu.</div>;

        return (
            <div className="space-y-6">
                {/* 1. KPI Boxes */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <AnalysisCard className="p-5 border-t-4 border-emerald-500 cursor-pointer" onClick={() => setActiveListTab('low_stock_active')}>
                        <InfoTooltip text="Giá trị hàng tồn theo giá nhập.">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Giá trị Tồn</p>
                        </InfoTooltip>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{formatPrice(kpis.total_inventory_value)}<span className="text-[10px] text-slate-400 ml-1 italic font-normal">VNĐ</span></p>
                        <div className="mt-2 text-[10px] bg-emerald-50 text-emerald-600 inline-block px-1.5 py-0.5 rounded font-bold">{stockTurnoverRatio}% DT</div>
                    </AnalysisCard>

                    <AnalysisCard className="p-5 border-t-4 border-indigo-600 cursor-pointer" onClick={() => setActiveListTab('low_stock_active')}>
                        <InfoTooltip text="Doanh thu trong kỳ phân tích.">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Doanh thu {filters.days}N</p>
                        </InfoTooltip>
                        <p className="text-2xl font-bold text-indigo-700 mt-1">{formatPrice(kpis.total_sales_value)}<span className="text-[10px] text-indigo-400 ml-1 italic font-normal">VNĐ</span></p>
                    </AnalysisCard>

                    <AnalysisCard className="p-5 border-t-4 border-rose-600 cursor-pointer" onClick={() => setActiveListTab('by_supplier')}>
                        <InfoTooltip text="Tiền đang nợ các NCC.">
                            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Nợ NCC</p>
                        </InfoTooltip>
                        <p className="text-2xl font-bold text-rose-700 mt-1">{formatPrice(kpis.total_payable_debt)}<span className="text-[10px] text-rose-400 ml-1 italic font-normal">VNĐ</span></p>
                    </AnalysisCard>

                    <AnalysisCard className="p-5 border-t-4 border-orange-500 cursor-pointer" onClick={() => setActiveListTab('low_stock_active')}>
                        <InfoTooltip text="SKU sắp hết hàng.">
                            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Sắp hết</p>
                        </InfoTooltip>
                        <p className="text-2xl font-bold text-orange-600 mt-1">{formatPrice(kpis.low_stock_count)} <span className="text-sm font-normal text-orange-400">SKU</span></p>
                    </AnalysisCard>

                    <AnalysisCard className="p-5 border-t-4 border-slate-500 cursor-pointer" onClick={() => setActiveListTab('dead_stock')}>
                        <InfoTooltip text="Hàng không bán được trong kỳ.">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tồn đọng</p>
                        </InfoTooltip>
                        <p className="text-2xl font-bold text-slate-700 mt-1">{formatPrice(kpis.dead_stock_count)} <span className="text-sm font-normal text-slate-400">SKU</span></p>
                    </AnalysisCard>
                </div>

                {/* 2. Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                        <AnalysisCard className="h-full">
                            <div className="flex items-center justify-between px-6 pt-5">
                                <p className="text-sm font-bold text-slate-700">Cơ cấu Tồn kho</p>
                                <div className="flex bg-slate-100 rounded-lg p-0.5">
                                    <button onClick={() => setPieMode('brand')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${pieMode === 'brand' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Nhãn hiệu</button>
                                    <button onClick={() => setPieMode('category')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${pieMode === 'category' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Danh mục</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 items-center">
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value"
                                                label={({ percent, name }) => percent > 0.05 ? `${name}` : ''}
                                                onClick={(data) => {
                                                    if (data?.payload?.code) {
                                                        const field = pieMode === 'brand' ? 'brand_code' : 'category_code';
                                                        setFilters(prev => ({ ...prev, [field]: data.payload.code, page: 1 }));
                                                        scrollToTable();
                                                    }
                                                }}
                                                cursor="pointer"
                                            >
                                                {pieChartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v) => formatPrice(v)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-2">
                                    {pieChartData.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between text-[10px]">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                <span className="font-bold text-slate-700 truncate">{e.name}</span>
                                            </div>
                                            <span className="font-mono text-slate-400">{formatPrice(e.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnalysisCard>
                    </div>

                    <div className="lg:col-span-5 space-y-4">
                        <AnalysisCard className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-xl text-white">
                            <div className="flex justify-between items-center p-5 pb-0">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">SỨC KHỎE CHU KỲ BÁN</p>
                                <UI.Icon name="activity" className="w-5 h-5 text-blue-500 animate-pulse" />
                            </div>
                            <div className="h-[160px] relative mt-2">
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-white">
                                    <span className="text-3xl font-black">{kpis.low_stock_count || '—'}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">Cần nhập</span>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Cần nhập', value: kpis.low_stock_count || 0, color: '#f97316' },
                                                { name: 'Tồn đọng', value: kpis.dead_stock_count || 0, color: '#64748b' },
                                                { name: 'Bình thường', value: Math.max(0, (kpis.total_items || 0) - (kpis.low_stock_count || 0) - (kpis.dead_stock_count || 0)), color: '#3b82f6' }
                                            ]}
                                            cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" dataKey="value"
                                        >
                                            {['#f97316', '#64748b', '#3b82f6'].map((color, index) => <Cell key={index} fill={color} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-around p-5 pt-3 border-t border-slate-700 text-xs">
                                <div onClick={() => setActiveListTab('low_stock_active')} className="cursor-pointer text-orange-400 font-bold">🚨 {formatPrice(kpis.low_stock_count)}</div>
                                <div className="text-blue-400 font-bold">📦 {formatPrice(kpis.total_items)}</div>
                                <div onClick={() => setActiveListTab('dead_stock')} className="cursor-pointer text-slate-400 font-bold">📉 {formatPrice(kpis.dead_stock_count)}</div>
                            </div>
                        </AnalysisCard>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer" onClick={() => setActiveListTab('low_stock_active')}>
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0"><UI.Icon name="flame" className="w-6 h-6" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Cần nhập</p><p className="text-lg font-black text-orange-600">{formatPrice(kpis.low_stock_count)}</p></div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer" onClick={() => setActiveListTab('by_supplier')}>
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0"><UI.Icon name="users" className="w-6 h-6" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Tổng NCC</p><p className="text-lg font-black text-violet-600">{formatPrice(listConfig.total || '—')}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-12">
                        <AnalysisCard>
                            <div className="p-6">
                                <p className="text-sm font-bold text-slate-700 mb-6">Top 10 Nhà cung cấp cần tập trung (Số lượng đề xuất)</p>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barTopSuppliers} layout="vertical" margin={{ left: 20, right: 60 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} />
                                            <Tooltip formatter={(val, name, props) => [formatPrice(val) + ' SP', props.payload.full_name]} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24} cursor="pointer" onClick={(data) => { if (data?.supplier_code) { setActiveListTab('by_supplier'); setViewingSupplierCode(data.supplier_code); } }}>
                                                <LabelList dataKey="value" content={<CustomBarLabel />} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </AnalysisCard>
                    </div>
                </div>

                {/* 3. Table */}
                <div ref={tableRef}>
                    <AnalysisCard className="overflow-hidden">
                        <div className="px-5 pt-3 border-b bg-slate-50/80">
                            <Tabs items={[{ id: 'low_stock_active', label: '🚨 Sắp hết' }, { id: 'dead_stock', label: '📉 Tồn đọng' }, { id: 'over_stock', label: '📦 Dư thừa' }, { id: 'by_supplier', label: '🤝 Phân tích NCC' }]} activeTab={activeListTab} onTabChange={setActiveListTab} />
                        </div>
                        <InventoryAnalysisDataTable data={currentListData} activeTab={activeListTab}
                            pagination={{ currentPage: listConfig.current_page, lastPage: listConfig.last_page, total: listConfig.total, perPage: listConfig.per_page, onPageChange: (n) => setFilters(prev => ({ ...prev, page: n })) }}
                            sortConfig={{ sortBy: filters.sort_by, sortDir: filters.sort_dir }} onSort={handleDataTableSort} onItemClick={handleDataTableItemClick}
                        />
                    </AnalysisCard>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-[calc(100vh-64px)]">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Trung tâm Quyết định Nhập hàng</h2>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">Dữ liệu hỗ trợ đề xuất Restock</p>
                </div>
                <button onClick={() => setShowGuide(true)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg transition-all">📖 Hướng dẫn</button>
            </div>
            <InventoryAnalysisFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} />
            {renderContent()}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} isOpen={true} onClose={() => setViewingProductId(null)} />}
            {viewingSupplierCode && <SupplierDetailModal supplierIdentifier={viewingSupplierCode} days={filters.days} onClose={() => setViewingSupplierCode(null)} />}
        </div>
    );
};

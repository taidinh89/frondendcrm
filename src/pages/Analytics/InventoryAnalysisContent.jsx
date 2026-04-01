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
        days: 90, brand: [], category: [], l3: [], search: '', tab: 'all_products',
        page: 1, per_page: 100, sort_by: '', sort_dir: 'desc', include_oos: ''
    });

    // Chuyển đổi mảng filter sang chuỗi comma-separated trước khi gửi API
    const apiFilters = useMemo(() => {
        return {
            ...filters,
            brand: filters.brand?.join(','),
            category: filters.category?.join(','),
            l3: filters.l3?.join(','),
        };
    }, [filters]);

    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, apiFilters, 500);
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
    const suggests = fullData?.suggests || [];

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

    // Khi bấm gợi ý autocomplete: tìm chính xác mã đó hoặc NCC đó và chuyển tab phù hợp
    const handleSelectSuggest = (suggest) => {
        if (suggest.type === 'supplier') {
            // Chế độ tìm Nhà cung cấp
            setFilters(prev => ({
                ...prev,
                search: suggest.supplier_name,
                search_field: 'supplier',
                tab: 'by_supplier',
                page: 1
            }));
            scrollToTable();
            return;
        }

        const targetTab = 'all_products';
        setFilters(prev => ({ ...prev, search: suggest.product_code, search_field: 'code', tab: targetTab, page: 1, brand: [], category: [], l3: [] }));
        scrollToTable();
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



                {/* 2. Filter + Table */}
                <div ref={tableRef}>
                    <AnalysisCard className="overflow-hidden">
                        <div className="p-3 border-b bg-white">
                            <InventoryAnalysisFilterBar
                                initialFilters={{ ...filters, filterOptions: fullData?.filter_options }}
                                onApplyFilters={setFilters}
                                isLoading={isLoading}
                            />
                        </div>
                        <div className="px-5 pt-3 border-b bg-slate-50/80">
                            <Tabs items={[{ id: 'all_products', label: '📦 Sản phẩm' }, { id: 'by_supplier', label: '🤝 Nhà cung cấp' }]} activeTab={activeListTab} onTabChange={setActiveListTab} />
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
            {renderContent()}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} isOpen={true} onClose={() => setViewingProductId(null)} />}
            {viewingSupplierCode && <SupplierDetailModal supplierIdentifier={viewingSupplierCode} days={filters.days} onClose={() => setViewingSupplierCode(null)} />}
        </div>
    );
};

// src/pages/Analytics/SalesAnalysisContent.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts';

// --- IMPORTS COMPONENTS ---
import { SalesAnalysisFilterBar } from '../../components/analysis/SalesAnalysisFilterBar.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Tabs } from '../../components/analysis/Tabs.jsx';
import { ProductGroupAnalysisDataTable } from '../../components/analysis/ProductGroupAnalysisDataTable.jsx';

// --- IMPORTS MODALS ---
import { ProductDetailModal } from '../../components/modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal.jsx';
import { SalesOrderDetailModal } from '../../components/modals/SalesOrderDetailModal.jsx';
import { Button, Icon } from '../../components/ui.jsx';

// --- UTILS & HOOKS ---
import { dateUtils } from '../../utils/dateUtils.js';
import { handleSalesExport } from '../../utils/salesExportLogic.js';
import { useApiData } from '../../hooks/useApiData.jsx';

const API_ENDPOINT = '/api/v2/sales-analysis';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value);

export const SalesAnalysisContent = ({ setAppTitle }) => {
    // 1. CẤU HÌNH FILTERS
    const defaultDates = dateUtils.getLast30Days();
    const [filters, setFilters] = useState({
        date_from: defaultDates.from,
        date_to: defaultDates.to,
        employee_ids: [],
        customer_ids: [],
        brand_codes: [],
        category_codes: [],
        include_returns: true
    });

    // 2. [FIX] SỬ DỤNG HOOK CHUẨN ĐỂ GỌI DATA
    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 300);

    const [activeListTab, setActiveListTab] = useState('products_profit');
    const [localSearch, setLocalSearch] = useState('');
    const [localFilterType, setLocalFilterType] = useState('ALL');

    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingCustomerId, setViewingCustomerId] = useState(null);
    const [viewingOrderId, setViewingOrderId] = useState(null);

    useEffect(() => { setAppTitle('Phân tích Hiệu quả Kinh doanh'); }, [setAppTitle]);

    // 3. TÍNH TOÁN KPI
    const charts = fullData?.charts || {};
    const totalRevenue = (charts.profit_trend || []).reduce((acc, item) => acc + (parseFloat(item.total_revenue) || 0), 0);
    const totalProfit = (charts.profit_trend || []).reduce((acc, item) => acc + (parseFloat(item.total_profit) || 0), 0);
    const totalCost = totalRevenue - totalProfit;

    const totalOrders = useMemo(() => {
        const empStats = fullData?.lists?.employees_stats || [];
        return empStats.reduce((sum, emp) => sum + (parseInt(emp.order_count) || 0), 0);
    }, [fullData]);

    const pieRevenueSplit = [
        { name: 'Lợi nhuận gộp', value: totalProfit > 0 ? totalProfit : 0 },
        { name: 'Giá vốn & Chi phí', value: totalCost > 0 ? totalCost : 0 }
    ];

    const pieProfitByBrand = useMemo(() => {
        const raw = charts.stats_by_brand_l1 || [];
        const top8 = raw.slice(0, 8);
        const others = raw.slice(8).reduce((sum, item) => sum + (parseFloat(item.total_profit) || 0), 0);
        const result = top8.map(item => ({
            name: item.category_name || item.category_id || 'Khác',
            value: parseFloat(item.total_profit) || 0
        }));
        if (others > 0) result.push({ name: 'Khác', value: others });
        return result;
    }, [charts.stats_by_brand_l1]);

    // MAPPING DATA
    const TAB_TO_DATA_KEY = {
        'products_profit': 'products_by_profit',
        'products_loss': 'products_by_loss',
        'products_frequency': 'products_by_frequency',
        'products_return': 'products_by_return_rate',
        'employees_stats': 'employees_stats',
        'listCustomerStats': 'listCustomerStats',
        'listCustomersByLoss': 'listCustomersByLoss',
        'listOrderStats': 'listOrderStats',
        'listOrdersByLoss': 'listOrdersByLoss'
    };

    const currentListData = useMemo(() => {
        if (!fullData?.lists) return [];
        const dataKey = TAB_TO_DATA_KEY[activeListTab];
        return fullData.lists[dataKey] || [];
    }, [fullData, activeListTab]);

    const filteredListData = useMemo(() => {
        if (!currentListData) return [];
        return currentListData.filter(item => {
            const searchStr = localSearch.toLowerCase();
            let match = true;
            if (searchStr) {
                const name = (item.ten_mat_hang || item.ten_khncc || item.nguoi_phu_trach || '').toLowerCase();
                const code = (item.ma_mat_hang || item.ma_khncc || item.so_phieu || '').toLowerCase();
                match = name.includes(searchStr) || code.includes(searchStr);
            }
            if (!match) return false;
            if (localFilterType === 'LOSS' && (item.total_profit || 0) >= 0) return false;
            if (localFilterType === 'RETURN') {
                const retVal = Math.abs(parseFloat(item.return_value || 0));
                const retRate = parseFloat(item.return_rate || 0);
                if (retVal === 0 && retRate === 0) return false;
            }
            return true;
        });
    }, [currentListData, localSearch, localFilterType]);

    const handleExportExcel = async () => {
        await handleSalesExport(filteredListData, activeListTab, filters);
    };

    const handleDataTableItemClick = (type, identifier) => {
        if (!identifier) return;
        if (type === 'product') setViewingProductId(identifier);
        if (type === 'customer') setViewingCustomerId(identifier);
        if (type === 'order') setViewingOrderId(identifier);
    };

    const renderContent = () => {
        if (isLoading && !fullData) return <div className="h-96 flex items-center justify-center text-blue-600 font-medium tracking-widest uppercase text-xs animate-pulse">⚡ Đang tải dữ liệu tinh gọn...</div>;
        if (!fullData) return <div className="p-20 text-center text-slate-300 italic font-medium">Chưa có dữ liệu cho khoảng thời gian này.</div>;

        return (
            <div className="space-y-6">
                {/* KPI Cards: Premium Wow Effect */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnalysisCard className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-emerald-500 to-teal-600">
                        <div className="p-6 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-emerald-100 text-xs font-black uppercase tracking-widest opacity-80">Lợi nhuận gộp</p>
                                    <h3 className="text-3xl font-black mt-1 leading-tight">{formatPrice(totalProfit)}</h3>
                                </div>
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                                    <Icon name="cash-multiple" className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded-lg">
                                <span>Net Profit Margin:</span>
                                <span className="text-emerald-200">
                                    {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'}
                                </span>
                            </div>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-blue-600 to-indigo-700">
                        <div className="p-6 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-blue-100 text-xs font-black uppercase tracking-widest opacity-80">Doanh thu thuần</p>
                                    <h3 className="text-3xl font-black mt-1 leading-tight">{formatPrice(totalRevenue)}</h3>
                                </div>
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                                    <Icon name="chart-bar" className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="text-[10px] font-bold opacity-70 italic tracking-wide">Đã trừ doanh thu trả hàng</div>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-amber-400 to-orange-600">
                        <div className="p-6 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-amber-100 text-xs font-black uppercase tracking-widest opacity-80">Hiệu suất Lãi</p>
                                    <h3 className="text-3xl font-black mt-1 leading-tight">
                                        {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'}
                                    </h3>
                                </div>
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                                    <Icon name="percent" className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="text-[10px] font-bold opacity-70 italic tracking-wide">Gross Profit Ratio</div>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Quy mô đơn hàng</p>
                                    <h3 className="text-3xl font-black mt-1 leading-tight text-white">{formatPrice(totalOrders)}</h3>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform text-white">
                                    <Icon name="list-numbered" className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="text-[10px] font-bold opacity-70 italic tracking-wide text-slate-300">Tổng phiếu xuất kho</div>
                        </div>
                    </AnalysisCard>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnalysisCard title="Cơ cấu Lợi nhuận / Doanh thu">
                        <div className="h-72 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieRevenueSplit} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                        <Cell fill="#10b981" /> <Cell fill="#e2e8f0" />
                                    </Pie>
                                    <Tooltip formatter={(val) => formatPrice(val)} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Tỷ trọng Lãi gộp theo Brand (Top 8)">
                        <div className="h-72 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieProfitByBrand} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                                        {pieProfitByBrand.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(val) => formatPrice(val)} />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>
                </div>

                {/* Table Data */}
                <AnalysisCard title={
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                            <span className="font-black text-slate-800 text-lg uppercase tracking-tight">Chi tiết hiệu quả kinh doanh</span>
                        </div>
                        <Button variant="primary" size="sm" onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 border-none rounded-xl font-bold uppercase text-[11px] tracking-widest px-4 py-2 flex items-center gap-2">
                            <Icon name="export-variant" className="w-4 h-4" />
                            Xuất báo cáo Excel
                        </Button>
                    </div>
                }
                >
                    <div className="px-4 pt-2 border-b bg-gray-50 rounded-t-lg font-bold">
                        <Tabs
                            items={[
                                { id: 'products_profit', label: 'Top Lãi' },
                                { id: 'products_loss', label: 'Top Lỗ' },
                                { id: 'products_return', label: 'Hàng Lỗi/Trả' },
                                { id: 'products_frequency', label: 'Bán chạy' },
                                { id: 'employees_stats', label: 'Nhân viên' },
                                { id: 'listOrderStats', label: 'Đơn hàng' },
                                { id: 'listOrdersByLoss', label: 'Đơn Lỗ' }
                            ]}
                            activeTab={activeListTab}
                            onTabChange={(tab) => { setActiveListTab(tab); setLocalSearch(''); setLocalFilterType('ALL'); }}
                        />
                    </div>

                    <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Tìm kiếm nhanh</label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Nhập tên SP, mã đơn, tên khách..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lọc trạng thái</label>
                                <select
                                    className="block w-full py-2 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                    value={localFilterType}
                                    onChange={(e) => setLocalFilterType(e.target.value)}
                                >
                                    <option value="ALL">Tất cả dữ liệu</option>
                                    <option value="LOSS">⚠️ Chỉ các mục đang Lỗ</option>
                                    <option value="RETURN">↩️ Các mục có Trả hàng</option>
                                </select>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Kết quả: <strong>{filteredListData.length}</strong></div>
                        </div>

                        <ProductGroupAnalysisDataTable
                            data={filteredListData}
                            type={
                                activeListTab.includes('employees') ? 'employees' :
                                    activeListTab.includes('Customer') ? 'customers' :
                                        activeListTab.includes('Order') ? 'orders' :
                                            activeListTab.includes('frequency') ? 'frequency' :
                                                'products'
                            }
                            onItemClick={handleDataTableItemClick}
                        />
                    </div>
                </AnalysisCard>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-8 bg-[#f8fafc] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Phân tích Hiệu quả Kinh doanh</h2>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Dữ liệu thời gian thực từ hệ thống Misa & Ecount
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <label className="inline-flex items-center cursor-pointer space-x-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-300 transition-all">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                            checked={filters.include_returns}
                            onChange={(e) => setFilters(prev => ({ ...prev, include_returns: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Net Sales Mode</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bao gồm hàng trả</span>
                        </div>
                    </label>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-3 left-6 inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full z-10 shadow-lg">
                    <Icon name="filter-variant" className="w-3 h-3" /> Bộ lọc nâng cao
                </div>
                <SalesAnalysisFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} />
            </div>

            {renderContent()}

            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} onClose={() => setViewingProductId(null)} />}
            {viewingCustomerId && <CustomerDetailModal customerIdentifier={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />}
            {viewingOrderId && <SalesOrderDetailModal orderIdentifier={viewingOrderId} onClose={() => setViewingOrderId(null)} />}
        </div>
    );
};

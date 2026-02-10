// src/pages/SalesAnalysisContent.jsx
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
import { ProductDetailModal } from '../../components/Modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/Modals/CustomerDetailModal.jsx';
import { SalesOrderDetailModal } from '../../components/Modals/SalesOrderDetailModal.jsx';
import { Button, Icon } from '../../components/ui.jsx'; 

// --- UTILS & HOOKS ---
import { dateUtils } from '../../utils/dateUtils.js';
import { handleSalesExport } from '../../utils/salesExportLogic.js';
import { useApiData } from '../../hooks/useApiData.jsx'; // <--- QUAN TRỌNG: Import Hook này

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
    // Hook này đã bao gồm: Debounce 300ms, AbortController, Smart Dedup (chống gọi trùng)
    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 300);

    const [activeListTab, setActiveListTab] = useState('products_profit');
    const [localSearch, setLocalSearch] = useState('');
    const [localFilterType, setLocalFilterType] = useState('ALL');

    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingCustomerId, setViewingCustomerId] = useState(null);
    const [viewingOrderId, setViewingOrderId] = useState(null);

    useEffect(() => { setAppTitle('Phân tích Hiệu quả Kinh doanh'); }, [setAppTitle]);

    // 3. TÍNH TOÁN KPI (Giữ nguyên logic cũ)
    const charts = fullData?.charts || {};
    const totalRevenue = (charts.profit_trend || []).reduce((acc, item) => acc + (parseFloat(item.total_revenue)||0), 0);
    const totalProfit = (charts.profit_trend || []).reduce((acc, item) => acc + (parseFloat(item.total_profit)||0), 0);
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
        const others = raw.slice(8).reduce((sum, item) => sum + (parseFloat(item.total_profit)||0), 0);
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

    // LỌC CỤC BỘ (CLIENT-SIDE)
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
        // Chỉ hiện loading khi chưa có data lần đầu
        if (isLoading && !fullData) return <div className="h-96 flex items-center justify-center text-blue-600 font-medium">Đang tải dữ liệu...</div>;
        if (!fullData) return <div className="p-8 text-center text-gray-500">Chưa có dữ liệu.</div>;

        return (
            <div className="space-y-6">
                 {/* KPI Cards */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnalysisCard className="text-center py-4 border-t-4 border-green-500">
                        <p className="text-gray-500 text-sm font-medium">Lợi nhuận gộp</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatPrice(totalProfit)}</p>
                    </AnalysisCard>
                    <AnalysisCard className="text-center py-4 border-t-4 border-blue-500">
                        <p className="text-gray-500 text-sm font-medium">Doanh thu thuần</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatPrice(totalRevenue)}</p>
                    </AnalysisCard>
                    <AnalysisCard className="text-center py-4 border-t-4 border-purple-500">
                        <p className="text-gray-500 text-sm font-medium">Tỷ suất Lãi gộp</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                            {totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) + '%' : '0%'}
                        </p>
                    </AnalysisCard>
                    <AnalysisCard className="text-center py-4 border-t-4 border-gray-500">
                        <p className="text-gray-500 text-sm font-medium">Số đơn hàng</p>
                        <p className="text-2xl font-bold text-gray-700 mt-1">{formatPrice(totalOrders)}</p>
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
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Tỷ trọng Lãi gộp theo Nhóm L1 (Brand)">
                        <div className="h-72 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieProfitByBrand} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                                        {pieProfitByBrand.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(val) => formatPrice(val)} />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: '12px'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>
                </div>

                {/* Table Data */}
                <AnalysisCard title={
                        <div className="flex justify-between items-center w-full">
                            <span>Bảng Dữ liệu Chi tiết</span>
                            <Button variant="primary" size="sm" onClick={handleExportExcel} className="bg-green-600 ml-4">
                                <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-2"/>
                                Xuất Excel
                            </Button>
                        </div>
                    }
                >
                    <div className="px-4 pt-2 border-b bg-gray-50 rounded-t-lg">
                        <Tabs 
                            items={[
                                { id: 'products_profit', label: 'Top Lãi' },
                                { id: 'products_loss', label: 'Top Lỗ' },
                                { id: 'products_return', label: 'Hàng Lỗi/Trả' },
                                { id: 'products_frequency', label: 'Bán chạy (SL)' },
                                { id: 'employees_stats', label: 'Nhân viên' },
                                { id: 'listOrderStats', label: 'Đơn hàng' },
                                { id: 'listOrdersByLoss', label: 'Đơn Lỗ' }
                            ]} 
                            activeTab={activeListTab} 
                            onTabChange={(tab) => { setActiveListTab(tab); setLocalSearch(''); setLocalFilterType('ALL'); }} 
                        />
                    </div>

                    <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-200 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Tìm kiếm nhanh</label>
                                <input
                                    type="text"
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Nhập tên SP, mã đơn, tên khách..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Lọc trạng thái</label>
                                <select
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm"
                                    value={localFilterType}
                                    onChange={(e) => setLocalFilterType(e.target.value)}
                                >
                                    <option value="ALL">Tất cả</option>
                                    <option value="LOSS">⚠️ Đang lỗ vốn</option>
                                    <option value="RETURN">↩️ Có trả hàng</option>
                                </select>
                            </div>
                            <div className="text-xs text-gray-500 pb-2">SL: <strong>{filteredListData.length}</strong></div>
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
        <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
            <h2 className="text-2xl font-bold text-gray-800">Phân tích Kinh doanh Tổng hợp</h2>
            
            <SalesAnalysisFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} />
            
            <div className="flex justify-end px-2">
                <label className="inline-flex items-center cursor-pointer space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
                    <input 
                        type="checkbox" 
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={filters.include_returns}
                        onChange={(e) => setFilters(prev => ({ ...prev, include_returns: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-gray-700">Bao gồm Đơn trả hàng (Net Sales)</span>
                </label>
            </div>

            {renderContent()}

            {viewingProductId && <ProductDetailModal productIdentifier={viewingProductId} onClose={() => setViewingProductId(null)} />}
            {viewingCustomerId && <CustomerDetailModal customerIdentifier={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />}
            {viewingOrderId && <SalesOrderDetailModal orderIdentifier={viewingOrderId} onClose={() => setViewingOrderId(null)} />}
        </div>
    );
};
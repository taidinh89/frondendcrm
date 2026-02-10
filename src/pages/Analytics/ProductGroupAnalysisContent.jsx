// src/pages/ProductGroupAnalysisContent.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts'; 

import { SalesAnalysisFilterBar } from '../../components/analysis/SalesAnalysisFilterBar.jsx';
import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Tabs } from '../../components/analysis/Tabs.jsx';
import { ProductGroupAnalysisDataTable } from '../../components/analysis/ProductGroupAnalysisDataTable.jsx'; 
import { ProductDetailModal } from '../../components/Modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/Modals/CustomerDetailModal.jsx';
import { SalesOrderDetailModal } from '../../components/Modals/SalesOrderDetailModal.jsx';
import { dateUtils } from '../../utils/dateUtils.js';

// [FIX] Import Hook chuẩn
import { useApiData } from '../../hooks/useApiData.jsx';

const API_ENDPOINT = '/api/v2/sales-analysis'; 
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];
const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value);

export const ProductGroupAnalysisContent = ({ setAppTitle }) => {
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

    // [FIX] Thay thế fetch thủ công bằng hook useApiData
    const { data: fullData, isLoading } = useApiData(API_ENDPOINT, filters, 300);

    const [activeListTab, setActiveListTab] = useState('products_profit');
    const [viewingProductId, setViewingProductId] = useState(null);
    const [viewingCustomerId, setViewingCustomerId] = useState(null);
    const [viewingOrderId, setViewingOrderId] = useState(null);
    
    useEffect(() => { setAppTitle('Phân tích Hiệu quả Kinh doanh'); }, [setAppTitle]);

    // LOGIC TÍNH TOÁN (Giữ nguyên)
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

    const barProfitL2 = useMemo(() => {
        return (charts.stats_by_category_l2 || []).slice(0, 10).map(item => ({
            name: item.category_name || item.category_id,
            value: parseFloat(item.total_profit) || 0
        }));
    }, [charts.stats_by_category_l2]);

    const barProfitL3 = useMemo(() => {
        return (charts.stats_by_category_l3 || []).slice(0, 10).map(item => ({
            name: item.category_name || item.category_id,
            value: parseFloat(item.total_profit) || 0
        }));
    }, [charts.stats_by_category_l3]);

    const TAB_TO_DATA_KEY = {
        'products_profit': 'products_by_profit',
        'products_loss': 'products_by_loss',
        'products_frequency': 'products_by_frequency',
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

    const handleDataTableItemClick = (type, identifier) => {
        if (!identifier) return;
        if (type === 'product') setViewingProductId(identifier);
        if (type === 'customer') setViewingCustomerId(identifier);
        if (type === 'order') setViewingOrderId(identifier);
    };

    const renderContent = () => {
        if (isLoading && !fullData) return <div className="h-96 flex items-center justify-center text-blue-600 font-medium">Đang tải dữ liệu...</div>;
        if (!fullData) return <div className="p-8 text-center text-gray-500">Chưa có dữ liệu.</div>;

        return (
            <div className="space-y-6">
                 {/* KPI Boxes */}
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
                        <p className="text-gray-500 text-sm font-medium">Tỷ suất Lãi Gộp</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                            {totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) + '%' : '0%'}
                        </p>
                    </AnalysisCard>
                    <AnalysisCard className="text-center py-4 border-t-4 border-gray-500">
                        <p className="text-gray-500 text-sm font-medium">Số đơn hàng</p>
                        <p className="text-2xl font-bold text-gray-700 mt-1">{formatPrice(totalOrders)}</p>
                    </AnalysisCard>
                </div>

                {/* Pie Charts */}
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

                {/* Trend Chart */}
                <AnalysisCard title="Xu hướng Kinh doanh (30 ngày)">
                    <div className="h-80 w-full p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.profit_trend || []} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(t) => new Date(t).getDate()} />
                                <YAxis tickFormatter={(val) => (val/1000000).toFixed(0) + 'Tr'} />
                                <Tooltip formatter={(val) => formatPrice(val)} />
                                <Legend />
                                <Bar dataKey="total_cost" stackId="a" name="Giá vốn" fill="#cbd5e1" />
                                <Bar dataKey="total_profit" stackId="a" name="Lợi nhuận" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AnalysisCard>

                {/* Bar Charts L2/L3 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnalysisCard title="Top 10 Nhóm L2 (Loại Sản Phẩm) Lãi cao nhất">
                        <div className="h-80 w-full p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barProfitL2} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={130} tick={{fontSize: 11}} />
                                    <Tooltip formatter={(val) => formatPrice(val)} />
                                    <Bar dataKey="value" fill="#3b82f6" barSize={15} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Top 10 Nhóm L3 (Chi tiết) Lãi cao nhất">
                        <div className="h-80 w-full p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barProfitL3} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={130} tick={{fontSize: 11}} />
                                    <Tooltip formatter={(val) => formatPrice(val)} />
                                    <Bar dataKey="value" fill="#8b5cf6" barSize={15} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalysisCard>
                </div>

                {/* Detailed Table */}
                <AnalysisCard title="Bảng Dữ liệu Chi tiết">
                    <div className="px-4 pt-2 border-b bg-gray-50 rounded-t-lg">
                        <Tabs 
                            items={[
                                { id: 'products_profit', label: 'Top sản phẩm Lãi' },
                                { id: 'products_loss', label: 'Top sản phẩm Lỗ (Cảnh báo)' },
                                { id: 'products_frequency', label: 'Sản phẩm Bán chạy (SL)' },
                                { id: 'employees_stats', label: 'Nhân viên' },
                                { id: 'listCustomerStats', label: 'Khách hàng' },
                                { id: 'listCustomersByLoss', label: 'Khách Lỗ' },
                                { id: 'listOrderStats', label: 'Đơn hàng' },
                                { id: 'listOrdersByLoss', label: 'Đơn Lỗ' }
                            ]} 
                            activeTab={activeListTab} 
                            onTabChange={setActiveListTab} 
                        />
                    </div>
                    <div className="p-4">
                        <ProductGroupAnalysisDataTable 
                            data={currentListData} 
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
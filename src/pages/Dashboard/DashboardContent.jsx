// src/pages/DashboardContent.jsx
import React, { useState, useMemo } from 'react';
import { dateUtils } from '../../utils/dateUtils.js';

// Import UI & Components
import { KpiCard } from '../../components/dashboard/KpiCard.jsx';
import { DashboardCard } from '../../components/dashboard/DashboardCard.jsx';
import { SalesTrendChart } from '../../components/dashboard/SalesTrendChart.jsx';
import { ComparisonDonutChart } from '../../components/dashboard/ComparisonDonutChart.jsx';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';

// Import Widgets
import { TopProductsList } from '../../components/dashboard/TopProductsList.jsx';
import { LowStockList } from '../../components/dashboard/LowStockList.jsx';
import { RecentSalesTable } from '../../components/dashboard/RecentSalesTable.jsx';
import { TopEmployeesList } from '../../components/dashboard/TopEmployeesList.jsx';
import { TopCustomersList } from '../../components/dashboard/TopCustomersList.jsx';

// Import Modal
import { SalesOrderDetailModal } from '../../components/Modals/SalesOrderDetailModal.jsx';
import { CustomerDetailModal } from '../../components/Modals/CustomerDetailModal.jsx';
import { ProductDetailModal } from '../../components/Modals/ProductDetailModal.jsx';

// [FIX] Import Hook chuẩn để gọi API
import { useApiData } from '../../hooks/useApiData.jsx';

// Helper Format
const formatPrice = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

// Colors
const VALUE_COLORS = ['#3b82f6', '#10b981']; 
const COUNT_COLORS = ['#6b7280', '#f59e0b']; 

export const DashboardContent = ({ setAppTitle }) => {
    // 1. STATE FILTERS
    const [filters, setFilters] = useState(() => {
        const defaultDates = dateUtils.getLast30Days();
        return { date_from: defaultDates.from, date_to: defaultDates.to, employee_id: '', customer_id: '' };
    });

    // 2. [FIX] GỌI API BẰNG HOOK (Tự động Dedup & Debounce)
    // Thay thế hoàn toàn useEffect + axios thủ công
    const { data, isLoading, error } = useApiData('/api/v2/dashboard', filters, 300);

    // --- LOGIC QUẢN LÝ MODAL ---
    const [viewingOrderId, setViewingOrderId] = useState(null);
    const [viewingCustomerId, setViewingCustomerId] = useState(null);
    const [viewingProductId, setViewingProductId] = useState(null);

    const handleSaveSuccess = () => {
        setViewingOrderId(null);
        // Hook useApiData sẽ tự handle việc cache, nếu muốn reload có thể thêm chức năng refetch sau
    };

    const handleEmployeeClick = (employeeId) => {
        setFilters(prev => ({ ...prev, employee_id: employeeId }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 3. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ (Giữ nguyên logic cũ)
    const { invoiceValueData, invoiceCountData } = useMemo(() => {
        if (!data) return { invoiceValueData: [], invoiceCountData: [] };
        const kpis = data.kpis;
        const status = data.invoice_status || [];
        return {
            invoiceValueData: [
                { name: "Tổng Mua vào", value: kpis?.total_purchase_invoice_value || 0 },
                { name: "Tổng Bán ra", value: kpis?.total_sales_invoice_value || 0 }
            ],
            invoiceCountData: [
                { name: "Hóa đơn Mua vào", value: status.filter(d => d.invoice_type === 'purchase').reduce((s, i) => s + i.count, 0) },
                { name: "Hóa đơn Bán ra", value: status.filter(d => d.invoice_type === 'sale').reduce((s, i) => s + i.count, 0) }
            ]
        };
    }, [data]);

    // Render Loading / Error
    if (isLoading && !data) return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu tổng quan...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
    if (!data) return null; // Chờ data load xong

    const { kpis, sales_trend, top_products_by_revenue, top_products_by_quantity, low_stock_products, recent_sales, top_employees, top_customers_by_revenue, top_customers_by_orders } = data;

    return (
        <div className="p-6 bg-gray-100 min-h-full">
            <DashboardFilterBar initialFilters={filters} onApplyFilters={setFilters} isLoading={isLoading} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                <KpiCard title="Doanh thu" value={formatPrice(kpis.revenue_30_days)} icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" iconColor="text-green-600" bgColor="bg-green-100" />
                <KpiCard title="Chi phí Mua" value={formatPrice(kpis.cost_30_days)} icon="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" iconColor="text-red-600" bgColor="bg-red-100" />
                <KpiCard title="Số đơn bán" value={formatNumber(kpis.sales_order_count)} icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" iconColor="text-blue-600" bgColor="bg-blue-100" />
                <KpiCard title="Doanh thu hôm nay" value={formatPrice(kpis.revenue_today)} icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" iconColor="text-indigo-600" bgColor="bg-indigo-100" />
                <KpiCard title="Tổng Khách hàng" value={formatNumber(kpis.total_customers)} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" iconColor="text-purple-600" bgColor="bg-purple-100" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-12 gap-6 mb-6">
                <DashboardCard title="Xu hướng doanh thu" fullHeight={true} className="col-span-12 lg:col-span-6">
                    <SalesTrendChart data={sales_trend} />
                </DashboardCard>
                <DashboardCard title="Tỷ trọng Hóa Đơn (Tiền)" fullHeight={true} className="col-span-12 md:col-span-6 lg:col-span-3">
                    <ComparisonDonutChart data={invoiceValueData} colors={VALUE_COLORS} format="price" />
                </DashboardCard>
                <DashboardCard title="Tỷ trọng Hóa Đơn (Số lượng)" fullHeight={true} className="col-span-12 md:col-span-6 lg:col-span-3">
                    <ComparisonDonutChart data={invoiceCountData} colors={COUNT_COLORS} format="number" />
                </DashboardCard>
            </div>

            {/* Row 3: Employees & Customers */}
            <div className="grid grid-cols-12 gap-6 mb-6">
                <DashboardCard title="Top  Nhân viên" className="col-span-12 md:col-span-6">
                    <TopEmployeesList 
                        data={top_employees} 
                        onItemClick={(item) => handleEmployeeClick(item.nguoi_phu_trach)} 
                    />
                </DashboardCard>
                <DashboardCard title="Top  Khách hàng (Doanh thu)" className="col-span-12 md:col-span-6">
                    <TopCustomersList 
                        data={top_customers_by_revenue} 
                        mode="revenue" 
                        onItemClick={(item) => setViewingCustomerId(item.ma_khncc)} 
                    />
                </DashboardCard>
            </div>

            {/* Row 4: Products */}
            <div className="grid grid-cols-12 gap-6 mb-6">
                <DashboardCard title="Top  Sản phẩm (Doanh thu)" className="col-span-12 md:col-span-6">
                    <TopProductsList 
                        data={top_products_by_revenue} 
                        mode="revenue" 
                        onItemClick={(item) => setViewingProductId(item.ma_mat_hang)}
                    />
                </DashboardCard>
                <DashboardCard title="Top  Sản phẩm (Số lượng)" className="col-span-12 md:col-span-6">
                    <TopProductsList 
                        data={top_products_by_quantity} 
                        mode="quantity"
                        onItemClick={(item) => setViewingProductId(item.ma_mat_hang)}
                    />
                </DashboardCard>
            </div>

            {/* Row 5: Low Stock & Customer Orders */}
            <div className="grid grid-cols-12 gap-6 mb-6">
                <DashboardCard title="Cảnh báo Tồn kho thấp" className="col-span-12 md:col-span-6">
                    <LowStockList 
                        data={low_stock_products} 
                        onItemClick={(item) => setViewingProductId(item.ecount_code)}
                    />
                </DashboardCard>
                <DashboardCard title="Top  Khách hàng (Số đơn)" className="col-span-12 md:col-span-6">
                    <TopCustomersList 
                        data={top_customers_by_orders} 
                        mode="orders" 
                        onItemClick={(item) => setViewingCustomerId(item.ma_khncc)}
                    />
                </DashboardCard>
            </div>

            {/* Row 6: Recent Sales */}
            <DashboardCard title="Đơn hàng gần đây">
                <RecentSalesTable 
                    data={recent_sales} 
                    onOrderClick={(id) => setViewingOrderId(id)}
                    onCustomerClick={(id) => setViewingCustomerId(id)}
                    onEmployeeClick={(name) => handleEmployeeClick(name)}
                />
            </DashboardCard>

            {/* --- KHU VỰC RENDER MODAL --- */}
            
            {viewingOrderId && (
                <SalesOrderDetailModal 
                    orderIdentifier={viewingOrderId} 
                    onClose={() => setViewingOrderId(null)}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}

            {viewingCustomerId && (
                <CustomerDetailModal 
                    customerIdentifier={viewingCustomerId}
                    onClose={() => setViewingCustomerId(null)}
                />
            )}

            {viewingProductId && (
                <ProductDetailModal 
                    productIdentifier={viewingProductId}
                    onClose={() => setViewingProductId(null)}
                />
            )}
        </div>
    );
};
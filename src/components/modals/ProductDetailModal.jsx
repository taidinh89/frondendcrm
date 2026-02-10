// src/components/Modals/ProductDetailModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Icon } from '../ui.jsx';

// Import Modal con để drill-down
import { SalesOrderDetailModal } from '../Modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../Modals/PurchaseOrderDetailModal.jsx';

// Helpers format
const formatDate = (ds) => {
    if (!ds) return '';
    const date = new Date(ds);
    return !isNaN(date) ? date.toLocaleDateString('vi-VN') : ds;
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
    // State Data
    const [info, setInfo] = useState(null); 
    const [activity, setActivity] = useState({ sales: [], purchases: [] });
    const [rawData, setRawData] = useState(null); 
    
    // State UI
    const [isLoading, setIsLoading] = useState(true);
    const [showRaw, setShowRaw] = useState(false);
    
    // [CẤU HÌNH] Mặc định hiển thị tab 'sales'
    const [activeTab, setActiveTab] = useState('sales'); 

    // State Drill-down
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (!productIdentifier) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. API INVENTORY
                const inventoryRes = await axios.get('/api/v2/inventory', { 
                    params: { search: productIdentifier, per_page: 1 } 
                });
                
                // 2. API ACTIVITY
                const activityRes = await axios.get('/api/v2/context/product-activity', { 
                    params: { product_code: productIdentifier } 
                });

                // Lưu Raw Data
                const invDataRaw = inventoryRes.data;
                const actDataRaw = activityRes.data;
                setRawData({ INVENTORY_API: invDataRaw, ACTIVITY_API: actDataRaw });

                // --- XỬ LÝ DỮ LIỆU INVENTORY (Chuẩn theo JSON mẫu) ---
                const productData = invDataRaw.data && invDataRaw.data.length > 0 ? invDataRaw.data[0] : {};
                
                // Lấy thông tin cơ bản
                const productName = productData.display_name 
                                 || productData.dataSources?.ecount?.name 
                                 || productIdentifier;

                // [QUAN TRỌNG] Lấy tồn kho từ inventorySummary
                const inventorySummary = productData.inventorySummary || {};
                const totalStock = inventorySummary.total_ecount_quantity 
                                ?? productData.total_quantity 
                                ?? 0;
                
                // [QUAN TRỌNG] Lấy danh sách kho từ inventorySummary.locations
                const locations = inventorySummary.locations || [];

                setInfo({
                    name: productName,
                    code: productData.ecount_code || productData.logical_id || productIdentifier,
                    brand: productData.brand_code || 'N/A',
                    category: productData.category_code || 'N/A',
                    unit: productData.dataSources?.ecount?.unit || 'Cái',
                    totalStock: totalStock,
                    locations: locations // Mảng chi tiết kho đã lấy đúng chỗ
                });

                // --- XỬ LÝ DỮ LIỆU ACTIVITY ---
                setActivity({
                    sales: actDataRaw.sales_orders || [],
                    purchases: actDataRaw.purchase_orders || []
                });

            } catch (error) {
                console.error("Lỗi tải chi tiết:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productIdentifier]);

    // Handle mở modal con
    const handleOrderClick = (id, type) => {
        if (id) setSelectedOrder({ id, type });
    };

    return (
        <React.Fragment>
            <Modal 
                isOpen={true} 
                onClose={onClose} 
                title={
                    <div className="flex items-center justify-between w-full pr-8">
                        <span className="truncate max-w-md">Chi tiết: <span className="font-mono text-blue-700">{productIdentifier}</span></span>
                        {!isLoading && (
                            <button 
                                onClick={() => setShowRaw(true)}
                                className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded border transition-colors"
                            >
                                <Icon path="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" className="w-4 h-4"/>
                                RAW API
                            </button>
                        )}
                    </div>
                } 
                maxWidthClass="max-w-7xl"
            >
                <div className="flex flex-col h-[85vh] bg-gray-50">
                    
                    {/* --- HEADER INFO CARD --- */}
                    {info && (
                        <div className="bg-white p-4 border-b shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Tên sản phẩm</label>
                                <div className="font-medium text-gray-800 text-lg leading-tight">{info.name}</div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Phân loại</label>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Brand:</span> {info.brand} <br/>
                                    <span className="font-semibold">Cat:</span> {info.category}
                                </div>
                            </div>
                            <div className="text-right">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Tổng Tồn Kho</label>
                                <div className={`text-3xl font-bold ${info.totalStock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                    {formatNumber(info.totalStock)} <span className="text-sm text-gray-400 font-normal">{info.unit}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- NAVIGATION TABS --- */}
                    <div className="flex border-b bg-white px-4">
                        <button 
                            onClick={() => setActiveTab('sales')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sales' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Lịch sử Bán ({activity.sales.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('purchases')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Lịch sử Mua ({activity.purchases.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Chi tiết Tồn kho ({info?.locations?.length || 0})
                        </button>
                    </div>

                    {/* --- CONTENT AREA --- */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mb-2"></div>
                                <p>Đang tải dữ liệu...</p>
                            </div>
                        ) : (
                            <>
                                {/* TAB 1: LỊCH SỬ BÁN (MẶC ĐỊNH) */}
                                {activeTab === 'sales' && (
                                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-green-50 text-green-800">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Ngày</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Số phiếu</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Khách hàng</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">NV</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase">Đơn giá</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {activity.sales.length > 0 ? (
                                                    activity.sales.map((order, idx) => (
                                                        <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(order.ngay)}</td>
                                                            <td className="px-4 py-3 text-sm font-mono">
                                                                <button 
                                                                    onClick={() => handleOrderClick(order.id || order.unique_order_key, 'sale')}
                                                                    className="text-blue-600 hover:underline font-bold"
                                                                >
                                                                    {order.so_phieu}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                                <div className="font-medium">{order.ten_khncc}</div>
                                                                {order.ghi_chu_tren_phieu && <div className="text-xs text-gray-400 italic">{order.ghi_chu_tren_phieu}</div>}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{order.nguoi_phu_trach}</td>
                                                            
                                                            {/* Hiển thị giá và số lượng từ items (nếu có) */}
                                                            <td className="px-4 py-3 text-sm text-right font-mono">
                                                                {order.items && order.items.length > 0 ? formatNumber(order.items[0].don_gia) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right font-bold">
                                                                {order.items && order.items.length > 0 ? order.items[0].so_luong : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="6" className="p-10 text-center text-gray-400">Không có đơn bán hàng trong kỳ.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 2: LỊCH SỬ MUA */}
                                {activeTab === 'purchases' && (
                                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-purple-50 text-purple-800">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Ngày</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Số phiếu</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Nhà cung cấp</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">NV</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase">SL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {activity.purchases.length > 0 ? (
                                                    activity.purchases.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.ngay)}</td>
                                                            <td className="px-4 py-3 text-sm font-mono">
                                                                <button 
                                                                    onClick={() => handleOrderClick(item.id || item.unique_order_key, 'purchase')}
                                                                    className="text-purple-600 hover:underline font-bold"
                                                                >
                                                                    {item.so_phieu}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700">{item.ten_khncc}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{item.nguoi_phu_trach}</td>
                                                            <td className="px-4 py-3 text-sm text-right font-bold">
                                                                {item.items && item.items.length > 0 ? item.items[0].so_luong : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400">Không có đơn mua hàng trong kỳ.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 3: TỒN KHO CHI TIẾT (ĐÃ SỬA LOGIC) */}
                                {activeTab === 'info' && (
                                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã Kho</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên Kho</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Số lượng</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nguồn</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {info?.locations?.length > 0 ? (
                                                    info.locations.map((loc, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{loc.warehouse_code}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.warehouse_name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                                                                {formatNumber(loc.quantity)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 uppercase bg-gray-50">
                                                                <span className="px-2 py-1 rounded bg-gray-200">{loc.source}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Chưa có dữ liệu phân bổ kho chi tiết.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {showRaw && rawData && (
                <RawDataViewer data={rawData} onClose={() => setShowRaw(false)} />
            )}

            {selectedOrder && selectedOrder.type === 'sale' && (
                <SalesOrderDetailModal 
                    orderIdentifier={selectedOrder.id}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
            {selectedOrder && selectedOrder.type === 'purchase' && (
                <PurchaseOrderDetailModal 
                    orderIdentifier={selectedOrder.id}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </React.Fragment>
    );
};
// src/components/dashboard/RecentSalesTable.jsx
import React from 'react';

// Helper format
const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const formatPrice = (p) => {
    const value = parseFloat(p);
    return (!value || isNaN(value)) ? "0 đ" : new Intl.NumberFormat('vi-VN').format(value) + ' đ';
};

export const RecentSalesTable = ({ data, onOrderClick, onCustomerClick }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã Đơn</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                                Không có đơn hàng gần đây.
                            </td>
                        </tr>
                    ) : (
                        data.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sale.ngay)}</td>
                                
                                {/* CỘT MÃ ĐƠN: Click để mở Modal Chi tiết đơn */}
                                <td className="px-4 py-3 text-sm font-mono">
                                    <button
                                        onClick={() => onOrderClick && onOrderClick(sale.unique_order_key || sale.id)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                        title="Xem chi tiết đơn hàng"
                                    >
                                        {sale.unique_order_key || sale.id}
                                    </button>
                                </td>
                                
                                {/* CỘT KHÁCH HÀNG: Click để mở Modal Chi tiết khách */}
                                <td className="px-4 py-3 text-sm font-medium">
                                    <button
                                         onClick={() => onCustomerClick && onCustomerClick(sale.ma_khncc)}
                                         className="text-gray-900 hover:text-blue-600 hover:underline text-left"
                                         title="Xem lịch sử khách hàng"
                                    >
                                        {sale.ten_khncc}
                                    </button>
                                </td>
                                
                                <td className="px-4 py-3 text-sm text-gray-700">
                                    {sale.nguoi_phu_trach || 'N/A'}
                                </td>

                                <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        sale.hien_trang === 'Đã xác nhận' ? 'bg-green-100 text-green-800' : 
                                        sale.hien_trang === 'Chờ xử lý' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {sale.hien_trang || 'N/A'}
                                    </span>
                                </td>
                                
                                <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                                    {formatPrice(sale.items_sum_so_tien_truoc_thue)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
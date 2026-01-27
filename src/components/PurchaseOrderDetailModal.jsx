// src/components/PurchaseOrderDetailModal.jsx
import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Modal, Button, Icon } from './ui.jsx';

// Import các modal con nếu có
import { CustomerDetailModal } from './CustomerDetailModal.jsx';
import { ProductDetailModal } from './ProductDetailModal.jsx';

const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p ?? 0);

// Hàm helper để parse serial từ chuỗi đặc biệt
const parseSerials = (serialString) => {
    if (!serialString) return [];
    // Ký tự ngăn cách trong JSON của bạn là \u222c
    return serialString.split('\u222c').filter(Boolean);
};

const StatusBadge = ({ status }) => {
    if (!status) return null;
    let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
    const s = status.toLowerCase();
    
    if (s.includes('hoàn thành') || s.includes('đã nhập')) colorClass = 'bg-green-50 text-green-700 border-green-200';
    else if (s.includes('hủy')) colorClass = 'bg-red-50 text-red-700 border-red-200';
    else if (s.includes('chưa') || s.includes('chờ')) colorClass = 'bg-orange-50 text-orange-700 border-orange-200';

    return (
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border uppercase tracking-wide ${colorClass}`}>
            {status}
        </span>
    );
};

export const PurchaseOrderDetailModal = ({ orderIdentifier, onClose }) => {
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Quản lý việc mở rộng xem Serial
    const [expandedSerials, setExpandedSerials] = useState({}); // { index: true/false }

    // State cho modal con
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

    useEffect(() => {
        if (!orderIdentifier) return;
        const fetchOrder = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/v2/purchase-orders/${orderIdentifier}`);
                setOrder(response.data.data); // Data bọc trong { data: ... }
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 404) {
                    setError(`Không tìm thấy đơn hàng #${orderIdentifier}`);
                } else {
                    setError("Không thể tải chi tiết đơn hàng.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [orderIdentifier]);

    const toggleSerial = (index) => {
        setExpandedSerials(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Ưu tiên lấy tong_cong từ API, nếu không thì tính tay
    const totalAmount = order?.tong_cong || order?.items?.reduce((sum, item) => sum + (item.so_luong * item.don_gia), 0) || 0;

    return (
        <Fragment>
            <Modal isOpen={true} onClose={onClose} title="Chi tiết Nhập Hàng" maxWidthClass="max-w-6xl">
                <div className="flex flex-col h-[80vh]"> {/* Cố định chiều cao để scroll nội dung */}
                    
                    {/* --- HEADER INFO --- */}
                    <div className="flex-shrink-0 bg-gray-50 p-4 border-b border-gray-200">
                        {isLoading && <div className="text-center py-4 text-gray-500">Đang tải dữ liệu...</div>}
                        {error && <div className="text-center py-4 text-red-500 font-bold">{error}</div>}
                        
                        {order && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                {/* Cột 1: NCC */}
                                <div className="bg-white p-3 rounded border shadow-sm col-span-1 md:col-span-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Nhà Cung Cấp</label>
                                        <Button variant="ghost" size="xs" onClick={() => setViewingCustomer(order.ma_khncc)}>
                                            <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-3.5 h-3.5 text-blue-500"/>
                                        </Button>
                                    </div>
                                    <div className="font-bold text-blue-900 text-base">{order.ten_khncc}</div>
                                    <div className="text-gray-500 font-mono text-xs mt-1 bg-gray-100 w-fit px-1 rounded">{order.ma_khncc}</div>
                                </div>

                                {/* Cột 2: Thông tin phiếu */}
                                <div className="bg-white p-3 rounded border shadow-sm">
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Thông tin phiếu</label>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-600">Số phiếu:</span>
                                        <span className="font-mono font-bold text-black bg-yellow-100 px-2 rounded">{order.so_phieu}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Ngày nhập:</span>
                                        <span className="font-bold">{formatDate(order.ngay)}</span>
                                    </div>
                                    {order.unique_order_key && (
                                        <div className="mt-2 text-[10px] text-gray-400 font-mono truncate" title={order.unique_order_key}>
                                            Ref: {order.unique_order_key}
                                        </div>
                                    )}
                                </div>

                                {/* Cột 3: Trạng thái & Nhân viên */}
                                <div className="bg-white p-3 rounded border shadow-sm flex flex-col justify-between">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Trạng thái</label>
                                        <StatusBadge status={order.hien_trang} />
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-dashed">
                                        <span className="text-xs text-gray-500 block">Nhân viên phụ trách:</span>
                                        <span className="font-bold text-gray-800 text-sm">{order.nguoi_phu_trach || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- TABLE CONTENT (SCROLLABLE) --- */}
                    <div className="flex-1 overflow-auto bg-white p-4">
                        {order && (
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-center w-10 border-b">#</th>
                                        <th className="p-3 text-left border-b w-32">Mã Hàng</th>
                                        <th className="p-3 text-left border-b">Tên Hàng / Serial</th>
                                        <th className="p-3 text-center border-b w-20">SL</th>
                                        <th className="p-3 text-right border-b w-32">Đơn Giá</th>
                                        <th className="p-3 text-right border-b w-36">Thành Tiền</th>
                                        <th className="p-3 text-center border-b w-10">...</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item, index) => {
                                        const serials = parseSerials(item.serial);
                                        const hasSerial = serials.length > 0;
                                        const isExpanded = expandedSerials[index];

                                        return (
                                            <React.Fragment key={index}>
                                                <tr className="hover:bg-blue-50 transition-colors">
                                                    <td className="p-3 text-center text-gray-400">{index + 1}</td>
                                                    <td className="p-3 font-mono text-xs font-bold text-blue-700 align-top">
                                                        {item.ma_mat_hang}
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <div className="font-medium text-gray-800">{item.ten_mat_hang}</div>
                                                        {hasSerial && (
                                                            <div className="mt-1">
                                                                <button 
                                                                    onClick={() => toggleSerial(index)}
                                                                    className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded border transition-all ${isExpanded ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                                                >
                                                                    <Icon path="M3.75 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" className="w-3 h-3"/>
                                                                    {isExpanded ? 'Ẩn Serial' : `Xem ${serials.length} Serial`}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-bold">{item.so_luong}</td>
                                                    <td className="p-3 text-right text-gray-600">{formatPrice(item.don_gia)}</td>
                                                    <td className="p-3 text-right font-bold text-gray-900">
                                                        {formatPrice(item.so_tien_truoc_thue || (item.so_luong * item.don_gia))}
                                                    </td>
                                                    <td className="p-3 text-center align-top">
                                                        <Button variant="ghost" size="xs" onClick={() => setViewingProduct(item.ma_mat_hang)}>
                                                            <Icon path="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" className="w-4 h-4 text-gray-400 hover:text-blue-600"/>
                                                        </Button>
                                                    </td>
                                                </tr>
                                                {/* Khu vực hiển thị Serial khi mở rộng */}
                                                {hasSerial && isExpanded && (
                                                    <tr className="bg-gray-50 shadow-inner">
                                                        <td colSpan="7" className="p-3 pl-16">
                                                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Danh sách Serial ({serials.length}):</div>
                                                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-white">
                                                                {serials.map((s, idx) => (
                                                                    <span key={idx} className="font-mono text-[11px] bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-gray-700 select-all hover:bg-blue-50 hover:border-blue-300">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="flex-shrink-0 bg-gray-50 p-4 border-t border-gray-200 flex justify-end items-center gap-4">
                        <div className="text-gray-500 text-sm">Tổng tiền thanh toán:</div>
                        <div className="text-2xl font-bold text-blue-700">{formatPrice(totalAmount)} ₫</div>
                    </div>

                </div>
            </Modal>

            {/* Render các modal con */}
            {viewingCustomer && <CustomerDetailModal customerIdentifier={viewingCustomer} onClose={() => setViewingCustomer(null)} />}
            {viewingProduct && <ProductDetailModal productIdentifier={viewingProduct} onClose={() => setViewingProduct(null)} />}
        </Fragment>
    );
};
// src/components/SalesOrderDetailModal.jsx

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Modal, Button, Icon } from './ui.jsx';

// Import các modal con
import { CustomerDetailModal } from './CustomerDetailModal.jsx';
import { ProductDetailModal } from './ProductDetailModal.jsx';
import { SalesOrderForm } from './SalesOrderForm.jsx';

const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';
const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p ?? 0);

const StatusBadge = ({ status }) => {
    // Mặc định cho đơn bán hàng nếu không có field hien_trang cụ thể từ JSON
    const s = status ? status.toLowerCase() : 'hoàn thành';
    let colorClass = 'bg-green-50 text-green-700 border-green-200';
    
    if (s.includes('hủy')) colorClass = 'bg-red-50 text-red-700 border-red-200';
    else if (s.includes('chưa') || s.includes('chờ')) colorClass = 'bg-orange-50 text-orange-700 border-orange-200';

    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${colorClass}`}>
            {status || 'ĐÃ HOÀN THÀNH'}
        </span>
    );
};

export const SalesOrderDetailModal = ({ orderIdentifier, onClose, onSaveSuccess, maxWidthClass = 'max-w-6xl' }) => {
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [expandedSerials, setExpandedSerials] = useState({});

    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

    const fetchOrder = async () => {
        if (!orderIdentifier) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/v2/sales-orders/${orderIdentifier}`);
            // Bóc tách từ structure { data: { ... } }
            setOrder(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || "Không thể tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => { fetchOrder(); }, [orderIdentifier]);
    
    const handleFormSaveSuccess = () => {
        setIsEditing(false);
        if (onSaveSuccess) onSaveSuccess();
        else fetchOrder();
    };

    const parseSerials = (serialString) => {
        if (!serialString) return [];
        return serialString.split(/\r?\n/).filter(Boolean);
    };

    const toggleSerial = (index) => {
        setExpandedSerials(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <Fragment>
            <Modal 
                isOpen={true} 
                onClose={onClose} 
                title={<span className="text-gray-700 font-bold uppercase text-base">Chi tiết Đơn Bán Hàng</span>}
                maxWidthClass={maxWidthClass}
                footer={!isEditing && order && (
                    <div className="flex justify-between items-center w-full px-4 py-2 bg-gray-50 border-t">
                        <div className="text-gray-500 text-sm italic">ID: {order.unique_order_key}</div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex items-center gap-1">
                                <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.283-8.283z" className="w-4 h-4"/>
                                Sửa Đổi
                            </Button>
                            <Button variant="secondary" onClick={onClose}>Đóng</Button>
                        </div>
                    </div>
                )}
            >
                {isLoading && <div className="p-20 text-center text-blue-500 animate-pulse">Đang tải thông tin đơn hàng...</div>}
                
                {order && !isEditing && (
                    <div className="bg-white">
                        {/* SECTION 1: TOP INFO CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b">
                            {/* Khách hàng */}
                            <div className="p-5 border-r border-gray-100 relative group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Khách hàng</label>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-blue-700 leading-tight uppercase mb-1">{order.ten_khncc}</p>
                                        <p className="text-xs text-gray-500 font-mono">{order.ma_khncc}</p>
                                    </div>
                                    <button onClick={() => setViewingCustomer(order.ma_khncc)} className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors border border-blue-100">
                                        <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>

                            {/* Thông tin phiếu */}
                            <div className="p-5 border-r border-gray-100 bg-gray-50/30">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Thông tin phiếu</label>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Số phiếu:</span>
                                        <span className="font-bold font-mono bg-yellow-100 px-1.5 rounded">{order.so_phieu}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Ngày bán:</span>
                                        <span className="font-medium text-gray-700">{formatDate(order.ngay)}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 italic mt-1">Ref: {order.ghi_chu_tren_phieu || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Trạng thái & Nhân viên */}
                            <div className="p-5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Trạng thái</label>
                                <div className="mb-3">
                                    <StatusBadge status={order.hien_trang} />
                                </div>
                                <div className="pt-2 border-t border-dashed border-gray-200">
                                    <label className="text-[10px] text-gray-400 block mb-1">Nhân viên phụ trách:</label>
                                    <p className="text-sm font-bold text-gray-700">{order.nguoi_phu_trach || 'Chưa phân công'}</p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: TABLE ITEMS */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Mã Hàng</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Tên Hàng / Serial</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">SL</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">Đơn Giá</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">Thành Tiền</th>
                                        <th className="px-4 py-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item, index) => {
                                        // Tính đơn giá thực tế nếu don_gia = 0
                                        const unitPrice = item.don_gia > 0 ? item.don_gia : (item.so_luong > 0 ? (item.so_tien_truoc_thue / item.so_luong) : 0);
                                        const serials = parseSerials(item.serial);
                                        const isExpanded = expandedSerials[index];

                                        return (
                                            <Fragment key={index}>
                                                <tr className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-4 py-4 text-xs text-gray-400">{index + 1}</td>
                                                    <td className="px-4 py-4 font-mono text-xs text-blue-600 font-medium">{item.ma_mat_hang}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm text-gray-800 font-medium leading-tight mb-1">{item.ten_mat_hang}</div>
                                                        {serials.length > 0 && (
                                                            <button 
                                                                onClick={() => toggleSerial(index)} 
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[10px] text-gray-600 transition-colors"
                                                            >
                                                                <Icon path="M3.75 12h16.5m-16.5-3.75h16.5m-16.5-3.75h16.5m-16.5 11.25h16.5" className="w-3 h-3"/>
                                                                {isExpanded ? 'Thu gọn' : `Xem ${serials.length} Serial`}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-gray-700">{item.so_luong}</td>
                                                    <td className="px-4 py-4 text-right text-gray-600 text-sm">{formatPrice(unitPrice)}</td>
                                                    <td className="px-4 py-4 text-right font-bold text-gray-900">{formatPrice(item.so_tien_truoc_thue)}</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button onClick={() => setViewingProduct(item.ma_mat_hang)} className="text-gray-300 hover:text-blue-500 transition-colors">
                                                            <Icon path="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" className="w-5 h-5"/>
                                                        </button>
                                                    </td>
                                                </tr>
                                                {serials.length > 0 && isExpanded && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan="7" className="px-10 py-3">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {serials.map((s, i) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500 shadow-sm">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* SECTION 3: TOTAL FOOTER */}
                        <div className="p-6 bg-white flex justify-end border-t">
                            <div className="text-right">
                                <span className="text-gray-500 text-sm mr-4 uppercase tracking-wider font-medium">Tổng tiền thanh toán:</span>
                                <span className="text-2xl font-black text-blue-700">{formatPrice(order.tong_cong)} <span className="text-lg underline decoration-2">đ</span></span>
                            </div>
                        </div>
                    </div>
                )}

                {isEditing && order && (
                    <SalesOrderForm 
                        order={order} 
                        onSaveSuccess={handleFormSaveSuccess} 
                        onCancel={() => setIsEditing(false)} 
                    />
                )}
            </Modal>

            {viewingCustomer && <CustomerDetailModal customerIdentifier={viewingCustomer} onClose={() => setViewingCustomer(null)} />}
            {viewingProduct && <ProductDetailModal productIdentifier={viewingProduct} onClose={() => setViewingProduct(null)} />}
        </Fragment>
    );
};
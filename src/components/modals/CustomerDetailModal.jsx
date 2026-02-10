// src/components/Modals/CustomerDetailModal.jsx
import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Modal, Button, Icon } from '../ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js'; 

// Import modal con
import { SalesOrderDetailModal } from '../Modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../Modals/PurchaseOrderDetailModal.jsx';

const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';

const CustomerOrdersList = ({ apiEndpoint, customerCode }) => {
    const { data: orders, isLoading, error } = 
        useV2Paginator(apiEndpoint, { ma_khncc: customerCode });
    
    const [viewingOrder, setViewingOrder] = useState(null); // Sẽ là ID
    const DetailModal = apiEndpoint.includes('sales') ? SalesOrderDetailModal : PurchaseOrderDetailModal;

    return (
        <Fragment>
            <div className="max-h-64 overflow-auto border rounded-lg bg-gray-50">
                {orders.length > 0 && (
                    <table className="min-w-full">
                        <tbody className="divide-y divide-gray-200">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-100">
                                    <td className="p-2 text-sm">{formatDate(order.ngay)}</td>
                                    <td className="p-2 font-mono text-xs">{order.so_phieu}</td>
                                    <td className="p-2 text-sm text-gray-600">{order.nguoi_phu_trach}</td>
                                    <td className="p-2 text-right">
                                        <Button variant="secondary" className="px-1 py-0.5 text-xs" onClick={() => setViewingOrder(order.id)}>
                                            <Icon path="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m-5.25 0h5.25v5.25" className="w-3 h-3"/>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {/* Render modal con "thật" */}
            {viewingOrder && (
                <DetailModal
                    orderIdentifier={viewingOrder}
                    onClose={() => setViewingOrder(null)}
                />
            )}
        </Fragment>
    );
};

// THÊM maxWidthClass VÀO PROPS, đặt mặc định là max-w-7xl
export const CustomerDetailModal = ({ customerIdentifier, onClose, maxWidthClass = 'max-w-7xl' }) => {
    const [customer, setCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!customerIdentifier) return;
        
        const fetchCustomer = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/v2/customers/${customerIdentifier}`);
                setCustomer(response.data.data);
            } catch (err) {
                 if (err.response && err.response.status === 404) {
                    setError(`Không tìm thấy khách hàng: ${customerIdentifier}`);
                } else {
                    setError(err.response?.data?.message || err.message);
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchCustomer();
    }, [customerIdentifier]);
    
    const modalTitle = customer 
        ? `Chi tiết Khách hàng: ${customer.ten_cong_ty_khach_hang} (${customer.ma_khncc})` 
        : `Đang tải chi tiết Khách hàng: ${customerIdentifier}`;


    return (
        <Modal isOpen={true} onClose={onClose} title={modalTitle} maxWidthClass={maxWidthClass}>
            <div className="p-6 space-y-6">
                {isLoading && <p className="text-center">Đang tải chi tiết...</p>}
                {error && <p className="text-center text-red-500 font-medium">{error}</p>}
                {customer && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                           <div><label className="text-sm text-gray-500">Tên Khách hàng</label>
                                <p className="font-medium text-lg">{customer.ten_cong_ty_khach_hang}</p>
                            </div>
                            <div><label className="text-sm text-gray-500">Mã Khách hàng</label>
                                <p className="font-medium">{customer.ma_khncc}</p>
                            </div>
                            <div><label className="text-sm text-gray-500">Mã Số Thuế</label>
                                <p className="font-medium">{customer.ma_so_thue || 'N/A'}</p>
                            </div>
                            <div><label className="text-sm text-gray-500">SĐT</label>
                                <p className="font-medium">{customer.dien_thoai_1 || 'N/A'}</p>
                            </div>
                            <div><label className="text-sm text-gray-500">Email</label>
                                <p className="font-medium">{customer.email || 'N/A'}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-2">Đơn Bán Hàng (V2)</h3>
                            <CustomerOrdersList 
                                apiEndpoint="/api/v2/sales-orders"
                                customerCode={customer.ma_khncc} 
                            />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Đơn Mua Hàng (V2)</h3>
                            <CustomerOrdersList 
                                apiEndpoint="/api/v2/purchase-orders"
                                customerCode={customer.ma_khncc} 
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};
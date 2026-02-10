// src/components/Modals/GlobalSearchModal.jsx
import React, { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import { Modal, Icon } from '../ui.jsx';
import { useDebounce } from '../../hooks/useDebounce.jsx';

// Import các Modal chi tiết
import { CustomerDetailModal } from '../Modals/CustomerDetailModal.jsx';
import { SalesOrderDetailModal } from '../Modals/SalesOrderDetailModal.jsx';
import { PurchaseOrderDetailModal } from '../Modals/PurchaseOrderDetailModal.jsx';
import { ProductDetailModal } from '../Modals/ProductDetailModal.jsx';

// Helper
const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('vi-VN') : '';

export const GlobalSearchModal = ({ isOpen, onClose, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // State cho các modal chi tiết
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingSalesOrder, setViewingSalesOrder] = useState(null);
    const [viewingPurchaseOrder, setViewingPurchaseOrder] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchTerm('');
            setResults(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (debouncedSearchTerm.length < 2) {
            setResults(null);
            setIsLoading(false);
            return;
        }

        const fetchSearch = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get('/api/v2/global-search', {
                    params: { term: debouncedSearchTerm }
                });
                setResults(response.data);
            } catch (err) {
                setError(err.response?.data?.message || err.message);
                setResults(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSearch();
    }, [debouncedSearchTerm]);

    // Đóng các modal con trước khi đóng modal cha
    const handleClose = () => {
        setViewingCustomer(null);
        setViewingSalesOrder(null);
        setViewingPurchaseOrder(null);
        setViewingProduct(null);
        onClose();
    };

    const SearchResult = ({ title, data, children }) => {
        if (!data || data.length === 0) return null;
        return (
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{title}</h3>
                <ul className="divide-y divide-gray-200">
                    {data.map(item => children(item))}
                </ul>
            </div>
        );
    };

    const hasResults = results && (results.products.length > 0 || results.customers.length > 0 || results.sales_orders.length > 0 || results.purchase_orders.length > 0);

    return (
        <Fragment>
            <Modal isOpen={isOpen} onClose={handleClose} title="Tìm kiếm Nhanh (V2)" maxWidthClass="max-w-3xl">
                <div className="p-0">
                    {/* Input tìm kiếm */}
                    <div className="p-4 border-b">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Nhập Mã SP, Tên KH, SĐT, Số đơn hàng... (Ctrl+K)"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vùng kết quả */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
                        {isLoading && <p className="text-center text-gray-500">Đang tìm kiếm...</p>}
                        {error && <p className="text-center text-red-500">{error}</p>}

                        {!isLoading && !error && debouncedSearchTerm.length >= 2 && !hasResults && (
                            <p className="text-center text-gray-500">Không tìm thấy kết quả nào cho "<b>{debouncedSearchTerm}</b>".</p>
                        )}

                        {!isLoading && !error && hasResults && (
                            <>
                                <SearchResult title="Sản phẩm" data={results.products}>
                                    {(item) => (
                                        <li key={`prod-${item.misa_code || item.ecount_code}`}
                                            onClick={() => setViewingProduct(item.misa_code || item.ecount_code)}
                                            className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">
                                            <p className="font-medium">{item.display_name}</p>
                                            <p className="text-sm text-gray-600 font-mono">{item.misa_code || item.ecount_code} (Tồn: {item.total_ecount_quantity})</p>
                                        </li>
                                    )}
                                </SearchResult>

                                <SearchResult title="Khách hàng" data={results.customers}>
                                    {(item) => (
                                        <li key={`cust-${item.id}`} onClick={() => setViewingCustomer(item.ma_khncc)}
                                            className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">
                                            <p className="font-medium">{item.ten_cong_ty_khach_hang}</p>
                                            <p className="text-sm text-gray-600">{item.ma_khncc}</p>
                                        </li>
                                    )}
                                </SearchResult>

                                <SearchResult title="Đơn Bán Hàng" data={results.sales_orders}>
                                    {(item) => (
                                        <li key={`sale-${item.id}`} onClick={() => setViewingSalesOrder(item.unique_order_key)}
                                            className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">
                                            <p className="font-medium">{item.so_phieu} <span className="text-sm text-gray-500">({formatDate(item.ngay)})</span></p>
                                            <p className="text-sm text-gray-600">{item.ten_khncc}</p>
                                        </li>
                                    )}
                                </SearchResult>

                                <SearchResult title="Đơn Mua Hàng" data={results.purchase_orders}>
                                    {(item) => (
                                        <li key={`pur-${item.id}`} onClick={() => setViewingPurchaseOrder(item.unique_order_key)}
                                            className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">
                                            <p className="font-medium">{item.so_phieu} <span className="text-sm text-gray-500">({formatDate(item.ngay)})</span></p>
                                            <p className="text-sm text-gray-600">{item.ten_khncc}</p>
                                        </li>
                                    )}
                                </SearchResult>
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Render các modal chi tiết (con) */}
            {viewingProduct && (
                <ProductDetailModal
                    productIdentifier={viewingProduct}
                    onClose={() => setViewingProduct(null)}
                />
            )}
            {viewingCustomer && (
                <CustomerDetailModal
                    customerIdentifier={viewingCustomer}
                    onClose={() => setViewingCustomer(null)}
                />
            )}
            {viewingSalesOrder && (
                <SalesOrderDetailModal
                    orderIdentifier={viewingSalesOrder}
                    onClose={() => setViewingSalesOrder(null)}
                />
            )}
            {viewingPurchaseOrder && (
                <PurchaseOrderDetailModal
                    orderIdentifier={viewingPurchaseOrder}
                    onClose={() => setViewingPurchaseOrder(null)}
                />
            )}
        </Fragment>
    );
};
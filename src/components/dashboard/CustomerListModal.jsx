// src/components/dashboard/CustomerListModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../ui/Modal.jsx';
import { Input } from '../ui.jsx';

// Dùng lại hàm format từ TopCustomersList
const formatPrice = (value) => {
    return new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0) + ' đ';
};

// Component con để render danh sách
const CustomerList = ({ customers }) => (
    <ul role="list" className="divide-y divide-gray-200">
        {customers.map((item) => (
            <li key={item.ma_khncc} className="py-3 sm:py-4">
                <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.ten_khncc}</p>
                        <p className="text-sm text-gray-500 truncate font-mono">{item.ma_khncc}</p>
                    </div>
                    <div className="inline-flex flex-col items-end text-base font-semibold text-gray-900">
                        <span className="text-sm text-green-600">{formatPrice(item.total_revenue)}</span>
                        <span className="text-xs font-normal text-gray-500">{item.order_count} đơn</span>
                    </div>
                </div>
            </li>
        ))}
    </ul>
);

export const CustomerListModal = ({ isOpen, onClose, title, dashboardFilters }) => {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!isOpen) return; // Chỉ fetch khi modal mở

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Kết hợp filter của dashboard (date_from, date_to) với filter của modal (search, page)
                const params = new URLSearchParams({
                    ...dashboardFilters, // Lấy date_from, date_to
                    search: search,
                    page: page,
                });

                const response = await axios.get(`/api/v2/dashboard/list/customers-by-revenue?${params.toString()}`);
                
                setData(response.data.data);
                
                // Lấy thông tin phân trang (trừ data)
                const { data, ...paginateInfo } = response.data;
                setPagination(paginateInfo);
                
            } catch (err) {
                setError("Lỗi tải danh sách khách hàng.");
            } finally {
                setIsLoading(false);
            }
        };

        // Thêm debounce (delay) 300ms khi tìm kiếm
        const timerId = setTimeout(() => {
            fetchData();
        }, search ? 300 : 0); // Gõ search thì delay, chuyển trang thì fetch ngay

        return () => clearTimeout(timerId);

    }, [isOpen, search, page, dashboardFilters]); // Fetch lại khi các giá trị này thay đổi

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.last_page) {
            setPage(newPage);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col gap-4">
                {/* Thanh tìm kiếm */}
                <Input
                    placeholder="Tìm theo tên hoặc mã khách hàng..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1); // Reset về trang 1 khi search
                    }}
                />
                
                {/* Vùng nội dung */}
                <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
                    {isLoading && <div className="text-center p-4">Đang tải...</div>}
                    {error && <div className="text-center p-4 text-red-500">{error}</div>}
                    
                    {!isLoading && !error && data.length > 0 && <CustomerList customers={data} />}
                    
                    {!isLoading && !error && data.length === 0 && (
                        <div className="text-center p-4 text-gray-500">Không tìm thấy khách hàng.</div>
                    )}
                </div>

                {/* Phân trang */}
                {pagination && data.length > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md disabled:opacity-50"
                        >
                            Trước
                        </button>
                        <span className="text-sm text-gray-600">
                            Trang {pagination.current_page} / {pagination.last_page}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === pagination.last_page}
                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md disabled:opacity-50"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
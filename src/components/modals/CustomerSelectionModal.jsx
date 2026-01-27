// src/components/modals/CustomerSelectionModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input, Icon } from '../ui'; // Import từ ui.jsx của bạn
import axios from 'axios';

export const CustomerSelectionModal = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const typingTimeoutRef = useRef(null);

    // Reset dữ liệu khi mở modal
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            fetchCustomers(''); 
            // Tự động focus vào ô tìm kiếm (nếu cần)
        }
    }, [isOpen]);

    const fetchCustomers = async (term) => {
        setIsLoading(true);
        try {
            // Gọi API Customer V2
            const response = await axios.get('/api/v2/customers', {
                params: {
                    search: term,
                    per_page: 20 // Lấy 20 kết quả để hiển thị trong modal
                }
            });
            // Laravel Resource trả về { data: [...] }
            const data = response.data.data || response.data;
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi tải danh sách khách hàng:", error);
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        // Debounce: Chờ 400ms sau khi ngừng gõ mới gọi API
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            fetchCustomers(term);
        }, 400);
    };

    const handleSelect = (customer) => {
        onSelect(customer); // Trả khách hàng về trang cha
        onClose();          // Đóng modal
    };

    // Nội dung Footer của Modal
    const modalFooter = (
        <Button variant="secondary" onClick={onClose}>
            Đóng
        </Button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Tìm & Chọn Khách Hàng" 
            maxWidthClass="max-w-4xl" // Modal rộng để hiển thị bảng
            footer={modalFooter}
        >
            <div className="p-1 space-y-4">
                {/* 1. Ô Tìm kiếm */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Input 
                            placeholder="Nhập tên, mã, số điện thoại hoặc MST..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-10" // Chừa chỗ cho icon
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                            <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-5 h-5"/>
                        </div>
                    </div>
                    <Button onClick={() => fetchCustomers(searchTerm)}>Tìm kiếm</Button>
                </div>

                {/* 2. Danh sách kết quả */}
                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã KH</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điện thoại</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-5 h-5 animate-spin"/>
                                            Đang tải dữ liệu...
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        Không tìm thấy khách hàng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((cust) => (
                                    <tr key={cust.id || cust.ma_khncc} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {cust.ma_khncc}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <div className="font-medium">{cust.ten_cong_ty_khach_hang}</div>
                                            {cust.ma_so_thue && <div className="text-xs text-gray-500">MST: {cust.ma_so_thue}</div>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {cust.dien_thoai_1 || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs" title={cust.dia_chi_cong_ty_1}>
                                            {cust.dia_chi_cong_ty_1 || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <Button size="xs" onClick={() => handleSelect(cust)}>
                                                Chọn
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};
// src/archive/components/ContextualSearchModalContainer.jsx

import React, { useState, useMemo, Fragment } from 'react';
import { Modal, Button, Icon } from '../../components/ui.jsx';
// Import các component cần thiết để sử dụng bên trong Modal
// Giả định các file này đã được import và tồn tại đúng trong scope của ứng dụng
import { CustomerDetailModal } from '../../components/Modals/CustomerDetailModal.jsx';
import { ProductDetailModal } from '../../components/Modals/ProductDetailModal.jsx';
import { SalesOrderDetailModal } from '../../components/Modals/SalesOrderDetailModal.jsx'; 
import { SalesOrderForm } from '../../components/Trading/SalesOrderForm.jsx'; // Dùng cho chức năng sửa đổi

// Component con hiển thị nội dung chính dựa trên Context
const ContextualContentRenderer = ({ context, onClose, onSaveSuccess, isEditing, setIsEditing }) => {
    
    // --- MOCK LOGIC TẢI DỮ LIỆU TỔNG QUAN ---
    const mockData = {
        name: "CÔNG TY TNHH CÔNG NGHỆ MÁY TÍNH HOÀNG ĐĂNG",
        sales_rep: "Anh Giáp",
        phone: "0945024799",
        address: "Xóm 10 - Xã Diễn Thọ - Huyện Diễn Châu - Nghệ An",
        list: [
            { id: 1, so_phieu_mua: 'P1-2025-001', so_phieu_ban: 'B1-2025-002', ten_kh: 'Hoàng Đăng', tong_tien: 150000000 },
        ],
        // Dữ liệu giả lập cho Form Edit
        mockOrder: { composite_key: context.identifier, so_phieu: context.identifier, ten_khncc: 'Khách hàng giả lập', ngay: '2025-11-17', ma_khncc: 'KH001', items: [] } 
    };
    
    const getTargetDisplay = (type) => {
        switch(type) {
            case 'orders': return "Đơn hàng:";
            case 'customers': return "Khách hàng/NCC:";
            case 'products': return "Sản phẩm:";
            case 'employees': return "Nhân viên:";
            default: return "Đối tượng:";
        }
    }
    
    // Nếu đang ở chế độ sửa Đơn hàng, hiển thị form
    if (context.type === 'orders' && isEditing) {
        return (
            <div className="p-4 h-full">
                <h3 className="text-xl font-bold mb-4">Sửa Đổi Đơn Hàng: {context.identifier}</h3>
                <SalesOrderForm 
                    order={mockData.mockOrder} 
                    onSaveSuccess={() => { setIsEditing(false); onSaveSuccess(); }}
                    onCancel={() => setIsEditing(false)} 
                />
            </div>
        );
    }
    
    // Chế độ Xem / Danh sách
    return (
        <div className="h-full space-y-4">
            
            {/* Thông tin tìm thấy/tạo mới */}
            <div className="border rounded-md p-4 bg-white shadow-sm space-y-3 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-800">
                    {getTargetDisplay(context.type)}
                    <span className="text-blue-600 ml-2">{mockData.name}</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Đại diện: </span>{mockData.sales_rep}</div>
                    <div><span className="font-semibold">Điện thoại: </span>{mockData.phone}</div>
                    {/* Nút Sửa đổi cho Đơn hàng */}
                    {context.type === 'orders' && (
                        <div className="col-span-2">
                             <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                                <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.283-8.283z" className="w-4 h-4 mr-1"/>
                                Sửa Đơn Hàng
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Thanh menu lọc phụ (Tạm thời không lọc) */}
            <div className="flex space-x-4 border-b border-gray-200">
                 {['Tất cả', 'Chưa xác nhận', 'Xác nhận', 'Đã hủy'].map(tab => (
                    <button key={tab} 
                        className={`py-2 px-3 text-sm font-medium ${'Tất cả' === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Danh sách kết quả */}
            <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số phiếu mua</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số phiếu bán</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên Khách hàng/NCC</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tổng số tiền</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {mockData.list.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-blue-600 cursor-pointer">{item.so_phieu_mua || 'N/A'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-green-600 cursor-pointer">{item.so_phieu_ban || 'N/A'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">{item.ten_kh || 'N/A'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{new Intl.NumberFormat('vi-VN').format(item.tong_tien)} đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- COMPONENT CONTAINER CHÍNH ---
export const ContextualSearchModalContainer = (props) => {
    if (!props.context || !props.context.identifier) return null;
    
    const [isEditing, setIsEditing] = useState(false);
    const [activeMenu, setActiveMenu] = useState('Danh sách mua'); // Giả lập Menu đang hoạt động

    const initialContext = useMemo(() => {
        return { type: props.context.type, identifier: String(props.context.identifier) };
    }, [props.context]);

    const getTitlePrefix = (type) => {
        switch(type) {
            case 'orders': return "Đơn hàng";
            case 'customers': return "Khách hàng/NCC";
            case 'products': return "Sản phẩm";
            case 'employees': return "Nhân viên";
            default: return "Tìm kiếm chung";
        }
    }

    return (
        <Modal 
            isOpen={true} 
            onClose={props.onClose} 
            title={`Tất cả trong một: ${getTitlePrefix(initialContext.type)}`} 
            maxWidthClass="max-w-7xl" // Luôn là modal lớn
        >
            <div className="h-[90vh] flex flex-col">
                {/* Thanh tìm kiếm và Tiêu đề */}
                <div className="p-4 border-b flex-shrink-0">
                    <div className="flex items-center space-x-3 mb-3">
                        <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-blue-400 rounded-md shadow-sm text-lg"
                            placeholder={`Nhập ${getTitlePrefix(initialContext.type)} để tìm kiếm...`}
                            defaultValue={initialContext.identifier}
                        />
                         <div className="flex-shrink-0 flex space-x-2">
                            <Button variant="secondary" size="sm">Tùy chọn</Button>
                            <Button variant="secondary" size="sm">Trợ giúp</Button>
                        </div>
                    </div>
                    
                    {/* Menu/Bộ lọc */}
                    <div className="flex space-x-4 text-sm mt-2 overflow-x-auto">
                        {['Menu', 'Danh sách mua', 'Số khách hàng/NCC', 'Thời gian trả nợ', 'Phải thu/Phải trả', 'Danh mục'].map(menu => (
                            <button key={menu} onClick={() => setActiveMenu(menu)}
                                className={`whitespace-nowrap py-1 px-3 rounded-md font-medium ${activeMenu === menu ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                {menu}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nội dung chính */}
                <div className="flex-1 overflow-y-auto p-4">
                    <ContextualContentRenderer 
                        context={initialContext} 
                        onClose={props.onClose}
                        onSaveSuccess={props.onSaveSuccess}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                    />
                </div>
                
                 <div className="flex justify-end p-4 border-t flex-shrink-0">
                    <Button variant="secondary" onClick={props.onClose}>Đóng Modal</Button>
                </div>
            </div>
        </Modal>
    );
};
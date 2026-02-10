// src/archive/components/ContextualSearchModal.jsx (DÙNG CHO MỤC ĐÍCH MÔ PHỎNG)
import React, { useState, useMemo } from 'react';
import { Modal, Button, Icon } from '../../components/ui.jsx';

// Component con mô phỏng hiển thị dữ liệu chi tiết
const MockSearchContent = ({ initialContext }) => {
    // Giả định tải kết quả
    const mockData = {
        name: initialContext.identifier,
        type: initialContext.type,
        list: [{ id: 1, so_phieu_mua: 'P1-2025-001', so_phieu_ban: 'B1-2025-002', ten_kh: 'Hoàng Đăng', tong_tien: 150000000 }],
        ten_cong_ty_khach_hang: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ LAM SON'
    };

    const renderHeaderButtons = () => (
        <div className="flex justify-end space-x-2 pt-1">
            <Button variant="secondary" size="xs">Tùy chọn</Button>
            <Button variant="secondary" size="xs">Trợ giúp</Button>
        </div>
    );

    const renderResultsList = () => (
        <div className="space-y-3">
            <h4 className="text-lg font-semibold border-b pb-2">Hoạt động Giao dịch liên quan ({initialContext.type.toUpperCase()})</h4>
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
             {/* Chỉ hiển thị nút Sửa đổi nếu là Đơn hàng */}
             {initialContext.type === 'order' && (
                <div className="mt-4 flex justify-end">
                    <Button variant="primary">Mở Form Sửa Đơn hàng</Button>
                </div>
             )}
        </div>
    );

    return (
        <div className="h-[75vh] flex flex-col space-y-4">
             {/* Thông tin tìm thấy/tạo mới */}
            <div className="border rounded-md p-4 bg-white shadow-sm space-y-3 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-800">
                    {initialContext.type === 'customer' ? 'Khách hàng/NCC:' : initialContext.type === 'product' ? 'Sản phẩm:' : 'Đơn hàng:'}
                    <span className="text-blue-600 ml-2">{mockData.ten_cong_ty_khach_hang}</span>
                </h3>
                <div className="text-sm text-gray-600">
                    Mã định danh đang tìm: {initialContext.identifier}
                </div>
            </div>
            {/* Danh sách kết quả (Đã cuộn) */}
            <div className="flex-1 overflow-y-auto">
                 {renderResultsList()}
            </div>
        </div>
    );
};

// --- COMPONENT CONTAINER CHÍNH (ContextualSearchModalContainer) ---
export const ContextualSearchModalContainer = (props) => {
    if (!props.context || !props.context.identifier) return null;

    const [activeMenu, setActiveMenu] = useState('Danh sách mua'); // Giả lập Menu đang hoạt động

    const initialContext = useMemo(() => {
        // Đảm bảo identifier là chuỗi để hiển thị
        return { type: props.context.type, identifier: String(props.context.identifier) };
    }, [props.context]);

    const getTitlePrefix = (type) => {
        switch(type) {
            case 'order': return "Đơn hàng";
            case 'customer': return "Khách hàng/NCC";
            case 'product': return "Sản phẩm";
            case 'employee': return "Nhân viên";
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
                    <MockSearchContent initialContext={initialContext} />
                </div>
                
                {/* Footer (Nút Đóng) */}
                 <div className="flex justify-end p-4 border-t flex-shrink-0">
                    <Button variant="secondary" onClick={props.onClose}>Đóng Modal</Button>
                </div>
            </div>
        </Modal>
    );
};
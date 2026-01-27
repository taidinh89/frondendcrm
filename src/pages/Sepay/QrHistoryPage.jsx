import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import { Button, Icon, Table } from '../ui'; // Giả sử bạn có component UI chuẩn
import { Icon, Modal, Button, Checkbox, Pagination } from '../../components/ui.jsx';
import { QrDisplay } from '../../components/sepay/QrDisplay'; // Component bạn đã tạo

export const QrHistoryPage = ({ setAppTitle }) => {
    useEffect(() => { if(setAppTitle) setAppTitle('Lịch sử & Quản lý QR'); }, []);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({ status: '', type: '' });
    const [pagination, setPagination] = useState({ page: 1, total: 0, per_page: 20 });
    
    // State xem chi tiết
    const [selectedQr, setSelectedQr] = useState(null);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, ...filters };
            const res = await axios.get('/api/v2/sepay/history', { params });
            setData(res.data.data);
            setPagination({
                page: res.data.current_page,
                total: res.data.total,
                per_page: res.data.per_page
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1);
    }, [filters]);

    const getTypeLabel = (type) => {
        switch (type) {
            case 'order': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Đơn hàng</span>;
            case 'static_user': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Nạp User</span>;
            case 'static_custom': return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Tùy chỉnh</span>;
            default: return type;
        }
    };

    const getStatusLabel = (status) => {
        if (status === 'paid') return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Thành công</span>;
        if (status === 'cancelled') return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">Đã hủy</span>;
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Đang chờ</span>;
    };

    // Helper: Ép buộc HTTPS để tránh lỗi Mixed Content
    const getSecureUrl = (url) => {
        if (!url) return null;
        // Thay thế http:// bằng https://
        return url.replace(/^http:\/\//i, 'https://');
    };

    return (
        <div className="p-4 space-y-4 h-full flex flex-col">
            {/* 1. Header & Bộ lọc */}
            <div className="flex justify-between items-end bg-white p-4 rounded shadow-sm border">
                <div className="flex gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                        <select 
                            className="border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                            value={filters.status}
                            onChange={e => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="">Tất cả</option>
                            <option value="pending">Đang chờ</option>
                            <option value="paid">Thành công</option>
                        </select>
                    </div>
                    {/* Thêm bộ lọc Type nếu cần */}
                </div>
                <Button onClick={() => fetchData(pagination.page)}>Làm mới</Button>
            </div>

            {/* 2. Nội dung chính: Danh sách hoặc Chi tiết */}
            <div className="flex-1 bg-white rounded shadow-sm border overflow-hidden flex">
                {/* Cột trái: Danh sách */}
                <div className={`flex-1 overflow-auto ${selectedQr ? 'hidden md:block md:w-2/3 border-r' : 'w-full'}`}>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600">Mã / Nội dung</th>
                                <th className="p-3 font-medium text-gray-600">Loại</th>
                                <th className="p-3 font-medium text-gray-600 text-right">Số tiền</th>
                                <th className="p-3 font-medium text-gray-600">Người tạo</th>
                                <th className="p-3 font-medium text-gray-600">Trạng thái</th>
                                <th className="p-3 font-medium text-gray-600 text-center">Ảnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map(item => (
                                <tr 
                                    key={item.id} 
                                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedQr?.id === item.id ? 'bg-blue-50' : ''}`}
                                    onClick={() => setSelectedQr(item)}
                                >
                                    <td className="p-3">
                                        <div className="font-bold text-gray-800">{item.order_code}</div>
                                        <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString('vi-VN')}</div>
                                    </td>
                                    <td className="p-3">{getTypeLabel(item.type)}</td>
                                    <td className="p-3 text-right font-mono font-semibold">
                                        {new Intl.NumberFormat('vi-VN').format(item.amount)}
                                    </td>
                                    <td className="p-3 text-gray-600">{item.user?.name}</td>
                                    <td className="p-3">{getStatusLabel(item.status)}</td>
                                    <td className="p-3 text-center">
                                        {item.qr_image_path ? (
                                            <Icon path="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" className="w-5 h-5 text-blue-500 mx-auto" />
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">Chưa có dữ liệu</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Cột phải: Preview Chi tiết */}
                {selectedQr && (
                    <div className="w-full md:w-1/3 p-4 bg-gray-50 flex flex-col border-l animate-slide-in-right">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Chi tiết Mã QR</h3>
                            <button onClick={() => setSelectedQr(null)} className="text-gray-400 hover:text-gray-600">
                                <Icon path="M6 18L18 6M6 6l12 12" />
                            </button>
                        </div>
                        
                        {/* Tái sử dụng Component QrDisplay cũ nhưng truyền data chuẩn */}
                        <QrDisplay 
                            orderData={{
                                order_code: selectedQr.order_code,
                                amount: selectedQr.amount,
                                qr_url: getSecureUrl(selectedQr.qr_url_full), // [FIX] Ép HTTPS
                                content: selectedQr.order_code
                            }} 
                            onReset={() => {
                                fetchData(pagination.page); // Refresh list
                                setSelectedQr(null);
                            }}
                        />

                        {selectedQr.qr_image_path && (
                             <div className="mt-4 text-center">
                                <a 
                                    href={getSecureUrl(selectedQr.qr_url_full)} // [FIX] Ép HTTPS cho link tải
                                    download={`QR_${selectedQr.order_code}.png`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Tải ảnh gốc về máy
                                </a>
                             </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Phân trang đơn giản */}
            <div className="flex justify-center space-x-2">
                <Button 
                    variant="secondary" 
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchData(pagination.page - 1)}
                >
                    Trước
                </Button>
                <span className="px-3 py-1 flex items-center text-sm text-gray-600">
                    Trang {pagination.page}
                </span>
                <Button 
                    variant="secondary" 
                    size="sm"
                    disabled={data.length < pagination.per_page}
                    onClick={() => fetchData(pagination.page + 1)}
                >
                    Sau
                </Button>
            </div>
        </div>
    );
};
import React, { useState } from 'react';

// Dữ liệu giả lập cho bảng, sau này có thể thay thế bằng API call
const mockData = [
    {
        id: 1,
        date: '11/10/2025-54',
        version: 'BH220422',
        customer: 'NGUYỄN NGỌC THẠCH',
        address: 'Số 18, đường Nguyễn Du, phường Phú Tân, phường Nghi Phú, TP.Vinh',
        item: 'Ổ cứng SSD TRM S100 120GB 2.5inch Sata3',
        quantity: 1,
        inventory: '310.000',
        printStatus: 'Đã chọn',
        debt: '310.000',
        note: 'CK, Dán tem, Ship Unicar',
        internalNote: 'Chưa kiểm tra',
        status: 'Kho Tiếng 21',
        location: 'Xem',
        shipping: 'chưa xuất',
    },
    {
        id: 2,
        date: '11/10/2025-53',
        version: 'BH220421',
        customer: 'CÔNG TY TNHH VẬT TƯ PHÁT TRIỂN HOÀNG TUẤN (NAM ANH HAPPY HOUSE)',
        address: 'Số 101, đường Ngô Đức Kế, Phường Trường Vinh, Tỉnh Nghệ An, Việt Nam',
        item: 'Mực in Thuận Phong TPFI3 145Gr (2900/3300/3500...)',
        quantity: 2,
        inventory: '100.000',
        printStatus: 'Đã chọn',
        debt: '100.000',
        note: 'Bán ship Unicar, Thu hộ tiền Ship cho Tuấn, Khách tự trả',
        internalNote: 'Chưa kiểm tra',
        status: 'Kho Tiếng 21',
        location: 'Xem',
        shipping: 'không xuất',
    },
    {
        id: 3,
        date: '11/10/2025-52',
        version: 'BH220420',
        customer: 'LÊ MẠNH CƯỜNG',
        address: 'K8- TT Hưng Nguyên',
        item: 'Màn hình xách tay Dell Vostro 3530 (i3-1305U/8GB/512GB SSD/15.6 inch)',
        quantity: 3,
        inventory: '9.990.000',
        printStatus: 'Đã chọn',
        debt: '9.990.000',
        note: 'CK - Nhận hàng',
        internalNote: 'Chưa kiểm tra',
        status: 'Kho Tiếng 21',
        location: 'Xem',
        shipping: 'không xuất',
    },
     {
        id: 4,
        date: '11/10/2025-50',
        version: 'BH220418',
        customer: 'DOANH NGHIỆP TƯ NHÂN THƯƠNG MẠI CÁT ĐẰNG',
        address: 'Số nhà 265 Ngô Gia Tự, Vinh, Nghệ An',
        item: 'Camera IMOU IPC-C22EP 2x, 3MP Wifi cố định trong nhà',
        quantity: 7,
        inventory: '1.339.000',
        printStatus: 'Đã chọn',
        debt: '42.557.000',
        note: 'Nhận hàng',
        internalNote: 'Chưa kiểm tra',
        status: 'Kho Tiếng 21',
        location: 'Xem',
        shipping: 'chưa xuất',
    },
];

// Component Icon (để dễ sử dụng lại)
const Icon = ({ path, className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path}></path>
    </svg>
);

// Component Sidebar
const Sidebar = () => (
    <aside className="w-60 bg-white flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-blue-600">QUOCVIET</h1>
        </div>
        <nav className="flex-1 overflow-y-auto">
            <ul className="py-2">
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
                    <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" className="w-5 h-5" />
                    <span>Báo giá</span>
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
                    <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" className="w-5 h-5" />
                    <span>Đơn bán hàng</span>
                </li>
                <li className="bg-blue-50 text-blue-600 font-semibold">
                    <div className="px-4 py-2 cursor-pointer flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Icon path="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" className="w-5 h-5" />
                            <span>Đơn hàng</span>
                        </div>
                        <Icon path="M19 9l-7 7-7-7" />
                    </div>
                    <ul className="pl-8 py-1 bg-white">
                        <li className="py-1.5 hover:text-blue-600 cursor-pointer">Thư nháp đơn hàng</li>
                        <li className="py-1.5 text-blue-600 font-bold cursor-pointer">Đã xuất hóa đơn</li>
                    </ul>
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
                    <Icon path="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" className="w-5 h-5" />
                    <span>Đơn giao hàng</span>
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
                    <Icon path="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" className="w-5 h-5" />
                    <span>Giao hàng</span>
                </li>
            </ul>
        </nav>
    </aside>
);

// Component Header
const Header = () => (
    <header className="bg-white border-b border-gray-200">
        <div className="h-12 flex items-center justify-between px-4">
            <nav className="flex items-center space-x-4 text-gray-600">
                <a href="#" className="hover:text-blue-600">Trang cá nhân</a>
                <a href="#" className="hover:text-blue-600">Tài chính</a>
                <a href="#" className="font-semibold text-gray-900 border-b-2 border-blue-600 pb-3">Kiểm kê</a>
                <a href="#" className="hover:text-blue-600">Kế toán I</a>
                <a href="#" className="hover:text-blue-600">Kế toán II</a>
                <a href="#" className="hover:text-blue-600">Nhân sự</a>
                <a href="#" className="hover:text-blue-600">Công ty</a>
                <a href="#" className="hover:text-blue-600">Trung tâm dữ liệu</a>
            </nav>
            <div className="flex items-center space-x-3">
                <button className="p-2 rounded-full hover:bg-gray-100"><Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-5 h-5 text-gray-500" /></button>
                <button className="p-2 rounded-full hover:bg-gray-100"><Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" className="w-5 h-5 text-gray-500" /></button>
                <button className="p-2 rounded-full hover:bg-gray-100"><Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-gray-500" /></button>
                <button className="p-2 rounded-full hover:bg-gray-100"><Icon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" className="w-5 h-5 text-gray-500" /></button>
                <img src="https://placehold.co/32x32/E2E8F0/4A5568?text=AD" alt="Admin" className="w-8 h-8 rounded-full" />
                <button className="p-2 rounded-full hover:bg-gray-100"><Icon path="M4 6h16M4 12h16M4 18h16" className="w-5 h-5 text-gray-500" /></button>
            </div>
        </div>
        <div className="h-12 flex items-center px-4 space-x-6 text-gray-600">
            <a href="#" className="hover:text-blue-600">Thiết lập</a>
            <a href="#" className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-3">Bán hàng</a>
            <a href="#" className="hover:text-blue-600">Mua hàng</a>
            <a href="#" className="hover:text-blue-600">Sản xuất</a>
            <a href="#" className="hover:text-blue-600">Biên động hàng</a>
            <a href="#" className="hover:text-blue-600">Báo cáo</a>
        </div>
    </header>
);

// Component Main Content Area
const MainContent = () => {
    const [selectedRows, setSelectedRows] = useState(new Set([2]));
    const [allSelected, setAllSelected] = useState(false);

    const handleSelectRow = (id) => {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedRows(newSelection);
        setAllSelected(newSelection.size === mockData.length);
    };

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedRows(new Set());
            setAllSelected(false);
        } else {
            setSelectedRows(new Set(mockData.map(item => item.id)));
            setAllSelected(true);
        }
    };
    
    return (
        <main className="flex-1 overflow-y-auto p-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
                {/* Action Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Danh sách bán hàng</h2>
                    <div className="flex items-center space-x-2">
                        <button className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300">Tải Lên</button>
                        <button className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300">Phê duyệt</button>
                        <div className="flex border rounded-md">
                            <button className="px-3 py-1.5 hover:bg-gray-100 border-r">Chưa xác nhận</button>
                            <button className="px-3 py-1.5 hover:bg-gray-100 border-r">Xác nhận</button>
                            <button className="px-3 py-1.5 hover:bg-gray-100">Đã bán</button>
                        </div>
                        <button className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300">Đổ bao bì, tạo hóa đơn</button>
                    </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Nhập nội dung tìm kiếm..." className="border rounded-md px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700">Tìm kiếm (F2)</button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Tùy chọn</button>
                        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Trợ giúp</button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50 text-left text-gray-600">
                            <tr>
                                <th className="p-3 w-4"><input type="checkbox" checked={allSelected} onChange={handleSelectAll} /></th>
                                <th className="p-3 font-semibold">Ngày/Số</th>
                                <th className="p-3 font-semibold">Số phiên bản</th>
                                <th className="p-3 font-semibold">Tên KH/NCC</th>
                                <th className="p-3 font-semibold">Địa chỉ giao hàng</th>
                                <th className="p-3 font-semibold">Tên mặt hàng</th>
                                <th className="p-3 font-semibold">Số lượng</th>
                                <th className="p-3 font-semibold">SL Tồn kho</th>
                                <th className="p-3 font-semibold">Tình trạng in...</th>
                                <th className="p-3 font-semibold">Công nợ còn lại</th>
                                <th className="p-3 font-semibold">Ghi chú trên phiếu</th>
                                <th className="p-3 font-semibold">Ghi chú nội bộ...</th>
                                <th className="p-3 font-semibold">Hiện trạng</th>
                                <th className="p-3 font-semibold">Tên điểm</th>
                                <th className="p-3 font-semibold">Điểm đi</th>
                                <th className="p-3 font-semibold">Phải GTGT...</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mockData.map((row) => (
                                <tr key={row.id} className={`${selectedRows.has(row.id) ? 'bg-blue-50' : ''} hover:bg-gray-50`}>
                                    <td className="p-3"><input type="checkbox" checked={selectedRows.has(row.id)} onChange={() => handleSelectRow(row.id)} /></td>
                                    <td className="p-3 text-blue-600 font-semibold">{row.date}</td>
                                    <td className="p-3">{row.version}</td>
                                    <td className="p-3 font-semibold">{row.customer}</td>
                                    <td className="p-3">{row.address}</td>
                                    <td className="p-3">{row.item}</td>
                                    <td className="p-3 text-right">{row.quantity}</td>
                                    <td className="p-3 text-right text-red-600">{row.inventory}</td>
                                    <td className="p-3"><button className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-xs">{row.printStatus}</button></td>
                                    <td className="p-3 text-right">{row.debt}</td>
                                    <td className="p-3">{row.note}</td>
                                    <td className="p-3 text-blue-600 cursor-pointer">{row.internalNote}</td>
                                    <td className="p-3">{row.status}</td>
                                    <td className="p-3">{row.location}</td>
                                    <td className="p-3 text-blue-600 cursor-pointer">{row.shipping}</td>
                                    <td className="p-3"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <span className="text-gray-600">Tổng số: {mockData.length}</span>
                    <div className="flex items-center space-x-1">
                        <button className="px-2 py-1 rounded border hover:bg-gray-100">&laquo;</button>
                        <button className="px-3 py-1 rounded border bg-blue-600 text-white">1</button>
                        <button className="px-3 py-1 rounded border hover:bg-gray-100">2</button>
                        <span className="px-2 py-1">...</span>
                        <button className="px-2 py-1 rounded border hover:bg-gray-100">&raquo;</button>
                    </div>
                </div>
            </div>
        </main>
    )
};

// Component Footer
const Footer = () => (
    <footer className="bg-white border-t border-gray-200 p-2 flex items-center space-x-2">
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">Tạo mới (F2)</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Email</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Thay đổi tình trạng</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">In</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Đã chốt sổ</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Mở (Sửa) chứng từ</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Phê duyệt</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Xóa</button>
        <button className="bg-white text-gray-700 px-3 py-1.5 rounded-md border hover:bg-gray-50">Lược sử</button>
    </footer>
);


// Main App Component
function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-sm text-gray-800">
        <Sidebar />
        <div className="flex-1 flex flex-col">
            <Header />
            <MainContent />
            <Footer />
        </div>
    </div>
  );
}

export default App;


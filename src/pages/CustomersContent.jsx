// src/pages/CustomersContent.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui.jsx';
import { useV2Paginator } from '../hooks/useV2Paginator.js';
import { CustomerDetailModal } from '../components/CustomerDetailModal.jsx';

// --- CẤU HÌNH CỘT MỚI (FULL THÔNG TIN) ---
const DEFAULT_COLUMNS = [
    // 1. Nhóm ưu tiên hiển thị đầu tiên (Theo yêu cầu)
    { key: 'ma_khncc', label: 'Mã KH', width: 150, visible: true, sortable: true },
    { key: 'ten_cong_ty_khach_hang', label: 'Tên Khách Hàng / Công Ty', width: 250, visible: true, sortable: true },
    { key: 'dien_thoai_1', label: 'SĐT 1', width: 120, visible: true, sortable: true },
    { key: 'dien_thoai_2', label: 'SĐT 2', width: 120, visible: true, sortable: true },
    { key: 'dia_chi_cong_ty_1', label: 'Địa Chỉ 1', width: 300, visible: true, sortable: false },
    { key: 'dia_chi_cong_ty_2', label: 'Địa Chỉ 2', width: 200, visible: true, sortable: false },

    // 2. Nhóm thông tin liên hệ & MXH
    { key: 'email', label: 'Email', width: 200, visible: true, sortable: true },
    { key: 'so_zalo', label: 'Zalo', width: 120, visible: true, sortable: true },
    { key: 'link_facebook', label: 'Facebook', width: 200, visible: false, sortable: false }, // Mặc định ẩn cho gọn, user có thể bật

    // 3. Nhóm quản lý & Phân loại
    { key: 'nhan_vien_phu_trach', label: 'NV Phụ Trách', width: 180, visible: true, sortable: true },
    { key: 'nhom_chuc_nang_khncc', label: 'Nhóm Chức Năng', width: 150, visible: true, sortable: true },
    { key: 'nhom_dia_ly', label: 'Nhóm Địa Lý', width: 150, visible: true, sortable: true },
    { key: 'nguon_khach_hang', label: 'Nguồn KH', width: 150, visible: false, sortable: true },
    { key: 'gia_ban_theo_nhom', label: 'Giá Bán Theo Nhóm', width: 150, visible: false, sortable: false },
    { key: 'ten_kh_lien_he_giam_doc', label: 'Người Đại Diện', width: 200, visible: false, sortable: false },

    // 4. Nhóm Tài chính & Pháp lý
    { key: 'ma_so_thue', label: 'Mã Số Thuế', width: 120, visible: true, sortable: true },
    { key: 'han_muc_tin_dung', label: 'Hạn Mức Tín Dụng', width: 150, visible: true, sortable: true, align: 'right', format: 'currency' },
    { key: 'thoi_gian_cho_vay', label: 'Thời Gian Cho Vay', width: 150, visible: false, sortable: false },
    { key: 'ma_misa', label: 'Mã MISA', width: 120, visible: false, sortable: true },

    // 5. Nhóm Audit (Lịch sử tạo/sửa)
    { key: 'ngay_tao_dau_tien', label: 'Ngày Tạo', width: 160, visible: true, sortable: true, format: 'datetime' },
    { key: 'nguoi_tao_dau_tien', label: 'Người Tạo', width: 150, visible: false, sortable: true },
    { key: 'ngay_sua_cuoi_cung', label: 'Ngày Sửa Cuối', width: 160, visible: false, sortable: true, format: 'datetime' },
    { key: 'nguoi_chinh_sua_cuoi', label: 'Người Sửa', width: 150, visible: false, sortable: true },

    // 6. Khác
    { key: 'is_active', label: 'Trạng Thái', width: 100, visible: true, sortable: true, align: 'center' },
    { key: 'ghi_chu', label: 'Ghi Chú', width: 250, visible: false, sortable: false },
    { key: 'tu_khoa_tim_kiem', label: 'Từ Khóa', width: 200, visible: false, sortable: false },
    { key: 'ma_khach_hang_ncc_cu', label: 'Mã Cũ', width: 120, visible: false, sortable: false },
    { key: 'ten_khach_hang_ncc_cu', label: 'Tên Cũ', width: 200, visible: false, sortable: false },
];

// --- HELPER FORMAT ---
const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDateTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN');
};

// --- COMPONENT INPUT ---
const Input = ({ label, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input {...props} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
);

// --- COMPONENT MODAL RAW DATA ---
const RawDataModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Dữ Liệu Gốc (Raw JSON) - {data.ma_khncc}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-4 overflow-auto bg-gray-900">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
                <div className="p-4 border-t flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Đóng</Button>
                </div>
            </div>
        </div>
    );
};

export const CustomersContent = () => {
    // 1. STATES
    const [filters, setFilters] = useState({ search: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'ten_cong_ty_khach_hang', direction: 'asc' });
    
    // Load config (Lưu ý: Đã đổi key sang _v3 để force update)
    const STORAGE_KEY = 'customer_columns_config_v3'; 

    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge logic: Giữ thứ tự cũ, thêm cột mới nếu thiếu
                const merged = [...parsed];
                DEFAULT_COLUMNS.forEach(defCol => {
                    if (!merged.find(c => c.key === defCol.key)) {
                        merged.push(defCol);
                    }
                });
                return merged;
            }
        } catch (e) { console.error("Lỗi load config", e); }
        return DEFAULT_COLUMNS;
    });

    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [viewingRaw, setViewingRaw] = useState(null);
    const [viewingDetail, setViewingDetail] = useState(null);

    // API Hook
    const { 
        data: customers, 
        isLoading, 
        isFetchingMore, 
        applyFilters, 
        refresh,
        fetchNextPage 
    } = useV2Paginator('/api/v2/customers', { 
        ...filters, 
        sort_by: sortConfig.key, 
        sort_direction: sortConfig.direction 
    });

    // 2. EFFECTS & HANDLERS

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    }, [columns]);

    const handleResetConfig = () => {
        if (window.confirm('Bạn có chắc muốn đặt lại giao diện về mặc định?')) {
            setColumns(DEFAULT_COLUMNS);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const handleSortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        applyFilters({ sort_by: key, sort_direction: direction });
    };

    const moveColumn = (index, direction) => {
        const newColumns = [...columns];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newColumns.length) return;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        setColumns(newColumns);
    };

    const handleResizeStart = (e, colKey) => {
        e.preventDefault();
        const startX = e.clientX;
        const colIndex = columns.findIndex(c => c.key === colKey);
        const startWidth = columns[colIndex].width;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
            setColumns(prev => prev.map(col => 
                col.key === colKey ? { ...col, width: newWidth } : col
            ));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const toggleColumn = (key) => {
        setColumns(prev => prev.map(col => 
            col.key === key ? { ...col, visible: !col.visible } : col
        ));
    };

    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50 && !isFetchingMore && !isLoading) {
            fetchNextPage();
        }
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-50">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1 text-blue-600">↑</span> : <span className="ml-1 text-blue-600">↓</span>;
    };

    return (
        <div className="p-4 h-full flex flex-col bg-gray-100 overflow-hidden">
            {/* --- TOOLBAR --- */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 p-3 bg-white rounded shadow-sm shrink-0">
                <div className="flex items-end gap-2 flex-1 min-w-[300px]">
                    <Input 
                        name="search" 
                        placeholder="Tìm kiếm (Mã, Tên, SĐT, Địa chỉ...)" 
                        className="w-full"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
                    />
                    <Button variant="primary" onClick={() => applyFilters(filters)} disabled={isLoading}>Tìm</Button>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={refresh}>Làm mới</Button>
                    
                    {/* NÚT CÀI ĐẶT CỘT */}
                    <div className="relative">
                        <Button variant="secondary" onClick={() => setShowColumnSettings(!showColumnSettings)}>
                            ⚙️ Cột
                        </Button>
                        
                        {showColumnSettings && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded shadow-xl z-50 flex flex-col max-h-[80vh]">
                                <div className="flex justify-between items-center p-3 border-b bg-gray-50 rounded-t">
                                    <span className="font-bold text-sm text-gray-700">Cấu hình cột</span>
                                    <button onClick={handleResetConfig} className="text-xs text-red-600 hover:underline">Reset mặc định</button>
                                </div>
                                
                                <div className="overflow-y-auto p-2 flex-1">
                                    {columns.map((col, index) => (
                                        <div key={col.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={col.visible} 
                                                    onChange={() => toggleColumn(col.key)}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className={`text-sm ${!col.visible ? 'text-gray-400' : 'text-gray-700'}`}>
                                                    {col.label}
                                                </span>
                                            </label>
                                            <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveColumn(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-20">↑</button>
                                                <button onClick={() => moveColumn(index, 1)} disabled={index === columns.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-20">↓</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t bg-gray-50 text-center">
                                    <button onClick={() => setShowColumnSettings(false)} className="text-xs text-blue-600 hover:underline">Đóng menu</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- TABLE CONTAINER --- */}
            <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-auto" onScroll={handleScroll}>
                    <table className="w-full border-collapse table-fixed" style={{ minWidth: 'max-content' }}>
                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="w-[100px] p-2 border-b border-r bg-gray-100 sticky left-0 z-30 text-center text-xs font-bold uppercase text-gray-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Thao tác
                                </th>
                                {columns.filter(c => c.visible).map((col) => (
                                    <th 
                                        key={col.key}
                                        className="border-b border-r bg-gray-100 relative group select-none hover:bg-gray-200 transition-colors"
                                        style={{ width: col.width }}
                                    >
                                        <div 
                                            className={`flex items-center p-2 text-xs font-bold uppercase text-gray-600 h-full cursor-pointer ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                                            onClick={() => col.sortable && handleSortData(col.key)}
                                            title="Click để sắp xếp dữ liệu"
                                        >
                                            <span className="truncate">{col.label}</span>
                                            {col.sortable && <SortIcon columnKey={col.key} />}
                                        </div>
                                        <div 
                                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 z-40 opacity-0 hover:opacity-100 transition-opacity"
                                            onMouseDown={(e) => handleResizeStart(e, col.key)}
                                            title="Kéo để chỉnh độ rộng"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading && customers.length === 0 ? (
                                <tr><td colSpan={columns.length + 1} className="p-10 text-center">Đang tải dữ liệu...</td></tr>
                            ) : customers.map((row) => (
                                <tr key={row.id} className="hover:bg-blue-50 group transition-colors">
                                    <td className="p-2 border-r bg-white group-hover:bg-blue-50 sticky left-0 z-10 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => setViewingDetail(row.ma_khncc)}
                                                className="text-blue-600 hover:text-blue-800 text-xs border border-blue-200 px-2 py-0.5 rounded bg-white hover:bg-blue-50"
                                                title="Xem Chi Tiết"
                                            >
                                                Xem
                                            </button>
                                            <button 
                                                onClick={() => setViewingRaw(row)}
                                                className="text-gray-500 hover:text-black text-xs border border-gray-200 px-2 py-0.5 rounded bg-white font-mono hover:bg-gray-100"
                                                title="Xem Raw JSON"
                                            >
                                                Raw
                                            </button>
                                        </div>
                                    </td>

                                    {columns.filter(c => c.visible).map(col => {
                                        let val = row[col.key];
                                        
                                        // Format dữ liệu
                                        if (col.format === 'currency') val = formatCurrency(val);
                                        else if (col.format === 'datetime') val = formatDateTime(val);
                                        else if (col.key === 'is_active') {
                                            val = val ? 
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span> : 
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Inactive</span>;
                                        }
                                        
                                        return (
                                            <td 
                                                key={`${row.id}-${col.key}`}
                                                className="p-2 border-r text-sm text-gray-700 whitespace-nowrap overflow-hidden"
                                                style={{ 
                                                    width: col.width, 
                                                    maxWidth: col.width,
                                                    textAlign: col.align || 'left' 
                                                }}
                                                title={typeof val === 'string' ? val : ''} 
                                            >
                                                {val || <span className="text-gray-300 text-xs">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            
                            {isFetchingMore && (
                                <tr><td colSpan={100} className="p-3 text-center bg-gray-50 text-sm text-gray-500 italic">Đang tải thêm dữ liệu...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Info */}
                <div className="bg-gray-50 p-2 border-t text-xs text-gray-500 flex justify-between select-none">
                    <span>Đã hiển thị: <b>{customers.length}</b> dòng</span>
                    <span>Giữ và kéo cạnh phải của tiêu đề cột để thay đổi độ rộng</span>
                </div>
            </div>

            {/* MODALS */}
            {viewingDetail && (
                <CustomerDetailModal 
                    customerIdentifier={viewingDetail} 
                    onClose={() => setViewingDetail(null)} 
                />
            )}
            
            {viewingRaw && (
                <RawDataModal 
                    data={viewingRaw} 
                    onClose={() => setViewingRaw(null)} 
                />
            )}
        </div>
    );
};
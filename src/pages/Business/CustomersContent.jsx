// src/pages/Business/CustomersContent.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { Button, Icon, Modal } from '../../components/ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal.jsx';

// --- CẤU HÌNH CỘT MỚI (FULL THÔNG TIN) ---
const DEFAULT_COLUMNS = [
    { key: 'ma_khncc', label: 'Mã KH/NCC', width: 150, visible: true, sortable: true },
    { key: 'ten_cong_ty_khach_hang', label: 'Tên Đối Tác (KH/NCC) / Công Ty', width: 250, visible: true, sortable: true },
    { key: 'dien_thoai_1', label: 'SĐT 1', width: 120, visible: true, sortable: true },
    { key: 'dien_thoai_2', label: 'SĐT 2', width: 120, visible: true, sortable: true },
    { key: 'dia_chi_cong_ty_1', label: 'Địa Chỉ 1', width: 300, visible: true, sortable: false },
    { key: 'dia_chi_cong_ty_2', label: 'Địa Chỉ 2', width: 200, visible: true, sortable: false },
    { key: 'email', label: 'Email', width: 200, visible: true, sortable: true },
    { key: 'so_zalo', label: 'Zalo', width: 120, visible: true, sortable: true },
    { key: 'link_facebook', label: 'Facebook', width: 200, visible: false, sortable: false },
    { key: 'nhan_vien_phu_trach', label: 'NV Phụ Trách', width: 180, visible: true, sortable: true },
    { key: 'nhom_chuc_nang_khncc', label: 'Nhóm Chức Năng', width: 150, visible: true, sortable: true },
    { key: 'nhom_dia_ly', label: 'Nhóm Địa Lý', width: 150, visible: true, sortable: true },
    { key: 'nguon_khach_hang', label: 'Nguồn KH', width: 150, visible: false, sortable: true },
    { key: 'gia_ban_theo_nhom', label: 'Giá Bán Theo Nhóm', width: 150, visible: false, sortable: false },
    { key: 'ten_kh_lien_he_giam_doc', label: 'Người Đại Diện', width: 200, visible: false, sortable: false },
    { key: 'ma_so_thue', label: 'Mã Số Thuế', width: 120, visible: true, sortable: true },
    { key: 'han_muc_tin_dung', label: 'Hạn Mức Tín Dụng', width: 150, visible: true, sortable: true, align: 'right', format: 'currency' },
    { key: 'thoi_gian_cho_vay', label: 'Thời Gian Cho Vay', width: 150, visible: false, sortable: false },
    { key: 'ma_misa', label: 'Mã MISA', width: 120, visible: false, sortable: true },
    { key: 'ngay_tao_dau_tien', label: 'Ngày Tạo', width: 160, visible: true, sortable: true, format: 'datetime' },
    { key: 'nguoi_tao_dau_tien', label: 'Người Tạo', width: 150, visible: false, sortable: true },
    { key: 'ngay_sua_cuoi_cung', label: 'Ngày Sửa Cuối', width: 160, visible: false, sortable: true, format: 'datetime' },
    { key: 'nguoi_chinh_sua_cuoi', label: 'Người Sửa', width: 150, visible: false, sortable: true },
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

// --- SKELETON UI COMPONENTS ---
const SkeletonRow = ({ colCount }) => (
    <tr className="animate-pulse">
        <td className="p-2 border-r bg-white sticky left-0 z-10"><div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div></td>
        {[...Array(colCount)].map((_, i) => (
            <td key={i} className="p-2 border-r"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
        ))}
    </tr>
);

// --- COMPONENT INPUT ---
const Input = ({ label, ...props }) => (
    <div className="w-full">
        {label && <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</label>}
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors">
                <Icon name="search" className="w-4 h-4" />
            </div>
            <input 
                {...props} 
                className="w-full pl-9 pr-4 py-1.5 md:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm group-hover:bg-white font-medium" 
            />
        </div>
    </div>
);

// --- COMPONENT MODAL RAW DATA ---
const RawDataModal = ({ data, onClose, isMobile }) => {
    if (!data) return null;
    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Dữ Liệu Gốc - ${data.ma_khncc}`}
            isFullScreen={isMobile}
            footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}
        >
            <div className={`p-4 h-full ${isMobile ? '' : 'bg-gray-900 overflow-auto'}`}>
                <pre className={`font-mono text-sm whitespace-pre-wrap ${isMobile ? 'text-gray-800' : 'text-green-400'}`}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </Modal>
    );
};

export const CustomersContent = () => {
    // 1. STATES & HOOKS
    const [filters, setFilters] = useState({ search: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'ten_cong_ty_khach_hang', direction: 'asc' });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Responsive listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const STORAGE_KEY = 'customer_columns_config_v3';
    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const merged = [...parsed];
                DEFAULT_COLUMNS.forEach(defCol => {
                    if (!merged.find(c => c.key === defCol.key)) merged.push(defCol);
                });
                return merged;
            }
        } catch (e) { console.error("Lỗi load config", e); }
        return DEFAULT_COLUMNS;
    });

    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [viewingRaw, setViewingRaw] = useState(null);
    const [viewingDetail, setViewingDetail] = useState(null);

    // --- SAFARI SCROLL LOGIC STATES ---
    const [showToolbar, setShowToolbar] = useState(true);
    const lastScrollY = useRef(0);

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

    // Debounced search
    const debouncedApplyFilters = useMemo(
        () => debounce((newFilters) => applyFilters(newFilters), 500),
        [applyFilters]
    );

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setFilters(prev => ({ ...prev, search: val }));
        debouncedApplyFilters({ ...filters, search: val });
    };

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
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
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
            setColumns(prev => prev.map(col => col.key === colKey ? { ...col, width: newWidth } : col));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const toggleColumn = (key) => {
        setColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
    };

    const handleScroll = useCallback((e) => {
        const currentScrollY = e.currentTarget.scrollTop;
        const scrollHeight = e.currentTarget.scrollHeight;
        const clientHeight = e.currentTarget.clientHeight;

        // 1. SAFARI SCROLL LOGIC (Chỉ chạy trên Mobile)
        if (isMobile) {
            // Nếu cuộn xuống (current > last) và đã qua một khoảng an toàn (50px) để tránh giật lag ở đỉnh trang
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                if (showToolbar) setShowToolbar(false); // Ẩn Toolbar
            } 
            // Nếu vuốt ngược lên
            else if (currentScrollY < lastScrollY.current) {
                if (!showToolbar) setShowToolbar(true); // Hiện lại Toolbar
            }
        }
        // Lưu lại tọa độ hiện tại cho lần tính toán tiếp theo
        lastScrollY.current = currentScrollY;

        // 2. INFINITE SCROLL LOGIC (Giữ nguyên Load More)
        if (scrollHeight - currentScrollY <= clientHeight + 100 && !isFetchingMore && !isLoading) {
            fetchNextPage();
        }
    }, [isMobile, showToolbar, isFetchingMore, isLoading, fetchNextPage]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-50">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1 text-blue-600">↑</span> : <span className="ml-1 text-blue-600">↓</span>;
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
            {/* --- TOOLBAR: SAFARI STYLE (AUTO HIDE/SHOW) --- */}
            <div 
                className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 p-2 md:p-4 shadow-sm flex items-center justify-between gap-2 shrink-0 transition-all duration-300 ease-in-out origin-top ${
                    !showToolbar && isMobile 
                    ? '-translate-y-full opacity-0 pointer-events-none absolute w-full' 
                    : 'translate-y-0 opacity-100'
                }`}
            >
                <div className="flex-1 min-w-0">
                    <Input
                        name="search"
                        placeholder="Tìm Đối tác..."
                        value={filters.search}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Nút Làm mới - Chỉ hiện Icon trên Mobile */}
                    <Button variant="secondary" className="h-10 w-10 md:w-auto md:px-4 rounded-xl flex items-center justify-center p-0 md:p-2" onClick={refresh}>
                        <Icon name="refresh" className="w-4 h-4 md:mr-2" /> 
                        <span className="hidden md:inline font-bold">Làm mới</span>
                    </Button>

                    {/* Nút Cột - Chỉ hiện Icon trên Mobile */}
                    <div className="relative">
                        <Button 
                            variant="secondary" 
                            className={`h-10 w-10 md:w-auto md:px-4 rounded-xl flex items-center justify-center p-0 md:p-2 ${showColumnSettings ? 'bg-slate-100 border-blue-500 text-blue-600' : ''}`}
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                        >
                            <Icon name="cog" className="w-4 h-4 md:mr-2" /> 
                            <span className="hidden md:inline font-bold">Cài đặt Cột</span>
                        </Button>

                        {showColumnSettings && (
                            <>
                                {isMobile ? (
                                    /* BOTTOM SHEET FOR MOBILE */
                                    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end" onClick={() => setShowColumnSettings(false)}>
                                        <div className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
                                            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0"></div>
                                            <div className="flex justify-between items-center p-4 border-b">
                                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Cấu hình hiển thị</h3>
                                                <button onClick={handleResetConfig} className="text-xs text-rose-600 font-bold">Reset</button>
                                            </div>
                                            <div className="overflow-y-auto p-4 space-y-1">
                                                {columns.map((col, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors">
                                                        <label className="flex items-center gap-3 flex-1">
                                                            <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.key)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" />
                                                            <span className={`text-sm font-bold ${!col.visible ? 'text-slate-400' : 'text-slate-700'}`}>{col.label}</span>
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => moveColumn(idx, -1)} disabled={idx === 0} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-20">↑</button>
                                                            <button onClick={() => moveColumn(idx, 1)} disabled={idx === columns.length - 1} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-20">↓</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-4 border-t bg-slate-50">
                                                <Button variant="primary" className="w-full py-4 rounded-2xl font-black uppercase tracking-widest h-auto" onClick={() => setShowColumnSettings(false)}>Xác nhận</Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* DROPDOWN FOR DESKTOP */
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-2xl shadow-2xl z-50 flex flex-col max-h-[70vh] overflow-hidden">
                                        <div className="flex justify-between items-center p-3 border-b bg-slate-50">
                                            <span className="font-bold text-xs text-slate-700 uppercase">Bật/tắt các cột</span>
                                            <button onClick={handleResetConfig} className="text-xs text-red-600 hover:underline">Reset</button>
                                        </div>
                                        <div className="overflow-y-auto p-2">
                                            {columns.map((col, index) => (
                                                <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl group">
                                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                        <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.key)} className="rounded text-blue-600" />
                                                        <span className={`text-sm ${!col.visible ? 'text-slate-400' : 'text-slate-700'}`}>{col.label}</span>
                                                    </label>
                                                    <div className="flex gap-1 opacity-20 group-hover:opacity-100">
                                                        <button onClick={() => moveColumn(index, -1)} disabled={index === 0}>↑</button>
                                                        <button onClick={() => moveColumn(index, 1)} disabled={index === columns.length - 1}>↓</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT: HYBRID COMPACT LIST/TABLE --- */}
            <div className="flex-1 overflow-auto" onScroll={handleScroll}>
                {/* 1. COMPACT LIST LAYOUT (PREMIUM MOBILE UI) */}
                <div className="block md:hidden bg-slate-50 mb-24">
                    {isLoading && customers.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold italic animate-pulse">Đang tải dữ liệu...</div>
                    ) : (
                        <div className="flex flex-col gap-2 p-2">
                            {customers.map((row) => (
                                <div 
                                    key={row.id} 
                                    onClick={() => setViewingDetail(row.ma_khncc)}
                                    className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.98] active:bg-slate-50 transition-all cursor-pointer"
                                >
                                    {/* 1. Avatar / Logo Icon để làm điểm neo thị giác */}
                                    <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shrink-0 border border-indigo-100 uppercase text-sm">
                                        {row.ten_cong_ty_khach_hang ? row.ten_cong_ty_khach_hang.charAt(0) : 'K'}
                                    </div>

                                    {/* 2. Nội dung chính */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">
                                                {row.ten_cong_ty_khach_hang || 'Chưa cập nhật tên'}
                                            </h3>
                                            {/* Thay dấu chấm bằng Badge xịn xò */}
                                            {row.is_active ? 
                                                <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 border border-emerald-100">BẬT</span> : 
                                                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 border border-rose-100">TẮT</span>
                                            }
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1 shrink-0">
                                                <Icon name="phone" className="w-3 h-3 text-slate-300"/> 
                                                <span className={row.dien_thoai_1 ? '' : 'italic opacity-50'}>{row.dien_thoai_1 || 'Trống'}</span>
                                            </span>
                                            <span className="flex items-center gap-1 truncate border-l border-slate-200 pl-3">
                                                <Icon name="user" className="w-3 h-3 text-slate-300"/> 
                                                <span className="truncate">{row.nhan_vien_phu_trach || 'Chưa gán'}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. Mũi tên điều hướng (Ẩn nút info rườm rà đi) */}
                                    <div className="shrink-0 text-slate-300 pr-1">
                                        <Icon path="M9 5l7 7-7 7" className="w-4 h-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {isFetchingMore && <div className="p-4 text-center text-xs text-blue-500 font-bold animate-pulse">Đang tải thêm...</div>}
                </div>

                {/* 2. TABLE LAYOUT (DESKTOP ONLY) */}
                <table className="hidden md:table w-full border-collapse table-fixed bg-white" style={{ minWidth: 'max-content' }}>
                    <thead className="sticky top-0 z-40 bg-slate-50 border-b shadow-sm">
                        <tr>
                            <th className="w-[100px] p-2 bg-slate-50 sticky left-0 z-30 text-center text-[10px] font-black uppercase text-slate-400">Thao tác</th>
                            {columns.filter(c => c.visible).map((col) => (
                                <th key={col.key} className="relative group select-none hover:bg-slate-100 transition-colors" style={{ width: col.width }}>
                                    <div 
                                        className={`flex items-center p-2 text-[10px] font-black uppercase text-slate-500 h-full cursor-pointer ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                                        onClick={() => col.sortable && handleSortData(col.key)}
                                    >
                                        <span className="truncate">{col.label}</span>
                                        {col.sortable && <SortIcon columnKey={col.key} />}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100" onMouseDown={(e) => handleResizeStart(e, col.key)} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading && customers.length === 0 ? (
                            [...Array(10)].map((_, i) => <SkeletonRow key={i} colCount={columns.filter(c => c.visible).length} />)
                        ) : customers.map((row) => (
                            <tr key={row.id} className="hover:bg-blue-50/50 group transition-colors">
                                <td className="p-2 border-r bg-white group-hover:bg-blue-50/50 sticky left-0 z-10 text-center shadow-sm">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => setViewingDetail(row.ma_khncc)} className="text-blue-600 hover:scale-110 transition-transform p-1"><Icon name="eye" className="w-4 h-4" /></button>
                                        <button onClick={() => setViewingRaw(row)} className="text-slate-400 hover:text-slate-800 p-1"><Icon name="info" className="w-4 h-4" /></button>
                                    </div>
                                </td>
                                {columns.filter(c => c.visible).map(col => {
                                    let val = row[col.key];
                                    if (col.format === 'currency') val = formatCurrency(val);
                                    else if (col.format === 'datetime') val = formatDateTime(val);
                                    else if (col.key === 'is_active') {
                                        val = val ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Active</span> : <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Inactive</span>;
                                    }

                                    // BIẾN MÃ VÀ TÊN THÀNH NÚT BẤM TRÊN DESKTOP
                                    const isClickable = col.key === 'ma_khncc' || col.key === 'ten_cong_ty_khach_hang';

                                    return (
                                        <td 
                                            key={col.key} 
                                            className={`p-2 text-sm whitespace-nowrap overflow-hidden truncate transition-colors ${
                                                isClickable 
                                                ? 'text-blue-600 font-bold cursor-pointer hover:bg-blue-100/50 hover:underline' 
                                                : 'text-slate-600'
                                            }`} 
                                            style={{ textAlign: col.align || 'left' }} 
                                            title={typeof val === 'string' ? val : ''}
                                            onClick={() => isClickable && setViewingDetail(row.ma_khncc)}
                                        >
                                            {val || <span className="text-slate-300">-</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {isFetchingMore && [...Array(3)].map((_, i) => <SkeletonRow key={i} colCount={columns.filter(c => c.visible).length} />)}
                    </tbody>
                </table>
            </div>

            {/* --- FOOTER INFO --- */}
            <div className="bg-white p-2 border-t text-[10px] font-bold text-slate-400 flex justify-between shrink-0 mb-safe">
                <span>DỮ LIỆU: <b>{customers.length}</b> ĐỐI TÁC</span>
                <span className="hidden md:inline">KÉO CẠNH TIÊU ĐỀ ĐỂ CHỈNH ĐỘ RỘNG CỘT</span>
            </div>

            {/* MODALS */}
            {viewingDetail && (
                <CustomerDetailModal
                    customerIdentifier={viewingDetail}
                    onClose={() => setViewingDetail(null)}
                    isFullScreen={isMobile}
                />
            )}

            {viewingRaw && (
                <RawDataModal
                    data={viewingRaw}
                    onClose={() => setViewingRaw(null)}
                    isMobile={isMobile}
                />
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .mb-safe { margin-bottom: env(safe-area-inset-bottom); }
            `}</style>
        </div>
    );
};

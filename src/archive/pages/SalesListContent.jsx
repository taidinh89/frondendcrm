// src/archive/pages/SalesListContent.jsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData.jsx';
import * as UI from '../../components/ui.jsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SalesForm } from '../../components/../archive/components/SalesForm.jsx'; 
// ✨ [THÊM MỚI] Import component in
import { SalesOrderPrintPreview } from '../../components/../archive/components/SalesOrderPrintPreview.jsx';

// ... (Các hằng số, config, formatPrice, getInitialDateRange giữ nguyên) ...
const API_ENDPOINT = '/api/v1/sales';
const API_PER_PAGE = 25; 
const ESTIMATED_ROW_HEIGHT = 60; 

const COL_ID = {
    ACTIONS: 'actions',
    DATE: 'ngay',
    COMPOSITE_KEY: 'composite_key',
    CUSTOMER: 'customer',
    TOTAL_AMOUNT: 'total_amount', 
    STATUS: 'status',
};
const ALL_COLUMN_DEFS_CONFIG = [
    // ✨ [CẬP NHẬT] Tăng độ rộng cột Hành Động để chứa 2 nút
    { id: COL_ID.ACTIONS, title: 'H.Động', minWidth: 110, sortKey: null, cellClassName: 'items-center justify-center', alwaysVisible: true },
    { id: COL_ID.DATE, title: 'Ngày', minWidth: 120, sortKey: null, alwaysVisible: true },
    { id: COL_ID.COMPOSITE_KEY, title: 'Mã Phiếu', minWidth: 150, sortKey: null, cellClassName: 'font-mono text-xs', alwaysVisible: true },
    { id: COL_ID.CUSTOMER, title: 'Khách Hàng', minWidth: 300, sortKey: null, alwaysVisible: true },
    { id: COL_ID.TOTAL_AMOUNT, title: 'Tổng Tiền', minWidth: 150, sortKey: null, headerClassName: 'justify-end', cellClassName: 'justify-end font-medium', isPrice: true, defaultVisible: true },
    { id: COL_ID.STATUS, title: 'Trạng Thái', minWidth: 120, sortKey: null, cellClassName: 'items-center', defaultVisible: true },
];
const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMN_DEFS_CONFIG
    .filter(c => c.alwaysVisible || c.defaultVisible)
    .map(c => c.id);

const formatPrice = (price) => {
    if (price === null || price === undefined || price === 0) return <span className="text-gray-300">-</span>;
    const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    if (price < 0) {
        return <span className="text-red-600 font-semibold">{formattedPrice}</span>;
    }
    return formattedPrice; 
};

const getInitialDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    }
};

// ==========================================================================
// == MAIN COMPONENT                                                     ==
// ==========================================================================

export const SalesListContent = () => {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState(getInitialDateRange);
    // ... (state cũ giữ nguyên)
    const [orders, setOrders] = useState([]);
    const [paginationInfo, setPaginationInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState(null);
    
    // State cho Form Sửa
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null); 

    // ✨ [THÊM MỚI] State cho Form In
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const [orderToPrint, setOrderToPrint] = useState(null);

    // --- 💡 [FIX] ĐÃ THÊM 2 DÒNG STATE BỊ THIẾU ---
    const [columnWidths, setColumnWidths] = useState({});
    const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
    // ------------------------------------------------

    const parentRef = useRef(null);
    const headerRef = useRef(null);
    
    // --- Handlers cho Form Sửa (giữ nguyên) ---
    const handleNewOrder = () => { /* ... giữ nguyên ... */ };
    const handleEditOrder = async (orderStub) => {
        setIsLoading(true); 
        try {
            const response = await axios.get(`${API_ENDPOINT}/${orderStub.composite_key}`);
            const orderDetail = response.data.data;
            setSelectedOrder(orderDetail);
            setIsFormOpen(true);
        } catch (err) {
            alert(`Lỗi khi tải chi tiết đơn hàng: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    const handleCloseForm = () => setIsFormOpen(false);
    const handleSaveSuccess = () => {
        setIsFormOpen(false);
        fetchOrders(1, false); 
    };

    // ✨ [THÊM MỚI] Handlers cho Form In
    const handlePrintPreview = async (orderStub) => {
        setIsLoading(true); 
        try {
            // Vẫn phải gọi API để lấy chi tiết (giống hệt edit)
            const response = await axios.get(`${API_ENDPOINT}/${orderStub.composite_key}`);
            const orderDetail = response.data.data;
            setOrderToPrint(orderDetail); // Gửi dữ liệu vào state in
            setIsPrintPreviewOpen(true); // Mở modal in
        } catch (err) {
            alert(`Lỗi khi tải chi tiết đơn hàng: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    const handleClosePrintPreview = () => {
        setIsPrintPreviewOpen(false);
        setOrderToPrint(null);
    };


    // --- Column Definitions ---
    const columnDefs = useMemo(() => {
        return ALL_COLUMN_DEFS_CONFIG
            .filter(c => visibleColumns.includes(c.id))
            .map(def => ({ ...def, width: columnWidths[def.id] || def.minWidth }));
    }, [columnWidths, visibleColumns]); // <-- Giờ đã đúng
    
    // --- Render Cell ---
    const renderCellContent = (colDef, order) => {
        switch (colDef.id) {
            case COL_ID.ACTIONS:
                // ✨ [CẬP NHẬT] Thêm nút "In"
                return (
                    <div className="flex items-center justify-center space-x-2">
                        {/* Nút Sửa/Xem */}
                        <UI.Button variant="secondary" className="px-2 py-1" onClick={() => handleEditOrder(order)} title="Xem/Sửa">
                            <UI.Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className="w-4 h-4" />
                        </UI.Button>
                        {/* Nút In */}
                        <UI.Button variant="secondary" className="px-2 py-1" onClick={() => handlePrintPreview(order)} title="In đơn hàng">
                            <UI.Icon path="M6.72 13.86l.24-1.14H17.04l.24 1.14H6.72zM4 6h16v6H4V6zm1 1v4h14V7H5zm-1 8h16v6H4v-6zm1 1v4h14v-4H5z" className="w-5 h-5" />
                        </UI.Button>
                    </div>
                );
            
            // ... (các case khác giữ nguyên) ...
            case COL_ID.DATE:
                return new Date(order.ngay).toLocaleDateString('vi-VN');
            case COL_ID.COMPOSITE_KEY:
                return order.composite_key;
            case COL_ID.CUSTOMER:
                return (
                    <div className="flex flex-col justify-center">
                        <span className="font-medium text-gray-800">{order.ten_khncc}</span>
                        <span className="text-xs text-gray-500">{order.ma_khncc}</span>
                    </div>
                );
            case COL_ID.TOTAL_AMOUNT:
                const total = order.total_amount || order.items?.reduce((sum, item) => sum + item.so_tien_truoc_thue, 0);
                return formatPrice(total || 0);
            case COL_ID.STATUS:
                return (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Đã Ghi Sổ
                    </span>
                );
            default:
                return order[colDef.id] || '-';
        }
    };

    // ... (Toàn bộ logic fetchOrders, Effects, Handlers, Calculations... giữ nguyên) ...
    // --- API Call ---
    const fetchOrders = async (page = 1, isAppending = false) => {
        if (page === 1 && !isAppending) setIsLoading(true);
        else setIsFetchingMore(true);
        setError(null);
        
        const params = {
            search: searchTerm,
            per_page: API_PER_PAGE,
            page: page,
            ngay_tu: dateRange.from || null,
            ngay_den: dateRange.to || null,
        };
        Object.keys(params).forEach(key => (params[key] == null || params[key] === '') && delete params[key]);
        
        try {
            const response = await axios.get(API_ENDPOINT, { params });
            const laravelData = response.data.data;
            const laravelMeta = response.data.meta;
            const laravelLinks = response.data.links;

            if (!laravelData || !laravelMeta) {
                if (Array.isArray(response.data)) {
                    setOrders(prev => isAppending ? [...prev, ...response.data] : response.data);
                    setPaginationInfo(null); 
                } else {
                    throw new Error("Cấu trúc API response không hợp lệ.");
                }
            } else {
                 setOrders(prev => isAppending ? [...prev, ...laravelData] : laravelData);
                 setPaginationInfo({ ...laravelMeta, ...laravelLinks });
            }

        } catch (err) {
            console.error(`❌ Error:`, err.response || err);
            const msg = err.response?.data?.message || err.message || "Error.";
            setError(`Lỗi: ${msg}`);
            if (page === 1) { setOrders([]); setPaginationInfo(null); }
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    // --- Effects ---
    useEffect(() => {
        fetchOrders(1, false);
    }, [dateRange]); 

    useEffect(() => {
        const parent = parentRef.current, header = headerRef.current;
        if (!parent || !header) return;
        const syncScroll = () => { header.scrollLeft = parent.scrollLeft; };
        parent.addEventListener('scroll', syncScroll);
        return () => parent.removeEventListener('scroll', syncScroll);
    }, []);

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: orders.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: 10,
    });

    // Infinite scroll
    const virtualItems = rowVirtualizer.getVirtualItems();
    useEffect(() => {
        if (virtualItems.length === 0 || !paginationInfo || !paginationInfo.last_page || isFetchingMore || isLoading || error) return;
        const lastItem = virtualItems[virtualItems.length - 1];
        if (lastItem.index >= orders.length - 5 && paginationInfo.current_page < paginationInfo.last_page) {
            fetchOrders(paginationInfo.current_page + 1, true);
        }
    }, [virtualItems, orders.length, isFetchingMore, paginationInfo, isLoading, error]);

    // --- Handlers ---
    const createResizeHandler = (columnId, minWidth) => (e) => { // <-- Giờ đã đúng
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || minWidth; // <-- Giờ đã đúng
        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(startWidth + (moveEvent.clientX - startX), minWidth);
            setColumnWidths(p => ({ ...p, [columnId]: newWidth })); // <-- Giờ đã đúng
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleDateChange = (e) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSearch = () => {
        fetchOrders(1, false);
    };

    // --- Calculations ---
    const totalWidth = useMemo(() => {
        return (columnDefs || []).reduce((acc, colDef) => acc + (columnWidths[colDef.id] || colDef.minWidth), 0);
    }, [columnDefs, columnWidths]); // <-- Giờ đã đúng
    const pageLoading = isLoading && !isFetchingMore;


    // --- Render ---
    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            {/* ... (Toolbar giữ nguyên) ... */}
            <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Tìm theo mã KH, tên KH..."
                    className="w-full md:w-48 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
                />
                <input
                    type="date"
                    name="from"
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600"
                    value={dateRange.from}
                    onChange={handleDateChange}
                />
                <input
                    type="date"
                    name="to"
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600"
                    value={dateRange.to}
                    onChange={handleDateChange}
                />
                <UI.Button variant='secondary' onClick={handleSearch} disabled={isLoading}>
                    <UI.Icon path='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' className="w-4 h-4 mr-2" />
                    Tìm kiếm
                </UI.Button>
                <div className="flex-grow"></div>
                <UI.Button variant='primary' onClick={handleNewOrder}>
                    <UI.Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4 mr-2" />
                    Tạo Đơn Hàng
                </UI.Button>
            </div>


            {/* Modal Form SỬA (Giữ nguyên) */}
            <UI.Modal
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                title={selectedOrder ? "Sửa Đơn Bán Hàng" : "Tạo Đơn Bán Hàng Mới"}
                maxWidthClass="max-w-4xl"
            >
                <SalesForm
                    key={selectedOrder ? selectedOrder.composite_key : 'new'} 
                    order={selectedOrder}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={handleCloseForm}
                />
            </UI.Modal>

            {/* ✨ [THÊM MỚI] Modal Form IN */}
            <UI.Modal
                isOpen={isPrintPreviewOpen}
                onClose={handleClosePrintPreview}
                title="Xem trước Bản in"
                maxWidthClass="max-w-4xl" // Modal này cũng rộng
                // Thêm class này để CSS @print có thể bắt được
                containerClassName="print-preview-container" 
            >
                {/* Component này chỉ nhận dữ liệu và hiển thị,
                  nó cũng có nút "In" (window.print) bên trong
                */}
                <SalesOrderPrintPreview 
                    order={orderToPrint}
                    onClose={handleClosePrintPreview} // Truyền hàm đóng modal vào
                />
            </UI.Modal>


            {/* ... (Toàn bộ phần Bảng Dữ Liệu giữ nguyên) ... */}
            <div className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* Info Bar */}
                <div className="p-2 border-b text-sm text-gray-600">
                    {paginationInfo && paginationInfo.total > 0 && !error ? (
                        <span>
                            Tìm thấy <strong>{paginationInfo.total.toLocaleString('vi-VN')}</strong> đơn hàng. 
                            Đang hiển thị <strong>{orders.length}</strong>.
                        </span>
                    ) : (
                        <span>
                            {pageLoading && !error ? 'Đang tải...' : (error ? '' : 'Tìm thấy 0 đơn hàng.')}
                        </span>
                    )}
                    {error && <span className="ml-4 text-red-600 font-medium">{error}</span>}
                </div>

                {/* 1. TIÊU ĐỀ (Header) */}
                <div ref={headerRef} className="overflow-x-hidden flex-shrink-0">
                    <div className="flex bg-gray-100 font-semibold text-gray-700 text-sm select-none" style={{ width: `${totalWidth}px` }}>
                        {(columnDefs || []).map(colDef => (
                            <div
                                key={colDef.id}
                                className={`relative flex items-center py-2 px-3 border-b border-r ${colDef.headerClassName || ''}`}
                                style={{ width: `${columnWidths[colDef.id] || colDef.minWidth}px`, flexShrink: 0 }}
                            >
                                <span className="pr-2">{colDef.title}</span>
                                <div
                                    onMouseDown={createResizeHandler(colDef.id, colDef.minWidth)}
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. NỘI DUNG (Body) */}
                <div ref={parentRef} className="flex-1 w-full overflow-auto">
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: `${totalWidth}px` }} className="relative">
                        
                        {pageLoading && !error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
                                <p className="text-gray-500">Đang tải dữ liệu...</p>
                            </div>
                        )}
                        
                        {!pageLoading && !error && orders.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="p-10 text-center text-gray-500">Không tìm thấy đơn hàng nào phù hợp.</p>
                            </div>
                        )}
                        
                        {!error && orders.length > 0 && rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const order = orders[virtualRow.index];
                            if (!order) return null;
                            const rowBgClass = virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    style={{ transform: `translateY(${virtualRow.start}px)`, height: `${virtualRow.size}px` }}
                                    className="absolute top-0 left-0 flex items-stretch w-full"
                                >
                                    {(columnDefs || []).map(colDef => (
                                        <div
                                            key={colDef.id}
                                            className={`py-2 px-3 border-b border-r flex ${colDef.cellClassName || 'items-center'} ${rowBgClass} whitespace-normal break-words overflow-hidden`}
                                            style={{ width: `${columnWidths[colDef.id] || colDef.minWidth}px`, flexShrink: 0 }}
                                        >
                                            {renderCellContent(colDef, order)}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                    
                    {isFetchingMore && !error && (
                        <div className="text-center p-4 text-gray-500">Đang tải thêm...</div>
                    )}
                </div>
            </div>
        </div>
    );
};
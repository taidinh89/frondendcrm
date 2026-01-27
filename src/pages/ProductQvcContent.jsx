// src/pages/ProductQvcContent.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx'; 
import Select from 'react-select';
import { ProductQvcDetailModal } from '../components/ProductQvcDetailModal.jsx'; // SỬ DỤNG MODAL CHIA TAB

// ==========================================================
// === CẤU HÌNH CỘT MẶC ĐỊNH (FINAL) ===
// ==========================================================
const API_ENDPOINT = '/api/v1/products'; 
const STORAGE_KEY = 'qvc_product_columns_config_v1'; 
const QVC_BASE_DOMAIN = "https://qvc.vn"; 

const DEFAULT_COLUMNS = [
    { key: 'thumbnail', label: 'Ảnh', width: 100, visible: true, sortable: false, align: 'center' },
    { key: 'storeSKU', label: 'SKU', width: 150, visible: true, sortable: true, align: 'left', format: 'string' }, 
    { key: 'proName', label: 'Tên Sản phẩm', width: 300, visible: true, sortable: true, align: 'left', format: 'string' }, 
    
    // CÁC CỘT GIÁ/TỒN KHO/BH
    { key: 'price_web', label: 'Giá Web', width: 120, visible: true, sortable: true, align: 'right', format: 'currency' },
    { key: 'target_price', label: 'Giá MT', width: 120, visible: true, sortable: true, align: 'right', format: 'target_price' },
    
    { key: 'quantity_web', label: 'Tồn Kho Web', width: 120, visible: true, sortable: true, align: 'right', format: 'number' },
    { key: 'target_qty', label: 'Tồn MT', width: 120, visible: true, sortable: true, align: 'right', format: 'target_qty' },
    
    { key: 'ordering_web', label: 'Order Web', width: 120, visible: true, sortable: true, align: 'right', format: 'number' },
    { key: 'warranty_web', label: 'BH Web', width: 150, visible: true, sortable: false, align: 'left', format: 'string' },
    { key: 'target_warranty', label: 'BH MT', width: 150, visible: true, sortable: false, align: 'left', format: 'target_warranty' },
    
    // CÁC CỘT KHÁC (Ẩn hoặc phụ)
    { key: 'id', label: 'ID', width: 100, visible: false, sortable: true, align: 'left', isPrimary: true }, 
    { key: 'needs_sync', label: 'Cần Sync', width: 100, visible: true, sortable: true, align: 'center', format: 'boolean' },
    { key: 'purchase_price_web', label: 'Giá Nhập Web', width: 150, visible: false, sortable: true, align: 'right', format: 'currency' },
];

// Tạo Map để tra cứu nhanh và an toàn cấu hình mặc định
const DEFAULT_COLUMNS_MAP = DEFAULT_COLUMNS.reduce((map, col) => {
    if (col && col.key) {
        map[col.key] = col;
    }
    return map;
}, {});


// ==========================================================
// === HÀM TIỆN ÍCH & FORMATTING ===
// ... (Các hàm tiện ích giữ nguyên)
const formatCurrency = (value) => {
    if (!value && value !== 0) return <span className="text-gray-300">-</span>;
    const numberValue = typeof value === 'string' ? parseFloat(String(value).replace(/[^0-9.-]+/g,"")) : value;
    if (isNaN(numberValue)) return <span className="text-gray-300">-</span>;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(numberValue);
};
const formatDateTime = (value) => {
    if (!value) return <span className="text-gray-300">-</span>;
    return new Date(value).toLocaleString('vi-VN');
};
const formatBoolean = (value) => {
    return value ? 
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">CẦN SYNC</span> : 
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">OK</span>;
};
const getPrimaryImageUrl = (product) => {
    if (product?.full_images?.[0]?.url) {
        return product.full_images[0].url;
    }
    if (product?.proThum) {
        return `${QVC_BASE_DOMAIN}/p/250_${product.proThum}`;
    }
    return null; 
};

// --- COMPONENT RAW DATA MODAL (Giữ nguyên) ---
const RawDataModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Dữ Liệu Gốc (Raw JSON) - {data.storeSKU || data.id}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
                </div>
                <div className="flex-1 p-4 overflow-auto bg-gray-900">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
                <div className="p-4 border-t flex justify-end">
                    <UI.Button variant="secondary" onClick={onClose}>Đóng</UI.Button>
                </div>
            </div>
        </div>
    );
};


// ==========================================================
// === COMPONENT CHÍNH: PRODUCT MANAGEMENT CONTENT (INLINE EDIT) ===
// ==========================================================
export const ProductQvcContent = ({ setAppTitle }) => {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [filter, setFilter] = useState('');
    const [updatingProductId, setUpdatingProductId] = useState(null);
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null); 
    const [viewingRaw, setViewingRaw] = useState(null); 
    const [showColumnSettings, setShowColumnSettings] = useState(false); 
    
    // --- COLUMN CONFIG LOGIC (SỬA LỖI VĨNH VIỄN - STRICT CLEANING) ---
    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // STRICT FILTER: Loại bỏ HOÀN TOÀN bất kỳ entry null/undefined/invalid
                const validParsed = Array.isArray(parsed) 
                    ? parsed.filter(c => 
                        c != null && 
                        typeof c === 'object' && 
                        c.key != null && 
                        typeof c.key === 'string' && 
                        DEFAULT_COLUMNS_MAP[c.key] != null
                      )
                    : [];
                
                // MERGE AN TOÀN: Chỉ merge nếu valid, fallback default
                const merged = validParsed.map(col => {
                    const defaultCol = DEFAULT_COLUMNS_MAP[col.key];
                    return { 
                        ...defaultCol, 
                        width: (col.width != null ? Number(col.width) : defaultCol.width), 
                        visible: col.visible !== undefined ? Boolean(col.visible) : defaultCol.visible 
                    };
                });
                
                // THÊM DEFAULT THIẾU: Nhưng chỉ nếu không duplicate
                const finalMerged = [...merged];
                DEFAULT_COLUMNS.forEach(defCol => {
                    if (defCol && defCol.key && !finalMerged.find(c => c.key === defCol.key)) {
                        finalMerged.push(defCol);
                    }
                });
                
                // FINAL CLEAN: Lọc lại lần cuối để chắc chắn không có null
                return finalMerged.filter(c => c != null && c.key != null);
            }
        } catch (e) { 
            console.error("Lỗi load config columns. Reset về mặc định.", e); 
            localStorage.removeItem(STORAGE_KEY); // XÓA STORAGE CORRUPT
        }
        // FALLBACK TUẬT ĐỂ: Luôn dùng default clean
        return [...DEFAULT_COLUMNS.filter(c => c != null && c.key != null)];
    });
    
    // SAFE HELPER: Memoized clean columns để tránh re-compute
    const safeColumns = useMemo(() => 
        columns.filter(c => c != null && c.key != null && typeof c.key === 'string'),
    [columns]);
    
    const visibleColumns = useMemo(() => 
        safeColumns.filter(c => c.visible === true),
    [safeColumns]);
    
    const mainTableRef = useRef(null);
    
    // SAVE ONLY IF CLEAN
    useEffect(() => { 
        if (safeColumns.length > 0 && safeColumns.length === columns.length) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(safeColumns));
            } catch (e) {
                console.error("Lỗi save columns config:", e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, [safeColumns]);
    // ------------------------------------

    useEffect(() => { setAppTitle('Quản lý Đồng bộ Sản phẩm'); }, [setAppTitle]);
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch data (logic giữ nguyên, thêm safe cho products)
    const fetchProducts = async (currentPage = 1) => {
        setUpdatingProductId(-1); 
        try {
            const params = { page: currentPage, per_page: 20, search: debouncedSearchTerm, sort_by: sortConfig.key, sort_direction: sortConfig.direction, filter: filter };
            const response = await axios.get(API_ENDPOINT, { params });
            const responseData = response.data;
            if (!responseData) {
                throw new Error('Response data is null');
            }
            const dataArray = Array.isArray(responseData.data) ? responseData.data.filter(p => p != null && p.id != null) : [];
            setProducts(dataArray);
            const { data, ...paginator } = responseData;
            setPagination(paginator || null);
            setPage(currentPage);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            setProducts([]);
            setPagination(null);
        } finally {
            setUpdatingProductId(null);
        }
    };
    useEffect(() => { fetchProducts(1); }, [debouncedSearchTerm, sortConfig, filter]);

    // --- LOGIC INLINE EDIT ---
    // Ánh xạ key của cột sang key dữ liệu tương ứng
    const getEditableFieldKey = (colKey) => {
        if (!colKey) return null;
        if (colKey === 'target_price') return 'price_ecount';
        if (colKey === 'target_qty') return 'quantity_ecount';
        if (colKey === 'target_warranty') return 'warranty_ecount';
        
        return colKey; // Fallback
    };
    
    const handleUpdateProduct = async (productId, updateData) => {
        if (!productId) throw new Error('Invalid product ID');
        setUpdatingProductId(productId);
        try {
            const response = await axios.put(`${API_ENDPOINT}/${productId}`, updateData);
            const updatedProduct = response.data?.product;
            if (!updatedProduct || !updatedProduct.id) {
                throw new Error('Invalid updated product data');
            }
            
            setProducts(prev => 
                prev
                    .map(p => p && p.id === productId ? updatedProduct : p)
                    .filter(p => p != null && p.id != null) // Clean null products
            );

            return updatedProduct; 
        } catch (error) {
            console.error("Lỗi cập nhật sản phẩm:", error);
            alert("Lỗi cập nhật. Vui lòng thử lại.");
            throw error; // Ném lỗi để handleSaveInline có thể bắt
        } finally {
            setUpdatingProductId(null);
        }
    };

    const handleCloseDetailModal = useCallback((updatedProduct) => {
        if (updatedProduct && updatedProduct.id) {
             setProducts(prev => 
                prev
                    .map(p => p && p.id === updatedProduct.id ? updatedProduct : p)
                    .filter(p => p != null && p.id != null)
             );
        }
        setViewingProduct(null); 
    }, []);
    
    // --- HÀM ĐỒNG BỘ TỪNG SẢN PHẨM (handleSyncSingle giữ nguyên) ---
    const handleSyncSingle = async (productId) => {
        if (!productId) return;
        if (!window.confirm('Bạn có chắc chắn muốn đồng bộ sản phẩm này lên Web QVC ngay lập tức?')) {
            return;
        }
        setUpdatingProductId(productId);
        try {
            const response = await axios.post(`${API_ENDPOINT}/${productId}/sync`);
            const syncedProduct = response.data?.product;
            if (!syncedProduct || !syncedProduct.id) {
                throw new Error('Invalid synced product data');
            }
            
            setProducts(prev => 
                prev
                    .map(p => p && p.id === productId ? syncedProduct : p)
                    .filter(p => p != null && p.id != null)
            );
            alert(response.data.message);
            
        } catch (error) {
            console.error("Lỗi sync:", error);
            alert('Lỗi đồng bộ. Vui lòng kiểm tra log!');
        } finally {
            setUpdatingProductId(null);
        }
    };

    // --- COLUMN HANDLERS (Giữ nguyên, nhưng thêm an toàn) ---
    const handleSortData = (key) => {
        if (!key) return;
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    const handleResetConfig = () => {
        if (window.confirm('Bạn có chắc muốn đặt lại giao diện về mặc định?')) {
            const cleanDefault = [...DEFAULT_COLUMNS.filter(c => c != null && c.key != null)];
            setColumns(cleanDefault);
            localStorage.removeItem(STORAGE_KEY);
        }
    };
    const toggleColumn = (key) => {
        if (!key) return;
        setColumns(prev => {
            const safePrev = prev.filter(c => c != null && c.key != null);
            return safePrev.map(col => 
                col.key === key ? { ...col, visible: !col.visible } : col
            );
        });
    };
    const moveColumn = (index, direction) => {
        if (index < 0 || !safeColumns[index]) return;
        setColumns(prev => {
            const validPrev = safeColumns;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= validPrev.length) return prev;
            const newColumns = [...validPrev];
            [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
            return newColumns;
        });
    };
    const handleResizeStart = (e, colKey) => {
        e.preventDefault();
        if (!colKey) return;
        const startX = e.clientX;
        const colIndex = safeColumns.findIndex(c => c && c.key === colKey);
        if (colIndex === -1) return;
        const startWidth = safeColumns[colIndex]?.width || 100;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
            setColumns(prev => {
                const safePrev = prev.filter(c => c != null && c.key != null);
                return safePrev.map(col => 
                    col.key === colKey ? { ...col, width: newWidth } : col
                );
            });
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Hàm renderCells MỚI (Đã thêm kiểm tra an toàn và SỬA HIỂN THỊ EDITED VALUE)
    const renderCellContent = (key, value, format, product) => {
        
        // GUARD ĐẦU TIÊN: Nếu key invalid, return safe fallback
        if (!key || typeof key !== 'string') {
            return <span className="text-gray-300 text-xs">-</span>;
        }
        
        // KIỂM TRA AN TOÀN TRỰC TIẾP: Đảm bảo cấu hình cột tồn tại
        const colConfig = DEFAULT_COLUMNS_MAP[key];
        if (!colConfig) {
             console.warn("Missing colConfig for key:", key);
             return <span className="text-red-500 text-xs">Cột lỗi</span>;
        }
        
        const isEditableNumber = ['target_price', 'target_qty', 'ordering_web'].includes(key);
        const editKey = getEditableFieldKey(key);
        if (!editKey) {
            return <span className="text-gray-300 text-xs">-</span>;
        }

        // XỬ LÝ CỘT ẢNH THUMBNAIL - SAFE
        if (key === 'thumbnail') {
            const primaryImage = getPrimaryImageUrl(product);
            return (
                <div className="w-20 h-20 mx-auto flex items-center justify-center"> 
                    {primaryImage ? (
                        <img src={primaryImage} alt={product?.proName ?? ''} className="w-full h-full object-contain border rounded" onError={(e) => { e.target.onerror = null; e.target.src="/default_thumb.jpg"; }} 
                        />
                    ) : (
                        <UI.Icon path="M2.25 15.75l1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5M21.75 8.25L10.5 19.5" className="w-6 h-6 text-gray-400 mx-auto" />
                    )}
                </div>
            );
        }
        
        // CỘT TÊN SẢN PHẨM & SKU (Hiển thị giá trị đã chỉnh sửa nếu có) - SAFE
        if (key === 'proName' || key === 'storeSKU') {
            const displayValue = product?.[editKey] ?? value ?? '';
            if (key === 'proName') {
                const productUrl = product?.request_path ? `${QVC_BASE_DOMAIN}${product.request_path}` : '#';
                return (
                    <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left truncate block"
                        title={displayValue}
                    >
                        {displayValue || <span className="text-gray-300 text-xs">-</span>}
                    </a>
                );
            }
            return displayValue || <span className="text-gray-300 text-xs">-</span>;
        }

        // Xử lý chung và formatting - SAFE NULL CHECKS
        if (product?.isLongText || key === 'details' || key === 'image_collection') {
            if (!value) return <span className="text-gray-300 text-xs">-</span>;
            const textValue = (typeof value === 'object' && value != null) ? JSON.stringify(value) : value;
            return <div className="truncate text-xs" title={textValue}>{textValue}</div>;
        }

        switch (format) {
            case 'currency':
                return formatCurrency(value);
            case 'target_price':
            case 'target_qty':
            case 'target_warranty': {
                // SỬA LỖI LOGIC: Luôn lấy giá trị từ trường `_edit` tương ứng
                const isPrice = key === 'target_price';
                const currentValue = product?.[editKey]; // Giá trị mục tiêu luôn là trường _edit
                const webKey = isPrice ? 'price_web' : (key === 'target_qty' ? 'quantity_web' : 'warranty_web');
                const webValue = product?.[webKey];
                
                const isDifferent = currentValue != null && currentValue != webValue;
                const displayValue = currentValue ?? '-';
                
                return (
                    <span className={`font-semibold ${isDifferent ? 'text-red-600' : 'text-green-600'}`}>
                        {isPrice ? formatCurrency(currentValue) : displayValue}
                    </span>
                );
            }
            case 'datetime':
                return formatDateTime(value);
            case 'boolean':
                return formatBoolean(value);
            default:
                // Nếu có giá trị đang sửa thì hiển thị nó cho các cột còn lại
                const displayValue = product?.[editKey] ?? value;
                return displayValue ?? <span className="text-gray-300 text-xs">-</span>;
        }
    };
    
    const SortIcon = ({ columnKey }) => {
        if (!columnKey) return null;
        if (sortConfig.key !== columnKey) return <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-50">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1 text-blue-600">↑</span> : <span className="ml-1 text-blue-600">↓</span>;
    };
    // ----------------------------------------------------


    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
            <h2 className="text-2xl font-bold text-gray-800">🛠️ Quản lý Đồng bộ Sản phẩm</h2>
            
            {/* --- TOOLBAR --- */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4 p-3 bg-white rounded shadow-sm shrink-0">
                <div className="flex flex-1 items-end gap-2 min-w-[300px]">
                     <UI.Input 
                        name="search" 
                        placeholder="Tìm kiếm (SKU, Tên SP, ID...)" 
                        className="w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value ?? '')}
                        onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1)}
                    />
                    <UI.Button variant="primary" onClick={() => fetchProducts(1)} disabled={updatingProductId === -1}>Tìm</UI.Button>
                </div>
                
                <div className="flex items-center gap-2">
                    <UI.Button variant="secondary" onClick={() => fetchProducts(1)}>Làm mới</UI.Button>
                    
                    {/* NÚT TÙY CHỈNH CỘT & RAW */}
                    <div className="relative">
                         <UI.Button variant="secondary" onClick={() => setShowColumnSettings(!showColumnSettings)}>
                            ⚙️ Bộ lọc & Cột
                        </UI.Button>
                        
                        {showColumnSettings && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded shadow-xl z-50 flex flex-col max-h-[70vh] shrink-0">
                                {/* COLUMN SETTINGS CONTENT */}
                                <div className="p-3 border-b flex justify-between items-center">
                                    <h4 className="font-bold text-gray-700">Tùy chỉnh cột</h4>
                                    <UI.Button size="xs" variant="danger" onClick={handleResetConfig}>Đặt lại</UI.Button>
                                </div>
                                <div className="p-3 overflow-y-auto">
                                    <ul className="space-y-2">
                                        {safeColumns.map((col, index) => (
                                            col ? (
                                                <li key={col.key || `col-${index}`} className="flex items-center justify-between group hover:bg-gray-50 p-1 rounded">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={col.visible ?? false}
                                                            onChange={() => toggleColumn(col.key)}
                                                            className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm">{col.label ?? 'N/A'}</span>
                                                    </div>
                                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <UI.Button size="xs" variant="secondary" onClick={() => moveColumn(index, -1)} disabled={index === 0}>↑</UI.Button>
                                                        <UI.Button size="xs" variant="secondary" onClick={() => moveColumn(index, 1)} disabled={index === safeColumns.length - 1}>↓</UI.Button>
                                                    </div>
                                                </li>
                                            ) : null
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* NÚT RAW DATA */}
                    <UI.Button variant="secondary" onClick={() => viewingRaw && setViewingRaw(products[0])} disabled={products.length === 0}>
                        <UI.Icon path="M6.75 7.5l3 3m0 0l3-3m-3 3v12" className="w-4 h-4 mr-1" /> Raw Data
                    </UI.Button>
                </div>
            </div>


            {/* --- TABLE CONTAINER --- */}
            <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden flex flex-col relative">
                <div ref={mainTableRef} className="flex-1 overflow-auto">
                    <table className="w-full border-collapse table-fixed" style={{ minWidth: 'max-content' }}>
                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="w-[120px] p-2 border-b border-r bg-gray-100 sticky left-0 z-30 text-center text-xs font-bold uppercase text-gray-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Hành động
                                </th>
                                {visibleColumns.map((col, colIndex) => {
                                    // FINAL GUARD: Skip nếu col invalid
                                    if (!col || !col.key) return null;
                                    return (
                                        <th 
                                            key={col.key || `th-${colIndex}`}
                                            className="border-b border-r bg-gray-100 relative group select-none hover:bg-gray-200 transition-colors"
                                            style={{ width: col.width ?? 100, minWidth: col.width ?? 100 }}
                                        >
                                            <div 
                                                className={`flex items-center p-2 text-xs font-bold uppercase text-gray-600 h-full cursor-pointer ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                                                onClick={() => col.sortable && handleSortData(col.key)}
                                                title="Click để sắp xếp dữ liệu"
                                            >
                                                <span className="truncate">{col.label ?? 'N/A'}</span>
                                                {col.sortable && <SortIcon columnKey={col.key} />}
                                            </div>
                                            <div 
                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 z-40 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onMouseDown={(e) => handleResizeStart(e, col.key)}
                                                title="Kéo để chỉnh độ rộng"
                                            />
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {products.length === 0 && updatingProductId === null ? (
                                <tr><td colSpan={(visibleColumns.length ?? 0) + 1} className="p-10 text-center">Không tìm thấy sản phẩm nào.</td></tr>
                            ) : products.map((product, productIndex) => {
                                // GUARD PRODUCT: Skip nếu product invalid
                                if (!product || !product.id) return null;
                                return (
                                    <tr key={product.id || `row-${productIndex}`} className={`hover:bg-blue-50 group transition-colors ${product.quantity_web <= 0 ? 'bg-red-50' : (product.needs_sync ? 'bg-yellow-50' : '')}`}>
                                        
                                        {/* CỘT HÀNH ĐỘNG (STATIONARY) */}
                                        <td className="p-2 border-r bg-white group-hover:bg-blue-50 sticky left-0 z-10 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex flex-col gap-1">
                                                    <UI.Button 
                                                        size="xs" 
                                                        variant="success" 
                                                        onClick={() => handleSyncSingle(product.id)}
                                                        disabled={updatingProductId === product.id}
                                                        className="w-full"
                                                    >
                                                        Sync Ngay
                                                    </UI.Button>
                                                    <UI.Button 
                                                        size="xs" 
                                                        variant="primary" 
                                                        onClick={() => setViewingProduct(product)} 
                                                        title="Xem và sửa toàn bộ trường"
                                                        disabled={updatingProductId === product.id}
                                                    >
                                                        Chi tiết
                                                    </UI.Button>
                                                </div>
                                            </td>

                                        {visibleColumns.map((col, colIndex) => {
                                            
                                            // FINAL GUARD PER CELL: Skip nếu col invalid
                                            if (!col || !col.key) return null;
                                            
                                            // Render General Content
                                            return (
                                                <td 
                                                    key={`${product.id}-${col.key || colIndex}`}
                                                    className="p-2 border-r text-sm text-gray-700 overflow-hidden"
                                                    style={{ 
                                                        width: col.width ?? 100, 
                                                        maxWidth: col.width ?? 100,
                                                        textAlign: col.align || 'left' 
                                                    }}
                                                    
                                                    title={typeof product[col.key] === 'string' ? product[col.key] : ''} 
                                                >
                                                    {renderCellContent(col.key, product[col.key], col.format, product)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Info */}
                <div className="bg-gray-50 p-2 border-t text-xs text-gray-500 flex justify-between select-none shrink-0">
                    <span>Tổng sản phẩm: <b>{pagination?.total ?? products.length}</b></span>
                    <span>Giữ và kéo cạnh phải của tiêu đề cột để thay đổi độ rộng</span>
                </div>
            </div>

            {/* MODALS */}
            {viewingProduct && (
                <ProductQvcDetailModal
                    product={viewingProduct}
                    isOpen={!!viewingProduct}
                    onClose={handleCloseDetailModal}
                    onUpdate={handleUpdateProduct} 
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
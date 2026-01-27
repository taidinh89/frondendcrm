// src/pages/ProductQvcContent.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx'; 
import Select from 'react-select';
import { ProductQvcDetailModal } from '../components/ProductQvcDetailModal.jsx';

// ==========================================================
// === CẤU HÌNH CỘT MẶC ĐỊNH & HANDLERS TÍCH HỢP ===
// ==========================================================
const API_ENDPOINT = '/api/v1/productqvc'; 
const STORAGE_KEY = 'qvc_product_columns_config_v1'; 

const DEFAULT_COLUMNS = [
    // Core Identification & Sync Status
    { key: 'id', label: 'ID', width: 100, visible: true, sortable: true, align: 'left', isPrimary: true },
    { key: 'storeSKU', label: 'SKU', width: 150, visible: true, sortable: true, align: 'left', isPrimary: true },
    { key: 'proName', label: 'Tên Sản phẩm', width: 300, visible: true, sortable: true, align: 'left' },
    
    // Core Web Data (Price, Stock, Order)
    { key: 'price_web', label: 'Giá Web', width: 120, visible: true, sortable: true, align: 'right', format: 'currency' },
    { key: 'quantity_web', label: 'Tồn kho Web', width: 120, visible: true, sortable: true, align: 'right' },
    { key: 'ordering_web', label: 'Order Web', width: 120, visible: true, sortable: true, align: 'right' },
    { key: 'needs_sync', label: 'Cần Sync', width: 100, visible: true, sortable: true, align: 'center', format: 'boolean' },

    // Detail/Secondary Data
    { key: 'warranty_web', label: 'BH Web', width: 150, visible: false, sortable: false, align: 'left' },
    { key: 'purchase_price_web', label: 'Giá Nhập Web', width: 150, visible: false, sortable: true, align: 'right', format: 'currency' },
    { key: 'meta_title', label: 'Meta Title', width: 300, visible: false, sortable: false, align: 'left' },
    { key: 'product_cat_web', label: 'ID Danh mục', width: 150, visible: false, sortable: false, align: 'left' },
    { key: 'url', label: 'Link SP', width: 250, visible: false, sortable: false, align: 'left' },
    
    // Audit/Time
    { key: 'last_synced_from_live', label: 'Sync Lần Cuối', width: 180, visible: false, sortable: true, align: 'left', format: 'datetime' },
];

// ==========================================================
// === HÀM TIỆN ÍCH & FORMATTING ===
// ==========================================================
const formatCurrency = (value) => {
    if (!value && value !== 0) return <span className="text-gray-300">-</span>;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(value);
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
    if (product.full_images && product.full_images[0]?.url) {
        return product.full_images[0].url;
    }
    return null; 
};

// --- COMPONENT RAW DATA MODAL ---
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
// === COMPONENT CHÍNH: PRODUCT MANAGEMENT CONTENT ===
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
    
    // --- COLUMN CONFIG STATE & REFS ---
    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
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
    const mainTableRef = useRef(null);

    // Save column config on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    }, [columns]);
    // ------------------------------------

    useEffect(() => { setAppTitle('Quản lý Đồng bộ Sản phẩm'); }, [setAppTitle]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch data
    const fetchProducts = async (currentPage = 1) => {
        setUpdatingProductId(-1); 
        try {
            const params = {
                page: currentPage,
                per_page: 20,
                search: debouncedSearchTerm,
                sort_by: sortConfig.key,
                sort_direction: sortConfig.direction,
                filter: filter,
            };
            const response = await axios.get(API_ENDPOINT, { params });
            setProducts(response.data.data);
            const { data, ...paginator } = response.data;
            setPagination(paginator);
            setPage(currentPage);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            setProducts([]);
            setPagination(null);
        } finally {
            setUpdatingProductId(null);
        }
    };
    
    useEffect(() => {
        fetchProducts(1);
    }, [debouncedSearchTerm, sortConfig, filter]);


    const handleUpdateProduct = async (productId, updateData) => {
        setUpdatingProductId(productId);
        try {
            const response = await axios.put(`${API_ENDPOINT}/${productId}`, updateData);
            
            // Cập nhật sản phẩm trong state list
            setProducts(prev => prev.map(p => p.id === productId ? response.data.product : p));
            return response.data.product; 
        } catch (error) {
            console.error("Lỗi cập nhật sản phẩm:", error);
            alert("Lỗi cập nhật. Vui lòng thử lại.");
        } finally {
            setUpdatingProductId(null);
        }
    };

    const handleCloseDetailModal = useCallback((updatedProduct) => {
        if (updatedProduct) {
             setProducts(prev => prev.map(p => 
                p.id === updatedProduct.id ? updatedProduct : p
            ));
        }
        setViewingProduct(null); 
    }, []);
    
    // --- COLUMN HANDLERS ---
    const handleSortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    const handleResetConfig = () => {
        if (window.confirm('Bạn có chắc muốn đặt lại giao diện về mặc định?')) {
            setColumns(DEFAULT_COLUMNS);
            localStorage.removeItem(STORAGE_KEY);
        }
    };
    const toggleColumn = (key) => {
        setColumns(prev => prev.map(col => 
            col.key === key ? { ...col, visible: !col.visible } : col
        ));
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

    const renderCellContent = (key, value, format) => {
        switch (format) {
            case 'currency':
                return formatCurrency(value);
            case 'datetime':
                return formatDateTime(value);
            case 'boolean':
                return formatBoolean(value);
            default:
                return value || <span className="text-gray-300 text-xs">-</span>;
        }
    };
    const SortIcon = ({ columnKey }) => {
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
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                                <div className="flex justify-between items-center p-3 border-b bg-gray-50 rounded-t">
                                    <span className="font-bold text-sm text-gray-700">Cấu hình cột</span>
                                    <button onClick={handleResetConfig} className="text-xs text-red-600 hover:underline">Reset mặc định</button>
                                </div>
                                <div className="overflow-y-auto p-2 flex-1">
                                    {columns.map((col, index) => (
                                        <div key={col.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.key)} className="rounded text-blue-600 focus:ring-blue-500"/>
                                                <span className={`text-sm ${!col.visible ? 'text-gray-400' : 'text-gray-700'}`}>{col.label}</span>
                                            </label>
                                            <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveColumn(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-20">↑</button>
                                                <button onClick={() => moveColumn(index, 1)} disabled={index === columns.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-20">↓</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t bg-gray-50 text-center">
                                    <button onClick={() => setShowColumnSettings(false)} className="text-xs text-blue-600 hover:underline">Đóng</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* NÚT RAW DATA */}
                    <UI.Button variant="secondary" onClick={() => setViewingRaw(products[0])} disabled={products.length === 0}>
                        <UI.Icon path="M6.75 7.5l3 3m0 0l3-3m-3 3v12" className="w-4 h-4 mr-1" /> Raw Data
                    </UI.Button>
                </div>
            </div>


            {/* --- TABLE CONTAINER --- */}
            <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden flex flex-col relative">
                <div ref={mainTableRef} className="flex-1 overflow-auto">
                    <table className="w-full border-collapse table-fixed">
                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="w-[120px] p-2 border-b border-r bg-gray-100 sticky left-0 z-30 text-center text-xs font-bold uppercase text-gray-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Hành động
                                </th>
                                {columns.filter(c => c.visible).map((col) => (
                                    <th 
                                        key={col.key}
                                        className="border-b border-r bg-gray-100 relative group select-none hover:bg-gray-200 transition-colors"
                                        style={{ width: col.width, minWidth: col.width }}
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
                                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 z-40 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onMouseDown={(e) => handleResizeStart(e, col.key)}
                                            title="Kéo để chỉnh độ rộng"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {products.length === 0 && updatingProductId === null ? (
                                <tr><td colSpan={columns.filter(c => c.visible).length + 1} className="p-10 text-center">Không tìm thấy sản phẩm nào.</td></tr>
                            ) : products.map((product) => (
                                <tr key={product.id} className={`hover:bg-blue-50 group transition-colors ${product.quantity_web <= 0 ? 'bg-red-50' : (product.needs_sync ? 'bg-yellow-50' : '')}`}>
                                    {/* CỘT HÀNH ĐỘNG (STATIONARY) */}
                                    <td className="p-2 border-r bg-white group-hover:bg-blue-50 sticky left-0 z-10 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <UI.Button 
                                            size="xs" 
                                            variant="primary" 
                                            onClick={() => setViewingProduct(product)} 
                                            title="Xem và sửa toàn bộ trường"
                                            disabled={updatingProductId === product.id}
                                        >
                                            Chi tiết
                                        </UI.Button>
                                    </td>

                                    {columns.filter(c => c.visible).map(col => {
                                        let val = product[col.key];
                                        
                                        // SPECIAL CASE: ID/SKU/Image column
                                        if (col.key === 'id' || col.key === 'storeSKU') {
                                            const isId = col.key === 'id';
                                            const primaryImage = getPrimaryImageUrl(product);
                                            
                                            if (isId) {
                                                return (
                                                    <td 
                                                        key={`${product.id}-${col.key}`}
                                                        className="p-2 border-r text-sm text-gray-700 whitespace-nowrap overflow-hidden"
                                                        style={{ width: col.width, maxWidth: col.width, textAlign: 'left' }}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-6 h-6 flex-shrink-0">
                                                                {primaryImage && (
                                                                    <img src={primaryImage} alt={product.proName} className="w-full h-full object-contain border rounded" onError={(e) => { e.target.onerror = null; e.target.src="/default_thumb.jpg"; }} />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-800">{product.id}</span>
                                                                <span className="text-gray-500">{product.storeSKU}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            } else {
                                                // Bỏ qua cột SKU vì đã render chung với ID
                                                return null;
                                            }
                                        }

                                        // Render General Content
                                        return (
                                            <td 
                                                key={`${product.id}-${col.key}`}
                                                className="p-2 border-r text-sm text-gray-700 overflow-hidden"
                                                style={{ 
                                                    width: col.width, 
                                                    maxWidth: col.width,
                                                    textAlign: col.align || 'left' 
                                                }}
                                                title={typeof val === 'string' ? val : ''} 
                                            >
                                                {renderCellContent(col.key, val, col.format)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
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
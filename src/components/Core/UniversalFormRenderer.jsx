// src/components/Core/UniversalFormRenderer.jsx

import React, { useMemo } from 'react';
import Select from 'react-select';
import * as UI from '../ui.jsx';
import { useUniversalFormLogic } from './useUniversalFormLogic.jsx';
// Import các hàm tiện ích từ logic cũ (Cần thiết cho Item Component)
import { getProductName, getItemPrice } from '../../archive/components/useSalesFormLogic.jsx'; 
import axios from 'axios';


// ==========================================================
// === HÀM TIỆN ÍCH UI ===
// ==========================================================
const formatPrice = (price) => { 
    if (price === null || price === undefined || price <= 0) return <span className="text-gray-300">-</span>; 
    return new Intl.NumberFormat('vi-VN').format(price); 
};


// ==========================================================
// === CÁC COMPONENT CON (Định nghĩa ở đây hoặc tách riêng) ===
// ==========================================================

// ProductInventoryModal (Giữ nguyên)
const ProductInventoryModal = ({ isOpen, onClose, productId, productName }) => {
    const API_ENDPOINT = `/api/v2/inventory/${productId}/detail`;
    const { data: inventoryDetails, isLoading, error, refetch } = UI.useApiData(isOpen && productId ? API_ENDPOINT : null);
    
    React.useEffect(() => {
        if (isOpen && productId) { refetch(); }
    }, [isOpen, productId, refetch]);
    
    if (!isOpen) return null;
    const title = `Chi tiết tồn kho: ${productName || `SP: ${productId}`}`;

    return (
        <UI.Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="p-6">
                 {isLoading && <p>Đang tải chi tiết tồn kho...</p>}
                 {error && (<div className="bg-red-50 border border-red-300 p-3 rounded mb-4"><p className="text-red-600 font-semibold">Lỗi tải dữ liệu:</p><p className="text-sm text-red-800">{`(${error}) Vui lòng kiểm tra lại Mã sản phẩm.`}</p></div>)}
                 {inventoryDetails && !isLoading && !error && (<div className="space-y-2"><h4 className="font-semibold text-gray-700">Tồn kho tại các kho:</h4><div className="max-h-64 overflow-y-auto border rounded-md p-2">{(inventoryDetails.locations && inventoryDetails.locations.length > 0) ? (<ul className="list-disc pl-5 space-y-1">{inventoryDetails.locations.map(loc => (<li key={loc.warehouse_code} className="text-sm">{loc.warehouse_name}: <span className="font-medium text-blue-600">{loc.quantity.toLocaleString('vi-VN')}</span></li>))}</ul>) : (<p className="text-gray-500 italic p-2">Không có dữ liệu tồn kho chi tiết tại các kho liên kết.</p>)}</div></div>)}
                 {!isLoading && !error && !inventoryDetails && (<p className="text-gray-500 italic p-4 text-center">Không tìm thấy dữ liệu tồn kho chi tiết.</p>)}
            </div>
             <div className="flex justify-end pt-4 mt-4 border-t px-6 py-4">
                <UI.Button variant="secondary" onClick={onClose}>Đóng</UI.Button>
            </div>
        </UI.Modal>
    );
};

// ProductSearchDropdown (Giữ nguyên logic)
const ProductSearchDropdown = ({ onProductSelect, allWarehouses, defaultWarehouseCode }) => {
    // ... (Giữ nguyên logic ProductSearchDropdown) ...
    const [searchTerm, setSearchTerm] = React.useState('');
    const [inventory, setInventory] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    
    const dropdownRef = React.useRef(null);
    const API_ENDPOINT = '/api/v2/inventory';
    const API_PER_PAGE = 5;

    UI.useClickOutside(dropdownRef, () => setIsOpen(false));

    const fetchInventory = React.useCallback(async (term) => {
        if (!term) {
            setInventory([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const params = {
            search: term,
            per_page: API_PER_PAGE,
            page: 1,
            has_ecount_stock: 1, 
            fields: 'ecount_code,misa_code,product_name,out_price,out_price1,inventory_summary.total_ecount_quantity,inventory_summary.locations',
        };
        
        if (defaultWarehouseCode) {
            params.warehouse_codes = defaultWarehouseCode;
        }
        
        try {
            const response = await axios.get(API_ENDPOINT, { params });
            setInventory(response.data.data || []);
            setIsOpen(true);
        } catch (err) {
            console.error("Lỗi tìm kiếm sản phẩm:", err);
            setInventory([]);
        } finally {
            setIsLoading(false);
        }
    }, [defaultWarehouseCode]);
    
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            fetchInventory(searchTerm);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, fetchInventory]);

    const handleSelectProduct = (product) => {
        const itemLocations = product.inventorySummary?.locations || [];
        
        let quantity = 1;
        let price = product.dataSources?.ecount?.prices?.out_price || 0;
        let whDetail = [];

        if (defaultWarehouseCode) {
            const defaultLoc = itemLocations.find(loc => loc.warehouse_code === defaultWarehouseCode && loc.quantity > 0);
            if (defaultLoc) {
                quantity = Math.min(1, defaultLoc.quantity); 
                whDetail = [{
                    code: defaultLoc.warehouse_code,
                    name: defaultLoc.warehouse_name,
                    quantity: quantity
                }];
            }
        }
        
        if (whDetail.length === 0) {
             const firstLoc = itemLocations.find(loc => loc.quantity > 0);
             if (firstLoc) {
                 quantity = Math.min(1, firstLoc.quantity);
                 whDetail = [{
                    code: firstLoc.warehouse_code,
                    name: firstLoc.warehouse_name,
                    quantity: quantity
                }];
             }
        }


        const newItem = {
            ma_mat_hang: product.ecount_code || product.misa_code,
            ten_mat_hang: product.dataSources?.ecount?.name || product.dataSources?.misa?.name,
            quantity: quantity,
            price: price, 
            warehouse_detail: whDetail,
            ecount_prices: product.dataSources?.ecount?.prices, 
            ecount_name: product.dataSources?.ecount?.name,
            misa_name: product.dataSources?.misa?.name,
            ecount_total_stock: product.inventorySummary?.total_ecount_quantity
        };
        
        onProductSelect(newItem);
        setSearchTerm('');
        setInventory([]);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <input 
                type="text" 
                placeholder="Tìm & Chọn sản phẩm (Tự động lọc theo Kho Xuất)..." 
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => { if (searchTerm) fetchInventory(searchTerm); }}
            />
            
            {isOpen && searchTerm && (
                <div className="absolute z-10 w-full mt-1 border border-gray-200 bg-white rounded-md shadow-lg max-h-80 overflow-y-auto">
                    {isLoading && <div className="p-3 text-center text-gray-500">Đang tìm kiếm...</div>}
                    {!isLoading && inventory.length === 0 && (
                        <div className="p-3 text-center text-gray-500 text-sm">Không tìm thấy sản phẩm nào có tồn kho {defaultWarehouseCode ? `tại kho "${allWarehouses.find(w => w.code === defaultWarehouseCode)?.name}"` : 'Ecount > 0'}.</div>
                    )}
                    
                    {inventory.map(product => {
                        const productSku = product.ecount_code || product.misa_code;
                        const productName = product.dataSources?.ecount?.name || product.dataSources?.misa?.name;
                        const totalStock = product.inventorySummary?.total_ecount_quantity;
                        const price = product.dataSources?.ecount?.prices?.out_price || 0;
                        const defaultLoc = product.inventorySummary?.locations?.find(loc => loc.warehouse_code === defaultWarehouseCode);
                        
                        return (
                            <button
                                key={product.id}
                                onClick={() => handleSelectProduct(product)}
                                className="flex justify-between items-center w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="text-sm font-medium text-gray-800 truncate">{productName}</p>
                                    <p className="text-xs text-gray-500 font-mono">{productSku}</p>
                                </div>
                                <div className="text-right text-xs">
                                    <p className="font-semibold text-blue-600">{formatPrice(price)} đ</p>
                                    {defaultWarehouseCode && (
                                        <p className={`text-gray-600 ${defaultLoc?.quantity > 0 ? 'font-medium' : 'text-red-500'}`}>
                                            Kho xuất: {defaultLoc ? defaultLoc.quantity.toLocaleString('vi-VN') : '0'}
                                        </p>
                                    )}
                                     {!defaultWarehouseCode && (
                                        <p className="text-gray-600">Tổng tồn: {totalStock.toLocaleString('vi-VN')}</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const PreferredSourceToggle = ({ preferredSource, setPreferredSource }) => (
    <div className="flex space-x-2">
        <UI.Button type="button" size="xs" 
            variant={preferredSource === 'ecount' ? 'primary' : 'secondary'} 
            onClick={() => setPreferredSource('ecount')}
            className="w-1/2"
        >
            ECOUNT
        </UI.Button>
         <UI.Button type="button" size="xs" 
            variant={preferredSource === 'misa' ? 'primary' : 'secondary'} 
            onClick={() => setPreferredSource('misa')}
            className="w-1/2"
        >
            MISA
        </UI.Button>
    </div>
);

const ReceiptTypeSelect = ({ formData, handleReceiptTypeSelect, isLoadingDropdowns }) => {
    const options = [
        { value: 'export_now', label: 'Xuất ngay' },
        { value: 'export_1day', label: 'Chờ xuất 1 ngày' },
        { value: 'export_contract', label: 'Xuất theo hợp đồng' },
    ];

    return (
        <Select
            options={options}
            onChange={handleReceiptTypeSelect}
            value={options.find(opt => opt.value === formData.receipt_type)}
            isDisabled={isLoadingDropdowns}
            placeholder="Chọn loại phiếu..."
            className="text-sm"
        />
    );
};

const MetaFields = ({ order, formData, handleHeaderChange, getError }) => (
    <div className="grid grid-cols-2 gap-4 w-full">
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu</label>
            <input type="text" value={order?.composite_key || "Tự động tạo"} readOnly className="mt-1 block w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-sm text-gray-500" />
         </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
            <input type="date" name="order_date" value={formData.order_date} onChange={handleHeaderChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" />
            {getError('ngay') && <p className="text-xs text-red-500 mt-1">{getError('ngay')}</p>}
        </div>
    </div>
);


// ==========================================================
// === COMPONENT CHÍNH: UniversalFormRenderer ===
// ==========================================================
/**
 * Component render UI đa dụng, sử dụng Config và Logic Hook.
 * @param {object} config - Cấu hình form (từ SalesOrderConfig, QuotationConfig,...)
 * @param {object} initialData - Dữ liệu ban đầu (order object)
 * @param {function} onSaveSuccess - Callback khi lưu thành công
 * @param {function} onCancel - Callback khi hủy
 */
export const UniversalFormRenderer = ({ config, initialData, onSaveSuccess, onCancel }) => {
    
    // GỌI HOOK LOGIC (đổi tên biến order thành initialData)
    const {
        formData, errors, isSubmitting, viewingInventoryProduct, preferredSource, totalAmount,
        customerOptions, warehouseOptions, isLoadingDropdowns,
        handleHeaderChange, handleCustomerSelect, handleWarehouseSelect, handleItemChange,
        handleWarehouseDetailChange, addItem, removeItem, handleProductSelectFromDropdown,
        handleSubmit, setPreferredSource, getProductName: getProductNameFromHook, getItemPrice,
        handleViewInventory, handleCloseInventoryModal, getError,
        handleReceiptTypeSelect,
    } = useUniversalFormLogic(config, initialData, onSaveSuccess);

    const getProductNameToRender = (item) => getProductNameFromHook(item) || getProductName(item, preferredSource);
    
    // Sắp xếp các trường Header theo 'gridOrder'
    const sortedHeaderFields = useMemo(() => {
        return [...config.headerFields].sort((a, b) => a.gridOrder - b.gridOrder);
    }, [config.headerFields]);


    // === HÀM RENDER FIELD ĐA DỤNG ===
    const renderField = (field) => {
        switch (field.type) {
            case 'customer_select':
                return initialData ? (
                    <input type="text" value={`${formData.ten_khncc} (${formData.ma_khncc})`} readOnly className="mt-1 block w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-sm text-gray-500" />
                ) : (
                    <Select options={customerOptions} onChange={handleCustomerSelect} isDisabled={isLoadingDropdowns} placeholder="Chọn hoặc tìm..." isLoading={isLoadingDropdowns} />
                );
            case 'warehouse_select':
                return <Select options={warehouseOptions} onChange={handleWarehouseSelect} value={warehouseOptions.find(w => w.value === formData.warehouse_code)} isDisabled={isLoadingDropdowns || !!initialData} placeholder="Chọn kho..." isLoading={isLoadingDropdowns} />;
            case 'receipt_select':
                return <ReceiptTypeSelect formData={formData} handleReceiptTypeSelect={handleReceiptTypeSelect} isLoadingDropdowns={isLoadingDropdowns}/>;
            case 'custom_toggle':
                return <PreferredSourceToggle preferredSource={preferredSource} setPreferredSource={setPreferredSource} />;
            case 'custom_meta':
                 return <MetaFields order={initialData} formData={formData} handleHeaderChange={handleHeaderChange} getError={getError} />;
            case 'textarea':
                return <textarea name={field.name} value={formData[field.name]} onChange={handleHeaderChange} rows={field.rows || 3} className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm resize-none`} placeholder={field.placeholder}></textarea>;
            case 'text':
            case 'date':
                return <input type={field.type} name={field.name} value={formData[field.name]} onChange={handleHeaderChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" placeholder={field.placeholder} />;
            default:
                return <input type="text" readOnly value={`Unsupported type: ${field.type}`} className="mt-1 block w-full border border-red-300 rounded-md shadow-sm p-2 text-sm bg-red-50" />;
        }
    };
    // === KẾT THÚC HÀM RENDER FIELD ĐA DỤNG ===


    // --- PHẦN RENDER ---
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {(isLoadingDropdowns && !initialData) && <p className="text-center text-gray-500">Đang tải dữ liệu...</p>}
            
            {/* RENDER CÁC TRƯỜNG HEADER */}
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 border-b pb-6">
                {sortedHeaderFields.map((field) => (
                    <div key={field.name} className={`md:col-span-${field.isFullWidth ? 4 : field.colSpan || 1}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                        {renderField(field)}
                        {getError(field.name) && <p className="text-xs text-red-500 mt-1">{getError(field.name)}</p>}
                    </div>
                ))}
            </div>

            {/* RENDER CÁC TRƯỜNG NOTE FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6">
                {config.noteFields.map((field) => (
                    <div key={field.name} className={`${field.isFullWidth ? 'md:col-span-2' : ''}`}>
                         <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                         {renderField(field)}
                    </div>
                ))}
            </div>


            {/* Phần Chi tiết sản phẩm */}
            <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800">Chi tiết sản phẩm</h3>
                {getError('items') && <p className="text-sm text-red-500 -mt-2 mb-2">{getError('items')}</p>}

                <div className="hidden md:flex gap-2 text-sm font-medium text-gray-500 px-2 items-center">
                    {config.itemColumns.map(col => (
                        <div key={col.key} className={`${col.width} ${col.textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                            {col.label}
                        </div>
                    ))}
                </div>

                {/* RENDER CÁC DÒNG SẢN PHẨM */}
                {formData.items.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-2 border rounded-md bg-gray-50 relative">
                        {config.itemColumns.map(col => (
                            <div key={col.key} className={`relative ${col.width}`}>
                                {col.key === 'product' && (
                                    initialData || item.ma_mat_hang ? (
                                        <input type="text" value={`${getProductNameToRender(item)} (${item.ma_mat_hang})`} readOnly className="w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-sm text-gray-700" />
                                    ) : (
                                        <ProductSearchDropdown 
                                            onProductSelect={handleProductSelectFromDropdown}
                                            allWarehouses={warehouseOptions.map(o => ({code: o.value, name: o.label}))} 
                                            defaultWarehouseCode={formData.warehouse_code}
                                        />
                                    )
                                )}

                                {col.key === 'warehouse_detail' && (
                                    <div className="w-full text-left text-xs space-y-0.5 border border-gray-200 p-2 rounded-md bg-white">
                                        {(item.warehouse_detail || []).length === 1 ? (
                                            <Select options={warehouseOptions} value={warehouseOptions.find(w => w.value === item.warehouse_detail[0].code) || null} onChange={(opt) => handleWarehouseDetailChange(index, opt?.value)} className="text-xs" classNamePrefix="react-select" placeholder="Chọn kho..." />
                                        ) : (
                                            (item.warehouse_detail || []).map((loc, i) => (
                                                <p key={i} className="text-gray-700 leading-tight">
                                                    <span className="font-semibold text-blue-600">{loc.quantity.toLocaleString('vi-VN')}</span> tại {loc.name}
                                                </p>
                                            ))
                                        )}
                                        {(item.warehouse_detail || []).length === 0 && (<p className="text-gray-400 italic">{item.ma_mat_hang ? 'Không có chi tiết kho.' : '-'}</p>)}
                                    </div>
                                )}
                                
                                {col.key === 'quantity' && (
                                    <input type="number" name="quantity" value={item.quantity} min="1" onChange={e => handleItemChange(index, e)} className={`w-full border border-gray-300 rounded-md p-2 text-sm ${col.textAlign === 'right' ? 'text-right' : 'text-left'}`} placeholder="SL" />
                                )}

                                {col.key === 'price' && (
                                    <input type="number" name="price" value={getItemPrice(item)} min="0" step="any" onChange={e => handleItemChange(index, e)} className={`w-full border border-gray-300 rounded-md p-2 text-sm ${col.textAlign === 'right' ? 'text-right' : 'text-left'}`} placeholder="Đơn giá" />
                                )}

                                {col.key === 'subtotal' && (
                                    <p className={`w-full text-sm font-medium p-2 ${col.textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                                        {formatPrice(item.quantity * getItemPrice(item))} đ
                                    </p>
                                )}

                                {col.key === 'stock_button' && (
                                    <div className="w-full flex justify-center">
                                        <UI.Button type="button" variant="secondary" className="px-2 py-1" title="Xem tồn kho" onClick={() => handleViewInventory(item.ma_mat_hang, getProductNameToRender(item))} disabled={!item.ma_mat_hang}>
                                            <UI.Icon path="M2.25 7.125A3.375 3.375 0 005.625 3.75h12.75c1.86 0 3.375 1.515 3.375 3.375v9.75c0 1.86-1.515 3.375-3.375 3.375H5.625A3.375 3.375 0 002.25 16.875V7.125z" className="w-4 h-4" />
                                        </UI.Button>
                                    </div>
                                )}
                                {col.key === 'action' && (
                                     <div className="flex justify-end">
                                        <UI.Button type="button" variant="danger" onClick={() => removeItem(index)} className="px-2 py-2" title="Xóa dòng">
                                            <UI.Icon path="M19.5 12h-15" className="w-4 h-4" />
                                        </UI.Button>
                                    </div>
                                )}
                                
                                {/* Thêm các cột mới (Ví dụ: chiết khấu, VAT) chỉ cần thêm logic render ở đây */}
                                {col.key === 'stock_button' && (
                                    <p className="absolute -top-1.5 right-1.5 text-xs font-bold text-blue-600 bg-white px-1 rounded-full border border-blue-300">
                                        {item.ecount_total_stock !== null && item.ecount_total_stock !== undefined ? item.ecount_total_stock.toLocaleString('vi-VN') : '-'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
                
                {/* Nút Thêm dòng */}
                {!initialData && (formData.items.length === 0 || formData.items[formData.items.length - 1].ma_mat_hang) && (
                    <UI.Button type="button" variant="secondary" onClick={addItem} disabled={isLoadingDropdowns}>
                        <UI.Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4 mr-1.5" />
                        Thêm dòng thủ công
                    </UI.Button>
                )}
            </div>

            {/* Phần Tổng cộng và Nút bấm */}
            <div className="pt-6 border-t flex flex-col items-end space-y-4">
                 <div className="text-right font-bold text-xl text-gray-800">
                    <span className="text-2xl font-extrabold text-blue-600">
                        TỔNG CỘNG: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
                    </span>
                </div>
                <div className="flex justify-end space-x-3 w-full">
                    <UI.Button type="button" variant="secondary" onClick={onCancel}>Hủy</UI.Button>
                    <UI.Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Lưu phiếu')}
                    </UI.Button>
                </div>
            </div>

            <ProductInventoryModal
                isOpen={!!viewingInventoryProduct}
                onClose={handleCloseInventoryModal}
                productId={viewingInventoryProduct?.id} 
                productName={viewingInventoryProduct?.name}
            />
        </form>
    );
};
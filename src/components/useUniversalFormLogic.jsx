// src/components/useUniversalFormLogic.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useApiData } from '../hooks/useApiData.jsx';
// Import các hàm tiện ích từ file logic cũ
import { getProductName, getItemPrice } from './useSalesFormLogic.jsx'; // Sẽ tạo file này sau


// ==========================================================
// === HOOK CHÍNH: useUniversalFormLogic ===
// ==========================================================
/**
 * Hook logic đa dụng cho mọi loại phiếu (Sales Order, Quotation, Picking Ticket).
 * @param {object} config - Cấu hình form (từ SalesOrderConfig/QuotationConfig)
 * @param {object} initialData - Dữ liệu ban đầu (khi chỉnh sửa)
 * @param {function} onSaveSuccess - Callback khi lưu thành công
 */
export const useUniversalFormLogic = (config, initialData, onSaveSuccess) => {
    
    // Khởi tạo state dựa trên initialData và Config
    const [formData, setFormData] = useState(() => ({
        // Mapping các trường Header từ Config và dùng giá trị mặc định/initialData
        ma_khncc: initialData?.ma_khncc || '',
        ten_khncc: initialData?.ten_khncc || '',
        order_date: initialData?.ngay || new Date().toISOString().slice(0, 10),
        warehouse_code: initialData?.kho_xuat_hh_nvl || '', 
        receipt_type: initialData?.receipt_type || 'export_now',
        employee: initialData?.nguoi_phu_trach || '', 
        project: initialData?.du_an || '',
        department: initialData?.phong_ban || '',
        customer_notes: initialData?.ghi_chu_tren_phieu || '',
        internal_notes: initialData?.ghi_chu_noi_bo || '',
        shipping_address: initialData?.dia_chi_giao_hang || '',
        
        // Item list
        items: initialData?.items || [{ ma_mat_hang: '', ten_mat_hang: '', quantity: 1, price: 0, warehouse_detail: [] }]
    }));

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingInventoryProduct, setViewingInventoryProduct] = useState(null);
    const [preferredSource, setPreferredSource] = useState('ecount'); 


    // --- Data Fetching (Chỉ fetch những gì cần) ---
    // Giả định API cho Customer và Warehouse là chung
    const { data: customers, isLoading: customersLoading } = useApiData('/api/v1/customers', { per_page: 200 });
    const { data: warehouses, isLoading: warehousesLoading } = useApiData('/api/v1/warehouses');
    const isLoadingDropdowns = customersLoading || warehousesLoading;

    // --- Memoized Options ---
    const customerOptions = useMemo(() => (customers || []).map(c => ({ 
        value: c.code, 
        label: `${c.name} (${c.code})`, 
        raw: c 
    })), [customers]);
    
    const warehouseOptions = useMemo(() => (warehouses || []).map(w => ({ 
        value: w.code, 
        label: w.name 
    })), [warehouses]);
    
    // --- Tính toán Tổng cộng ---
    // Sử dụng hàm getItemPrice chung
    const totalAmount = useMemo(() => formData.items.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0), [formData.items]);


    // ==========================================================
    // === HANDLERS CHUNG (Hoàn toàn tái sử dụng) ===
    // ==========================================================
    
    const handleHeaderChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleItemChange = useCallback((index, e) => {
        const { name, value } = e.target;
        const newItems = [...formData.items];
        
        let processedValue = value;
        if (name === 'quantity' || name === 'price') {
             processedValue = parseFloat(value) || 0;
        }

        newItems[index][name] = processedValue;
        setFormData(prev => ({ ...prev, items: newItems }));
    }, [formData.items]);
    
    const handleCustomerSelect = useCallback((selectedOption) => {
        setFormData(prev => ({ 
            ...prev, 
            ma_khncc: selectedOption ? selectedOption.raw.code : '',
            ten_khncc: selectedOption ? selectedOption.raw.name : ''
        }));
    }, []);
    
    const handleWarehouseSelect = useCallback((selectedOption) => {
         setFormData(prev => ({ ...prev, warehouse_code: selectedOption ? selectedOption.value : '' }));
    }, []);
    
    const handleReceiptTypeSelect = useCallback((selectedOption) => {
         setFormData(prev => ({ ...prev, receipt_type: selectedOption ? selectedOption.value : 'export_now' }));
    }, []);

    // ... (Các handlers khác như addItem, removeItem, handleProductSelectFromDropdown, v.v. được giữ nguyên) ...

    const handleWarehouseDetailChange = useCallback((index, newCode) => {
        const newItems = [...formData.items];
        const currentItem = newItems[index];
        const newWarehouse = warehouses.find(w => w.code === newCode);
        
        if (newWarehouse) {
            newItems[index].warehouse_detail = [{
                code: newCode,
                name: newWarehouse.name,
                quantity: currentItem.quantity 
            }];
        } else {
             newItems[index].warehouse_detail = [];
        }
        
        setFormData(prev => ({ ...prev, items: newItems }));
    }, [formData.items, warehouses]);


    const addItem = useCallback(() => {
        setFormData(prev => ({ ...prev, items: [...prev.items, { ma_mat_hang: '', ten_mat_hang: '', quantity: 1, price: 0, warehouse_detail: [] }] }));
    }, []);
    
    const removeItem = useCallback((index) => {
        setFormData(prev => ({ ...prev, items: formData.items.filter((_, i) => i !== index) }));
    }, [formData.items]);
    
    const handleProductSelectFromDropdown = useCallback((newItem) => {
        const newItems = [...formData.items];
        const emptyIndex = newItems.findIndex(item => !item.ma_mat_hang);
        
        if (emptyIndex !== -1) {
            newItems[emptyIndex] = newItem;
        } else {
            newItems.push(newItem);
        }
        setFormData(prev => ({ ...prev, items: newItems }));
    }, [formData.items]);

    const handleViewInventory = useCallback((id, name) => {
        setViewingInventoryProduct({ id, name });
    }, []);

    const handleCloseInventoryModal = useCallback(() => {
        setViewingInventoryProduct(null);
    }, []);

    const getError = useCallback((field) => errors?.[field]?.[0] || null, [errors]);
    
    const getProductNameWithPreferredSource = useCallback((item) => getProductName(item, preferredSource), [preferredSource]);


    // --- Submission (Sử dụng config.apiEndpoint) ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const validItems = formData.items.filter(item => item.ma_mat_hang); 
        if (validItems.length === 0) {
             setErrors({ items: ['Vui lòng thêm ít nhất một sản phẩm hợp lệ.'] });
             setIsSubmitting(false);
             return;
        }

        // Tạo payload dựa trên formData và config (tự động mapping)
        const apiPayload = {
            ngay: formData.order_date,
            ma_khncc: formData.ma_khncc,
            ten_khncc: formData.ten_khncc,
            kho_xuat_hh_nvl: formData.warehouse_code, 
            du_an: formData.project,
            phong_ban: formData.department,
            ghi_chu_tren_phieu: formData.customer_notes,
            ghi_chu_noi_bo: formData.internal_notes,
            dia_chi_giao_hang: formData.shipping_address,
            nguoi_phu_trach: formData.employee,
            receipt_type: formData.receipt_type,
            items: validItems.map(item => ({ 
                ma_mat_hang: item.ma_mat_hang,
                ten_mat_hang: getProductName(item, preferredSource),
                so_luong: item.quantity,
                don_gia: getItemPrice(item),
            }))
        };
        
        // Loại bỏ các trường không cần thiết cho API cũ
        const cleanPayload = {
            ...apiPayload,
            items: apiPayload.items.map(({ warehouse_detail, ecount_prices, ecount_name, misa_name, ecount_total_stock, ...rest }) => rest)
        };
        

        if (!apiPayload.ma_khncc) {
             setErrors({ customer_id: ['Khách hàng là bắt buộc.'] });
             setIsSubmitting(false);
             return;
        }
       
        try {
            const endpoint = initialData ? `${config.apiEndpoint}/${initialData.composite_key}` : config.apiEndpoint;
            
            if (initialData) { 
                await axios.put(endpoint, cleanPayload); 
            }
            else { 
                await axios.post(endpoint, cleanPayload); 
            }
            onSaveSuccess();
        } catch (err) {
            console.error("❌ [UniversalForm] Lỗi khi gửi API:", err.response || err);
            if (err.response && err.response.status === 422) { setErrors(err.response.data.errors); }
            else { alert(`Lỗi lưu phiếu: ${err.response?.data?.message || err.message}`); }
        } finally { setIsSubmitting(false); }
    }, [formData, initialData, onSaveSuccess, preferredSource, config.apiEndpoint]);

    return {
        // Data & State
        formData, errors, isSubmitting, viewingInventoryProduct, preferredSource, totalAmount,
        // Options/Loading
        customerOptions, warehouseOptions, isLoadingDropdowns,
        // Handlers
        handleHeaderChange, handleCustomerSelect, handleWarehouseSelect, handleReceiptTypeSelect,
        handleItemChange, handleWarehouseDetailChange, addItem, removeItem, handleProductSelectFromDropdown,
        handleSubmit, setPreferredSource, handleViewInventory, handleCloseInventoryModal, getError,
        getProductName: getProductNameWithPreferredSource, getItemPrice,
    };
};
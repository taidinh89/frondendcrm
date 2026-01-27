// src/components/useSalesFormLogic.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useApiData as originalUseApiData } from '../hooks/useApiData.jsx';
import * as UI from './ui.jsx'; 

const useApiData = originalUseApiData || UI.useApiData;


// ==========================================================
// === HÀM TIỆN ÍCH CHUNG (Cần cho logic) ===
// ==========================================================

export const getProductName = (item, preferredSource) => {
    if (preferredSource === 'ecount' && item.ecount_name) return item.ecount_name;
    if (preferredSource === 'misa' && item.misa_name) return item.misa_name;
    if (item.ecount_name) return item.ecount_name;
    if (item.misa_name) return item.misa_name;
    return item.ten_mat_hang || '(Chưa chọn)';
};

export const getItemPrice = (item) => {
    if (item.price !== undefined && item.price !== null) return item.price;
    return item.ecount_prices?.out_price || 0;
};

// ==========================================================
// === HOOK CHÍNH: useSalesFormLogic ===
// ==========================================================

export const useSalesFormLogic = (order, onSaveSuccess) => {
    
    // Khởi tạo state dựa trên order (nếu có) hoặc giá trị mặc định
    const [formData, setFormData] = useState(() => ({
        ma_khncc: order?.ma_khncc || '',
        ten_khncc: order?.ten_khncc || '',
        order_date: order?.ngay || new Date().toISOString().slice(0, 10),
        warehouse_code: order?.kho_xuat_hh_nvl || '', 
        receipt_type: order?.receipt_type || 'export_now', // [FIX] Loại phiếu
        project: order?.du_an || '',
        department: order?.phong_ban || '',
        customer_notes: order?.ghi_chu_tren_phieu || '',
        internal_notes: order?.ghi_chu_noi_bo || '',
        shipping_address: order?.dia_chi_giao_hang || '',
        employee: order?.nguoi_phu_trach || '', 
        items: order ? order.items.map(item => ({
            ...item,
            warehouse_detail: item.warehouse_detail || [],
            ecount_prices: null, 
            ecount_name: item.ten_mat_hang,
            misa_name: item.ten_mat_hang,
            ecount_total_stock: null
        })) : [{ ma_mat_hang: '', ten_mat_hang: '', quantity: 1, price: 0, warehouse_detail: [] }]
    }));

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingInventoryProduct, setViewingInventoryProduct] = useState(null);
    const [preferredSource, setPreferredSource] = useState('ecount'); 


    // --- Data Fetching ---
    const { data: customers, isLoading: customersLoading } = useApiData(!order ? '/api/v1/customers' : null, { per_page: 200 });
    const { data: warehouses, isLoading: warehousesLoading } = useApiData('/api/v1/warehouses');
    const productsLoading = false; 
    const isLoadingDropdowns = customersLoading || productsLoading || warehousesLoading;

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
    const totalAmount = useMemo(() => formData.items.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0), [formData.items]);


    // --- Handlers ---
    
    const handleHeaderChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const handleReceiptTypeSelect = useCallback((selectedOption) => {
         setFormData(prev => ({ ...prev, receipt_type: selectedOption ? selectedOption.value : 'export_now' }));
    }, []);

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

    const getProductNameWithPreferredSource = useCallback((item) => getProductName(item, preferredSource), [preferredSource]);

    const handleViewInventory = useCallback((id, name) => {
        setViewingInventoryProduct({ id, name });
    }, []);

    const handleCloseInventoryModal = useCallback(() => {
        setViewingInventoryProduct(null);
    }, []);
    
    const getError = useCallback((field) => errors?.[field]?.[0] || null, [errors]);


    // --- Submission ---
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
            if (order) { 
                await axios.put(`/api/v1/sales/${order.composite_key}`, cleanPayload); 
            }
            else { 
                await axios.post('/api/v1/sales', cleanPayload); 
            }
            onSaveSuccess();
        } catch (err) {
            console.error("❌ [SalesForm] Lỗi khi gửi API:", err.response || err);
            if (err.response && err.response.status === 422) { setErrors(err.response.data.errors); }
            else { alert(`Lỗi lưu đơn hàng: ${err.response?.data?.message || err.message}`); }
        } finally { setIsSubmitting(false); }
    }, [formData, order, onSaveSuccess, preferredSource]);

    return {
        // Data
        formData,
        errors,
        isSubmitting,
        viewingInventoryProduct,
        preferredSource,
        totalAmount,
        
        // Options/Loading
        customerOptions,
        warehouseOptions,
        isLoadingDropdowns,

        // Handlers
        handleHeaderChange,
        handleCustomerSelect,
        handleWarehouseSelect,
        handleItemChange,
        handleWarehouseDetailChange,
        addItem,
        removeItem,
        handleProductSelectFromDropdown,
        handleSubmit,
        setPreferredSource,
        getProductName: getProductNameWithPreferredSource,
        getItemPrice,
        handleViewInventory,
        handleCloseInventoryModal,
        getError,
        handleReceiptTypeSelect,
    };
};
// src/config/QuotationConfig.js

export const QuotationConfig = {
    
    // 1. CẤU HÌNH CORE & API
    formKey: 'quotation',
    title: 'Báo giá Khách hàng', // Thay đổi tiêu đề
    apiEndpoint: '/api/v1/quotations', // API Endpoint khác
    
    // 2. CẤU HÌNH HEADER FIELDS (Giống Sales Order)
    headerFields: [
        { name: 'ma_khncc', label: 'Khách hàng *', type: 'customer_select', gridOrder: 1, required: true },
        { name: 'warehouse_code', label: 'Kho xuất *', type: 'warehouse_select', gridOrder: 2, required: true },
        { name: 'preferred_source_toggle', label: 'Tên SP ưu tiên hiển thị', type: 'custom_toggle', gridOrder: 3, component: 'PreferredSourceToggle' },
        { name: 'receipt_type', label: 'Loại Phiếu *', type: 'receipt_select', gridOrder: 4, required: true },
        
        { name: 'meta_fields', label: 'Mã phiếu & Ngày', type: 'custom_meta', gridOrder: 5, component: 'MetaFields' },
        { name: 'employee', label: 'Nhân viên phụ trách', type: 'text', gridOrder: 6, placeholder: 'Chọn nhân viên phụ trách...' },
        { name: 'project', label: 'Dự án', type: 'text', gridOrder: 7, placeholder: 'Nhập tên dự án (nếu có)...' },
        { name: 'department', label: 'Phòng ban', type: 'text', gridOrder: 8, placeholder: 'Nhập tên phòng ban (nếu có)...' },
    ],

    // 3. CẤU HÌNH ITEM COLUMNS (Giống Sales Order)
    itemColumns: [
        { key: 'product', label: 'Sản phẩm *', width: 'flex-1 min-w-[200px]', type: 'search_dropdown' },
        { key: 'warehouse_detail', label: 'Xuất từ Kho (SL)', width: 'w-40', type: 'warehouse_detail_select' },
        { key: 'quantity', label: 'Số lượng *', width: 'w-24', type: 'number_input', required: true, textAlign: 'right' },
        { key: 'price', label: 'Đơn giá *', width: 'w-32', type: 'currency_input', required: true, textAlign: 'right' },
        { key: 'subtotal', label: 'Thành tiền', width: 'w-32', type: 'read_only_text', textAlign: 'right' },
        { key: 'stock_button', label: 'Tồn kho', width: 'w-16', type: 'custom_button' },
        { key: 'action', label: '', width: 'w-10', type: 'action_button' },
    ],
    
    // 4. CẤU HÌNH NOTE FIELDS (Giống Sales Order)
    noteFields: [
        { name: 'customer_notes', label: 'Ghi chú (hiển thị cho khách)', type: 'textarea', placeholder: 'Thông tin bảo hành, thanh toán...', rows: 3 },
        { name: 'internal_notes', label: 'Ghi chú nội bộ', type: 'textarea', placeholder: 'Ghi chú riêng...', rows: 3 },
        { name: 'shipping_address', label: 'Địa chỉ giao hàng', type: 'textarea', isFullWidth: true, placeholder: 'Nhập địa chỉ giao hàng...', rows: 2 }
    ]
};
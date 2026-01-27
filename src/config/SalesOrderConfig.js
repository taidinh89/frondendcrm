// src/config/SalesOrderConfig.js

/**
 * Cấu hình cho Đơn Bán Hàng (Sales Order)
 * Tất cả các thông số hiển thị, logic và API endpoint đều được định nghĩa tại đây.
 */
export const SalesOrderConfig = {
    
    // ==========================================================
    // 1. CẤU HÌNH CORE & API
    // ==========================================================
    formKey: 'sales_order',
    title: 'Đơn Bán Hàng',
    apiEndpoint: '/api/v1/sales', // API Endpoint để POST/PUT
    
    // ==========================================================
    // 2. CẤU HÌNH HEADER FIELDS
    // ==========================================================
    // key: Dùng để match với formData (state) và API payload
    // type: Loại input (select, text, date, custom_toggle)
    // gridOrder: Thứ tự hiển thị (grid layout)
    headerFields: [
        // HÀNG 1 (Cột 1-4)
        { name: 'ma_khncc', label: 'Khách hàng *', type: 'customer_select', gridOrder: 1, required: true },
        { name: 'warehouse_code', label: 'Kho xuất *', type: 'warehouse_select', gridOrder: 2, required: true },
        { name: 'preferred_source_toggle', label: 'Tên SP ưu tiên hiển thị', type: 'custom_toggle', gridOrder: 3, component: 'PreferredSourceToggle' },
        { name: 'receipt_type', label: 'Loại Phiếu *', type: 'receipt_select', gridOrder: 4, required: true },
        
        // HÀNG 2 (Cột 5-8)
        { name: 'meta_fields', label: 'Mã phiếu & Ngày', type: 'custom_meta', gridOrder: 5, component: 'MetaFields' },
        { name: 'employee', label: 'Nhân viên phụ trách', type: 'text', gridOrder: 6, placeholder: 'Chọn nhân viên phụ trách...' },
        { name: 'project', label: 'Dự án', type: 'text', gridOrder: 7, placeholder: 'Nhập tên dự án (nếu có)...' },
        { name: 'department', label: 'Phòng ban', type: 'text', gridOrder: 8, placeholder: 'Nhập tên phòng ban (nếu có)...' },
    ],

    // ==========================================================
    // 3. CẤU HÌNH ITEM COLUMNS
    // ==========================================================
    // key: Dùng để match với item data (Ví dụ: item.quantity)
    // type: Loại hiển thị/input trong hàng sản phẩm
    itemColumns: [
        { key: 'product', label: 'Sản phẩm *', width: 'flex-1 min-w-[200px]', type: 'search_dropdown' },
        { key: 'warehouse_detail', label: 'Xuất từ Kho (SL)', width: 'w-40', type: 'warehouse_detail_select' },
        { key: 'quantity', label: 'Số lượng *', width: 'w-24', type: 'number_input', required: true, textAlign: 'right' },
        { key: 'price', label: 'Đơn giá *', width: 'w-32', type: 'currency_input', required: true, textAlign: 'right' },
        { key: 'subtotal', label: 'Thành tiền', width: 'w-32', type: 'read_only_text', textAlign: 'right' },
        { key: 'stock_button', label: 'Tồn kho', width: 'w-16', type: 'custom_button' },
        { key: 'action', label: '', width: 'w-10', type: 'action_button' },
    ],
    
    // ==========================================================
    // 4. CẤU HÌNH NOTE FIELDS
    // ==========================================================
    noteFields: [
        { name: 'customer_notes', label: 'Ghi chú (hiển thị cho khách)', type: 'textarea', placeholder: 'Thông tin bảo hành, thanh toán...' },
        { name: 'internal_notes', label: 'Ghi chú nội bộ', type: 'textarea', placeholder: 'Ghi chú riêng...' },
        { name: 'shipping_address', label: 'Địa chỉ giao hàng', type: 'textarea', isFullWidth: true, placeholder: 'Nhập địa chỉ giao hàng...' }
    ]
};
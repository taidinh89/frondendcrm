// src/components/Trading/SalesOrderForm.jsx

import React from 'react';
import { UniversalFormRenderer } from '../Core/UniversalFormRenderer.jsx'; // Component UI Core
import { SalesOrderConfig } from '../../config/SalesOrderConfig.js'; // Cấu hình cho phiếu này

/**
 * Component Wrapper cho Đơn Bán Hàng.
 * Nó chỉ định nghĩa CẤU HÌNH nào sẽ được render.
 * Việc thay đổi layout, trường, cột sẽ chỉ cần sửa trong SalesOrderConfig.js.
 */
export const SalesOrderForm = ({ order, onSaveSuccess, onCancel }) => {
    
    // Truyền config và data vào renderer chung
    return (
        <UniversalFormRenderer
            config={SalesOrderConfig}
            initialData={order}
            onSaveSuccess={onSaveSuccess}
            onCancel={onCancel}
        />
    );
};
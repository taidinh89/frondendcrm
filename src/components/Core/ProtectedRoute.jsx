
// src/components/Core/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ENABLE_PERMISSION_CHECK } from '../../config'; // <--- Nhập cầu dao vào

const ProtectedRoute = ({ requiredPermission }) => {
    // 1. KIỂM TRA CẦU DAO TỔNG
    // Nếu cầu dao đang TẮT -> Cho qua luôn, không cần check gì cả
    if (!ENABLE_PERMISSION_CHECK) {
        return <Outlet />;
    }

    // 2. Logic kiểm tra quyền như cũ
    const storedPermissions = localStorage.getItem('permissions');
    const permissions = storedPermissions ? JSON.parse(storedPermissions) : [];

    // Check quyền (Super Admin * luôn đúng)
    const hasPermission = permissions.includes('*') || permissions.includes(requiredPermission);

    if (!hasPermission) {
        return <div className="text-red-500 font-bold p-10 text-center">⛔ BẠN KHÔNG CÓ QUYỀN TRUY CẬP (Đã bật chặn)</div>;
    }

    return <Outlet />;
};

export default ProtectedRoute;
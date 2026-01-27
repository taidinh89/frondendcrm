// src/components/dashboard/DashboardCard.jsx
import React from 'react';

// [SỬA] Thêm prop "onSeeMore"
export const DashboardCard = ({ title, children, className = "", fullHeight = false, onSeeMore }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm flex flex-col ${className}`}>
            {title && (
                // [SỬA] Dùng flex để căn chỉnh nút
                <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {title}
                    </h3>
                    {/* [MỚI] Hiển thị nút nếu có hàm onSeeMore */}
                    {onSeeMore && (
                        <button 
                            onClick={onSeeMore} 
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            Xem thêm
                        </button>
                    )}
                </div>
            )}
            
            {/* ... (phần còn lại giữ nguyên) ... */}
            <div className={`
                ${fullHeight ? 'h-80' : ''} 
                ${title ? 'p-6' : 'p-6'} 
                ${fullHeight ? 'overflow-y-auto' : ''} 
            `}>
                {children}
            </div>
        </div>
    );
};
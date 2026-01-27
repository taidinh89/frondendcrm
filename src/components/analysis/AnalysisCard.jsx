// src/components/analysis/AnalysisCard.jsx
import React from 'react';

// Đây là file copy của DashboardCard nhưng không có padding mặc định ở body
export const AnalysisCard = ({ title, children, className = "" }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm flex flex-col ${className}`}>
            {title && (
                <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {title}
                    </h3>
                </div>
            )}
            
            {/* Thẻ body không có padding, để biểu đồ chiếm toàn bộ */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
};
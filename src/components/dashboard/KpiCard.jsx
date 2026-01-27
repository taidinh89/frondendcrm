// src/components/dashboard/KpiCard.jsx
import React from 'react';
import { Icon } from '../ui.jsx';

export const KpiCard = ({ title, value, icon, iconColor, bgColor }) => {
    return (
        // [SỬA] Thay đổi layout để linh hoạt hơn
        <div className="bg-white p-5 rounded-lg shadow-sm flex items-center space-x-4">
            <div className={`flex-shrink-0 rounded-full p-3 ${bgColor || 'bg-blue-100'}`}>
                <Icon path={icon || "M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"} className={`w-6 h-6 ${iconColor || 'text-blue-600'}`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 truncate">{value}</p>
            </div>
        </div>
    );
};
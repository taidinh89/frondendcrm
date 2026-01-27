// src/components/analysis/AnalysisList.jsx
import React from 'react';

// Helper format
const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0) + ' đ';
const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0);

export const TopProductsList = ({ data }) => (
    <ul className="divide-y divide-gray-100">
        {data.map(item => (
            <li key={item.ma_mat_hang} className="py-2.5">
                <p className="text-sm font-medium text-gray-800 truncate">{item.ten_mat_hang}</p>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-mono">{item.ma_mat_hang}</span>
                    <span className="font-semibold text-green-600">{formatPrice(item.total_profit)}</span>
                </div>
            </li>
        ))}
    </ul>
);

export const TopEmployeesList = ({ data }) => (
    <ul className="divide-y divide-gray-100">
        {data.map(item => (
            <li key={item.nguoi_phu_trach} className="py-2.5">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-800">{item.nguoi_phu_trach}</span>
                    <span className="font-semibold text-green-600">{formatPrice(item.total_profit)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-0.5">
                    <span>{formatNumber(item.order_count)} đơn</span>
                    <span>AOV: {formatPrice(item.aov)}</span>
                </div>
            </li>
        ))}
    </ul>
);
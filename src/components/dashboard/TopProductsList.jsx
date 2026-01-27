// src/components/dashboard/TopProductsList.jsx
import React from 'react';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0) + ' đ';
const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0);

export const TopProductsList = ({ data, mode = 'revenue', onItemClick }) => {
    return (
        <div className="flow-root h-80 overflow-y-auto pr-2 custom-scrollbar">
            <ul role="list" className="divide-y divide-gray-200">
                {data.map((item) => (
                    <li 
                        key={item.ma_mat_hang} 
                        className="py-3 sm:py-4 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => onItemClick && onItemClick(item)}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                    {item.ten_mat_hang}
                                </p>
                                <p className="text-xs text-gray-500 truncate font-mono">
                                    {item.ma_mat_hang}
                                </p>
                            </div>
                            <div className="inline-flex flex-col items-end text-base font-semibold text-gray-900">
                                {mode === 'revenue' ? (
                                    <>
                                        <span className="text-sm text-green-600">{formatPrice(item.total_revenue)}</span>
                                        <span className="text-xs font-normal text-gray-500">Đã bán {formatNumber(item.total_quantity)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg text-blue-600">{formatNumber(item.total_quantity)}</span>
                                        <span className="text-xs font-normal text-gray-500">{formatPrice(item.total_revenue)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
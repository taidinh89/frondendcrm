// src/components/dashboard/TopEmployeesList.jsx
import React from 'react';

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(parseFloat(value) || 0) + ' đ';

export const TopEmployeesList = ({ data, onItemClick }) => {
    return (
        <div className="flow-root h-80 overflow-y-auto pr-2 custom-scrollbar">
            <ul role="list" className="divide-y divide-gray-200">
                {data.map((item) => (
                    <li 
                        key={item.nguoi_phu_trach} 
                        className="py-3 sm:py-4 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => onItemClick && onItemClick(item)}
                    >
                        <div className="flex items-center space-x-4">
                            {/* Avatar giả lập (nếu muốn đẹp hơn) */}
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                    {item.nguoi_phu_trach.charAt(0)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                    {item.nguoi_phu_trach}
                                </p>
                            </div>
                            <div className="inline-flex flex-col items-end text-base font-semibold text-gray-900">
                                <span className="text-sm text-green-600">{formatPrice(item.total_revenue)}</span>
                                <span className="text-xs font-normal text-gray-500">{item.order_count} đơn</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
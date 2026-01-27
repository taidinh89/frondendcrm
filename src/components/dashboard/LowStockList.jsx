// src/components/dashboard/LowStockList.jsx
import React from 'react';

export const LowStockList = ({ data }) => {
    return (
        // [SỬA] Thêm div bọc ngoài với chiều cao cố định và thanh cuộn
        <div className="flow-root h-80 overflow-y-auto pr-2">
            <ul role="list" className="divide-y divide-gray-200">
                {data.map((product) => (
                    <li key={product.ecount_code} className="py-3 sm:py-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.display_name}</p>
                                <p className="text-sm text-gray-500 truncate font-mono">{product.ecount_code}</p>
                            </div>
                            <div className="inline-flex items-center text-base font-semibold text-gray-900">
                                <span className="px-3 py-1 rounded-full text-lg font-bold bg-yellow-100 text-yellow-800">
                                    {parseFloat(product.total_ecount_quantity)}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
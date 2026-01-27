// src/components/analysis/Tabs.jsx
import React from 'react';

export const Tabs = ({ items, activeTab, onTabChange }) => {
    return (
        // Thẻ cha chứa các nút tab: Thêm overflow-x-auto và whitespace-nowrap
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap pb-1"> 
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                        flex-shrink-0 // RẤT QUAN TRỌNG: Ngăn tab bị co
                        py-2 px-3 text-sm font-medium transition-colors duration-200
                        ${activeTab === item.id 
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }
                    `}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
};
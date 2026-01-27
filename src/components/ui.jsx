// src/components/ui.jsx

import React, { useRef, useEffect } from 'react';
import { useApiData as originalUseApiData } from '../hooks/useApiData.jsx'; // Dùng tên khác khi import

// ==========================================================
// === HOOK ĐỂ XỬ LÝ CLICK RA NGOÀI (Cho Dropdown) ===
// ==========================================================
export const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
};
// ==========================================================

// ==========================================================
// === TẠO ALIAS CHO useApiData ĐỂ TRÁNH LỖI IMPORT ===
// ==========================================================
export const useApiData = originalUseApiData;
// ==========================================================


const ICONS = {
    search: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    filter: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z",
    plus: "M12 4.5v15m7.5-7.5h-15",
    "external-link": "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
    save: "M17.598 2.112a1.021 1.021 0 0 1 .833.303l.707.707a1.01 1.01 0 0 1 .303.833L18.5 5.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9.5a1 1 0 0 1 .707.293l.391.391a1 1 0 0 1 .282.707V4.5a.5.5 0 0 0 1 0V3.5h.5a1.02 1.02 0 0 1 .218-.388ZM7 18h10v-5H7v5ZM9 4v4h6V4H9Z",
    upload: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
    image: "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    info: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
    chevronLeft: "M15.75 19.5L8.25 12l7.5-7.5",
    chevronRight: "M8.25 4.5l7.5 7.5-7.5 7.5"
};

export const Icon = ({ name, path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path || ICONS[name] || ""} />
    </svg>
);

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-lg', isFullScreen = false }) => {
    if (!isOpen) return null;

    const containerClasses = isFullScreen
        ? "fixed inset-0 z-50 flex flex-col bg-white"
        : "fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4";

    const contentClasses = isFullScreen
        ? "w-full h-full flex flex-col overflow-hidden"
        : `bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[95vh] flex flex-col`;

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <div className="flex-1 truncate pr-4 text-lg font-semibold text-gray-800">{title}</div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
                        <Icon name="plus" className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 h-full">
                    {children}
                </div>
                {footer && (
                    <div className="flex justify-end space-x-3 border-t bg-gray-50 rounded-b-lg flex-shrink-0 p-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = "button", size = "md" }) => {
    const baseClasses = 'text-sm font-medium rounded-md flex items-center justify-center border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    let paddingClasses = 'px-3 py-1.5';
    if (size === 'xs') {
        paddingClasses = 'px-2.5 py-1 text-xs';
    }

    const variantClasses = {
        primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
        danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
    };
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`${baseClasses} ${paddingClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
        >
            {children}
        </button>
    );
};

export const Checkbox = React.forwardRef(({ indeterminate, label, ...rest }, ref) => {
    const defaultRef = useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
        if (resolvedRef.current) {
            resolvedRef.current.indeterminate = indeterminate;
        }
    }, [resolvedRef, indeterminate]);

    const checkboxElement = (
        <input
            type="checkbox"
            ref={resolvedRef}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...rest}
        />
    );

    if (label) {
        return (
            <label className="inline-flex items-center">
                {checkboxElement}
                <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
        );
    }

    return checkboxElement;
});

export const Pagination = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.last_page <= 1) return null;
    const { current_page, last_page, total, from, to } = pagination;

    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
                Hiển thị từ <strong>{from}</strong> đến <strong>{to}</strong> trên tổng số <strong>{total}</strong> kết quả
            </p>
            <div className="flex items-center space-x-2">
                <button onClick={() => onPageChange(1)} disabled={current_page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" className="w-5 h-5" />
                </button>
                <button onClick={() => onPageChange(current_page - 1)} disabled={current_page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
                </button>
                <span>Trang {current_page} / {last_page}</span>
                <button onClick={() => onPageChange(current_page + 1)} disabled={current_page === last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-5 h-5" />
                </button>
                <button onClick={() => onPageChange(last_page)} disabled={current_page === last_page} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
                    <Icon path="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


// === KHÔI PHỤC COMPONENT INPUT ===
export const Input = ({ label, name, type = "text", value, onChange, placeholder, className = "" }) => (
    <div className="w-full">
        {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 ${className}`}
        />
    </div>
);

export const Textarea = ({ label, name, value, onChange, placeholder, className = "", rows = 3 }) => (
    <div className="w-full">
        {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <textarea
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y ${className}`}
        />
    </div>
);
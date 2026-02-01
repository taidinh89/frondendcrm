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
    chevronRight: "M8.25 4.5l7.5 7.5-7.5 7.5",
    chevronUp: "M4.5 15.75l7.5-7.5 7.5 7.5",
    chevronDown: "M19.5 8.25l-7.5 7.5-7.5-7.5",
    package: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
    award: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    "file-text": "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-.75a3.375 3.375 0 00-3.375-3.375H9m1.5 4.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9",
    list: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
    "shopping-cart": "M2.25 2.25h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.1-.73 2.37-1.824l1.654-6.751A.75.75 0 0019.25 5.25H4.25m4.5 13.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
    eye: "M2.036 12.322a1.012 1.012 0 010-.644C3.399 8.049 7.31 5.25 12 5.25c4.69 0 8.601 2.809 9.964 6.428.061.162.061.326 0 .488-1.363 3.619-5.273 6.419-9.964 6.419-4.69 0-8.601-2.801-9.964-6.419z M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z",
    heart: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
    sliders: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-9.75 0h9.75",
    "arrow-up-down": "M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m9-6L21 15m0 0-4.5 4.5M21 15V3",
    flame: "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z",
    gift: "M21 11.25s0-2.25-1.5-2.25H15a3 3 0 0 0-3-3V5.25m6 6V15a.75.75 0 0 1-.75.75h-3.75M21 11.25H3.375a1.125 1.125 0 0 1-1.125-1.125V5.625A1.125 1.125 0 0 1 3.375 4.5H9.75m11.25 6.75h-1.125l-1.125 1.125H3.375m11.25-6.75h1.125a1.125 1.125 0 0 1 1.125 1.125v4.5m-11.25 0V15a.75.75 0 0 0 .75.75h3.75M3 11.25h1.125L5.25 12.375M12 15.75V21m-1.5-1.125h3m-3 1.5h3",
    "bar-chart": "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    "cloud-upload": "M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z",
    activity: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 16.5h6a3.987 3.987 0 0 1 1.951 3.012A8.949 8.949 0 0 1 12 21Zm0-18a8.949 8.949 0 0 0-4.951 1.488A3.987 3.987 0 0 0 9 7.5h6a3.987 3.987 0 0 0 1.951-3.012A8.949 8.949 0 0 0 12 3Z",
    "alert-triangle": "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 12.376ZM12 15.75h.007v.008H12v-.008Z",
    "eye-off": "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88",
    "sidebar-open": "M3.75 3.75v16.5m1.5-16.5v16.5M7.5 3.75v16.5a2.25 2.25 0 0 1 2.25-2.25h9a2.25 2.25 0 0 1 2.25 2.25v-13.5A2.25 2.25 0 0 0 18.75 4.5h-9a2.25 2.25 0 0 0-2.25 2.25",
    "sidebar-close": "M3.75 3.75v16.5m1.5-16.5v16.5M18.75 3.75v16.5a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25",
    trash: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
    link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    copy: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75",
    x: "M6 18L18 6M6 6l12 12",
    check: "m4.5 12.75 6 6 9-13.5",
    grid: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    maximize: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15m-11.25 5.25h4.5m-4.5 0v-4.5m0 4.5L9 15",
    download: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75V15m0 0 3-3m-3 3-3-3M12 2.25V8.25",
    wand: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
    "check-circle": "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

export const Icon = ({ name, path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path || ICONS[name] || ""} />
    </svg>
);

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-lg', isFullScreen = false }) => {
    if (!isOpen) return null;

    const containerClasses = isFullScreen
        ? "fixed inset-0 z-[1000] flex flex-col bg-white"
        : "fixed inset-0 bg-black bg-opacity-50 z-[1000] flex justify-center items-center p-4";

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
        success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
        warning: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 focus:ring-amber-400',
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
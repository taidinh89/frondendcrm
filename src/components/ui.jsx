import React, { useRef, useEffect } from 'react';

export const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => {
    const baseClasses = 'px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
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
            className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
        >
            {children}
        </button>
    );
};

export const Checkbox = React.forwardRef(({ indeterminate, ...rest }, ref) => {
    const defaultRef = useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
        if(resolvedRef.current){
             resolvedRef.current.indeterminate = indeterminate;
        }
    }, [resolvedRef, indeterminate]);

    return (
        <input
            type="checkbox"
            ref={resolvedRef}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...rest}
        />
    );
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


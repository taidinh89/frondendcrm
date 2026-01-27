import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from '../ui.jsx'; 

// --- 1. [GIỮ NGUYÊN] LÀM TRÒN SỐ TUYỆT ĐỐI ---
// maximumFractionDigits: 0 -> Cắt bỏ hoàn toàn số lẻ thập phân
const formatPrice = (value) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatMargin = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0%';
    return num.toFixed(1) + '%';
};

// --- CONFIG CẤU HÌNH CỘT ---
const getKeysByType = (type) => {
    const commonCols = [
        { key: 'total_revenue', label: 'DOANH THU', isPrice: true, align: 'right', width: 110, className: 'font-medium' },
        { key: 'total_profit', label: 'LỢI NHUẬN gộp', isPrice: true, isProfit: true, align: 'right', width: 120 },
        { key: 'profit_margin', label: '% LN gộp', isMargin: true, formatter: formatMargin, align: 'right', width: 70 }
    ];

    const productKeys = [
        { key: 'ma_mat_hang', label: 'MÃ', align: 'left', clickableType: 'product', width: 110, className: 'font-medium text-gray-600' },
        { key: 'ten_mat_hang', label: 'SẢN PHẨM', align: 'left', clickableType: 'product', width: 300, className: 'font-medium text-gray-800 whitespace-normal line-clamp-2' },
        { key: 'total_quantity_sold', label: 'SL BÁN', align: 'center', isNumber: true, width: 70, className: 'bg-blue-50 font-bold text-blue-700' },
        { key: 'avg_price', label: 'GIÁ BÁN TB', isPrice: true, align: 'right', width: 110, className: 'text-gray-500 text-xs' }, 
        { key: 'latest_purchase_price', label: 'GIÁ NHẬP (Lần cuối)', isPrice: true, isPurchasePrice: true, align: 'right', width: 130, className: 'bg-yellow-50 text-xs' },
        ...commonCols
    ];
    
    // Các cấu hình cột khác giữ nguyên
    const employeeKeys = [
        { key: 'nguoi_phu_trach', label: 'NHÂN VIÊN', align: 'left', clickableType: 'employee', width: 200, className: 'font-bold text-blue-700' },
        { key: 'order_count', label: 'ĐƠN', align: 'center', isNumber: true, width: 80 },
        { key: 'aov', label: 'TB ĐƠN', isPrice: true, align: 'right', width: 120, className: 'text-gray-500' },
        ...commonCols
    ];
    const customerKeys = [
        { key: 'ma_khncc', label: 'MÃ KH', align: 'left', clickableType: 'customer', width: 100 },
        { key: 'ten_khncc', label: 'KHÁCH HÀNG', align: 'left', clickableType: 'customer', width: 250, className: 'whitespace-normal font-medium' },
        { key: 'order_count', label: 'ĐƠN', align: 'center', isNumber: true, width: 70 },
        ...commonCols
    ];
    const orderKeys = [
        { key: 'so_phieu', label: 'SỐ PHIẾU', align: 'left', clickableType: 'order', width: 130, className: 'font-bold text-blue-600' },
        { key: 'ngay', label: 'NGÀY', align: 'center', isDate: true, width: 90 },
        { key: 'ten_khncc', label: 'KHÁCH HÀNG', align: 'left', clickableType: 'customer', identifierKey: 'ma_khncc', width: 200, className: 'truncate text-gray-600' },
        ...commonCols
    ];

    switch (type) {
        case 'employees': return employeeKeys; 
        case 'customers': return customerKeys; 
        case 'orders': return orderKeys;
        case 'frequency': return productKeys; 
        default: return productKeys;
    }
};

export const ProductGroupAnalysisDataTable = ({ data, type, onItemClick }) => {
    const [hideReturns, setHideReturns] = useState(true);
    const [columnWidths, setColumnWidths] = useState({});
    
    const keys = getKeysByType(type);
    const storageKey = `col_widths_v8_${type}`; // Tăng version

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) { try { setColumnWidths(JSON.parse(saved)); } catch (e) {} }
    }, [storageKey]);

    const displayData = useMemo(() => {
        if (!data) return [];
        if (!hideReturns) return data; 
        return data.filter(item => {
            const revenue = parseFloat(item.total_revenue || item.net_revenue || 0);
            return revenue >= 0; 
        });
    }, [data, hideReturns]);

    // Logic Resize (Giữ nguyên)
    const getWidth = (key) => columnWidths[key] || keys.find(k => k.key === key)?.width || 100;
    const resizingRef = useRef(null);
    const handleMouseDown = (e, key) => {
        e.preventDefault();
        resizingRef.current = { key, startX: e.pageX, startWidth: getWidth(key) };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };
    const handleMouseMove = useCallback((e) => {
        if (!resizingRef.current) return;
        const diff = e.pageX - resizingRef.current.startX;
        setColumnWidths(prev => ({ ...prev, [resizingRef.current.key]: Math.max(50, resizingRef.current.startWidth + diff) }));
    }, []);
    const handleMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
    }, []);
    useEffect(() => {
        if (Object.keys(columnWidths).length > 0) {
            const timer = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(columnWidths)), 500);
            return () => clearTimeout(timer);
        }
    }, [columnWidths, storageKey]);

    const getIdentifier = (item, key) => {
        if (key.identifierKey) return item[key.identifierKey];
        if (key.clickableType === 'product') return item.ma_mat_hang;
        if (key.clickableType === 'customer') return item.ma_khncc;
        if (key.clickableType === 'order') return item.so_phieu;
        return item[key.key];
    };

    if (!data || data.length === 0) {
        return <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-500">Không có dữ liệu.</div>;
    }

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex justify-end items-center px-1">
                <label className="inline-flex items-center cursor-pointer select-none space-x-2 text-sm text-gray-600 hover:text-gray-800">
                    <input 
                        type="checkbox" 
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={hideReturns}
                        onChange={(e) => setHideReturns(e.target.checked)}
                    />
                    <span>Ẩn dòng trả hàng (Doanh thu âm)</span>
                </label>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            {keys.map(key => (
                                <th key={key.key} className={`relative px-2 py-3 font-bold text-gray-600 uppercase tracking-wider text-${key.align || 'left'} select-none`} style={{ width: getWidth(key.key) }}>
                                    <div className="truncate px-1" title={key.label}>{key.label}</div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-400" onMouseDown={(e) => handleMouseDown(e, key.key)} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {displayData.map((item, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors group">
                                {keys.map(key => {
                                    let displayValue = item[key.key];
                                    let cssClass = `px-3 py-2 text-${key.align || 'left'} ${key.className || ''} overflow-hidden`;

                                    // --- 2. LOGIC HIỂN THỊ CHUẨN ---
                                    if (key.isPurchasePrice) {
                                        // Chỉ hiển thị nếu có giá trị thực > 0
                                        if (displayValue && parseFloat(displayValue) > 0) {
                                            displayValue = formatPrice(displayValue);
                                            cssClass += ' font-mono text-gray-700';
                                        } 
                                        // Nếu không có (0 hoặc null), giữ nguyên N/A để người dùng biết đường tra cứu
                                        else {
                                            displayValue = <span className="text-gray-300 italic text-[10px]">N/A</span>;
                                        }
                                    } 
                                    else if (key.isPrice) {
                                        // Chỉ làm tròn số, không can thiệp logic khác
                                        const val = parseFloat(item[key.key] || 0);
                                        displayValue = formatPrice(val);
                                        cssClass += ' font-mono';
                                        
                                        if (key.isProfit) { 
                                            // Vẫn giữ logic cảnh báo nếu là giá vốn tạm tính (nhưng không sửa số liệu)
                                            if (item.is_estimated_cost) {
                                                cssClass += ' text-orange-600 font-bold bg-orange-50';
                                                displayValue = (
                                                    <div className="flex items-center justify-end gap-1 cursor-help" title="Giá vốn tạm tính (dựa trên giá nhập gần nhất)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-orange-500">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                        {displayValue}
                                                    </div>
                                                );
                                            } else {
                                                cssClass += val > 0 ? ' text-green-600 font-bold' : (val < 0 ? ' text-red-600 font-bold bg-red-50' : ' text-gray-400');
                                            }
                                        }
                                    } 
                                    else if (key.isNumber) {
                                        displayValue = formatNumber(displayValue);
                                    } 
                                    else if (key.isMargin) {
                                        const val = parseFloat(item[key.key] || 0);
                                        displayValue = val.toFixed(1) + '%';
                                        if (val >= 99.9 && !item.is_estimated_cost && parseFloat(item.total_cost || 0) === 0) {
                                            cssClass += ' text-gray-400 italic';
                                        } else {
                                            cssClass += val < 5 ? ' text-red-600 font-bold' : ' text-blue-600';
                                        }
                                    } 
                                    else if (key.isDate && displayValue) {
                                        displayValue = new Date(displayValue).toLocaleDateString('vi-VN');
                                    }

                                    const isClickable = key.clickableType && onItemClick;
                                    if (isClickable) cssClass += ' cursor-pointer text-blue-600 hover:text-blue-800 hover:underline';
                                    else if (!key.isProfit && !key.isMargin && !key.isTag && !key.isPurchasePrice) cssClass += ' text-gray-700';

                                    return (
                                        <td key={key.key} className={cssClass} style={{ width: getWidth(key.key) }} onClick={() => isClickable && onItemClick(key.clickableType, getIdentifier(item, key))}>
                                            <div className={key.key === 'ten_mat_hang' || key.key === 'ten_khncc' ? '' : 'truncate'}>
                                                {displayValue}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
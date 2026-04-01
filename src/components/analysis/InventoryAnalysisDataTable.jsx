import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as UI from '../ui.jsx';
import { exportToExcelWithStyles } from '../../utils/excelExporter.js';

export const InventoryAnalysisDataTable = ({ data, activeTab, pagination, onItemClick, sortConfig, onSort, renderRowActions }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [hiddenColumns, setHiddenColumns] = useState([]);
    const [isColMenuOpen, setIsColMenuOpen] = useState(false);
    
    // --- MỚI: QUẢN LÝ CO GIÃN CỘT (RESIZABLE) ---
    const STORAGE_KEY = `inv_analysis_widths_${activeTab}`;
    const [columnWidths, setColumnWidths] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) { return {}; }
    });

    const resizingRef = useRef(null); // { field, startX, startWidth }
    
    const handleResizeStart = (e, field) => {
        e.preventDefault();
        e.stopPropagation();
        
        const th = e.target.parentElement;
        resizingRef.current = {
            field,
            startX: e.pageX,
            startWidth: th.offsetWidth
        };
        
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleResizeMove = (e) => {
        if (!resizingRef.current) return;
        const { field, startX, startWidth } = resizingRef.current;
        const diff = e.pageX - startX;
        const newWidth = Math.max(80, startWidth + diff); // Minimum width 80px
        
        setColumnWidths(prev => ({
            ...prev,
            [field]: newWidth
        }));
    };

    const handleResizeEnd = () => {
        if (resizingRef.current) {
            // Khi dừng kéo, lưu vào LocalStorage để ghi nhớ
            setColumnWidths(current => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
                return current;
            });
        }
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    const topScrollRef = useRef(null);
    const mainScrollRef = useRef(null);
    const tableRef = useRef(null);
    const [tableWidth, setTableWidth] = useState(0);

    // Đồng bộ cuộn ngang giữa thanh cuộn trên và bảng chính
    useEffect(() => {
        const top = topScrollRef.current;
        const main = mainScrollRef.current;
        if (!top || !main) return;

        const handleTopScroll = () => { if (main.scrollLeft !== top.scrollLeft) main.scrollLeft = top.scrollLeft; };
        const handleMainScroll = () => { if (top.scrollLeft !== main.scrollLeft) top.scrollLeft = main.scrollLeft; };

        top.addEventListener('scroll', handleTopScroll);
        main.addEventListener('scroll', handleMainScroll);

        return () => {
            top.removeEventListener('scroll', handleTopScroll);
            main.removeEventListener('scroll', handleMainScroll);
        };
    }, []);

    // Cập nhật chiều rộng cho thanh cuộn "phantom" phía trên
    useEffect(() => {
        if (tableRef.current) {
            setTableWidth(tableRef.current.scrollWidth);
        }
    }, [data, hiddenColumns, activeTab, columnWidths]);


    const { currentPage, lastPage, total, perPage, onPageChange } = pagination || {};
    const formatNum = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

    const renderPagination = (position = 'bottom') => {
        if (!pagination || lastPage <= 1) return null;
        return (
            <div className={`p-4 bg-slate-50 flex items-center justify-between ${position === 'top' ? 'border-b' : 'border-t'} border-slate-200 shadow-sm`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {position === 'top' ? 'Trang ' : 'Hiển thị '} {formatNum(total)} kết quả
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[10px] font-black disabled:opacity-50">TRƯỚC</button>
                    <div className="h-8 px-3 flex items-center bg-blue-600 text-white text-[10px] font-black rounded-lg">{currentPage} / {lastPage}</div>
                    <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[10px] font-black disabled:opacity-50">SAU</button>
                </div>
            </div>
        );
    };

    const getUrgencyColor = (urgency) => {
        switch (urgency) {
            case 'high': return 'bg-rose-500 text-white';
            case 'warning': return 'bg-amber-400 text-amber-950';
            case 'normal': return 'bg-emerald-500 text-white';
            default: return 'bg-slate-200 text-slate-600';
        }
    };

    const columns = activeTab === 'by_supplier' ? [
        { id: 'supplier_name', label: 'Nhà cung cấp', sticky: true, width: columnWidths['supplier_name'] || 280 },
        { id: 'sales_value', label: 'Doanh số NCC', align: 'right', width: columnWidths['sales_value'] || 160 },
        { id: 'suggested_sales_value', label: 'Doanh số mã cần nhập', align: 'right', width: columnWidths['suggested_sales_value'] || 160 },
        { id: 'total_inventory_value', label: 'Giá trị Tồn', align: 'right', width: columnWidths['total_inventory_value'] || 144 },
        { id: 'stock_qty', label: 'SL Tồn', align: 'right', width: columnWidths['stock_qty'] || 112 },
        { id: 'sku_count', label: 'Tổng mã', align: 'right', width: columnWidths['sku_count'] || 100 },
        { id: 'sku_suggested_count', label: 'Mã cần nhập', align: 'right', width: columnWidths['sku_suggested_count'] || 112 },
        { id: 'total_suggested', label: 'SL Đề xuất Nhập', align: 'right', width: columnWidths['total_suggested'] || 160 },
        { id: 'suggested_value', label: 'Giá trị cần nhập', align: 'right', width: columnWidths['suggested_value'] || 160 },
        { id: 'debt', label: 'Công nợ Phải trả', align: 'right', width: columnWidths['debt'] || 144 },
    ] : [
        { id: 'product', label: 'Sản phẩm', sticky: true, width: columnWidths['product'] || 320 },
        { id: 'stock', label: 'Tồn kho', align: 'right', width: columnWidths['stock'] || 112 },
        { id: 'value', label: 'Giá trị Tồn', align: 'right', width: columnWidths['value'] || 144 },
        { id: 'velocity', label: 'Tốc độ/Ngày', align: 'right', width: columnWidths['velocity'] || 100 },
        { id: 'days', label: 'An toàn', align: 'right', width: columnWidths['days'] || 112 },
        { id: 'suggested', label: 'Cần nhập', align: 'right', width: columnWidths['suggested'] || 128, showIf: activeTab === 'all_products' || activeTab === 'low_stock_active' },
        { id: 'supplier', label: 'Nhà cung cấp', align: 'left', width: columnWidths['supplier'] || 160 },
        { id: 'cycle', label: 'Chu kỳ', align: 'center', width: columnWidths['cycle'] || 100 },
        { id: 'actions', label: 'Thao tác', align: 'center', width: columnWidths['actions'] || 100, showIf: !!renderRowActions },
    ];

    const visibleColumns = columns.filter(col => !hiddenColumns.includes(col.id) && (col.showIf === undefined || col.showIf));

    const toggleSelectAll = () => {
        if (selectedIds.length === data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data.map(item => activeTab === 'by_supplier' ? item.supplier_code : item.product_code));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleColumn = (id) => {
        setHiddenColumns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const SortableHeader = ({ label, subtitle, field, className }) => {
        const isSorted = sortConfig?.sortBy === field;
        const isAsc = sortConfig?.sortDir === 'asc';
        
        // Lấy width hiện tại
        const width = columnWidths[field];

        return (
            <th
                className={`relative px-4 py-3 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors group/header ${className || 'text-slate-500 text-right'}`}
                onClick={() => onSort && onSort(field)}
                style={{ verticalAlign: 'middle', whiteSpace: 'normal', width: width ? `${width}px` : undefined }}
            >
                <div className={`flex items-center gap-1.5 ${className?.includes('text-left') || className?.includes('sticky') ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex flex-col">
                        <span>{label}</span>
                        {subtitle && <span className="text-[9px] font-normal normal-case tracking-normal text-slate-400 mt-0.5">{subtitle}</span>}
                    </div>
                    <span className="flex flex-col gap-0 opacity-70 flex-shrink-0">
                        <UI.Icon name="chevronUp" className={`w-2.5 h-2.5 ${isSorted && isAsc ? 'text-blue-600' : 'text-slate-300'}`} />
                        <UI.Icon name="chevronDown" className={`w-2.5 h-2.5 ${isSorted && !isAsc ? 'text-blue-600' : 'text-slate-300'}`} />
                    </span>
                </div>

                {/* --- HANDLE CO GIÃN CỘT --- */}
                <div 
                    className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-[100]"
                    onMouseDown={(e) => handleResizeStart(e, field)}
                    onClick={(e) => e.stopPropagation()} // Quan trọng: Chặn gây sắp xếp nhầm
                />
            </th>
        );
    };

    const handleExportExcel = async () => {
        const exportData = data.map(item => {
            if (activeTab === 'by_supplier') {
                return {
                    'Mã NCC': item.supplier_code,
                    'Nhà cung cấp': item.supplier,
                    'Doanh số NCC': item.sales_value,
                    'Giá trị Tồn': item.total_inventory_value,
                    'SL Tồn': item.stock_quantity,
                    'Tổng mã': item.sku_count,
                    'Mã cần nhập': item.sku_suggested_count,
                    'SL Đề xuất Nhập': item.total_suggested,
                    'Giá trị cần nhập': item.suggested_value,
                    'Công nợ': item.debt
                };
            }
            return {
                'Mã SP': item.product_code,
                'Sản phẩm': item.product_name,
                'Tồn kho': item.stock_quantity,
                'Giá trị Tồn': item.inventory_value,
                'Bán/D': item.velocity_per_day,
                'Ngày an toàn': item.days_of_inventory,
                'Cần nhập': item.suggested_reorder,
                'Nhà cung cấp': item.supplier,
                'Chu kỳ': item.sales_cycle
            };
        });

        await exportToExcelWithStyles([{
            sheetName: activeTab === 'by_supplier' ? 'Nha Cung Cap' : 'San Pham',
            data: exportData
        }], `Bao_cao_ton_kho_${new Date().toISOString().split('T')[0]}`);
    };

    const [groupBy, setGroupBy] = useState('none');
    const [groupSortBy, setGroupSortBy] = useState('name'); // 'name', 'value', 'size', 'urgency'

    const totals = useMemo(() => {
        const res = {
            inventory_value: 0,
            stock_quantity: 0,
            sales_value: 0,
            suggested_value: 0,
            total_suggested: 0,
            debt: 0,
            sku_count: 0,
            sku_suggested_count: 0,
            suggested_sales_value: 0,
            velocity: 0
        };
        data?.forEach(item => {
            res.inventory_value += (parseFloat(item.inventory_value) || parseFloat(item.total_inventory_value) || 0);
            res.stock_quantity += (parseFloat(item.stock_quantity) || 0);
            res.sales_value += (parseFloat(item.sales_value) || 0);
            res.suggested_value += (parseFloat(item.suggested_value) || 0);
            res.total_suggested += (parseFloat(item.total_suggested) || parseFloat(item.suggested_reorder) || 0);
            res.debt += (parseFloat(item.debt) || parseFloat(item.supplier_debt) || 0);
            res.sku_count += (parseFloat(item.sku_count) || 0);
            res.sku_suggested_count += (parseFloat(item.sku_suggested_count) || 0);
            res.suggested_sales_value += (parseFloat(item.suggested_sales_value) || 0);
            res.velocity += (parseFloat(item.velocity_per_day) || 0);
        });
        return res;
    }, [data]);

    const groupedData = useMemo(() => {
        if (groupBy === 'none') return data;
        const groups = {};
        
        // 1. Phân nhóm
        data?.forEach(item => {
            let key = item[groupBy] || 'Khác';
            if (groupBy === 'category') key = item.category_name || 'Chưa phân loại';
            if (!groups[key]) groups[key] = { items: [], totalValue: 0, totalSuggested: 0 };
            
            groups[key].items.push(item);
            groups[key].totalValue += (parseFloat(item.inventory_value) || parseFloat(item.total_inventory_value) || 0);
            groups[key].totalSuggested += (parseFloat(item.total_suggested) || parseFloat(item.suggested_reorder) || 0);
        });

        // 2. Sắp xếp các Key (Nhóm)
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            // Trường hợp đặc biệt: Mức khẩn cấp (Khẩn -> Lưu ý -> An toàn)
            if (groupBy === 'urgency' && groupSortBy === 'urgency') {
                const order = { high: 1, warning: 2, normal: 3 };
                return (order[a] || 99) - (order[b] || 99);
            }

            if (groupSortBy === 'value') {
                return groups[b].totalValue - groups[a].totalValue;
            }
            if (groupSortBy === 'suggested') {
                return groups[b].totalSuggested - groups[a].totalSuggested;
            }
            if (groupSortBy === 'size') {
                return groups[b].items.length - groups[a].items.length;
            }
            // Mặc định sắp xếp theo tên
            return a.localeCompare(b);
        });

        // 3. Trả về object đã sắp xếp (thực tế là map lại để render)
        const ordered = {};
        sortedKeys.forEach(k => { ordered[k] = groups[k].items; });
        return ordered;
    }, [data, groupBy, groupSortBy]);

    const renderRows = (items) => items.map((row, idx) => {
        const rowId = activeTab === 'by_supplier' ? row.supplier_code : row.product_code;
        const isSelected = selectedIds.includes(rowId);

        if (activeTab === 'by_supplier') {
            return (
                <tr
                    key={rowId}
                    className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    onClick={() => onItemClick('supplier', row.supplier_code)}
                >
                    <td className={`px-4 py-3 sticky left-0 z-10 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white group-hover:bg-slate-50'}`} onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(rowId)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                    </td>
                    {!hiddenColumns.includes('supplier_name') && (
                        <td className="px-4 py-3 font-bold text-xs uppercase tracking-tight text-slate-800 sticky left-12 z-10 bg-inherit">
                            {row.supplier}
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{row.supplier_code}</p>
                        </td>
                    )}
                    {!hiddenColumns.includes('sales_value') && (
                        <td className="px-4 py-3 text-right">
                            <span className="font-bold text-emerald-600">{formatNum(row.sales_value)}</span>
                        </td>
                    )}
                    {!hiddenColumns.includes('suggested_sales_value') && (
                        <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${row.suggested_sales_value > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                {row.suggested_sales_value > 0 ? formatNum(row.suggested_sales_value) : '-'}
                            </span>
                        </td>
                    )}
                    {!hiddenColumns.includes('total_inventory_value') && (
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNum(row.total_inventory_value)}</td>
                    )}
                    {!hiddenColumns.includes('stock_qty') && (
                        <td className="px-4 py-3 text-right font-semibold text-slate-500">{formatNum(row.stock_quantity)}</td>
                    )}
                    {!hiddenColumns.includes('sku_count') && (
                        <td className="px-4 py-3 text-right">
                            <span className="text-slate-600 font-bold">{formatNum(row.sku_count)}</span>
                        </td>
                    )}
                    {!hiddenColumns.includes('sku_suggested_count') && (
                        <td className="px-4 py-3 text-right">
                            <span className={`font-black ${row.sku_suggested_count > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                                {row.sku_suggested_count > 0 ? formatNum(row.sku_suggested_count) : '-'}
                            </span>
                        </td>
                    )}
                    {!hiddenColumns.includes('total_suggested') && (
                        <td className="px-4 py-3 text-right font-bold text-blue-600">{formatNum(row.total_suggested)}</td>
                    )}
                    {!hiddenColumns.includes('suggested_value') && (
                        <td className="px-4 py-3 text-right font-bold text-rose-500">{formatNum(row.suggested_value)}</td>
                    )}
                    {!hiddenColumns.includes('debt') && (
                        <td className="px-4 py-3 text-right font-bold text-rose-500">{formatNum(row.debt)}</td>
                    )}
                </tr>
            );
        }

        return (
            <tr
                key={rowId}
                className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                onClick={() => onItemClick('product', row.product_code)}
            >
                <td className={`px-4 py-3 sticky left-0 z-10 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white group-hover:bg-slate-50'}`} onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(rowId)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                </td>

                {!hiddenColumns.includes('product') && (
                    <td className={`px-4 py-3 sticky left-12 z-10 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white group-hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getUrgencyColor(row.urgency)}`} title={row.urgency}></div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-slate-800 truncate" title={row.product_name}>{row.product_name}</span>
                                <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{row.product_code}</span>
                            </div>
                        </div>
                    </td>
                )}

                {!hiddenColumns.includes('stock') && <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNum(row.stock_quantity)}</td>}
                {!hiddenColumns.includes('value') && <td className="px-4 py-3 text-right font-semibold text-slate-500">{formatNum(row.inventory_value)}</td>}
                {!hiddenColumns.includes('velocity') && (
                    <td className="px-4 py-3 text-right">
                        <div className="flex flex-col">
                            <span className="font-bold text-blue-600">{row.velocity_per_day}</span>
                        </div>
                    </td>
                )}
                {!hiddenColumns.includes('days') && (
                    <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${row.days_of_inventory < 7 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {row.days_of_inventory > 900 ? 'DEAD' : `${formatNum(row.days_of_inventory)} D`}
                        </span>
                    </td>
                )}
                {!hiddenColumns.includes('suggested') && (
                    <td className="px-4 py-3 text-right bg-rose-50/20">
                        <span className="text-base font-bold text-rose-600">{row.suggested_reorder > 0 ? formatNum(row.suggested_reorder) : '-'}</span>
                    </td>
                )}
                {!hiddenColumns.includes('supplier') && (
                    <td className="px-4 py-3">
                        <div className="flex flex-col">
                            <button
                                onClick={(e) => { e.stopPropagation(); onItemClick('supplier', row.supplier_code); }}
                                className="max-w-[150px] truncate text-xs font-bold uppercase tracking-tight text-slate-500 hover:text-blue-600 transition-colors text-left"
                            >
                                {row.supplier || 'Unknown'}
                            </button>
                        </div>
                    </td>
                )}
                {!hiddenColumns.includes('cycle') && (
                    <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${row.sales_cycle === 'fast' ? 'bg-orange-500 text-white' :
                            row.sales_cycle === 'medium' ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                            }`}>
                            {row.sales_cycle}
                        </span>
                    </td>
                )}
                {renderRowActions && (
                    <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                        {renderRowActions(row)}
                    </td>
                )}
            </tr>
        );
    });

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs h-64 flex items-center justify-center">Không có dữ liệu phù hợp...</div>;
    }

    return (
        <div className="flex flex-col relative text-slate-800">
            {/* 1. Thanh công cụ Header */}
            <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-slate-200">
                <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nhóm theo:</span>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="none">Không nhóm</option>
                        <option value="category">Nhóm Sản phẩm</option>
                        <option value="sales_cycle">Chu kỳ bán</option>
                        <option value="urgency">Mức khẩn cấp</option>
                    </select>

                    {groupBy !== 'none' && (
                        <>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Sắp xếp nhóm:</span>
                            <select
                                value={groupSortBy}
                                onChange={(e) => setGroupSortBy(e.target.value)}
                                className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="name">Theo tên nhóm</option>
                                <option value="value">Theo giá trị tồn</option>
                                <option value="size">Theo số lượng mã</option>
                                <option value="suggested">Theo lượng cần nhập</option>
                                {groupBy === 'urgency' && <option value="urgency">Theo mức ưu tiên</option>}
                            </select>
                        </>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
                    >
                        <UI.Icon name="sliders" className="w-3.5 h-3.5" />
                        Tuỳ chỉnh cột
                    </button>
                    {isColMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[110] p-2">
                            <p className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase border-b mb-1">Ẩn / Hiện cột</p>
                            {columns.map(col => (
                                <label key={col.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenColumns.includes(col.id)}
                                        onChange={() => toggleColumn(col.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                    />
                                    <span className="text-xs font-bold text-slate-600">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Phân trang trên */}
            {renderPagination('top')}

            {/* 3. Thanh cuộn giả phía trên (Đồng bộ cuộn ngang) */}
            <div
                ref={topScrollRef}
                className="overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-white sticky top-[48px] z-[50]"
                style={{ height: '8px' }}
            >
                <div style={{ width: `${tableWidth}px`, height: '1px' }} />
            </div>

            {/* 4. Vùng nội dung bảng chính */}
            <div ref={mainScrollRef} className="overflow-x-auto min-h-[400px]">
                <table ref={tableRef} className="w-full text-left text-sm whitespace-nowrap table-fixed border-separate border-spacing-0">
                    <colgroup>
                        <col className="w-12" /> {/* Checkbox */}
                        {visibleColumns.map(col => (
                            <col 
                                key={col.id} 
                                style={{ width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : (typeof col.width === 'number' ? `${col.width}px` : col.width) }} 
                            />
                        ))}
                    </colgroup>
                    
                    <thead>
                        {/* HÀNG TỔNG CỘNG CỐ ĐỊNH */}
                        <tr className="bg-slate-900 text-white font-black h-12 sticky top-0 z-[60] shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                            <td className="px-4 py-3 sticky left-0 bg-slate-900 border-r border-slate-700 z-[61]"></td>
                            {activeTab === 'by_supplier' ? (
                                <>
                                    {!hiddenColumns.includes('supplier_name') && (
                                        <td className="px-4 py-3 sticky left-12 bg-slate-900 text-left text-[10px] uppercase tracking-widest border-r border-slate-700 z-[61]">TỔNG CỘNG</td>
                                    )}
                                    {!hiddenColumns.includes('sales_value') && <td className="px-4 py-3 text-right text-emerald-400 font-mono">{formatNum(totals.sales_value)}</td>}
                                    {!hiddenColumns.includes('suggested_sales_value') && <td className="px-4 py-3 text-right font-mono text-amber-400">{formatNum(totals.suggested_sales_value)}</td>}
                                    {!hiddenColumns.includes('total_inventory_value') && <td className="px-4 py-3 text-right font-mono">{formatNum(totals.inventory_value)}</td>}
                                    {!hiddenColumns.includes('stock_qty') && <td className="px-4 py-3 text-right font-mono">{formatNum(totals.stock_quantity)}</td>}
                                    {!hiddenColumns.includes('sku_count') && <td className="px-4 py-3 text-right font-mono">{formatNum(totals.sku_count)}</td>}
                                    {!hiddenColumns.includes('sku_suggested_count') && <td className="px-4 py-3 text-right font-mono text-orange-400">{formatNum(totals.sku_suggested_count)}</td>}
                                    {!hiddenColumns.includes('total_suggested') && <td className="px-4 py-3 text-right font-mono">{formatNum(totals.total_suggested)}</td>}
                                    {!hiddenColumns.includes('suggested_value') && <td className="px-4 py-3 text-right font-mono text-rose-400">{formatNum(totals.suggested_value)}</td>}
                                    {!hiddenColumns.includes('debt') && <td className="px-4 py-3 text-right font-mono text-rose-500">{formatNum(totals.debt)}</td>}
                                </>
                            ) : (
                                <>
                                    {!hiddenColumns.includes('product') && (
                                        <td className="px-4 py-3 sticky left-12 bg-slate-900 text-left text-[10px] uppercase tracking-widest border-r border-slate-700 z-[61]">TỔNG CỘNG</td>
                                    )}
                                    {!hiddenColumns.includes('stock') && <td className="px-4 py-3 text-right font-mono text-white">{formatNum(totals.stock_quantity)}</td>}
                                    {!hiddenColumns.includes('value') && <td className="px-4 py-3 text-right font-mono text-slate-300">{formatNum(totals.inventory_value)}</td>}
                                    {!hiddenColumns.includes('velocity') && <td className="px-4 py-3 text-right font-mono text-blue-400">{totals.velocity.toFixed(2)}</td>}
                                    {!hiddenColumns.includes('days') && <td className="px-4 py-3 text-right"></td>}
                                    {!hiddenColumns.includes('suggested') && (
                                        <td className="px-4 py-3 text-right font-mono text-rose-500">{formatNum(totals.total_suggested)}</td>
                                    )}
                                    {!hiddenColumns.includes('supplier') && <td className="px-4 py-3"></td>}
                                    {!hiddenColumns.includes('cycle') && <td className="px-4 py-3"></td>}
                                    {renderRowActions && !hiddenColumns.includes('actions') && <td className="px-4 py-3 sticky right-0 bg-slate-900 z-[61]"></td>}
                                </>
                            )}
                        </tr>

                        {/* HÀNG TIÊU ĐỀ CỘT CÓ THỂ SẮP XẾP VÀ CO GIÃN */}
                        <tr className="bg-slate-100 border-b border-slate-300 sticky top-12 z-40 shadow-sm">
                            <th className="px-4 py-4 sticky left-0 bg-slate-100 z-40">
                                <input
                                    type="checkbox"
                                    checked={data.length > 0 && selectedIds.length === data.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>

                            {activeTab === 'by_supplier' ? (
                                <>
                                    {!hiddenColumns.includes('supplier_name') && (
                                        <SortableHeader label="Nhà cung cấp" subtitle="Tên & mã NCC" field="supplier_name" className="sticky left-12 bg-slate-100 z-40 text-left" />
                                    )}
                                    {!hiddenColumns.includes('sales_value') && (
                                        <SortableHeader label="Doanh số" subtitle="DT TỔNG kì này" field="sales_value" className="text-emerald-600" />
                                    )}
                                    {!hiddenColumns.includes('suggested_sales_value') && (
                                        <SortableHeader label="DS mã thiếu" subtitle="DT các mã cần nhập" field="suggested_sales_value" className="text-amber-600" />
                                    )}
                                    {!hiddenColumns.includes('total_inventory_value') && (
                                        <SortableHeader label="Giá trị Tồn" field="total_inventory_value" />
                                    )}
                                    {!hiddenColumns.includes('stock_qty') && (
                                        <SortableHeader label="SL Tồn" field="stock_quantity" />
                                    )}
                                    {!hiddenColumns.includes('sku_count') && (
                                        <SortableHeader label="Tổng mã" field="sku_count" />
                                    )}
                                    {!hiddenColumns.includes('sku_suggested_count') && (
                                        <SortableHeader label="Mã thiếu" field="sku_suggested_count" className="text-orange-500" />
                                    )}
                                    {!hiddenColumns.includes('total_suggested') && (
                                        <SortableHeader label="SL cần nhập" field="total_suggested" />
                                    )}
                                    {!hiddenColumns.includes('suggested_value') && (
                                        <SortableHeader label="Vốn cần nhập" field="suggested_value" className="text-rose-500" />
                                    )}
                                    {!hiddenColumns.includes('debt') && (
                                        <SortableHeader label="Nợ NCC" field="debt" />
                                    )}
                                </>
                            ) : (
                                <>
                                    {!hiddenColumns.includes('product') && (
                                        <SortableHeader label="Sản phẩm" field="product_name" className="sticky left-12 bg-slate-100 z-40 text-left" />
                                    )}
                                    {!hiddenColumns.includes('stock') && <SortableHeader label="Tồn kho" field="stock_quantity" />}
                                    {!hiddenColumns.includes('velocity') && <SortableHeader label="Bán/D" field="velocity_per_day" />}
                                    {!hiddenColumns.includes('value') && <SortableHeader label="Giá trị Tồn" field="inventory_value" />}
                                    {!hiddenColumns.includes('days') && <SortableHeader label="An toàn" field="days_of_inventory" />}
                                    {!hiddenColumns.includes('suggested') && (
                                        <SortableHeader label="Cần nhập" field="suggested_reorder" className="text-rose-600 bg-rose-50/50" />
                                    )}
                                    {!hiddenColumns.includes('supplier') && <SortableHeader label="Nhà cung cấp" field="supplier" className="text-left" />}
                                    {!hiddenColumns.includes('cycle') && <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Chu kỳ</th>}
                                    {renderRowActions && !hiddenColumns.includes('actions') && (
                                        <th className="px-4 py-4 sticky right-0 bg-slate-100 z-40 text-[10px] font-black text-slate-500 uppercase text-center">Thao tác</th>
                                    )}
                                </>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {groupBy === 'none' ? renderRows(data) : Object.keys(groupedData).map(groupKey => (
                            <React.Fragment key={groupKey}>
                                <tr className="bg-slate-50/80 border-y border-slate-200">
                                    <td colSpan={visibleColumns.length + 1} className="px-4 py-2 font-black text-[10px] text-blue-600 uppercase tracking-[0.3em] bg-blue-50/30">
                                        📁 {groupKey} ({groupedData[groupKey].length})
                                    </td>
                                </tr>
                                {renderRows(groupedData[groupKey])}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 5. Phân trang dưới */}
            {renderPagination('bottom')}

            {/* 6. Thanh Action nổi khi chọn nhiều dòng */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl flex items-center p-2 gap-4">
                        <div className="px-3 border-r border-slate-700">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Đã chọn</p>
                            <p className="text-lg font-black text-white">{selectedIds.length}</p>
                        </div>

                        <div className="px-3 border-r border-slate-700 min-w-[120px]">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Tổng Nợ NCC</p>
                            <p className="text-sm font-black text-white">
                                {(() => {
                                    const uniqueSups = new Set();
                                    let debt = 0;
                                    data.forEach(item => {
                                        const isMatch = activeTab === 'by_supplier'
                                            ? selectedIds.includes(item.supplier_code)
                                            : selectedIds.includes(item.product_code);

                                        if (isMatch && !uniqueSups.has(item.supplier_code)) {
                                            uniqueSups.add(item.supplier_code);
                                            debt += (activeTab === 'by_supplier' ? (item.debt || 0) : (item.supplier_debt || 0));
                                        }
                                    });
                                    return formatNum(debt);
                                })()}
                            </p>
                        </div>
                        <div className="flex gap-2 pr-2">
                            <button onClick={handleExportExcel} className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 transition-all">
                                <UI.Icon name="file-text" className="w-4 h-4" />
                                Xuất Excel
                            </button>
                            <button className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 transition-all">
                                <UI.Icon name="shopping-cart" className="w-4 h-4" />
                                + Đơn nháp
                            </button>
                            <button onClick={() => setSelectedIds([])} className="h-10 w-10 flex items-center justify-center bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all">
                                <UI.Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

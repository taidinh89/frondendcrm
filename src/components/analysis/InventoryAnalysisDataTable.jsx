import React, { useState, useMemo } from 'react';
import * as UI from '../ui.jsx';

export const InventoryAnalysisDataTable = ({ data, activeTab, pagination, onItemClick, sortConfig, onSort }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [hiddenColumns, setHiddenColumns] = useState([]);
    const [isColMenuOpen, setIsColMenuOpen] = useState(false);

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs h-64 flex items-center justify-center">Không có dữ liệu phù hợp...</div>;
    }

    const { currentPage, lastPage, total, perPage, onPageChange } = pagination || {};
    const formatNum = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

    const getUrgencyColor = (urgency) => {
        switch (urgency) {
            case 'high': return 'bg-rose-500 text-white';
            case 'warning': return 'bg-amber-400 text-amber-950';
            case 'normal': return 'bg-emerald-500 text-white';
            default: return 'bg-slate-200 text-slate-600';
        }
    };

    const columns = activeTab === 'by_supplier' ? [
        { id: 'supplier_name', label: 'Nhà cung cấp', sticky: true, width: 'min-w-[280px]' },
        { id: 'total_inventory_value', label: 'Giá trị Tồn', align: 'right' },
        { id: 'total_suggested', label: 'Tổng Đề xuất Nhập', align: 'right' },
        { id: 'debt', label: 'Công nợ Phải trả', align: 'right' },
    ] : [
        { id: 'product', label: 'Sản phẩm', sticky: true, width: 'min-w-[320px]' },
        { id: 'stock', label: 'Tồn kho', align: 'right' },
        { id: 'value', label: 'Giá trị Tồn', align: 'right' },
        { id: 'velocity', label: 'Tốc độ/Ngày', align: 'right' },
        { id: 'days', label: 'An toàn', align: 'right' },
        { id: 'suggested', label: 'Gợi ý Nhập', align: 'right', showIf: activeTab === 'low_stock_active' },
        { id: 'supplier', label: 'Nhà cung cấp', align: 'left' },
        { id: 'cycle', label: 'Chu kỳ', align: 'center' },
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

    const SortableHeader = ({ label, field, className }) => {
        const isSorted = sortConfig?.sortBy === field;
        const isAsc = sortConfig?.sortDir === 'asc';
        return (
            <th 
                className={`px-4 py-4 font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors ${className || 'text-slate-500 text-right'}`}
                onClick={() => onSort && onSort(field)}
            >
                <div className={`flex items-center gap-1.5 ${className?.includes('text-left') ? 'justify-start' : 'justify-end'}`}>
                    {label}
                    <span className="flex flex-col gap-0 opacity-70">
                        <UI.Icon name="chevronUp" className={`w-2.5 h-2.5 ${isSorted && isAsc ? 'text-blue-600' : 'text-slate-300'}`} />
                        <UI.Icon name="chevronDown" className={`w-2.5 h-2.5 ${isSorted && !isAsc ? 'text-blue-600' : 'text-slate-300'}`} />
                    </span>
                </div>
            </th>
        );
    };

    const [groupBy, setGroupBy] = useState('none');

    const groupedData = useMemo(() => {
        if (groupBy === 'none') return data;
        const groups = {};
        data.forEach(item => {
            let key = item[groupBy] || 'Khác';
            if (groupBy === 'category') key = item.category_name || 'Chưa phân loại';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }, [data, groupBy]);

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
                    <td className="px-4 py-3 font-bold text-xs uppercase tracking-tight text-slate-800">
                        {row.supplier}
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{row.supplier_code}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNum(row.total_inventory_value)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{formatNum(row.total_suggested)}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-500">{formatNum(row.debt)}</td>
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
                            <span className="text-[10px] text-slate-400 uppercase font-bold">SP/Ngày</span>
                        </div>
                    </td>
                )}
                {!hiddenColumns.includes('days') && (
                    <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${row.days_of_inventory < 7 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                {row.days_of_inventory > 900 ? 'DEAD' : `${formatNum(row.days_of_inventory)} D`}
                            </span>
                        </div>
                    </td>
                )}
                
                {activeTab === 'low_stock_active' && !hiddenColumns.includes('suggested') && (
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
                            {row.supplier_debt > 0 && (
                                <span className="text-[9px] font-bold text-rose-500 mt-0.5">
                                    Nợ: {formatNum(row.supplier_debt)}
                                </span>
                            )}
                        </div>
                    </td>
                )}

                {!hiddenColumns.includes('cycle') && (
                    <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                            row.sales_cycle === 'fast' ? 'bg-orange-500 text-white' : 
                            row.sales_cycle === 'medium' ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                        }`}>
                            {row.sales_cycle}
                        </span>
                    </td>
                )}
            </tr>
        );
    });

    return (
        <div className="flex flex-col relative">
            {/* Header Tool: Column Visibility & Grouping */}
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

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 sticky top-0 z-30 shadow-sm">
                            <th className="px-4 py-4 w-12 sticky left-0 bg-slate-100 z-40">
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
                                        <SortableHeader label="Nhà cung cấp" field="supplier" className="w-[280px] sticky left-12 bg-slate-100 z-40 text-left" />
                                    )}
                                    {!hiddenColumns.includes('total_inventory_value') && <SortableHeader label="Giá trị Tồn" field="total_inventory_value" className="w-36" />}
                                    {!hiddenColumns.includes('total_suggested') && <SortableHeader label="Tổng Đề xuất Nhập" field="total_suggested" className="w-44" />}
                                    {!hiddenColumns.includes('debt') && <SortableHeader label="Công nợ Phải trả" field="debt" className="w-36" />}
                                </>
                            ) : (
                                <>
                                    {!hiddenColumns.includes('product') && (
                                        <SortableHeader label="Sản phẩm" field="product_name" className="w-[320px] sticky left-12 bg-slate-100 z-40 text-left" />
                                    )}
                                    {!hiddenColumns.includes('stock') && <SortableHeader label="Tồn kho" field="stock_quantity" className="w-28" />}
                                    {!hiddenColumns.includes('value') && <SortableHeader label="Giá trị Tồn" field="inventory_value" className="w-36" />}
                                    {!hiddenColumns.includes('velocity') && <SortableHeader label="Bán/D" field="velocity_per_day" className="w-24" />}
                                    {!hiddenColumns.includes('days') && <SortableHeader label="Ngày an toàn" field="days_of_inventory" className="w-28" />}
                                    
                                    {activeTab === 'low_stock_active' && !hiddenColumns.includes('suggested') && (
                                        <SortableHeader label="Cần nhập" field="suggested_reorder" className="w-32 text-rose-600 bg-rose-50/50" />
                                    )}
                                    
                                    {!hiddenColumns.includes('supplier') && <SortableHeader label="Nhà cung cấp" field="supplier" className="w-40 text-left" />}
                                    {!hiddenColumns.includes('cycle') && <th className="px-4 py-4 w-24 text-[10px] font-black text-slate-500 uppercase text-center">Chu kỳ</th>}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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

            {/* Pagination */}
            {pagination && lastPage > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiển thị {formatNum(total)} kết quả</span>
                    <div className="flex gap-2">
                        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[10px] font-black disabled:opacity-50">TRƯỚC</button>
                        <div className="h-8 px-3 flex items-center bg-blue-600 text-white text-[10px] font-black rounded-lg">{currentPage} / {lastPage}</div>
                        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage} className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[10px] font-black disabled:opacity-50">SAU</button>
                    </div>
                </div>
            )}

            {/* Floating Action Bar */}
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
                            <button className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 transition-all">
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

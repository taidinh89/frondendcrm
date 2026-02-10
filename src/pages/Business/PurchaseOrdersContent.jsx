// src/pages/PurchaseOrdersContent.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui.jsx';
import { useV2Paginator } from '../../hooks/useV2Paginator.js';
import { PurchaseOrderDetailModal } from '../../components/Modals/PurchaseOrderDetailModal.jsx';

// --- CẤU HÌNH CỘT MẶC ĐỊNH (Purchase Orders) ---
const DEFAULT_COLUMNS = [
    { key: 'ngay', label: 'Ngày CT', width: 120, visible: true, sortable: true, format: 'date' },
    { key: 'so_phieu', label: 'Số Phiếu', width: 150, visible: true, sortable: true },
    { key: 'ma_khncc', label: 'Mã NCC', width: 120, visible: true, sortable: true },
    { key: 'ten_khncc', label: 'Tên Nhà Cung Cấp', width: 300, visible: true, sortable: true },
    { key: 'tong_cong', label: 'Tổng Tiền', width: 160, visible: true, sortable: false, align: 'right', format: 'currency' },
    { key: 'nguoi_phu_trach', label: 'NV Phụ Trách22', width: 180, visible: true, sortable: true },
    { key: 'hien_trang', label: 'Trạng Thái22', width: 150, visible: true, sortable: true, align: 'center' },
    { key: 'ghi_chu_noi_bo', label: 'Ghi Chú', width: 250, visible: false, sortable: false },
    { key: 'ngay_tao_dau_tien', label: 'Ngày Tạo', width: 160, visible: false, sortable: true, format: 'datetime' },
];

// --- UTILS ---
const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v||0);
const formatDate = (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '';
const formatDateTime = (v) => v ? new Date(v).toLocaleString('vi-VN') : '';

// Components UI
const Input = ({ className, ...props }) => <input className={`px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none ${className}`} {...props} />;

const RawDataModal = ({ data, onClose }) => {
    if(!data) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between p-4 border-b"><h3 className="font-bold">Raw JSON</h3><button onClick={onClose}>&times;</button></div>
                <div className="flex-1 p-4 overflow-auto bg-gray-900"><pre className="text-green-400 text-xs">{JSON.stringify(data,null,2)}</pre></div>
            </div>
        </div>
    );
};

export const PurchaseOrdersContent = () => {
    // State
    const [filters, setFilters] = useState({ search: '', date_from: '', date_to: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'ngay', direction: 'desc' });
    
    // Load Column Config (Key V3 để áp dụng mới)
    const STORAGE_KEY = 'purchase_cols_v3';
    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const merged = [...parsed];
                DEFAULT_COLUMNS.forEach(def => { if (!merged.find(c => c.key === def.key)) merged.push(def); });
                return merged;
            }
        } catch { }
        return DEFAULT_COLUMNS;
    });

    const [showColSettings, setShowColSettings] = useState(false);
    const [viewingRaw, setViewingRaw] = useState(null);
    const [viewingDetailId, setViewingDetailId] = useState(null); // Dùng ID số

    // API Hook
    const { data: orders, isLoading, isFetchingMore, applyFilters, refresh, fetchNextPage } = 
        useV2Paginator('/api/v2/purchase-orders', { ...filters, sort_by: sortConfig.key, sort_direction: sortConfig.direction });

    // Effects
    useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(columns)), [columns]);

    // Handlers
    const handleSortData = (key) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
        setSortConfig({ key, direction });
        applyFilters({ sort_by: key, sort_direction: direction });
    };

    // Logic Cột (Resize, Move, Toggle)
    const handleResizeStart = (e, key) => {
        e.preventDefault(); const startX = e.clientX; 
        const idx = columns.findIndex(c => c.key === key); const startW = columns[idx].width;
        const onMove = (evt) => setColumns(p => p.map((c, i) => i===idx ? {...c, width: Math.max(50, startW + evt.clientX - startX)} : c));
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    };
    const moveColumn = (idx, dir) => {
        const newCols = [...columns];
        if(idx+dir >= 0 && idx+dir < newCols.length) {
            [newCols[idx], newCols[idx+dir]] = [newCols[idx+dir], newCols[idx]];
            setColumns(newCols);
        }
    };
    const toggleColumn = (key) => setColumns(p => p.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    const handleScroll = (e) => {
        if(e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50 && !isFetchingMore && !isLoading) fetchNextPage();
    };

    const SortIcon = ({ colKey }) => sortConfig.key !== colKey ? <span className="text-gray-300 opacity-0 group-hover:opacity-50">↕</span> : <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;

    return (
        <div className="p-4 h-full flex flex-col bg-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-white rounded shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <Input type="date" value={filters.date_from} onChange={e=>setFilters({...filters, date_from: e.target.value})} className="w-36"/>
                    <Input type="date" value={filters.date_to} onChange={e=>setFilters({...filters, date_to: e.target.value})} className="w-36"/>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <Input placeholder="Tìm số phiếu, NCC..." className="w-full" value={filters.search} onChange={e=>setFilters({...filters, search: e.target.value})} onKeyDown={e=>e.key==='Enter'&&applyFilters(filters)}/>
                    <Button variant="primary" onClick={()=>applyFilters(filters)}>Tìm</Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={refresh}>Làm mới</Button>
                    <div className="relative">
                        <Button variant="secondary" onClick={()=>setShowColSettings(!showColSettings)}>⚙️ Cột</Button>
                        {showColSettings && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white border rounded shadow-xl z-50 p-2 max-h-[60vh] overflow-auto">
                                <div className="flex justify-between mb-2 border-b pb-1"><span className="font-bold text-sm">Cấu hình cột</span><button onClick={()=>{setColumns(DEFAULT_COLUMNS);localStorage.removeItem(STORAGE_KEY)}} className="text-red-500 text-xs">Reset</button></div>
                                {columns.map((c,i)=>(
                                    <div key={c.key} className="flex justify-between p-1 hover:bg-gray-50 items-center">
                                        <label className="flex gap-2 text-sm cursor-pointer"><input type="checkbox" checked={c.visible} onChange={()=>toggleColumn(c.key)}/>{c.label}</label>
                                        <div className="flex gap-1"><button onClick={()=>moveCol(i,-1)} disabled={i===0} className="px-1 bg-gray-100 rounded text-xs">↑</button><button onClick={()=>moveCol(i,1)} disabled={i===columns.length-1} className="px-1 bg-gray-100 rounded text-xs">↓</button></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-auto" onScroll={handleScroll}>
                    <table className="w-full border-collapse table-fixed" style={{minWidth: 'max-content'}}>
                        <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="w-[100px] p-2 border-r bg-gray-100 sticky left-0 z-30 text-center text-xs font-bold uppercase text-gray-600 shadow-sm">Thao tác</th>
                                {columns.filter(c=>c.visible).map(col=>(
                                    <th key={col.key} className="border-r bg-gray-100 relative group select-none hover:bg-gray-200 transition-colors" style={{width: col.width}}>
                                        <div className={`flex items-center p-2 text-xs font-bold uppercase cursor-pointer h-full ${col.align==='right'?'justify-end':col.align==='center'?'justify-center':'justify-start'}`} onClick={()=>col.sortable&&handleSortData(col.key)}>
                                            {col.label} {col.sortable && <SortIcon colKey={col.key} />}
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 hover:bg-blue-400 cursor-col-resize z-40 opacity-0 hover:opacity-100" onMouseDown={e=>handleResizeStart(e,col.key)}/>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading && orders.length===0 ? <tr><td colSpan={100} className="p-10 text-center">Đang tải...</td></tr> : orders.map(row => (
                                <tr key={row.id} className="hover:bg-blue-50 group">
                                    {/* Action Column */}
                                    <td className="p-2 border-r bg-white group-hover:bg-blue-50 sticky left-0 z-10 text-center shadow-sm">
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => setViewingDetailId(row.id)} // <--- QUAN TRỌNG: Dùng row.id (Logic Cũ)
                                                className="text-blue-600 text-xs border px-2 py-0.5 rounded bg-white hover:bg-blue-50"
                                            >
                                                Xem
                                            </button>
                                            <button onClick={()=>setViewingRaw(row)} className="text-gray-500 text-xs border px-1 rounded bg-white hover:text-black">{`{}`}</button>
                                        </div>
                                    </td>
                                    {/* Data Columns */}
                                    {columns.filter(c=>c.visible).map(col=>{
                                        let val=row[col.key];
                                        if(col.format==='currency') val=formatCurrency(val); else if(col.format==='date') val=formatDate(val); else if(col.format==='datetime') val=formatDateTime(val);
                                        return (
                                            <td key={col.key} className="p-2 border-r text-sm whitespace-nowrap overflow-hidden text-gray-700" style={{width: col.width, maxWidth: col.width, textAlign: col.align||'left'}} title={val}>
                                                {val}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                            {isFetchingMore && <tr><td colSpan={100} className="p-2 text-center text-sm bg-gray-50 italic">Đang tải thêm...</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 p-2 border-t text-xs text-gray-500">Đã hiển thị: <b>{orders.length}</b> dòng</div>
            </div>

            {/* Modals */}
            {viewingDetailId && (
                <PurchaseOrderDetailModal 
                    orderIdentifier={viewingDetailId} // Truyền ID số
                    onClose={() => setViewingDetailId(null)} 
                />
            )}
            {viewingRaw && <RawDataModal data={viewingRaw} onClose={() => setViewingRaw(null)} />}
        </div>
    );
};
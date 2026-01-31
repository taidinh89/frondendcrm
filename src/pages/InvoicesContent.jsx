import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx';
import { exportToExcel } from '../utils/exportUtils.js';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { InvoiceModal } from '../components/InvoiceModal';

const API = '/api/v1/invoices';
const SYNC_API = '/api/v1/sync-statuses';
const SYNC_TRIGGER = '/api/v1/sync/trigger';
const STORAGE_KEY = 'inv_layout_v100'; // Bản chuẩn hóa cuối cùng

// Thứ tự cột chuẩn theo yêu cầu: Ngày -> Loại -> Đối tác -> Tổng tiền -> Actions -> Gốc -> Số -> Ký hiệu -> MISA
const DEFAULTS = [
    { id: 'date', label: 'Ngày HĐ', width: 120 },
    { id: 'type', label: 'Loại', width: 100 },
    { id: 'partner', label: 'Đối tác (Bấm để xem nhanh HĐ)', width: 450 },
    { id: 'amount', label: 'Tổng tiền', width: 150 },
    { id: 'actions', label: 'Actions', width: 160 },
    { id: 'original', label: 'File Gốc', width: 90 },
    { id: 'number', label: 'Số HĐ', width: 100 },
    { id: 'series', label: 'Ký hiệu', width: 110 },
    { id: 'misa', label: 'Trạng thái MISA', width: 130 },
];

export const InvoicesContent = () => {
    const [columns, setColumns] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULTS);
    const [invoices, setInvoices] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [dates, setDates] = useState({
        start: new Date(Date.now() - 2592000000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [types, setTypes] = useState({ purchase: true, sale: true, cash_register: true, purchase_cash_register: true });
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [syncData, setSyncData] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [modal, setModal] = useState({ open: false, data: null, mode: 'details', html: null, loading: false });
    const [formData, setFormData] = useState({ misa_status: '', notes: '' });

    useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(columns)), [columns]);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        const t = Object.keys(types).filter(k => types[k]).map(k => k === 'cash_register' ? 'sale_cash_register' : k).join(',');
        try {
            const res = await axios.get(API, { params: { page, search: query || null, date_from: dates.start, date_to: dates.end, invoice_type: t || 'none' } });
            setInvoices(res.data.data || []);
            setPagination(res.data);
            setSelectedInvoices([]);
        } finally { setLoading(false); }
    }, [page, query, dates, types]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const fetchSync = useCallback(async () => {
        try {
            const res = await axios.get(SYNC_API);
            setSyncData(res.data.reduce((acc, s) => ({ ...acc, [s.job_name]: s }), {}));
        } catch (e) { }
    }, []);
    useEffect(() => { fetchSync(); }, [fetchSync]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await axios.post(SYNC_TRIGGER, {}); // Gửi lệnh đồng bộ mới nhất
            setTimeout(fetchSync, 2000);
        } catch (e) { alert(e.response?.data?.message || "Lỗi kết nối"); }
        finally { setIsSyncing(false); }
    };

    const handleQuickDate = (range) => {
        const now = new Date();
        let start = new Date();
        if (range === 'today') start = now;
        else if (range === 'yesterday') start.setDate(now.getDate() - 1);
        else if (range === '30days') start.setDate(now.getDate() - 30);
        else if (range === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (range === 'year') start = new Date(now.getFullYear(), 0, 1);
        setDates({ start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] });
    };

    const [dragIdx, setDragIdx] = useState(null);
    const onResize = (e, id, w) => {
        e.preventDefault();
        const startX = e.clientX;
        const move = (me) => setColumns(prev => prev.map(c => c.id === id ? { ...c, width: Math.max(60, w + (me.clientX - startX)) } : c));
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    };

    const handleViewHtml = async (inv) => {
        setModal({ open: true, data: inv, mode: 'html', html: null, loading: true });
        try {
            const res = await axios.get(`${API}/${inv.invoice_uuid}/html`);
            setModal(m => ({ ...m, html: res.data.html, loading: false }));
        } catch (e) { setModal(m => ({ ...m, html: '<p class="p-4 text-red-500 text-center font-bold">Lỗi tải dữ liệu từ CQT.</p>', loading: false })); }
    };

    const renderCell = (inv, id) => {
        const d = inv.data || {};
        const styles = { purchase: 'bg-purple-100 text-purple-800', sale: 'bg-blue-100 text-blue-800', sale_cash_register: 'bg-teal-100 text-teal-800', purchase_cash_register: 'bg-orange-100 text-orange-800' };
        const labels = { purchase: 'Mua vào', sale: 'Bán ra', sale_cash_register: 'MTT Bán', purchase_cash_register: 'MTT Mua' };
        switch (id) {
            case 'date': return <span className="text-gray-600 font-medium">{new Date(d.tdlap || inv.invoice_date).toLocaleDateString('vi-VN')}</span>;
            case 'type': return <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${styles[inv.invoice_type]}`}>{labels[inv.invoice_type]}</span>;
            case 'partner':
                const isP = inv.invoice_type?.includes('purchase');
                const pName = isP
                    ? (inv.data?.nbten || inv.seller_name || inv.buyer_name_display)
                    : (inv.data?.nmten || inv.buyer_name || inv.buyer_name_display || 'Khách lẻ');
                return <div className="truncate font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-[14px]" onClick={(e) => { e.stopPropagation(); handleViewHtml(inv) }} title={pName}>{pName}</div>;
            case 'amount': return <div className="text-right font-bold text-gray-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(inv.total_amount || 0)}</div>;
            case 'actions': return (
                <div className="flex space-x-1 justify-center">
                    <UI.Button variant="secondary" size="xs" onClick={(e) => { e.stopPropagation(); handleViewHtml(inv) }}><UI.Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" className="w-4 h-4" /></UI.Button>
                    <UI.Button variant="secondary" size="xs" onClick={(e) => { e.stopPropagation(); window.open(`${API}/${inv.invoice_uuid}/download-zip`) }}><UI.Icon path="M3 17.25v3a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 20.25v-3M8.625 10.5l3.375 3.375L15.375 10.5M12 2.25v11.625" className="w-4 h-4" /></UI.Button>
                    <UI.Button variant="secondary" size="xs" onClick={(e) => { e.stopPropagation(); window.open(`${API}/${inv.invoice_uuid}/download-detail-json`) }}><UI.Icon path="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" className="w-4 h-4" /></UI.Button>
                    <UI.Button variant="secondary" size="xs" onClick={(e) => { e.stopPropagation(); setFormData({ misa_status: inv.misa_status || '', notes: inv.notes || '' }); setModal({ open: true, data: inv, mode: 'details' }) }}><UI.Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className="w-4 h-4" /></UI.Button>
                </div>
            );
            case 'original': return <div className="text-center"><UI.Button variant="secondary" size="xs" onClick={(e) => { e.stopPropagation(); window.open(`${API}/${inv.invoice_uuid}/download-original`) }} disabled={!inv.original_invoice_path}><UI.Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4" /></UI.Button></div>;
            case 'misa': return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.misa_status === 'Đã nhập' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.misa_status || 'Chưa nhập'}</span>;
            case 'number': return d.shdon || inv.invoice_number || '-';
            case 'series': return d.khhdon || inv.invoice_series || '-';
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full p-6 bg-gray-50 font-sans overflow-hidden">
            {/* Sync Bar - Gọn gàng */}
            <div className="mb-3 border rounded-xl bg-white p-2 shadow-sm scale-95 origin-left">
                <SyncStatusBar syncStatuses={syncData} isSyncing={isSyncing} onRefresh={fetchSync} onManualSync={handleManualSync} />
            </div>

            {/* Toolbar - Nới rộng diện tích */}
            <div className="mb-4 flex flex-wrap gap-3 items-center">
                <div className="flex bg-white p-1 border rounded-lg shadow-sm">
                    {['purchase', 'sale', 'cash_register', 'purchase_cash_register'].map(k => (
                        <button key={k} onClick={() => { setTypes(p => ({ ...p, [k]: !p[k] })); setPage(1) }} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${types[k] ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                            {k === 'purchase' ? 'MUA' : k === 'sale' ? 'BÁN' : k === 'cash_register' ? 'MTT BÁN' : 'MTT MUA'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 border rounded-lg shadow-sm">
                    <select onChange={(e) => handleQuickDate(e.target.value)} className="text-[13px] font-semibold outline-none cursor-pointer">
                        <option value="">Chọn nhanh ngày...</option>
                        <option value="today">Hôm nay</option><option value="yesterday">Hôm qua</option><option value="30days">30 ngày qua</option><option value="month">Tháng này</option><option value="year">Năm nay</option>
                    </select>
                    <div className="h-5 w-px bg-gray-200 mx-2"></div>
                    <input type="date" value={dates.start} onChange={e => setDates(p => ({ ...p, start: e.target.value }))} className="text-[13px] outline-none" />
                    <span className="text-gray-400">→</span>
                    <input type="date" value={dates.end} onChange={e => setDates(p => ({ ...p, end: e.target.value }))} className="text-[13px] outline-none" />
                </div>

                <div className="flex-1 min-w-[200px] max-w-[350px] relative group">
                    <input type="text" placeholder="Tìm số HĐ, MST, Đối tác..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setQuery(search), setPage(1))} className="w-full text-[13px] pl-4 pr-12 py-2 border rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <button onClick={() => { setQuery(search); setPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 font-black text-[11px] hover:bg-blue-50 px-2 py-1 rounded">TÌM</button>
                </div>

                <div className="flex gap-2 ml-auto">
                    <UI.Button variant="secondary" onClick={() => setIsFilterOpen(true)} className="rounded-lg shadow-sm"><UI.Icon path="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" className="w-4 h-4 mr-2" />Lọc</UI.Button>
                    <UI.Button variant="secondary" onClick={() => exportToExcel(invoices, 'DSHD_QVC')} className="rounded-lg shadow-sm"><UI.Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-2" />Excel</UI.Button>
                </div>
            </div>

            {/* Hiển thị tổng tiền lọc */}
            {pagination?.filtered_total_amount > 0 && (
                <div className="mb-3 flex justify-end px-2">
                    <span className="text-gray-500 text-sm">Tổng tiền (dữ liệu lọc):</span>
                    <span className="ml-2 font-bold text-blue-700 text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pagination.filtered_total_amount)}</span>
                </div>
            )}

            <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="min-w-full table-fixed divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0 z-30 shadow-sm">
                            <tr>
                                <th className="w-12 px-4 py-3 bg-gray-100 border-r border-gray-200"><UI.Checkbox checked={invoices.length > 0 && selectedInvoices.length === invoices.length} onChange={e => setSelectedInvoices(e.target.checked ? invoices.map(i => i.invoice_uuid) : [])} /></th>
                                {columns.map((c, i) => (
                                    <th key={c.id} style={{ width: c.width }} className="relative px-3 py-4 text-left text-[12px] font-semibold text-gray-600 border-r border-gray-200 group select-none transition-colors" draggable onDragStart={() => setDragIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIdx === null || dragIdx === i) return; const n = [...columns]; n.splice(i, 0, n.splice(dragIdx, 1)[0]); setColumns(n); setDragIdx(null); }}>
                                        <div className="flex items-center gap-1 cursor-move uppercase tracking-tighter">{c.label} <UI.Icon path="M8.25 15L12 18.75 15.75 15m0-6L12 5.25 8.25 9" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                        <div onMouseDown={e => onResize(e, c.id, c.width)} className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 z-40 transition-all" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={columns.length + 1} className="p-20 text-center text-sm text-blue-600 font-bold italic animate-pulse">Đang tải dữ liệu...</td></tr> : invoices.map(inv => (
                                <tr key={inv.invoice_uuid} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => handleOpenModal(inv)}>
                                    <td className="px-4 py-3 border-r border-gray-100 text-center" onClick={e => e.stopPropagation()}><UI.Checkbox checked={selectedInvoices.includes(inv.invoice_uuid)} onChange={e => setSelectedInvoices(p => e.target.checked ? [...p, inv.invoice_uuid] : p.filter(id => id !== inv.invoice_uuid))} /></td>
                                    {columns.map(c => <td key={c.id} className="px-3 py-3 border-r border-gray-50 text-[13px] whitespace-nowrap overflow-hidden">{renderCell(inv, c.id)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <UI.Pagination pagination={pagination} onPageChange={setPage} />
                </div>
            </div>
            <InvoiceModal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} selectedInvoice={modal.data} modalFormData={formData} setModalFormData={setFormData} modalViewMode={modal.mode} setModalViewMode={v => setModal({ ...modal, mode: v })} invoiceHtml={modal.html} isHtmlLoading={modal.loading} handleUpdateInvoice={fetchInvoices} handleFetchInvoiceHtml={handleViewHtml} />
        </div>
    );
};
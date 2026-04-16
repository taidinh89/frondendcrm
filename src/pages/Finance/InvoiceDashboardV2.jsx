import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../../components/ui.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { InvoiceModal } from '../../components/modals/InvoiceModal';
import { PartnerAnalysisModalV2 } from '../../components/modals/PartnerAnalysisModalV2';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal';

const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];


// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const yearStart = () => `${new Date().getFullYear()}-01-01`;

const DATE_PRESETS = [
    { label: '7 ngày', start: daysAgo(6), end: today() },
    { label: 'Tháng này', start: monthStart(), end: today() },
    { label: '30 ngày', start: daysAgo(29), end: today() },
    { label: 'Năm nay', start: yearStart(), end: today() },
];

const TYPE_LABELS = {
    sale: 'Bán ra',
    purchase: 'Mua vào',
    sale_cash_register: 'Bán MTT',
    purchase_cash_register: 'Mua MTT',
};

const TYPE_COLORS = {
    sale: 'bg-blue-50 border-blue-200 text-blue-700',
    purchase: 'bg-purple-50 border-purple-200 text-purple-700',
    sale_cash_register: 'bg-teal-50 border-teal-200 text-teal-700',
    purchase_cash_register: 'bg-pink-50 border-pink-200 text-pink-700',
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ toasts, remove }) => (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold animate-slide-up max-w-sm
                ${t.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
                  t.type === 'error'   ? 'bg-rose-600 text-white border-rose-500' :
                                         'bg-slate-800 text-white border-slate-700'}`}>
                <span className="flex-1">{t.msg}</span>
                <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 text-lg leading-none mt-0.5">×</button>
            </div>
        ))}
    </div>
);

const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const add = useCallback((msg, type = 'info', ms = 5000) => {
        const id = Date.now();
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms);
    }, []);
    const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
    return { toasts, toast: add, removeToast: remove };
};

// ─── SYNC RESULT MODAL ───────────────────────────────────────────────────────
const SyncResultModal = ({ result, onClose }) => {
    if (!result) return null;
    return (
        <UI.Modal isOpen={true} onClose={onClose} title="Kết quả đồng bộ V2" maxWidthClass="max-w-lg">
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Đã xử lý', val: result.processed, color: 'text-slate-700' },
                        { label: 'Thành công', val: result.success, color: 'text-emerald-600' },
                        { label: 'Thất bại', val: result.failed, color: 'text-rose-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-2xl p-4 text-center border">
                            <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
                {result.errors?.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 max-h-48 overflow-y-auto">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">Chi tiết lỗi</div>
                        <div className="space-y-1.5">
                            {result.errors.map((e, i) => (
                                <div key={i} className="text-xs text-rose-700 font-medium">
                                    <span className="font-black">#{e.invoice_number}</span> — {e.reason}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-colors">
                    Đóng
                </button>
            </div>
        </UI.Modal>
    );
};

// ─── SKELETON ────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;

const KpiSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_,i) => (
            <div key={i} className="p-6 rounded-[2rem] bg-slate-100 animate-pulse h-32" />
        ))}
    </div>
);

const TableSkeleton = () => (
    <tbody>
        {[...Array(8)].map((_,i) => (
            <tr key={i} className="border-b border-slate-50">
                {[100,90,80,350,120,100,140,80].map((w,j) => (
                    <td key={j} className="px-6 py-4" style={{ width: w }}>
                        <Skeleton className="h-4 w-full" />
                    </td>
                ))}
            </tr>
        ))}
    </tbody>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const InvoiceDashboardV2 = () => {
    // --- MAPPING HELPERS ---
    const mapStats = (raw) => {
        const d = raw || {};
        return {
            kpi: {
                total_sale: Number(d.kpi?.total_sale || 0),
                total_purchase: Number(d.kpi?.total_purchase || 0),
                net_revenue: Number(d.kpi?.net_revenue || 0),
                count_sale: Number(d.kpi?.count_sale || 0),
                count_purchase: Number(d.kpi?.count_purchase || 0),
            },
            chart: (d.chart || []).map(c => ({
                date: c.date,
                sale: Number(c.sale || 0),
                purchase: Number(c.purchase || 0),
                count: Number(c.count || 0)
            })),
            top_items: (d.top_items || []).map(i => ({
                product_name: i.product_name || 'Mặt hàng không tên',
                product_code: i.product_code || '',
                revenue: Number(i.revenue || 0),
                quantity: Number(i.quantity || 0)
            })),
            top_providers: (d.top_providers || []).map(p => ({
                name: p.name || 'N/A',
                tax_code: p.tax_code,
                amount: Number(p.amount || 0)
            })),
            top_customers: (d.top_customers || []).map(c => ({
                name: c.name || 'N/A',
                tax_code: c.tax_code,
                amount: Number(c.amount || 0)
            })),
            category_pie: (d.category_pie || [])
        };
    };

    // This function is designed to normalize various API response structures
    // into a consistent { data: [], pagination: {} } format.
    // It accounts for potential Axios interceptors that might flatten the response.
    const extractPayload = (axiosResponse) => {
        // console.group('[extractPayload]');
        if (!axiosResponse || !axiosResponse.data) {
            console.warn('[extractPayload] No axiosResponse or data received.');
            // console.groupEnd();
            return { data: [], pagination: null };
        }

        const data = axiosResponse.data;
        
        // --- CASE 1: Interceptor-unpacked structure (Standard for this app) ---
        
        // A. List structure with pagination metadata
        if (Array.isArray(data) && data._pagination) {
            // console.log('[extractPayload] Detected unpacked array with _pagination.');
            // console.groupEnd();
            return { data: data, pagination: data._pagination };
        }

        // B. Statistics structure (Object containing kpi)
        // Note: The interceptor might have already discarded 'status' and 'message'
        if (typeof data === 'object' && data !== null && (data.kpi || data.chart)) {
            // console.log('[extractPayload] Detected unpacked statistics object.');
            // console.groupEnd();
            return { data: data, pagination: null };
        }

        // --- CASE 2: Raw API Envelope (Interceptor not active or bypass) ---
        
        if (data.status === 'success' || data.success === true) {
            // Unpacked or partially packed data field
            const payload = data.data || data;
            const pagination = data.pagination || (data.data && data.data._pagination);

            if (Array.isArray(payload)) {
                // console.log('[extractPayload] Detected standard enveloped array.');
                // console.groupEnd();
                return { data: payload, pagination: pagination || null };
            }
            
            if (typeof payload === 'object' && payload !== null) {
                // console.log('[extractPayload] Detected standard enveloped object.');
                // console.groupEnd();
                return { data: payload, pagination: pagination || null };
            }
        }

        // --- CASE 3: Plain Array (Fallback) ---
        if (Array.isArray(data)) {
            // console.warn('[extractPayload] Detected plain array without metadata.');
            // console.groupEnd();
            return { data: data, pagination: null };
        }

        // Fallback for any other structure
        console.warn('[extractPayload] Unexpected structure:', data);
        // console.groupEnd();
        
        // If data is an object, try returning it anyway as it might be what the component expects
        if (typeof data === 'object' && data !== null) {
            return { data: data, pagination: null };
        }

        return { data: [], pagination: null };
    };

    const { toasts, toast, removeToast } = useToast();

    const [dates, setDates] = useState({ start: monthStart(), end: today() });
    const [activePreset, setActivePreset] = useState(1);
    const [types, setTypes] = useState({ purchase: true, sale: true, sale_cash_register: true, purchase_cash_register: true });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [extractionStatus, setExtractionStatus] = useState('all'); // 'all', 'extracted', 'not_extracted'

    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [isLoadMore, setIsLoadMore] = useState(false);
    const [syncingId, setSyncingId] = useState(null); // per-row sync state
    const [syncModalResult, setSyncModalResult] = useState(null);

    const [statsData, setStatsData] = useState({ kpi: {}, chart: [], top_items: [], top_providers: [], top_customers: [], category_pie: [] });
    const [tableData, setTableData] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [viewingPartner, setViewingPartner] = useState(null);
    const [viewingCRMCode, setViewingCRMCode] = useState(null);
    const navigate = useNavigate();

    const [modal, setModal] = useState({ open: false, data: null, mode: 'html', html: null, loading: false });
    const [formData, setFormData] = useState({ misa_status: '', notes: '' });
    const iframeRef = useRef(null);

    // ── FETCH ──
    const fetchData = useCallback(async (targetPage = 1, isAppending = false) => {
        console.group(`[FetchData] ${isAppending ? 'APPENDING' : 'RESETTING'}`);
        console.log(`targetPage: ${targetPage}, isAppending: ${isAppending}, current page state: ${page}`);
        
        if (isAppending) setIsLoadMore(true);
        else {
            setLoading(true);
            setPage(1); 
            console.log('Resetting page to 1');
        }
        
        setStatsLoading(true);
        const activeTypes = Object.keys(types).filter(k => types[k]);
        const params = { 
            start_date: dates.start, 
            end_date: dates.end, 
            types: activeTypes, 
            search, 
            extracted_status: extractionStatus === 'all' ? null : extractionStatus,
            per_page: 15, 
            page: targetPage 
        };
        
        console.log('[fetchData] Request Params:', params);
        
        try {
            const [statsAxiosRes, listAxiosRes] = await Promise.all([
                axios.get('/api/v2/invoices/statistics', { params }),
                axios.get('/api/v2/invoices', { params }),
            ]);

            console.log('Response received from API');
            // Trích xuất thống kê an toàn
            const sd = extractPayload(statsAxiosRes);
            setStatsData(mapStats(sd.data)); // mapStats expects the actual data object, not the {data, pagination} wrapper
            setStatsLoading(false);

            // Trích xuất danh sách an toàn
            const ld = extractPayload(listAxiosRes); // ld is now { data: [...], pagination: {...} }
            console.log('[fetchData] List data payload:', ld);
            
            const items = ld.data; // Always use ld.data for items
            console.log(`Extracted items count: ${items ? items.length : 0}`, items);
            
            if (isAppending) {
                console.log('Appending items to tableData');
                setTableData(prev => {
                    const next = [...prev, ...items];
                    console.log(`New tableData size: ${next.length}`);
                    return next;
                });
                console.log(`Update page state to: ${targetPage}`);
                setPage(targetPage);
            } else {
                console.log('Replacing tableData with new items');
                setTableData(items);
                // Đảm bảo page state đồng bộ với targetPage khi reset load
                setPage(targetPage);
            }
            
            if (ld.pagination) {
                console.log('Setting pagination metadata:', ld.pagination);
                setPagination(ld.pagination);
            } else {
                console.warn('No pagination metadata in response');
                setPagination(null);
            }
        } catch (err) {
            console.error('[FetchData] Error Details:', err);
            toast('Lỗi tải dữ liệu: ' + (err.response?.data?.message || err.message), 'error');
            setStatsLoading(false);
        } finally {
            setLoading(false);
            setIsLoadMore(false);
            console.log('FetchData Finished');
            console.groupEnd();
        }
    }, [dates, types, search, extractionStatus]); // Removed 'page' dependency

    // Initial and Filter Change Fetch
    useEffect(() => { 
        fetchData(1, false); 
    }, [dates, types, search, extractionStatus]);

    const applyPreset = (idx) => {
        setActivePreset(idx);
        const preset = DATE_PRESETS[idx];
        setDates({ start: preset.start, end: preset.end });
    };

    // ── SYNC BULK ──
    const handleSyncBulk = async (force = false) => {
        const label = force ? 'GHI ĐÈ toàn bộ' : 'bổ sung các đơn còn thiếu';
        if (!window.confirm(`Xác nhận ${label} từ ${dates.start} → ${dates.end}?`)) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/v2/invoices/sync-items', { force, start_date: dates.start, end_date: dates.end });
            const ld = extractPayload(res);
            const result = ld.data;
            setSyncModalResult(result);
            toast(res.data?.message || 'Hoàn thành đồng bộ V2', (result && result.failed > 0) ? 'info' : 'success');
            fetchData();
        } catch (err) {
            toast('Lỗi đồng bộ: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── SYNC SINGLE ──
    const handleQuickSync = async (inv) => {
        setSyncingId(inv.id);
        try {
            const res = await axios.post(`/api/v2/invoices/${inv.id}/sync-single`);
            const ld = extractPayload(res);
            const result = ld.data;
            
            if (result && result.success) {
                toast(`✓ HĐ #${inv.invoice_number}: ${result.message}`, 'success', 3000);
                // Cập nhật trực tiếp row trong tableData thay vì refetch toàn bộ
                setTableData(prev => prev.map(r => r.id === inv.id ? { ...r, is_extracted_v2: true } : r));
            } else {
                toast(`✗ HĐ #${inv.invoice_number}: ${result.message || 'Thất bại'}`, 'error');
            }
        } catch (err) {
            console.error('Quick sync error:', err);
            const msg = err.response?.data?.message || err.message;
            toast(`✗ HĐ #${inv.invoice_number}: ${msg}`, 'error');
        } finally {
            setSyncingId(null);
        }
    };

    // ── VIEW HTML ──
    const handleViewHtml = (inv) => {
        // [V2.1] Tự động chọn chế độ xem: Ưu tiên bản gốc nếu có PDF/XML
        const canShowOriginal = inv.has_pdf || inv.has_xml;
        const initialMode = canShowOriginal ? 'html' : 'details';
        
        setModal({ open: true, data: inv, mode: initialMode, html: null, loading: canShowOriginal });
        setFormData({ misa_status: inv.misa_status || '', notes: inv.notes || '' });
        
        if (canShowOriginal) {
            axios.get(`/api/v1/invoices/${inv.invoice_uuid}/html`)
                .then(r => setModal(m => ({ ...m, html: r.data.html, loading: false })))
                .catch(() => setModal(m => ({ ...m, html: '<div style="padding:40px;text-align:center;color:#ef4444;font-weight:bold">Lỗi tải bản thể hiện gốc.</div>', loading: false })));
        }
    };

    // ── RENDER CELL ──
    const renderCell = (inv, colId) => {
        const isPurchase = inv.invoice_type?.includes('purchase');
        const partnerName = isPurchase ? inv.seller_name : (inv.buyer_name || 'Khách lẻ');
        const partnerTax  = isPurchase ? inv.seller_tax_code : (inv.buyer_tax_code || '');
        const isSyncing   = syncingId === inv.id;

        switch (colId) {
            case 'date':
                return <span className="text-slate-600 font-medium tabular-nums">{fmtDate(inv.invoice_date)}</span>;

            case 'number':
                return (
                    <div 
                        className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => handleViewHtml(inv)}
                    >
                        <span className="font-bold text-slate-800">{inv.invoice_number}</span>
                        {inv.is_extracted_v2 && (
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow shadow-emerald-200" title="Đã trích xuất mặt hàng" />
                        )}
                    </div>
                );

            case 'symbol':
                return <span className="text-slate-400 text-xs font-mono">{inv.invoice_series}</span>;

            case 'partner':
                return (
                    <span 
                        onClick={() => setViewingPartner({ tax_code: partnerTax, name: partnerName })}
                        className="font-black text-[12px] text-indigo-700 hover:text-indigo-500 hover:underline cursor-pointer truncate block max-w-[320px] transition-colors"
                    >
                        {partnerName}
                    </span>
                );

            case 'tax_code':
                return (
                    <span 
                        className="font-mono text-[11px] text-slate-400 hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                        onClick={() => setViewingPartner({ tax_code: partnerTax, name: partnerName })}
                    >
                        {partnerTax}
                    </span>
                );

            case 'type': {
                const colorClass = TYPE_COLORS[inv.invoice_type] || 'bg-slate-50 border-slate-200 text-slate-600';
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${colorClass}`}>
                        {TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                    </span>
                );
            }

            case 'amount':
                return <span className="font-black text-slate-900 tabular-nums">{fmt(inv.total_amount)}</span>;

            case 'action':
                return (
                    <div className="flex items-center gap-1.5">
                        {/* View */}
                        <button
                            onClick={e => { e.stopPropagation(); handleViewHtml(inv); }}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                            title="Xem hóa đơn"
                        >
                            <UI.Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM10 12a2 2 0 114 0 2 2 0 01-4 0z" className="w-3.5 h-3.5" />
                        </button>
                        {/* Download Original */}
                        {inv.download_url && (
                            <a
                                href={inv.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                                title="Tải hóa đơn gốc (PDF)"
                                onClick={e => e.stopPropagation()}
                            >
                                <UI.Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" className="w-3.5 h-3.5" />
                            </a>
                        )}
                        {/* Quick Sync */}
                        <button
                            onClick={e => { e.stopPropagation(); handleQuickSync(inv); }}
                            disabled={isSyncing}
                            className={`p-1.5 rounded-lg transition-colors border ${
                                isSyncing            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-wait' :
                                inv.is_extracted_v2  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' :
                                                       'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                            }`}
                            title={inv.is_extracted_v2 ? 'Trích xuất lại' : 'Trích xuất mặt hàng'}
                        >
                            <UI.Icon
                                path={isSyncing
                                    ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    : inv.is_extracted_v2
                                        ? "M4.5 12.75l6 6 9-13.5"
                                        : "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"}
                                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                        </button>
                    </div>
                );

            default: return null;
        }
    };

    const kpi = statsData.kpi;
    const extractedCount = tableData.filter(r => r.is_extracted_v2).length;
    const extractionRate = tableData.length > 0 ? Math.round((extractedCount / tableData.length) * 100) : 0;

    return (
        <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen text-slate-900">
            <Toast toasts={toasts} remove={removeToast} />
            <SyncResultModal result={syncModalResult} onClose={() => setSyncModalResult(null)} />

            {/* ── HEADER ── */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                            <UI.Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" className="w-6 h-6" />
                        </div>
                        Finance Analytics
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">v2.0</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Hệ thống hóa đơn độc lập · Tối ưu hiệu suất</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/finance/invoice-products')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-black text-[11px] uppercase hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <UI.Icon path="M9.568 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V9.675a2.25 2.25 0 00-.659-1.591l-3.159-3.159A2.25 2.25 0 0015.591 3H9.568zM12 12.75l6-6M12 12.75l-6-6M12 12.75V21" className="w-3.5 h-3.5" />
                        Phân tích Mặt hàng
                    </button>
                    <button
                        onClick={() => handleSyncBulk(false)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-60"
                    >
                        <UI.Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Sync bổ sung
                    </button>
                    <button
                        onClick={() => handleSyncBulk(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-black text-[11px] uppercase hover:bg-rose-100 transition-colors disabled:opacity-60"
                        title="Ghi đè toàn bộ"
                    >
                        <UI.Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-3.5 h-3.5" />
                        Force sync
                    </button>
                </div>
            </header>

            {/* ── FILTER BAR ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                {/* Date */}
                <div className="md:col-span-5 bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</label>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <input type="date" value={dates.start} onChange={e => { setDates(p => ({ ...p, start: e.target.value })); setActivePreset(null); setPage(1); }}
                            className="bg-transparent text-sm font-bold border-none outline-none flex-1" />
                        <UI.Icon path="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" className="w-4 h-4 text-slate-300 shrink-0" />
                        <input type="date" value={dates.end} onChange={e => { setDates(p => ({ ...p, end: e.target.value })); setActivePreset(null); setPage(1); }}
                            className="bg-transparent text-sm font-bold border-none outline-none flex-1 text-right" />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {DATE_PRESETS.map((p, i) => (
                            <button key={i} onClick={() => applyPreset(i)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${activePreset === i ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Types */}
                <div className="md:col-span-7 bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại hình</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(types).map(t => (
                            <button key={t} onClick={() => { setTypes(p => ({ ...p, [t]: !p[t] })); }}
                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${types[t] ? TYPE_COLORS[t] + ' shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}>
                                {TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── KPI CARDS ── */}
            {statsLoading ? <KpiSkeleton /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KpiCard title="DOANH SỐ BÁN RA"  value={kpi.total_sale}     count={kpi.count_sale}     gradient="from-blue-600 to-indigo-600" />
                    <KpiCard title="CHI PHÍ MUA VÀO"  value={kpi.total_purchase} count={kpi.count_purchase} gradient="from-purple-600 to-pink-600" />
                    <KpiCard title="LỢI NHUẬN THUẦN"  value={kpi.net_revenue}    gradient={kpi.net_revenue >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'} />
                    <KpiCard title="TỈ LỆ TRÍCH XUẤT" value={extractionRate}     unit="%" isPercent
                        subtitle={`${extractedCount}/${tableData.length} hóa đơn`}
                        gradient={extractionRate === 100 ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-amber-600'} />
                </div>
            )}

            {/* ── CHARTS ROW 1: TREND & TOP ITEMS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Diễn biến dòng tiền
                        </h3>
                        <div className="flex gap-4">
                            {[['#4f46e5', 'BÁN RA'], ['#ec4899', 'MUA VÀO']].map(([c,l]) => (
                                <div key={l} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        {statsLoading ? <Skeleton className="h-full w-full" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsData.chart} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
                                    <defs>
                                        {[['v2Sale','#4f46e5'],['v2Buy','#ec4899']].map(([id,c]) => (
                                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={c} stopOpacity={0.18}/>
                                                <stop offset="95%" stopColor={c} stopOpacity={0}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tickFormatter={d => d.slice(5)} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={8} />
                                    <YAxis tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}Tr` : v.toLocaleString()} style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} domain={[0,'auto']} />
                                    <ReTooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="sale" stroke="#4f46e5" strokeWidth={3} fill="url(#v2Sale)" dot={false} activeDot={{ r:5, strokeWidth:0, fill:'#4f46e5' }} animationDuration={1200} />
                                    <Area type="monotone" dataKey="purchase" stroke="#ec4899" strokeWidth={3} fill="url(#v2Buy)" dot={false} activeDot={{ r:5, strokeWidth:0, fill:'#ec4899' }} animationDuration={1400} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Items */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        📦 Top mặt hàng (V2)
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {statsLoading ? [...Array(5)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />) :
                         statsData.top_items.length > 0 ? statsData.top_items.map((it, idx) => (
                            <div key={idx} className="group p-3 bg-slate-50 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        {it.product_code && it.product_code !== it.product_name && (
                                            <div className="text-[9px] font-black text-slate-400 font-mono uppercase mb-0.5 opacity-70">
                                                ID: {it.product_code}
                                            </div>
                                        )}
                                        <div className="text-[11px] font-black text-slate-700 uppercase leading-snug line-clamp-2">
                                            {it.product_name}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[11px] font-black text-indigo-600">{fmt(it.revenue)}</div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">Qty: {it.quantity}</div>
                                    </div>
                                </div>
                                <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-700 group-hover:bg-indigo-600"
                                        style={{ width: `${(it.revenue / statsData.top_items[0]?.revenue) * 100 || 0}%` }} />
                                </div>
                            </div>
                         )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                                    <UI.Icon path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" className="w-7 h-7 text-slate-300" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa có dữ liệu mặt hàng</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* ── CHARTS ROW 2: TOP PARTNERS & CATEGORY PIE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Providers Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[320px] flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <UI.Icon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" className="w-3.5 h-3.5 text-indigo-500" /> Top 5 Nhà cung cấp (Mua vào)
                    </h3>
                    <div className="flex-1">
                        {statsLoading ? <Skeleton className="h-full w-full" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData.top_providers} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight: '900', fill: '#475569'}} />
                                    <ReTooltip formatter={v => fmt(v)} cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={20}>
                                        {statsData.top_providers.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Category Pie Chart */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[320px] flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <UI.Icon path="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" className="w-3.5 h-3.5 text-indigo-500" /> Tỉ trọng Loại hóa đơn
                    </h3>
                    <div className="flex-1 flex items-center">
                        {statsLoading ? <Skeleton className="h-60 w-60 rounded-full mx-auto" /> : (
                            <>
                                <ResponsiveContainer width="60%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statsData.category_pie}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statsData.category_pie.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <ReTooltip formatter={v => fmt(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3 pr-4">
                                    {statsData.category_pie.map((entry, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                                                <span className="text-[10px] font-black text-slate-600 uppercase">{entry.label}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{Math.round((entry.value / statsData.kpi.total_purchase) * 100) || 0}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── DATA TABLE ── */}
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mr-2">Dữ liệu hóa đơn</h3>
                        <div className="flex items-center gap-2">
                            {['all','extracted','not_extracted'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setExtractionStatus(s)}
                                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border transition-all ${extractionStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                                >
                                    {s === 'all' ? 'Tất cả' : s === 'extracted' ? 'Đã trích xuất' : 'Chưa trích xuất'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-[400px]">
                        <div className="relative flex-1">
                            <input
                                type="text" 
                                placeholder="Tìm theo MST, Tên đối tác, Số HĐ..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            <UI.Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {pagination && <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{pagination.total} bản ghi</div>}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0 min-w-[900px]">
                        <thead className="bg-[#f8fafc] sticky top-0 z-10">
                            <tr>
                                {['Ngày HĐ','Số HĐ','Ký hiệu','Đối tác','MST','Loại HĐ','Tổng tiền',''].map((h, i) => (
                                    <th key={i} className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        {loading ? <TableSkeleton /> : (
                            <tbody className="divide-y divide-slate-50">
                                {tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-slate-300 font-black italic uppercase text-xs">
                                            Không tìm thấy dữ liệu
                                        </td>
                                    </tr>
                                ) : tableData.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        {['date','number','symbol','partner','tax_code','type','amount','action'].map(col => {
                                            // Columns that trigger invoice details
                                            const isDetailTrigger = ['date', 'number', 'symbol'].includes(col);
                                            // Columns that trigger partner analysis
                                            const isPartnerTrigger = ['partner', 'tax_code'].includes(col);
                                            
                                            let tdClass = "px-5 py-3.5 text-sm border-slate-50";
                                            if (isDetailTrigger) tdClass += " cursor-pointer hover:bg-indigo-50/50";
                                            if (isPartnerTrigger) tdClass += " cursor-pointer hover:bg-amber-50/30";

                                            return (
                                                <td 
                                                    key={col} 
                                                    className={tdClass}
                                                    onClick={() => {
                                                        if (isDetailTrigger) handleViewHtml(inv);
                                                    }}
                                                >
                                                    {renderCell(inv, col)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>

                {/* Load More / End of data UI */}
                <div className="p-8 bg-slate-50/10 flex flex-col items-center justify-center border-t border-slate-50 min-h-[120px]">
                    {pagination && pagination.current_page < pagination.last_page ? (
                        <>
                            <button
                                onClick={() => {
                                    console.log('[UI] Load More clicked, next page:', page + 1);
                                    fetchData(page + 1, true);
                                }}
                                disabled={loading || isLoadMore}
                                className="bg-white text-indigo-600 border border-indigo-200 px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                {isLoadMore ? ( // Skeleton for loading state
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full bg-slate-200 animate-pulse" />
                                        <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                                    </div>
                                ) : ( // Normal state
                                    <>
                                        <UI.Icon path="M12 4.5v15m0 0l-6.75-6.75M12 19.5l6.75-6.75" className="w-4 h-4" />
                                        Tải thêm dữ liệu ({pagination.total - tableData.length} còn lại)
                                    </>
                                )}
                            </button>
                            <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                Đang hiển thị {tableData.length} / {pagination.total} bản ghi (Trang {pagination.current_page}/{pagination.last_page})
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                             {pagination && pagination.total > 0 ? (
                                <>
                                    <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Hệ thống đã tải hết {pagination.total} kết quả</div>
                                    <div className="w-12 h-1 bg-slate-100 rounded-full" />
                                </>
                             ) : (
                                <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                    {loading ? 'Đang truy vấn dữ liệu...' : 'Không tìm thấy hóa đơn nào'}
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* Partner Analysis Modal */}
            <PartnerAnalysisModalV2
                isOpen={!!viewingPartner}
                onClose={() => setViewingPartner(null)}
                taxCode={viewingPartner?.tax_code}
                partnerName={viewingPartner?.name}
                onInvoiceClick={(inv) => {
                    handleViewHtml(inv);
                }}
                onViewCRMDetail={(maKH) => {
                    setViewingCRMCode(maKH);
                }}
            />

            {/* Customer Detail Modal (CRM) */}
            <CustomerDetailModal
                isOpen={!!viewingCRMCode}
                onClose={() => setViewingCRMCode(null)}
                customerIdentifier={viewingCRMCode}
            />

            {/* Invoice Modal */}
            <InvoiceModal
                isOpen={modal.open}
                onClose={() => setModal(m => ({ ...m, open: false }))}
                selectedInvoice={modal.data}
                modalViewMode={modal.mode}
                setModalViewMode={mode => setModal(m => ({ ...m, mode }))}
                modalFormData={formData}
                setModalFormData={setFormData}
                invoiceHtml={modal.html}
                isHtmlLoading={modal.loading}
                iframeRef={iframeRef}
                handleFetchInvoiceHtml={handleViewHtml}
                handleUpdateInvoice={fetchData}
                onPartnerClick={(p) => setViewingPartner(p)}
            />
        </div>
    );
};

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, count, gradient, unit, subtitle, isPercent }) => (
    <div className={`p-6 rounded-[2rem] shadow-xl bg-gradient-to-br ${gradient} text-white relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border border-white/10`}>
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-700" />
        <div className="relative z-10 space-y-3">
            <label className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">{title}</label>
            <div className="text-2xl font-black tracking-tighter drop-shadow-sm">
                {isPercent
                    ? <>{value}<span className="text-base ml-0.5 opacity-70">{unit}</span></>
                    : new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(value || 0)
                }
            </div>
            <div className="text-[10px] font-bold text-white/60">
                {subtitle || (count !== undefined && `${count} chứng từ`)}
            </div>
            <div className="h-0.5 w-8 bg-white/20 rounded-full group-hover:w-16 transition-all duration-500" />
        </div>
    </div>
);

// ─── CHART TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const fmt = v => new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(v || 0);
    return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-sm min-w-[180px]">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-2 border-b">{payload[0]?.payload?.date}</div>
            {[{ key:'Bán ra', color:'text-indigo-600', idx:0 }, { key:'Mua vào', color:'text-pink-600', idx:1 }].map(({ key, color, idx }) => (
                <div key={key} className="flex justify-between items-center gap-6 mb-1">
                    <span className={`text-[10px] font-black uppercase ${color}`}>{key}</span>
                    <span className="text-xs font-black text-slate-800">{fmt(payload[idx]?.value)}</span>
                </div>
            ))}
        </div>
    );
};

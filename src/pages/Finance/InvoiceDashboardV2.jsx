import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../../components/ui.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';
import { InvoiceModal } from '../../components/modals/InvoiceModal';

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// --- CẤU HÌNH CỘT MẶC ĐỊNH V2 ---
const DEFAULT_COLUMNS = [
    { id: 'date', label: 'Ngày HĐ', width: 100, visible: true },
    { id: 'number', label: 'Số HĐ', width: 90, visible: true },
    { id: 'symbol', label: 'Ký hiệu', width: 80, visible: true },
    { id: 'partner', label: 'Đối tác (V2)', width: 350, visible: true },
    { id: 'tax_code', label: 'Mã số thuế', width: 120, visible: true },
    { id: 'type', label: 'Loại HĐ', width: 100, visible: true },
    { id: 'amount', label: 'Tổng tiền', width: 140, visible: true },
    { id: 'action', label: 'Hành động', width: 80, visible: true, fixed: true },
];

const STORAGE_KEY_COLS = 'dashboard_table_columns_v2';

export const InvoiceDashboardV2 = () => {
    // === 1. STATE BỘ LỌC ===
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [types, setTypes] = useState({
        purchase: true, sale: true, sale_cash_register: true, purchase_cash_register: true
    });
    const [searchGroup, setSearchGroup] = useState('');
    const [page, setPage] = useState(1);

    // === 2. STATE DATA ===
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState({ kpi: {}, chart: [], top_items: [] });
    const [tableData, setTableData] = useState([]);
    const [pagination, setPagination] = useState(null);

    // Standard Modal State
    const [modal, setModal] = useState({ open: false, data: null, mode: 'html', html: null, loading: false });
    const [viewingPartner, setViewingPartner] = useState(null);
    const [formData, setFormData] = useState({ misa_status: '', notes: '' });
    const iframeRef = useRef(null);

    // === 3. TABLE CONFIG ===
    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_COLS);
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showColMenu, setShowColMenu] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(columns));
    }, [columns]);

    // === 4. FETCH DATA (V2 API) ===
    const fetchData = useCallback(async () => {
        setLoading(true);
        const activeTypes = Object.keys(types).filter(k => types[k]);
        const params = {
            start_date: dates.start,
            end_date: dates.end,
            types: activeTypes,
            search: searchGroup,
            per_page: 25,
            page: page
        };
        try {
            // SmartAPI (axiosGlobal.js) automatically unwraps { status: 'success', data: [...] }
            // So statsRes.data IS the stats object, and listRes.data IS the paginated invoice object.
            const [statsRes, listRes] = await Promise.all([
                axios.get('/api/v2/invoices/statistics', { params }),
                axios.get('/api/v2/invoices', { params })
            ]);
            
            // Safety: Fallback to initial state if data is missing
            setStatsData(statsRes.data || { kpi: {}, chart: [], top_items: [] });
            setTableData(listRes.data?.data || []);
            setPagination(listRes.data || null);
        } catch (error) {
            console.error("Lỗi V2 API:", error);
        } finally {
            setLoading(false);
        }
    }, [dates, types, searchGroup, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // === 5. RENDER HELPERS ===
    const handleViewHtml = (inv) => {
        setModal({ open: true, data: inv, mode: 'html', html: null, loading: true });
        setFormData({ misa_status: inv.misa_status || '', notes: inv.notes || '' });
        axios.get(`/api/v1/invoices/${inv.invoice_uuid}/html`) // Reuse V1 HTML endpoint for stability
            .then(res => setModal(m => ({ ...m, html: res.data.html, loading: false })))
            .catch(() => setModal(m => ({ ...m, html: '<div class="p-10 text-center text-red-500">Lỗi tải bản thể hiện V2.</div>', loading: false })));
    };

    const renderCell = (inv, colId) => {
        const isPurchase = inv.invoice_type.includes('purchase');
        const partnerName = isPurchase ? inv.seller_name : (inv.buyer_name || 'Khách lẻ');
        const partnerTax = isPurchase ? inv.seller_tax_code : (inv.buyer_tax_code || '');

        switch (colId) {
            case 'date': return <span className="text-slate-600 font-medium">{formatDate(inv.invoice_date)}</span>;
            case 'number': return <span className="font-bold text-slate-800">{inv.invoice_number}</span>;
            case 'symbol': return <span className="text-slate-400 text-xs font-mono">{inv.invoice_series}</span>;
            case 'partner':
                return (
                    <span 
                        onClick={(e) => { e.stopPropagation(); setViewingPartner(partnerTax); }}
                        className="font-bold text-[13px] text-indigo-700 hover:text-indigo-500 hover:underline cursor-pointer truncate block"
                    >
                        {partnerName}
                    </span>
                );
            case 'tax_code': return <span className="font-mono text-[11px] text-slate-500">{partnerTax}</span>;
            case 'type':
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${isPurchase ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {inv.invoice_type.replace('_', ' ')}
                    </span>
                );
            case 'amount': return <span className="font-black text-slate-900">{formatCurrency(inv.total_amount)}</span>;
            case 'action':
                return (
                    <button onClick={(e) => { e.stopPropagation(); handleViewHtml(inv); }} className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100">
                        <UI.Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM10 12a2 2 0 114 0 2 2 0 01-4 0z" className="w-4 h-4" />
                    </button>
                );
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen text-slate-900 overflow-x-hidden">
            {/* Header V2 */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-indigo-200 shadow-lg">
                            <UI.Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" className="w-6 h-6" />
                        </div>
                        Finance Analytics <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">v2.0</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest italic">Hệ thống hóa đơn độc lập & Tối ưu hiệu suất</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border shadow-sm items-center">
                    {['Bán ra', 'Mua vào'].map((l, i) => (
                        <button key={i} className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${i === 0 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </header>

            {/* Filter Hub V2 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                <div className="md:col-span-4 bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian giao dịch</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <input type="date" value={dates.start} onChange={e => setDates(p => ({ ...p, start: e.target.value }))} className="bg-transparent text-sm font-bold border-none outline-none flex-1" />
                        <UI.Icon path="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" className="w-4 h-4 text-slate-300" />
                        <input type="date" value={dates.end} onChange={e => setDates(p => ({ ...p, end: e.target.value }))} className="bg-transparent text-sm font-bold border-none outline-none flex-1 text-right" />
                    </div>
                </div>
                <div className="md:col-span-5 bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại hình hóa đơn</label>
                    <div className="flex flex-wrap gap-2">
                        {['sale', 'purchase', 'sale_cash_register', 'purchase_cash_register'].map(type => (
                            <button 
                                key={type} 
                                onClick={() => setTypes(p => ({ ...p, [type]: !p[type] }))}
                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${types[type] ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                                {type.includes('sale') ? 'Bán ra' : 'Mua vào'} {type.includes('cash') ? '(MTT)' : ''}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-3 bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tìm nhanh</label>
                    <div className="relative">
                        <input type="text" placeholder="MST, Tên, Số HĐ..." value={searchGroup} onChange={e => setSearchGroup(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                        <UI.Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>

            {/* KPI Section V2 */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <CardV2 title="DOANH SỐ BÁN RA" value={statsData.kpi?.total_sale} count={statsData.kpi?.count_sale} gradient="from-blue-600 to-indigo-600" />
                    <CardV2 title="CHI PHÍ MUA VÀO" value={statsData.kpi?.total_purchase} count={statsData.kpi?.count_purchase} gradient="from-purple-600 to-pink-600" />
                    <CardV2 title="LỢI NHUẬN THUẾ" value={statsData.kpi?.net_revenue} gradient={statsData.kpi?.net_revenue >= 0 ? "from-emerald-500 to-teal-600" : "from-rose-500 to-red-600"} />
                    <CardV2 title="LƯỢNG GIAO DỊCH" value={(statsData.kpi?.count_sale || 0) + (statsData.kpi?.count_purchase || 0)} unit="tờ" gradient="from-orange-500 to-amber-600" isNumeric />
                </div>
            )}

            {/* Charts & Top Items Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm h-[450px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Diễn biến dòng tiền thuế V2
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" /> BÁN RA
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                <div className="w-3 h-3 rounded-full bg-pink-500" /> MUA VÀO
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statsData.chart} margin={{ top: 30, right: 20, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="v2Sale" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="v2Purchase" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={d => d.slice(5)} 
                                    style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    tickFormatter={v => `${(v / 1000000).toFixed(0)}Tr`} 
                                    style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <ReTooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="sale" 
                                    stroke="#4f46e5" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#v2Sale)" 
                                    animationBegin={0}
                                    animationDuration={1500}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="purchase" 
                                    stroke="#ec4899" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#v2Purchase)" 
                                    animationBegin={200}
                                    animationDuration={1500}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[450px] flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        📦 Top Mặt hàng tối ưu (V2)
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {statsData.top_items && statsData.top_items.length > 0 ? statsData.top_items.map((it, idx) => (
                            <div key={idx} className="group p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="text-[11px] font-black text-slate-700 uppercase leading-snug line-clamp-2">{it.product_name}</div>
                                    <div className="text-right">
                                        <div className="text-[11px] font-black text-indigo-600 whitespace-nowrap">{formatCurrency(it.revenue)}</div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Qty: {it.quantity}</div>
                                    </div>
                                </div>
                                <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 shadow-sm transition-all duration-1000 group-hover:bg-indigo-600" 
                                        style={{ width: `${(it.revenue / statsData.top_items[0].revenue) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 animate-pulse">
                                    <UI.Icon path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" className="w-8 h-8" />
                                </div>
                                <div className="text-center group">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Đang rà soát dữ liệu...</p>
                                    <p className="text-[9px] font-bold text-slate-300 mt-1 italic tracking-tight">Vui lòng chạy 'migrate' và đồng bộ hóa</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List Table V2 */}
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bảng kê chi tiết V2.0</h3>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <table className="w-full border-separate border-spacing-0">
                        <thead className="bg-[#f8fafc] sticky top-0 z-10 shadow-sm">
                            <tr>
                                {columns.filter(c => c.visible).map((col) => (
                                    <th key={col.id} style={{ width: col.width }} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-slate-100 bg-[#f8fafc]">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.length === 0 ? (
                                <tr><td colSpan={columns.length} className="px-6 py-20 text-center text-slate-300 font-black italic uppercase text-xs">Không tìm thấy dữ liệu V2</td></tr>
                            ) : tableData.map((inv) => (
                                <tr key={inv.id} onClick={() => handleViewHtml(inv)} className="hover:bg-indigo-50/30 transition-all cursor-pointer group">
                                    {columns.filter(c => c.visible).map(col => (
                                        <td key={col.id} className="px-6 py-4 text-sm border-r border-slate-50 border-b border-slate-100">
                                            {renderCell(inv, col.id)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination V2 */}
                {pagination && pagination.last_page > 1 && (
                    <footer className="px-8 py-4 bg-slate-50 border-t flex justify-between items-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {pagination.last_page} · {pagination.total} Records</div>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} className={`p-2 rounded-xl border transition-all ${page === 1 ? 'opacity-30 cursor-not-allowed' : 'bg-white hover:bg-indigo-50 text-indigo-600'}`}>
                                <UI.Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage(p => p + 1)} className={`p-2 rounded-xl border transition-all ${page === pagination.last_page ? 'opacity-30 cursor-not-allowed' : 'bg-white hover:bg-indigo-50 text-indigo-600'}`}>
                                <UI.Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-4 h-4" />
                            </button>
                        </div>
                    </footer>
                )}
            </div>

            {/* Modals */}
            {viewingPartner && <PartnerDetailModal taxCode={viewingPartner} onClose={() => setViewingPartner(null)} />}
            <InvoiceModal
                isOpen={modal.open}
                onClose={() => setModal({ ...modal, open: false })}
                selectedInvoice={modal.data}
                modalViewMode={modal.mode}
                setModalViewMode={(mode) => setModal({ ...modal, mode })}
                modalFormData={formData}
                setModalFormData={setFormData}
                invoiceHtml={modal.html}
                isHtmlLoading={modal.loading}
                iframeRef={iframeRef}
                handleFetchInvoiceHtml={handleViewHtml}
                handleUpdateInvoice={fetchData}
            />
        </div>
    );
};

// --- SUB COMPONENTS V2 ---

const CardV2 = ({ title, value, count, gradient, isNumeric, unit }) => (
    <div className={`p-6 rounded-[2rem] shadow-xl bg-gradient-to-br ${gradient} text-white relative overflow-hidden group transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl border border-white/10`}>
        {/* Glass Effect Overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-700" />
        
        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
            <UI.Icon path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" className="w-12 h-12" />
        </div>

        <div className="relative z-10 flex flex-col h-full space-y-3">
            <label className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">{title}</label>
            <div className="space-y-1">
                <div className="text-2xl font-black tracking-tighter drop-shadow-sm">
                    {isNumeric ? value?.toLocaleString() : formatCurrency(value)}
                    {unit && <span className="ml-2 text-xs font-bold opacity-60 uppercase">{unit}</span>}
                </div>
                {count !== undefined && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="text-[10px] font-bold text-white/60 tracking-tight">{count} Chứng từ</span>
                    </div>
                )}
            </div>
            
            {/* Action Hint */}
            <div className="pt-2 mt-auto">
                <div className="h-1 w-12 bg-white/20 rounded-full group-hover:w-20 transition-all duration-500" />
            </div>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-slide-up">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pb-2 border-b">{payload[0].payload.date}</div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-8">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase">Bán ra</div>
                        <div className="text-xs font-black text-slate-800">{formatCurrency(payload[0].value)}</div>
                    </div>
                    <div className="flex justify-between items-center gap-8">
                        <div className="flex items-center gap-2 text-[10px] font-black text-pink-600 uppercase">Mua vào</div>
                        <div className="text-xs font-black text-slate-800">{formatCurrency(payload[1].value)}</div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const PartnerDetailModal = ({ taxCode, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`/api/v1/invoices/partner/${taxCode}`)
            .then(res => setData(res.data))
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, [taxCode]);

    return (
        <UI.Modal isOpen={true} onClose={onClose} title="PHÂN TÍCH ĐỐI TÁC V2" maxWidthClass="max-w-4xl">
            <div className="p-8 bg-[#fdfdfd] min-h-[600px]">
                {loading ? (
                    <div className="py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[4px] text-xs">Querying Metadata...</div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-end border-b pb-6">
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{data.partner?.name || 'Đối tác ẩn danh'}</h1>
                                <div className="text-xs font-black text-indigo-600 mt-1 uppercase tracking-widest">Mã số thuế: {taxCode}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Update</div>
                                <div className="text-xs font-bold text-slate-800 italic">{new Date().toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Giao dịch trọng yếu</h4>
                                <div className="space-y-4">
                                    {data.top_items?.slice(0, 5).map((it, idx) => (
                                        <div key={idx} className="flex justify-between items-center group">
                                            <div className="text-[11px] font-black text-slate-600 line-clamp-1 flex-1 uppercase tracking-tighter">{it.name}</div>
                                            <div className="text-[11px] font-black text-indigo-600 ml-4">{formatCurrency(it.revenue)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Hoạt động gần nhất</h4>
                                <div className="space-y-3">
                                    {data.recent_invoices?.slice(0, 5).map((inv, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[11px]">
                                            <div className="font-bold text-slate-500">#{inv.invoice_number}</div>
                                            <div className="font-black text-slate-700">{formatCurrency(inv.total_amount)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UI.Modal>
    );
};

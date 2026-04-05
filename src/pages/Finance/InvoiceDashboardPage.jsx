import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../../components/ui.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { InvoiceModal } from '../../components/modals/InvoiceModal';

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// --- CẤU HÌNH CỘT MẶC ĐỊNH ---
const DEFAULT_COLUMNS = [
    { id: 'date', label: 'Ngày HĐ', width: 100, visible: true },
    { id: 'number', label: 'Số HĐ', width: 90, visible: true },
    { id: 'symbol', label: 'Ký hiệu', width: 80, visible: true },
    { id: 'partner', label: 'Đối tác (Người Mua / Bán)', width: 350, visible: true },
    { id: 'tax_code', label: 'Mã số thuế', width: 120, visible: true },
    { id: 'type', label: 'Loại HĐ', width: 100, visible: true },
    { id: 'amount', label: 'Tổng tiền', width: 140, visible: true },
    { id: 'nature', label: 'Tính chất', width: 100, visible: true },
    { id: 'action', label: 'Hành động', width: 80, visible: true, fixed: true }, // Cột chốt
];

const STORAGE_KEY_COLS = 'dashboard_table_columns_v1';

export const InvoiceDashboardPage = () => {
    // === 1. STATE BỘ LỌC ===
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [types, setTypes] = useState({
        purchase: true, sale: true, sale_cash_register: true, purchase_cash_register: true
    });
    const [nature, setNature] = useState('');
    const [searchGroup, setSearchGroup] = useState('');

    // === 2. STATE DATA & MODAL ===
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState({ kpi: {}, chart: [] });
    const [tableData, setTableData] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);

    // State Modal chuẩn
    const [modal, setModal] = useState({
        open: false,
        data: null,
        mode: 'html',
        html: null,
        loading: false
    });

    // === 3. STATE CHO TABLE (RESIZE & CONFIG) ===
    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_COLS);
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showColMenu, setShowColMenu] = useState(false); // Menu bật tắt cột
    const resizingRef = useRef(null); // Ref để xử lý kéo thả
    const iframeRef = useRef(null);
    const [formData, setFormData] = useState({ misa_status: '', notes: '' });

    // Lưu cấu hình cột khi thay đổi
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(columns));
    }, [columns]);

    // === 4. LOGIC RESIZE CỘT ===
    const handleResizeStart = (e, colId) => {
        e.preventDefault();
        const startX = e.pageX;
        const colIndex = columns.findIndex(c => c.id === colId);
        const startWidth = columns[colIndex].width;

        const onMouseMove = (moveEvent) => {
            const diff = moveEvent.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Min width 50px
            setColumns(prev => {
                const next = [...prev];
                next[colIndex] = { ...next[colIndex], width: newWidth };
                return next;
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // === 5. FETCH DATA ===
    const fetchData = useCallback(async () => {
        setLoading(true);
        const activeTypes = Object.keys(types).filter(k => types[k]);
        const params = {
            date_from: dates.start,
            date_to: dates.end,
            invoice_type: activeTypes.join(','),
            classification_nature: nature,
            search: searchGroup,
            page: page
        };
        try {
            const [statsRes, listRes] = await Promise.all([
                axios.get('/api/v1/invoices/statistics', { params }),
                axios.get('/api/v1/invoices', { params })
            ]);
            setStatsData(statsRes.data);
            setTableData(listRes.data.data);
            setPagination(listRes.data);
        } catch (error) {
            console.error("Lỗi:", error);
        } finally {
            setLoading(false);
        }
    }, [dates, types, nature, searchGroup, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const [viewingPartner, setViewingPartner] = useState(null); // MST

    // === 6. HANDLE VIEW HTML ===
    const handleViewHtml = (inv) => {
        setModal({ open: true, data: inv, mode: 'html', html: null, loading: true });
        setFormData({ misa_status: inv.misa_status || '', notes: inv.notes || '' });
        axios.get(`/api/v1/invoices/${inv.invoice_uuid}/html`)
            .then(res => setModal(m => ({ ...m, html: res.data.html, loading: false })))
            .catch(() => setModal(m => ({ ...m, html: '<div class="p-10 text-center text-red-500">Không tải được bản thể hiện. Vui lòng tải XML gốc.</div>', loading: false })));
    };

    const handlePrintInvoice = () => {
        if (iframeRef.current) {
            const contentWindow = iframeRef.current.contentWindow;
            contentWindow.focus();
            contentWindow.print();
        }
    };

    // === 7. HELPERS DATE & RENDER CELL ===
    const handleQuickDate = (mode) => {
        const today = new Date();
        const start = new Date();
        switch (mode) {
            case 'today': break;
            case '3days': start.setDate(today.getDate() - 2); break;
            case '7days': start.setDate(today.getDate() - 6); break;
            case 'month': start.setDate(1); break;
            case 'last_month': start.setMonth(start.getMonth() - 1); start.setDate(1); today.setDate(0); break;
            case 'quarter': const q = Math.floor((today.getMonth() + 3) / 3); start.setMonth((q - 1) * 3); start.setDate(1); break;
            case 'year': start.setMonth(0); start.setDate(1); break;
        }
        setDates({ start: start.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
    };

    const QuickBtn = ({ label, mode }) => (
        <button onClick={() => handleQuickDate(mode)} className="px-2 py-1 text-xs font-medium bg-white border hover:bg-blue-50 hover:text-blue-600 rounded whitespace-nowrap">{label}</button>
    );

    // Render nội dung từng ô trong bảng
    const renderCell = (inv, colId) => {
        const isPurchase = inv.invoice_type.includes('purchase');
        const partnerName = isPurchase
            ? (inv.data?.nbten || inv.seller_name || inv.seller_name_display)
            : (inv.data?.nmten || inv.buyer_name || inv.buyer_name_display || 'Khách lẻ');
        const partnerTax = isPurchase
            ? (inv.seller_tax_code || inv.data?.nbmst)
            : (inv.buyer_tax_code || inv.data?.nmmst || '');

        switch (colId) {
            case 'date':
                const realDate = inv.data?.tdlap || inv.invoice_date;
                return <span className="text-gray-700 font-medium">{formatDate(realDate)}</span>;
            case 'number':
                return <span className="font-bold text-gray-800">{inv.invoice_number}</span>;
            case 'symbol':
                return <span className="text-gray-500 text-xs">{inv.invoice_series}</span>;
            case 'partner':
                return (
                    <div className="flex flex-col group/pname" title={partnerName}>
                        <span 
                            onClick={(e) => { 
                                if (partnerTax) {
                                    e.stopPropagation(); 
                                    setViewingPartner(partnerTax); 
                                }
                            }}
                            className={`font-bold truncate text-[13px] ${partnerTax ? 'text-blue-700 hover:text-blue-500 hover:underline cursor-pointer' : 'text-gray-700'}`}
                        >
                            {partnerName}
                        </span>
                    </div>
                );
            case 'tax_code':
                return (
                    <span 
                        onClick={(e) => { e.stopPropagation(); setViewingPartner(partnerTax); }}
                        className="text-gray-500 text-xs font-mono hover:text-blue-600 cursor-pointer"
                    >
                        {partnerTax}
                    </span>
                );
            case 'type':
                return (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isPurchase ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {inv.invoice_type === 'purchase' ? 'MUA' : inv.invoice_type === 'sale' ? 'BÁN' : isPurchase ? 'MTT MUA' : 'MTT BÁN'}
                    </span>
                );
            case 'amount':
                return <span className="font-bold text-gray-900">{formatCurrency(inv.total_amount)}</span>;
            case 'nature':
                const tchat = inv.data?.tchat;
                if (!tchat || tchat == '1') return <span className="text-xs text-gray-400">Gốc</span>;
                if (tchat == '2') return <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">Thay thế</span>;
                if (tchat == '3') return <span className="text-[10px] bg-pink-100 text-pink-800 px-1 rounded">Điều chỉnh</span>;
                if (tchat == '4') return <span className="text-[10px] bg-gray-200 text-gray-600 line-through">Đã hủy</span>;
                return tchat;
            case 'action':
                return (
                    <button onClick={(e) => { e.stopPropagation(); handleViewHtml(inv); }} className="p-1 hover:bg-blue-50 text-blue-600 rounded border border-gray-200 shadow-sm transition-colors" title="Xem chi tiết">
                        <UI.Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM10 12a2 2 0 114 0 2 2 0 01-4 0z" className="w-4 h-4" />
                    </button>
                );
            default: return null;
        }
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 min-h-screen font-sans" onClick={() => setShowColMenu(false)}>
            {/* HEADER & FILTER SECTION */}
            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border mb-4 md:mb-6">
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                    <h1 className="hidden md:flex text-xl font-bold text-gray-800 items-center gap-2">
                        <UI.Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" className="w-6 h-6 text-blue-600" />
                        Dashboard Hóa đơn
                    </h1>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex overflow-x-auto no-scrollbar gap-1 w-full sm:w-auto pb-1 sm:pb-0 mb-1 sm:mb-0">
                            <QuickBtn label="Hôm nay" mode="today" />
                            <QuickBtn label="3 ngày" mode="3days" />
                            <QuickBtn label="Tháng này" mode="month" />
                            <QuickBtn label="Năm nay" mode="year" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border w-full sm:w-auto justify-between sm:justify-start">
                            <input type="date" value={dates.start} onChange={e => setDates(p => ({ ...p, start: e.target.value }))} className="bg-transparent text-sm font-semibold border-none outline-none w-28 sm:w-24" />
                            <span className="text-gray-400">➜</span>
                            <input type="date" value={dates.end} onChange={e => setDates(p => ({ ...p, end: e.target.value }))} className="bg-transparent text-sm font-semibold border-none outline-none w-28 sm:w-24" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
                        {['sale', 'purchase', 'sale_cash_register', 'purchase_cash_register'].map(type => (
                            <label key={type} className="flex items-center gap-1.5 cursor-pointer select-none bg-gray-50 px-2 py-1 rounded border hover:bg-gray-100 min-w-0">
                                <UI.Checkbox checked={types[type]} onChange={e => setTypes(p => ({ ...p, [type]: e.target.checked }))} />
                                <span className="text-[11px] sm:text-sm font-bold text-gray-700 truncate">
                                    {type === 'sale' ? 'Bán ra' : type === 'purchase' ? 'Mua vào' : type === 'sale_cash_register' ? 'MTT Bán' : 'MTT Mua'}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto relative">
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowColMenu(!showColMenu); }} className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 p-1.5 sm:px-3 rounded-lg text-sm font-medium transition-colors">
                                <UI.Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                <span className="hidden sm:inline">Cột</span>
                            </button>
                            {showColMenu && (
                                <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-56 bg-white border rounded-lg shadow-xl z-50 p-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                                    <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Hiển thị cột</div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {columns.map(col => !col.fixed && (
                                            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={col.visible}
                                                    onChange={() => setColumns(prev => prev.map(c => c.id === col.id ? { ...c, visible: !c.visible } : c))}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                        <button onClick={() => setColumns(DEFAULT_COLUMNS)} className="w-full text-center text-xs text-blue-600 hover:underline">Khôi phục mặc định</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <input type="text" placeholder="Tìm kiếm..." value={searchGroup} onChange={e => setSearchGroup(e.target.value)} onBlur={fetchData} onKeyDown={e => e.key === 'Enter' && fetchData()} className="flex-1 min-w-0 text-sm border-gray-300 rounded-lg pl-3 py-1.5 focus:ring-blue-500 border" />
                        <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap">Lọc</button>
                    </div>
                </div>
            </div>

            {/* CHARTS & KPI */}
            {!loading && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KPICard title="TỔNG BÁN RA" value={statsData.kpi?.total_sale} count={statsData.kpi?.count_sale} color="blue" />
                        <KPICard title="TỔNG MUA VÀO" value={statsData.kpi?.total_purchase} count={statsData.kpi?.count_purchase} color="purple" />
                        <KPICard title="CHÊNH LỆCH" value={statsData.kpi?.net_revenue} color={statsData.kpi?.net_revenue >= 0 ? "emerald" : "red"} />
                        <KPICard title="TỔNG SỐ HÓA ĐƠN" value={null} customDisplay={<div className="text-3xl font-bold text-gray-700 mt-1">{(statsData.kpi?.count_sale || 0) + (statsData.kpi?.count_purchase || 0)} <span className="text-sm font-normal text-gray-400">tờ</span></div>} color="orange" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border h-[400px] flex flex-col">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <UI.Icon path="M2.25 18L9 11.25l4.5 4.5L21.75 7.5" className="w-4 h-4 text-blue-500" /> Diễn biến doanh thu / chi phí
                            </h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={statsData.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="date" tickFormatter={d => d.slice(5)} style={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}Tr`} style={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <ReTooltip borderStyle={{borderRadius:8, border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} formatter={v => formatCurrency(v)} />
                                        <Area type="monotone" dataKey="sale" name="Bán ra" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSale)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="purchase" name="Mua vào" stroke="#a855f7" fillOpacity={1} fill="url(#colorPurchase)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* TOP MẶT HÀNG */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border h-[400px] flex flex-col overflow-hidden">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <UI.Icon path="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" className="w-4 h-4 text-emerald-500" /> Top Mặt hàng theo thuế
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {statsData.top_items && statsData.top_items.length > 0 ? (
                                    <div className="space-y-3">
                                        {statsData.top_items.map((it, idx) => (
                                            <div key={idx} className="group p-2 rounded-lg hover:bg-slate-50 transition-colors border-b border-dashed border-slate-100 last:border-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="text-[11px] font-bold text-slate-700 line-clamp-2 uppercase leading-tight">{it.name}</div>
                                                    <div className="text-[11px] font-black text-emerald-600 whitespace-nowrap">{formatCurrency(it.revenue)}</div>
                                                </div>
                                                <div className="flex justify-between mt-1 items-center">
                                                    <div className="text-[9px] font-bold text-slate-400">SL: {it.quantity}</div>
                                                    <div className="h-1 bg-slate-100 rounded-full flex-1 mx-3 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-emerald-400/50" 
                                                            style={{ width: `${(it.revenue / statsData.top_items[0].revenue) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-xs italic">
                                        Chu kỳ này chưa có dữ liệu chi tiết
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* DYNAMIC RESIZABLE TABLE */}
            <div className="bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách hóa đơn trong kỳ</h3>
                    <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap italic">* Click vào Tên đối tác hoặc MST để xem báo cáo thuế chi tiết</div>
                </div>
                <div className="overflow-x-auto custom-scrollbar flex-1" style={{ minHeight: '300px' }}>
                    <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0 table-fixed">
                        <thead className="bg-gray-100 shadow-sm">
                            <tr>
                                {columns.filter(c => c.visible).map((col) => (
                                    <th
                                        key={col.id}
                                        style={{ width: col.width }}
                                        className="relative px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-gray-100 group select-none"
                                    >
                                        <div className="flex items-center justify-between w-full truncate">
                                            <span>{col.label}</span>
                                        </div>
                                        <div
                                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                            onMouseDown={(e) => handleResizeStart(e, col.id)}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-10 text-center text-gray-400">Không tìm thấy dữ liệu</td>
                                </tr>
                            ) : tableData.map((inv) => (
                                <tr key={inv.invoice_uuid} onClick={() => handleViewHtml(inv)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                                    {columns.filter(c => c.visible).map(col => (
                                        <td key={col.id} className="px-3 py-2 text-sm border-r border-gray-50 truncate border-b border-gray-100">
                                            {renderCell(inv, col.id)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                    <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Trang {page} / {pagination.last_page} ({pagination.total} bản ghi)</span>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition font-bold">Trước</button>
                            <button disabled={page === pagination.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition font-bold">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CHI TIẾT ĐỐI TÁC (MST) */}
            {viewingPartner && <PartnerDetailModal taxCode={viewingPartner} onClose={() => setViewingPartner(null)} />}

            {/* MODAL DÙNG CHUNG */}
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
                handlePrintInvoice={handlePrintInvoice}
                handleUpdateInvoice={fetchData}
            />
        </div>
    );
};

// ==========================================================
// MODAL CHI TIẾT ĐỐI TÁC THEO THUẾ
// ==========================================================
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
        <UI.Modal 
            isOpen={true} 
            onClose={onClose} 
            title="PHÂN TÍCH ĐỐI TÁC THEO DỮ LIỆU THUẾ"
            maxWidthClass="max-w-4xl"
        >
            <div className="p-6 bg-slate-50 min-h-[500px]">
                {loading ? (
                    <div className="py-20 text-center font-black text-slate-300 animate-pulse tracking-widest uppercase text-xs">Đang truy vấn dữ liệu XML...</div>
                ) : !data ? (
                    <div className="py-20 text-center text-slate-400">Không tìm thấy dữ liệu hóa đơn nào</div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header Info */}
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-tight">{data.partner?.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-black uppercase">MST: {taxCode}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nguồn: Dữ liệu hóa đơn XML</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Tổng mua vào</div>
                                    <div className="text-lg font-black text-purple-600">{formatCurrency(data.summary?.total_purchase)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Tổng bán ra</div>
                                    <div className="text-lg font-black text-blue-600">{formatCurrency(data.summary?.total_sale)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top items traded with this partner */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    📦 Mặt hàng giao dịch nhiều nhất
                                </h4>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {data.top_items?.length > 0 ? data.top_items.map((it, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-[11px] font-black text-slate-700 uppercase leading-tight line-clamp-2">{it.name}</div>
                                            <div className="flex justify-between mt-2 items-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Doanh số: <span className="text-slate-800">{formatCurrency(it.revenue)}</span></div>
                                                <div className="text-[10px] font-black text-blue-500">Qty: {it.qty}</div>
                                            </div>
                                        </div>
                                    )) : <div className="text-center py-10 text-slate-300 italic text-xs">Chưa có chi tiết dòng hàng</div>}
                                </div>
                            </div>

                            {/* Recent Invoices */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    📄 10 Hóa đơn gần nhất
                                </h4>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                    {data.recent_invoices?.map((inv, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2.5 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-black text-slate-800">Số: {inv.invoice_number}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{inv.invoice_date} · {inv.type.includes('purchase') ? 'MUA VÀO' : 'BÁN RA'}</div>
                                            </div>
                                            <div className="text-[11px] font-black text-slate-700">{formatCurrency(inv.total_amount)}</div>
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

// Component phụ KPICard
const KPICard = ({ title, value, count, color, customDisplay }) => {
    const colors = { blue: 'border-blue-500 bg-blue-50', purple: 'border-purple-500 bg-purple-50', emerald: 'border-emerald-500 bg-emerald-50', red: 'border-red-500 bg-red-50', orange: 'border-orange-500 bg-orange-50' };
    return (
        <div className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${colors[color] || colors.blue}`}>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">{title}</p>
            {customDisplay ? customDisplay : <h3 className="text-2xl font-bold mt-1 text-gray-800">{formatCurrency(value)}</h3>}
            {count !== undefined && <div className="mt-1 text-xs font-medium text-gray-400">{count} hóa đơn</div>}
        </div>
    );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx'; 
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, 
    BarChart, Bar 
} from 'recharts';
import { InvoiceModal } from '../components/InvoiceModal'; 

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
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

    // === 6. HANDLE VIEW HTML ===
    const handleViewHtml = async (inv) => {
        setModal({ open: true, data: inv, mode: 'html', html: null, loading: true });
        try { 
            const res = await axios.get(`/api/v1/invoices/${inv.invoice_uuid}/html`); 
            setModal(m => ({ ...m, html: res.data.html, loading: false })); 
        } catch(e) { 
            setModal(m => ({ ...m, html: '<div class="p-10 text-center text-red-500">Không tải được bản thể hiện. Vui lòng tải XML gốc.</div>', loading: false })); 
        }
    };

    // === 7. HELPERS DATE & RENDER CELL ===
    const handleQuickDate = (mode) => {
        const today = new Date();
        const start = new Date();
        switch(mode) {
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
        const partnerName = isPurchase ? (inv.data?.nbten || inv.seller_name_display) : (inv.data?.nmten || inv.buyer_name_display || 'Khách lẻ');
        const partnerTax = isPurchase ? inv.seller_tax_code : (inv.buyer_tax_code || '');

        switch (colId) {
            case 'date': 
                // return <span className="text-gray-700 font-medium">{formatDate(inv.invoice_date)}</span>;
                const realDate = inv.data?.tdlap || inv.invoice_date;
                return <span className="text-gray-700 font-medium">{formatDate(realDate)}</span>;
            case 'number': 
                return <span className="font-bold text-gray-800">{inv.invoice_number}</span>;
            case 'symbol': 
                return <span className="text-gray-500 text-xs">{inv.invoice_series}</span>;
            case 'partner':
                return (
                    <div className="flex flex-col" title={partnerName}>
                        <span className="font-medium text-blue-800 truncate text-[13px]">{partnerName}</span>
                    </div>
                );
            case 'tax_code':
                return <span className="text-gray-500 text-xs font-mono">{partnerTax}</span>;
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
                        <UI.Icon path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM10 12a2 2 0 114 0 2 2 0 01-4 0z" className="w-4 h-4"/>
                    </button>
                );
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans" onClick={() => setShowColMenu(false)}>
            {/* HEADER & FILTER SECTION */}
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 sticky top-0 z-20">
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UI.Icon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" className="w-6 h-6 text-blue-600"/>
                        Dashboard Hóa đơn
                    </h1>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex flex-wrap justify-end gap-1 mr-2 mb-2 sm:mb-0">
                            <QuickBtn label="Hôm nay" mode="today"/>
                            <QuickBtn label="3 ngày" mode="3days"/>
                            <QuickBtn label="Tháng này" mode="month"/>
                            <QuickBtn label="Năm nay" mode="year"/>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border">
                            <input type="date" value={dates.start} onChange={e => setDates(p =>({...p, start: e.target.value}))} className="bg-transparent text-sm font-semibold border-none outline-none w-24"/>
                            <span className="text-gray-400">➜</span>
                            <input type="date" value={dates.end} onChange={e => setDates(p =>({...p, end: e.target.value}))} className="bg-transparent text-sm font-semibold border-none outline-none w-24"/>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        {['sale', 'purchase', 'sale_cash_register', 'purchase_cash_register'].map(type => (
                            <label key={type} className="flex items-center gap-1.5 cursor-pointer select-none bg-gray-50 px-2 py-1 rounded border hover:bg-gray-100">
                                <UI.Checkbox checked={types[type]} onChange={e => setTypes(p => ({...p, [type]: e.target.checked}))} />
                                <span className="text-sm font-bold text-gray-700">
                                    {type === 'sale' ? 'Bán ra' : type === 'purchase' ? 'Mua vào' : type === 'sale_cash_register' ? 'MTT Bán' : 'MTT Mua'}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto relative">
                        {/* Nút Cấu hình Cột */}
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowColMenu(!showColMenu); }} className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                <UI.Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" className="w-4 h-4 text-gray-500"/>
                                Cột
                            </button>
                            {/* Dropdown Menu Cột */}
                            {showColMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white border rounded-lg shadow-xl z-50 p-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                                    <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Hiển thị cột</div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {columns.map(col => !col.fixed && (
                                            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={col.visible} 
                                                    onChange={() => setColumns(prev => prev.map(c => c.id === col.id ? {...c, visible: !c.visible} : c))}
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

                        <input type="text" placeholder="Tìm kiếm..." value={searchGroup} onChange={e => setSearchGroup(e.target.value)} onBlur={fetchData} onKeyDown={e => e.key === 'Enter' && fetchData()} className="w-full text-sm border-gray-300 rounded-lg pl-3 py-1.5 focus:ring-blue-500 border" />
                        <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap">Lọc</button>
                    </div>
                </div>
            </div>

            {/* CHARTS & KPI */}
            {!loading && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KPICard title="TỔNG BÁN RA" value={statsData.kpi.total_sale} count={statsData.kpi.count_sale} color="blue" />
                        <KPICard title="TỔNG MUA VÀO" value={statsData.kpi.total_purchase} count={statsData.kpi.count_purchase} color="purple" />
                        <KPICard title="CHÊNH LỆCH" value={statsData.kpi.net_revenue} color={statsData.kpi.net_revenue >= 0 ? "emerald" : "red"} />
                        <KPICard title="TỔNG SỐ HÓA ĐƠN" value={null} customDisplay={<div className="text-3xl font-bold text-gray-700 mt-1">{(statsData.kpi.count_sale || 0) + (statsData.kpi.count_purchase || 0)} <span className="text-sm font-normal text-gray-400">tờ</span></div>} color="orange" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border h-72">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsData.chart} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <defs>
                                        <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                                    <XAxis dataKey="date" tickFormatter={d => d.slice(5)} style={{fontSize: 11}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v => `${v/1000000}Tr`} style={{fontSize: 11}} axisLine={false} tickLine={false}/>
                                    <ReTooltip formatter={v => formatCurrency(v)} />
                                    <Area type="monotone" dataKey="sale" name="Bán ra" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSale)" />
                                    <Area type="monotone" dataKey="purchase" name="Mua vào" stroke="#a855f7" fillOpacity={1} fill="url(#colorPurchase)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData.chart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                                    <XAxis dataKey="date" tickFormatter={d => d.slice(8)} style={{fontSize: 11}} axisLine={false} tickLine={false}/>
                                    <YAxis allowDecimals={false} style={{fontSize: 11}} axisLine={false} tickLine={false}/>
                                    <ReTooltip cursor={{fill: '#f3f4f6'}} />
                                    <Bar dataKey="count" name="Số lượng" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* DYNAMIC RESIZABLE TABLE (PHẦN NÂNG CẤP) */}
            <div className="bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar flex-1" style={{ minHeight: '300px' }}>
                    <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0 table-fixed">
                        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
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
                                        {/* Resize Handle */}
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
                    <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center sticky bottom-0 z-10">
                        <span className="text-xs text-gray-500">Trang {page} / {pagination.last_page} ({pagination.total} bản ghi)</span>
                        <div className="flex gap-2">
                            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition">Trước</button>
                            <button disabled={page===pagination.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100 disabled:opacity-50 transition">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DÙNG CHUNG */}
            <InvoiceModal 
                isOpen={modal.open} 
                onClose={() => setModal({ ...modal, open: false })} 
                selectedInvoice={modal.data} 
                modalViewMode={modal.mode} 
                setModalViewMode={(mode) => setModal({...modal, mode})} 
                invoiceHtml={modal.html} 
                isHtmlLoading={modal.loading} 
                handleFetchInvoiceHtml={handleViewHtml} 
            />
        </div>
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
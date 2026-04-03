import React, { useState, useMemo, useEffect, memo, useRef } from 'react';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';

import { AnalysisCard } from '../../components/analysis/AnalysisCard.jsx';
import { Button, Icon } from '../../components/ui.jsx';
import { CustomerAnalysisModal } from '../../components/modals/CustomerAnalysisModal.jsx';
import { dateUtils } from '../../utils/dateUtils.js';
import { exportToExcel } from '../../utils/exportUtils.js';
import { useCustomerAnalytics, useRefreshAnalytics } from '../../hooks/useCustomerAnalytics.js';
import axios from 'axios';

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("Customer360 Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-10 text-center bg-rose-50 rounded-3xl border border-rose-100 m-6">
                    <div className="p-4 bg-rose-100 rounded-full text-rose-600 mb-4 animate-bounce">
                        <Icon path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-black text-rose-800 uppercase tracking-tight mb-2">Đã xảy ra lỗi giao diện</h2>
                    <p className="text-rose-600/80 mb-6 max-w-md mx-auto">{this.state.error?.message || "Hệ thống gặp sự cố không xác định."}</p>
                    <Button variant="primary" onClick={() => window.location.reload()}>Tải lại trang</Button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- COMPONENT MULTI DROP ---
const MultiDrop = ({ label, opts = [], val = [], setVal, k = 'code', n = 'name' }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);
    useEffect(() => { const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, []);
    const fOpts = useMemo(() => {
        let res = opts.filter(o => !txt || String(o[n] || '').toLowerCase().includes(txt.toLowerCase()) || String(o[k] || '').toLowerCase().includes(txt.toLowerCase()));
        return res.sort((a, b) => (val.includes(a[k]) === val.includes(b[k])) ? 0 : val.includes(a[k]) ? -1 : 1);
    }, [opts, txt, val, k, n]);
    const tog = (o) => setVal(val.includes(o[k]) ? val.filter(i => i !== o[k]) : [...val, o[k]]);
    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(!open)} className={`flex justify-between items-center min-w-[140px] max-w-[220px] px-3 py-2 text-[11px] font-bold border rounded-xl cursor-pointer shadow-sm transition-all ${val.length ? 'border-blue-500 ring-1 ring-blue-200 text-blue-700 font-black bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="truncate mr-2 uppercase tracking-tight">{val.length === 0 ? label : `${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">{val.length > 0 && <span onClick={(e) => { e.stopPropagation(); setVal([]) }} className="hover:text-red-500 font-bold px-1.5 text-sm">✖</span>}<span className="text-[8px] text-slate-400">▼</span></div>
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[400px] flex flex-col overflow-hidden left-0">
                    <div className="p-2 border-b border-slate-100 bg-slate-50"><input className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 outline-none transition-all" placeholder={`Tìm ${label}...`} value={txt} onChange={e => setTxt(e.target.value)} autoFocus /></div>
                    <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white"><span>Đã chọn: <b className="text-blue-600 font-black">{val.length}</b></span><button onClick={() => setVal(val.length === opts.length ? [] : opts.map(o => o[k]))} className="text-blue-600 hover:text-blue-800 transition-colors">{val.length === opts.length ? 'Bỏ hết' : 'Chọn tất cả'}</button></div>
                    <div className="overflow-y-auto flex-1 p-1">{fOpts.map(o => {
                        const isSel = val.includes(o[k]);
                        return <div key={o[k]} onClick={() => tog(o)} className={`flex items-center px-3 py-2.5 cursor-pointer rounded-xl text-xs mb-0.5 transition-colors ${isSel ? 'bg-blue-50 text-blue-800 font-black border-l-4 border-blue-500' : 'text-slate-700 font-medium hover:bg-slate-50'}`}><input type="checkbox" checked={isSel} readOnly className="mr-2.5 pointer-events-none accent-blue-600 rounded-sm" /><span className="truncate">{o[k] === o[n] ? o[n] : <>{o[n]} <span className="text-slate-400 font-normal text-[10px] ml-1">({o[k]})</span></>}</span></div>
                    })}</div>
                </div>
            )}
        </div>
    );
};

// Configuration for RFM Segments
const SEGMENT_CONFIG = {
    CHAMPION: { label: '💎 VIP', color: '#10b981', explain: 'Khách hàng chi tiêu nhiều & thường xuyên nhất' },
    LOYAL:    { label: '❤️ Trung Thành', color: '#3b82f6', explain: 'Thường xuyên mua hàng, mang lại dòng tiền ổn định' },
    WHALE:    { label: '💰 Đại Gia', color: '#f59e0b', explain: 'Không mua thường xuyên nhưng mua các gói thầu lớn' },
    NEW:      { label: '🌱 Mới', color: '#8b5cf6', explain: 'Khách hàng tiềm năng mới gia nhập hoặc có tín hiệu mua mới' },
    SLEEP:    { label: '💤 Ngủ Đông', color: '#6b7280', explain: 'Khách hàng cũ đang có dấu hiệu chững lại' },
    LOST:     { label: '⚠️ Rủi Ro', color: '#ef4444', explain: 'Rất lâu không phát sinh đơn, cần chiến dịch kéo lại' },
    REGULAR:  { label: 'Phổ thông', color: '#9ca3af', explain: 'Khách hàng vãng lai thông thường' }
};

// --- COMPONENT CON: RFM CONFIG MODAL ---
const RfmConfigModal = ({ isOpen, onClose, currentConfig, onSuccess }) => {
    const [cfg, setCfg] = useState(currentConfig);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => { setCfg(currentConfig); }, [currentConfig, isOpen]);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post('/api/v3/customer-analysis/config', cfg);
            onSuccess();
        } catch(e) { alert("Lỗi lưu cấu hình"); }
        finally { setIsSaving(false); }
    };
    
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2"><span>⚙️</span> Tùy chỉnh Luật RFM</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-2 bg-white rounded-xl shadow-sm">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Mốc tiền tính Đại Gia (VNĐ)</label>
                        <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-slate-800" value={cfg.whale_min} onChange={e => setCfg({...cfg, whale_min: Number(e.target.value)})} />
                        <div className="text-[10px] text-slate-400 mt-1">Khách mua nhiều hơn số này sẽ gán mác Đại gia</div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Khoảng ngày tính Khách Mới</label>
                        <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-slate-800" value={cfg.new_days} onChange={e => setCfg({...cfg, new_days: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Số ngày cảnh báo Ngủ Đông</label>
                        <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-slate-800" value={cfg.sleep_days} onChange={e => setCfg({...cfg, sleep_days: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-rose-500 uppercase mb-1">Số ngày rủi ro báo động Mất khách (!)</label>
                        <input type="number" className="w-full px-4 py-2 border rounded-xl font-bold bg-rose-50 text-rose-800" value={cfg.lost_days} onChange={e => setCfg({...cfg, lost_days: Number(e.target.value)})} />
                        <div className="text-[10px] text-slate-400 mt-1">Dành cho khách từng mua lớn nhưng bỏ đi quá lâu</div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase rounded-xl hover:bg-slate-200">Hủy</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 transition-colors">
                        {isSaving ? "Đang tính..." : "Lưu & Ép tính lại 🚀"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Chưa xác định';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : `${d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${d.toLocaleDateString('vi-VN')}`;
};

export const Customer360Content = ({ setAppTitle }) => {
    // 1. SET APP TITLE
    useEffect(() => {
        if (typeof setAppTitle === 'function') {
            setAppTitle('Hub Phân Tích Dữ Liệu 360°');
        }
    }, [setAppTitle]);

    // 2. STATES
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [fltSeg, setFltSeg] = useState('');
    const [fltMgr, setFltMgr] = useState('');
    const [fltCusGrp, setFltCusGrp] = useState([]);
    const [fltL1, setFltL1] = useState([]);
    const [fltL2, setFltL2] = useState([]);
    const [fltL3, setFltL3] = useState([]);
    const [viewCusId, setViewCusId] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    
    // Numeical filters
    const [showNumFilters, setShowNumFilters] = useState(false);
    const [numFilters, setNumFilters] = useState({
        orders_min: '', orders_max: '',
        total_min: '', total_max: '',
        avg_min: '', avg_max: ''
    });

    const defaultDates = dateUtils.getLast30Days();
    const [dateRange, setDateRange] = useState({ date_from: defaultDates.from, date_to: defaultDates.to });

    // 3. HOOKS
    const { data: apiResponse, isLoading, isPlaceholderData, isError, error: queryError, refetch } = useCustomerAnalytics({
        page, search, segment: fltSeg, manager: fltMgr, 
        customer_group: fltCusGrp.join(','), l1: fltL1.join(','), l2: fltL2.join(','), l3: fltL3.join(','),
        ...dateRange,
        ...numFilters
    });
    const refreshMutation = useRefreshAnalytics();

    // 4. DATA EXTRACTION
    const isProcessing = apiResponse?.status === 'processing';
    const results = apiResponse?.results || {};
    const customers = Array.isArray(results.data) ? results.data : [];
    const totalCount = results.total ?? 0;
    const currentPage = results.current_page || 1;
    const lastPage = results.last_page || 1;

    const metaOptions = useMemo(() => {
        const meta = apiResponse?.meta || {};
        return {
            segments: Array.isArray(meta.segments) ? meta.segments : [],
            managers: Array.isArray(meta.managers) ? meta.managers : [],
            customer_groups: Array.isArray(meta.customer_groups) ? meta.customer_groups : [],
            l1_options: Array.isArray(meta.l1_options) ? meta.l1_options : [],
            l2_options: Array.isArray(meta.l2_options) ? meta.l2_options : [],
            l3_options: Array.isArray(meta.l3_options) ? meta.l3_options : [],
            last_sync: meta.last_sync,
            is_stale: meta.is_stale,
            segment_stats: Array.isArray(meta.segment_stats) ? meta.segment_stats : [],
            total_revenue: meta.total_revenue || 0,
            rfm_config: meta.rfm_config || {
                lost_days: 180,
                sleep_days: 90,
                whale_min: 500000000,
                new_days: 30
            }
        };
    }, [apiResponse]);

    const dropOptions = useMemo(() => {
        const mapToObj = arr => arr.filter(Boolean).map(x => ({ code: x, name: x }));
        return {
            customer_groups: mapToObj(metaOptions.customer_groups),
            l1: mapToObj(metaOptions.l1_options),
            l2: mapToObj(metaOptions.l2_options),
            l3: mapToObj(metaOptions.l3_options),
        };
    }, [metaOptions]);

    const pieData = useMemo(() => {
        if (metaOptions.segment_stats.length === 0) return [];
        return metaOptions.segment_stats.map(s => ({
            code: s.segment_code,
            name: SEGMENT_CONFIG[s.segment_code]?.label || s.segment_code,
            value: Number(s.cust_count),
            revenue: Number(s.sum_revenue),
            color: SEGMENT_CONFIG[s.segment_code]?.color || '#9ca3af',
            last_buy: s.max_last_buy
        }));
    }, [metaOptions.segment_stats]);

    // Custom Tooltip cho PieChart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 text-white p-3 rounded-2xl shadow-xl border-none text-[11px] font-bold z-50">
                    <div style={{color: data.color}} className="uppercase tracking-widest mb-1">{data.name}</div>
                    <div>{new Intl.NumberFormat('vi-VN').format(data.value)} Khách</div>
                    <div className="text-slate-400 mt-1">Doanh số: <span className="text-emerald-400">{new Intl.NumberFormat('vi-VN').format(data.revenue)}đ</span></div>
                </div>
            );
        }
        return null;
    };

    // 5. HANDLERS
    const handleExportExcel = () => {
        if (customers.length === 0) return;
        const exportData = customers.map((c, idx) => ({
            '#': ((page-1)*50) + idx + 1, 'Mã': c.id, 'Tên': c.name, 'Phân hạng': c.segment_name,
            'Doanh số': c.revenue, 'Số đơn': c.order_count, 'Phụ trách': c.manager_name,
            'SĐT': c.phone, 'Ngày mua cuối': c.last_buy_date
        }));
        exportToExcel(exportData, `RFM_Snapshot_${dateRange.date_from}_to_${dateRange.date_to}`);
    };

    // 6. RENDER - CASE: LOADING / PROCESSING / ERROR
    if (isLoading && !isPlaceholderData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-slate-400">
                <div className="relative w-16 h-16 animate-spin">
                    <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)]"></div>
                </div>
                <div className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 animate-pulse">Khởi tạo Hub AI...</div>
            </div>
        );
    }

    if (isProcessing) {
        return (
            <div className="m-6 p-10 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-[2rem] border border-white/60 shadow-xl backdrop-blur-3xl relative">
                <div className="p-5 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-full mb-6 shadow-2xl animate-spin-slow z-10 relative">
                    <Icon path="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.937 6.937 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-blue-700 uppercase tracking-tighter mb-2 z-10">Đang đồng bộ thuật toán AI</h2>
                <p className="text-indigo-900/60 max-w-sm text-center text-xs font-medium leading-relaxed italic z-10">Hệ thống đang quét qua toàn bộ dữ liệu. Thao tác này mất chút thời gian nhưng sẽ giảm tải tối đa cho các lần truy vấn sau!</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="m-6 p-8 flex flex-col items-center justify-center min-h-[400px] bg-rose-50/50 rounded-3xl border border-rose-100 text-center">
                <div className="p-4 bg-rose-100 text-rose-600 rounded-full mb-4 animate-bounce"><Icon path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" className="w-8 h-8" /></div>
                <h3 className="text-lg font-black text-rose-800 uppercase tracking-tight">Trục trặc đường truyền</h3>
                <p className="text-rose-600/80 text-sm mt-1 max-w-sm mx-auto mb-6 italic">{queryError.response?.data?.message || queryError.message}</p>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => refetch()}>Thử Lại</Button>
                </div>
            </div>
        );
    }

    // 7. RENDER - CASE: NORMAL
    return (
        <ErrorBoundary>
            <div className="p-4 bg-[#f8fafc] min-h-[calc(100vh-4rem)] flex flex-col gap-4">
                
                {/* === TRẢ LẠI GIAO DIỆN CHUẨN - DỄ DÙNG === */}
                
                {/* 1. Header & Điều khiển nhanh */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                            <Icon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Hồ Sơ Khách Hàng 360°</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    Snapshot: <span className={metaOptions.is_stale ? 'text-amber-600' : 'text-emerald-600'}>{formatDateTime(metaOptions.last_sync)}</span>
                                </span>
                                {metaOptions.is_stale && (
                                    <span className="text-[10px] uppercase font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">Có đơn hàng mới</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="secondary" onClick={() => setShowConfig(true)} className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 uppercase text-[11px] font-black px-4 py-2">
                            <Icon path="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" className="w-4 h-4 mr-1.5" />
                            Cấu Hình
                        </Button>

                        <Button variant="secondary" onClick={handleExportExcel} disabled={customers.length === 0} className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 uppercase text-xs font-bold px-4 py-2">
                            <Icon path="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" className="w-4 h-4 mr-1.5" />
                            Xuất Excel
                        </Button>

                        <Button 
                            variant="primary" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white uppercase text-xs font-bold px-4 py-2"
                        >
                            <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" className={`w-4 h-4 mr-1.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                            {refreshMutation.isPending ? 'Đang ép tính lại...' : 'Chạy Làm Mới Snapshot'}
                        </Button>
                    </div>
                </div>

                {/* 2. Thống kê nhanh - Hiển thị TẤT CẢ 7 PHÂN HẠNG */}
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    <div className="col-span-2 lg:col-span-4 xl:col-span-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tổng Số Khách</div>
                        <div className="text-3xl font-black text-slate-800">{new Intl.NumberFormat('vi-VN').format(totalCount)}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Doanh Số Phễu</div>
                        <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 mt-0.5">
                            {new Intl.NumberFormat('vi-VN').format(metaOptions.total_revenue)} đ
                        </div>
                    </div>
                    {['CHAMPION', 'LOYAL', 'WHALE', 'NEW', 'REGULAR', 'SLEEP', 'LOST'].map(code => {
                        const seg = SEGMENT_CONFIG[code];
                        const stats = metaOptions.segment_stats.find(p => p.segment_code === code) || {};
                        const countInSeg = Number(stats.cust_count || 0);
                        const revInSeg = Number(stats.sum_revenue || 0);
                        const isSelected = fltSeg === code;
                        
                        return (
                            <div key={code} 
                                 onClick={() => { setFltSeg(isSelected ? '' : code); setPage(1); }}
                                 className={`bg-white p-3 rounded-2xl border shadow-sm flex flex-col justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group relative ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-100'}`}>
                                <div className="absolute top-2 right-2 flex items-center justify-center">
                                    <Icon path="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    <div className="absolute hidden group-hover:block bottom-full right-[-8px] mb-2 w-48 p-2.5 bg-slate-800 text-white text-[11px] font-medium leading-relaxed rounded-xl shadow-2xl z-50 text-left pointer-events-none">
                                        <div className="font-black mb-1 opacity-100" style={{color: seg.color}}>{seg.label}</div>
                                        {seg.explain}
                                        <div className="absolute top-full right-[10px] w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-slate-800 border-r-[6px] border-r-transparent"></div>
                                    </div>
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 truncate group-hover:text-slate-600 transition-colors pr-4">{seg.label}</div>
                                <div className="flex items-end gap-1">
                                    <div className="text-2xl font-black text-slate-800 tracking-tighter" style={{color: isSelected ? seg.color : ''}}>{new Intl.NumberFormat('vi-VN').format(countInSeg)}</div>
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-slate-400">Doanh số: <span className="text-slate-700">{new Intl.NumberFormat('vi-VN').format(revInSeg)}đ</span></div>
                                {stats.max_last_buy && <div className="text-[8px] text-slate-400 mt-0.5">GD: <b className="text-slate-600">{stats.max_last_buy}</b></div>}
                                
                                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${totalCount ? (countInSeg/totalCount)*100 : 0}%`, backgroundColor: seg.color }}></div></div>
                            </div>
                        );
                    })}
                </div>

                {/* 3. BẢNG DỮ LIỆU ĐẦY ĐỦ VỚI PHÂN TRANG (CHỮA LỖI UI) */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                    {/* BỘ LỌC */}
                    <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex-1 min-w-[240px] relative group">
                                <Icon path="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input 
                                    type="text" className="w-full pl-11 pr-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                                    placeholder="Tìm Tên, SĐT, Mã (Bấm Enter để tìm)..." 
                                    value={searchInput} 
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                                />
                            </div>
                            <select className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500 hover:border-slate-300 shadow-sm transition-colors" value={fltSeg} onChange={e => { setFltSeg(e.target.value); setPage(1); }}>
                                <option value="">- Tất cả phân hạng -</option>
                                {metaOptions.segments.map(s => <option key={s.code} value={s.code}>{s.name.toUpperCase()}</option>)}
                            </select>
                            <select className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500 hover:border-slate-300 shadow-sm transition-colors" value={fltMgr} onChange={e => { setFltMgr(e.target.value); setPage(1); }}>
                                <option value="">- Tất cả nhân viên -</option>
                                {metaOptions.managers.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                            
                            <div className="shrink-0 flex items-center bg-white text-blue-700 px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm ml-auto ring-1 ring-blue-50">
                                <span className="text-[10px] font-black uppercase tracking-widest mr-2 text-slate-400">Tìm thấy:</span>
                                <span className="text-base font-black tracking-tight">{new Intl.NumberFormat('vi-VN').format(totalCount)}</span>
                            </div>
                        </div>

                        {/* BỘ LỌC ĐA NĂNG */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-2 flex items-center gap-1">
                                <Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75" className="w-3.5 h-3.5" /> Bộ Lọc Chi Tiết
                            </div>
                            <MultiDrop label="Nhóm Khách Hàng" opts={dropOptions.customer_groups} val={fltCusGrp} setVal={v => { setFltCusGrp(v); setPage(1); }} />
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <MultiDrop label="Hành vi: Nhóm L1" opts={dropOptions.l1} val={fltL1} setVal={v => { setFltL1(v); setPage(1); }} />
                            <MultiDrop label="Nhóm L2" opts={dropOptions.l2} val={fltL2} setVal={v => { setFltL2(v); setPage(1); }} />
                            <MultiDrop label="Nhóm L3" opts={dropOptions.l3} val={fltL3} setVal={v => { setFltL3(v); setPage(1); }} />
                            
                            {/* [MỚI] NÚT VÀ DROPDOWN LỌC SỐ HỌC */}
                            <div className="relative">
                                <button onClick={() => setShowNumFilters(!showNumFilters)} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-colors ${(numFilters.orders_min || numFilters.orders_max || numFilters.total_min || numFilters.total_max || numFilters.avg_min || numFilters.avg_max) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-600'}`}>
                                    <Icon path="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5" />
                                    Lọc Dải Chỉ Số
                                </button>
                                {showNumFilters && (
                                    <div className="absolute top-10 left-0 w-[420px] z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-4 grid grid-cols-2 gap-4">
                                        <div className="col-span-2 text-xs font-black text-slate-700 uppercase border-b border-slate-100 pb-2">Tùy chỉnh khoảng Chỉ Số</div>
                                        
                                        <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Số lượng đơn hàng</div>
                                            <div className="flex gap-2">
                                                <input type="number" placeholder="Từ" value={numFilters.orders_min} onChange={e => setNumFilters({...numFilters, orders_min: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                                <input type="number" placeholder="Đến" value={numFilters.orders_max} onChange={e => setNumFilters({...numFilters, orders_max: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Tổng doanh số mua (VNĐ)</div>
                                            <div className="flex gap-2">
                                                <input type="number" placeholder="Từ (Tối thiểu)" value={numFilters.total_min} onChange={e => setNumFilters({...numFilters, total_min: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                                <input type="number" placeholder="Đến (Tối đa)" value={numFilters.total_max} onChange={e => setNumFilters({...numFilters, total_max: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Trung bình thu/đơn (VNĐ)</div>
                                            <div className="flex gap-2">
                                                <input type="number" placeholder="Từ" value={numFilters.avg_min} onChange={e => setNumFilters({...numFilters, avg_min: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                                <input type="number" placeholder="Đến" value={numFilters.avg_max} onChange={e => setNumFilters({...numFilters, avg_max: e.target.value})} className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors" />
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-2 flex justify-end gap-2 pt-3 mt-1 border-t border-slate-100">
                                            <button onClick={() => setNumFilters({orders_min:'',orders_max:'',total_min:'',total_max:'',avg_min:'',avg_max:''})} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg border border-transparent">Xóa Rỗng</button>
                                            <button onClick={() => {setShowNumFilters(false); setPage(1);}} className="px-5 py-1.5 text-[11px] font-black tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg uppercase shadow-md shadow-indigo-600/20">Áp dụng Lọc & Đóng</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Nút reset tổng hợp */}
                            {(fltCusGrp.length > 0 || fltL1.length > 0 || fltL2.length > 0 || fltL3.length > 0 || numFilters.orders_min || numFilters.orders_max || numFilters.total_min || numFilters.total_max || numFilters.avg_min || numFilters.avg_max) && (
                                <button onClick={() => { setFltCusGrp([]); setFltL1([]); setFltL2([]); setFltL3([]); setNumFilters({orders_min:'',orders_max:'',total_min:'',total_max:'',avg_min:'',avg_max:''}); setPage(1); }} className="text-[10px] font-black text-rose-500 uppercase hover:text-rose-700 ml-auto px-2 py-1.5 bg-rose-50 rounded-lg transition-colors border border-rose-100 whitespace-nowrap">Xác lập lại bộ lọc</button>
                            )}
                        </div>
                    </div>

                    {/* BẢNG RENDERING BÌNH THƯỜNG (BỎ VIRTUAL SCROLL CHỐNG LỖI) */}
                    <div className="flex-1 overflow-auto bg-white">
                        {customers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center h-full">
                                <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-12 h-12 text-slate-200 mb-4" />
                                <h4 className="font-black text-slate-600 uppercase tracking-tight">Không Có Dữ Liệu</h4>
                                <p className="text-sm text-slate-400 mt-1">Vui lòng điều chỉnh bộ lọc hoặc bấm Chạy Làm Mới Snapshot.</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                                        <th className="p-4 text-center w-16">STT</th>
                                        <th className="p-4">Khách Hàng / Đối Tác</th>
                                        <th className="p-4">Thông Tin Liên Hệ</th>
                                        <th className="p-4 text-center">Chỉ Số AI (R-F-M)</th>
                                        <th className="p-4 text-right">Doanh Số (VND)</th>
                                        <th className="p-4 text-center">Phân Hạng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {customers.map((cust, idx) => {
                                        const conf = SEGMENT_CONFIG[cust.segment_code] || SEGMENT_CONFIG.REGULAR;
                                        const globalIndex = (page - 1) * 50 + idx + 1;
                                        return (
                                            <tr key={cust.id} className="hover:bg-blue-50/80 cursor-pointer transition-colors group/row" onClick={() => setViewCusId(cust.id)}>
                                                <td className="p-4 text-center text-xs font-bold text-slate-500">{globalIndex}</td>
                                                <td className="p-4">
                                                    <div className="font-extrabold text-slate-900 text-[14.5px] leading-tight group-hover/row:text-blue-700 transition-colors">{cust.name}</div>
                                                    <div className="text-[11px] text-slate-500 mt-1.5 uppercase font-bold bg-slate-100 border border-slate-200 inline-flex items-center px-2 py-0.5 rounded-md shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{backgroundColor: conf.color}}></span>
                                                        {cust.id}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[13px] text-slate-800 font-bold flex items-center gap-2">
                                                        <Icon path="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h12" className="w-4 h-4 text-blue-500/70" />
                                                        {cust.phone || <span className="text-slate-300 font-normal">Trống</span>}
                                                    </div>
                                                    <div className="text-[11px] text-slate-600 mt-1.5 font-bold flex items-center gap-1.5">
                                                        <span className="w-1 h-3 bg-slate-300 rounded-full"></span>
                                                        NV: <span className="text-slate-900">{cust.manager_name || 'Chưa gán'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center group relative w-32">
                                                     <div className="bg-slate-50 rounded-xl py-2 border border-slate-100 group-hover/row:bg-white transition-colors">
                                                        <div className="flex justify-center items-baseline gap-1">
                                                            <span className="text-xl font-black" style={{color: conf.color}}>{Math.round((cust.r_score + cust.f_score + cust.m_score)/3)}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">/ 5 sao</span>
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-black mt-1 bg-white inline-block px-1.5 rounded-full border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                            R:{cust.r_score} F:{cust.f_score} M:{cust.m_score}
                                                        </div>
                                                     </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="font-black text-slate-900 text-[16px] tracking-tight">{new Intl.NumberFormat('vi-VN').format(cust.revenue || 0)} <span className="text-[10px] text-slate-400 font-bold">đ</span></div>
                                                    <div className="text-[11px] text-slate-500 mt-1 font-bold">
                                                        Mua cuối: <span className="text-slate-800 bg-amber-50 px-1.5 rounded border border-amber-100">{cust.last_buy_date || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border-2 shadow-sm" 
                                                         style={{ 
                                                            backgroundColor: `${conf.color}15`, 
                                                            color: conf.color, 
                                                            borderColor: `${conf.color}40` 
                                                         }}>
                                                        {cust.segment_name}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                        {isPlaceholderData && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center pointer-events-none z-20">
                                <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
                                    <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" className="w-5 h-5 animate-spin text-blue-600" />
                                    <span className="text-sm font-bold text-slate-600">Đang tải trang...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TRẢ LẠI THANH PHÂN TRANG CHUẨN */}
                    <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
                        <div className="text-sm text-slate-500 font-medium">
                            Đang xem Trang <b className="text-slate-800">{currentPage}</b> / {lastPage} (Tổng: <b className="text-slate-800">{totalCount}</b>)
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1 || isPlaceholderData}
                                className="px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold border-slate-200 hover:border-slate-300"
                            >
                                Trang Trước
                            </Button>
                            <Button 
                                variant="secondary" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage || isPlaceholderData}
                                className="px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold border-slate-200 hover:border-slate-300"
                            >
                                Trang Kế Tiếp
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Modals & CSS Animations */}
                {viewCusId && <CustomerAnalysisModal customerIdentifier={viewCusId} onClose={() => setViewCusId(null)} />}
                
                <RfmConfigModal 
                    isOpen={showConfig} 
                    onClose={() => setShowConfig(false)} 
                    currentConfig={metaOptions.rfm_config} 
                    onSuccess={() => { setShowConfig(false); refetch(); }} 
                />
                
                <style>{`
                    .animate-spin-slow { animation: spin 8s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </ErrorBoundary>
    );
};

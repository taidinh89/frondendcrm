// src/pages/Analytics/KpiScorecardPage.jsx
// Bảng điểm KPI thực chiến — ai đạt, ai trượt, click vào để xem chi tiết
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { Icon } from '../../components/ui.jsx';

import { ProductDetailModal }  from '../../components/modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal.jsx';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal.jsx';
import { EmployeePerformanceModal } from '../../components/modals/EmployeePerformanceModal.jsx';

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (v) => {
    if (!v && v !== 0) return '–';
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
};

const fmtFull = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

const STATUS_CONFIG = {
    achieved: { label: 'Đạt',        bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500',  emoji: '✅' },
    on_track: { label: 'Theo dõi',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   bar: 'bg-amber-400',    emoji: '⚠️' },
    behind:   { label: 'Chưa đạt',   bg: 'bg-rose-100',    text: 'text-rose-600',    dot: 'bg-rose-500',    bar: 'bg-rose-500',     emoji: '🔴' },
    no_target:{ label: 'Chưa có KPI',bg: 'bg-slate-100',   text: 'text-slate-400',   dot: 'bg-slate-300',   bar: 'bg-slate-200',    emoji: '–'  },
};

const TYPE_ICON = {
    employee: '👤', employee_group: '👥', customer: '🏪', customer_group: '🤝',
    supplier: '🚛', supplier_group: '🏢', brand: '🏷️', product: '📦',
    product_group_l2: '📂', global: '🌐',
};

const DEPARTMENTS = [
    { value: 'sales',      label: '💰 Kinh doanh' },
    { value: 'accounting', label: '📊 Kế toán' },
    { value: 'purchasing', label: '🛒 Mua hàng' },
    { value: 'hr',         label: '👥 Nhân sự' },
];

const PERIOD_TYPES = [
    { value: 'month',   label: 'Tháng' },
    { value: 'quarter', label: 'Quý' },
    { value: 'year',    label: 'Năm' },
];

// ─── Mini Progress Bar ──────────────────────────────────────────────────────
const ProgressBar = ({ pct, status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.no_target;
    const w = Math.min(Math.max(pct || 0, 0), 100);
    return (
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden w-full shadow-inner">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${cfg.bar} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                style={{ width: `${w}%` }}
            />
            {pct > 100 && (
                <div className="absolute inset-0 bg-emerald-400 opacity-20 animate-pulse" />
            )}
        </div>
    );
};

// ─── Scorecard Row ──────────────────────────────────────────────────────────
const ScorecardRow = ({ idx, item, onEntityClick }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.no_target;
    const isClickable = true; // Cho phép bấm vào tất cả để xem chi tiết
    const progressPct = item.pct || 0;

    return (
        <tr className="group hover:bg-blue-50/40 transition-all border-b border-slate-100/50">
            <td className="px-4 py-4 text-[10px] font-black text-slate-300 w-10">{idx}</td>
            <td className="px-4 py-4 min-w-[250px]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        {TYPE_ICON[item.target_type] || '🎯'}
                    </div>
                    <div>
                        <div
                            onClick={() => onEntityClick(item)}
                            className="font-black text-sm leading-tight text-slate-800 cursor-pointer hover:text-blue-600 hover:underline decoration-blue-300 decoration-2 transition-all"
                        >
                            {item.target_name || item.target_key || 'Toàn công ty'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {item.metric_name || item.metric}
                            </div>
                            <div className="text-[9px] font-bold text-slate-300 italic">
                                {item.target_type}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="text-sm font-black text-slate-700">{fmt(item.actual_value)}</div>
                <div className="text-[10px] text-slate-400">{item.unit}</div>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="text-sm font-bold text-slate-500">{fmt(item.target_value)}</div>
                <div className="text-[10px] text-slate-400">{item.unit}</div>
            </td>
            <td className="px-4 py-3 w-40">
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-black ${cfg.text}`}>{progressPct}%</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <ProgressBar pct={progressPct} status={item.status} />
                </div>
            </td>
            <td className="px-4 py-3">
                {item.diff !== null && item.diff !== undefined && (
                    <div className={`text-xs font-black ${item.diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {item.diff >= 0 ? '+' : ''}{fmt(item.diff)}
                    </div>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.target_type}</span>
                </div>
            </td>
        </tr>
    );
};

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
const KpiScorecardPage = () => {
    const [department,   setDepartment]   = useState('sales');
    const [periodType,   setPeriodType]   = useState('month');
    const [periodYear,   setPeriodYear]   = useState(moment().year());
    const [periodValue,  setPeriodValue]  = useState(moment().month() + 1);
    const [data,         setData]         = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');   // all | achieved | on_track | behind
    const [filterType,   setFilterType]   = useState('all');   // all | employee | product | customer ...
    const [search,       setSearch]       = useState('');
    const [sortKey,      setSortKey]      = useState('target_value');
    const [sortDir,      setSortDir]      = useState('desc');

    const [viewingProduct,  setViewingProduct]  = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [viewingBrand,    setViewingBrand]    = useState(null);
    const [viewingType,     setViewingType]     = useState('employee');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/kpi/dashboard', {
                params: { department, period_type: periodType, period_year: periodYear, period_value: periodValue, kpi_scope: 'global' }
            });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [department, periodType, periodYear, periodValue]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const summary = data?.summary || [];

    const uniqueTypes = useMemo(() => {
        const types = [...new Set(summary.map(s => s.target_type))];
        return types;
    }, [summary]);

    const filteredSorted = useMemo(() => {
        let items = summary.filter(s => {
            if (filterStatus !== 'all' && s.status !== filterStatus) return false;
            if (filterType !== 'all' && s.target_type !== filterType) return false;
            if (search) {
                const q = search.toLowerCase();
                const name = (s.target_name || s.target_key || '').toLowerCase();
                if (!name.includes(q)) return false;
            }
            return true;
        });

        items.sort((a, b) => {
            let aV = a[sortKey] ?? -Infinity;
            let bV = b[sortKey] ?? -Infinity;
            if (sortKey === 'target_name') { aV = (a.target_name || '').toLowerCase(); bV = (b.target_name || '').toLowerCase(); }
            if (aV < bV) return sortDir === 'asc' ? -1 : 1;
            if (aV > bV) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [summary, filterStatus, filterType, search, sortKey, sortDir]);

    const stats = useMemo(() => ({
        total:     summary.length,
        achieved:  summary.filter(s => s.status === 'achieved').length,
        on_track:  summary.filter(s => s.status === 'on_track').length,
        behind:    summary.filter(s => s.status === 'behind').length,
        achievePct: summary.length > 0 ? Math.round((summary.filter(s => s.status === 'achieved').length / summary.length) * 100) : 0,
    }), [summary]);

    const requestSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortTH = ({ label, col, className = '' }) => (
        <th onClick={() => requestSort(col)}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none hover:bg-slate-100 transition group ${className}`}>
            {label}
            {sortKey === col
                ? <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} className="inline-block ml-1 w-3 h-3 text-blue-600" />
                : <Icon name="chevron-down" className="inline-block ml-1 w-3 h-3 text-slate-200 opacity-0 group-hover:opacity-100" />}
        </th>
    );

    const handleEntityClick = (item) => {
        const key = item.target_key;
        const type = item.target_type;
        
        if (type === 'product') setViewingProduct(key);
        else if (type === 'customer') setViewingCustomer(key);
        else if (type === 'supplier') setViewingSupplier(key);
        else if (['employee', 'employee_group', 'customer_group', 'brand', 'product_group_l2'].includes(type)) {
            setViewingType(type);
            setViewingEmployee(key);
        }
        else {
            // Các loại khác chưa có modal riêng, có thê show thống kê chung sau này
            console.log("Click on", type, key);
        }
    };

    return (
        <div className="p-6 space-y-5 min-h-full bg-slate-50 flex flex-col">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        🏆 Bảng điểm KPI
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">Xem nhanh ai đang đạt mục tiêu — click vào tên để xem chi tiết</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/kpi/setup" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                        <Icon name="edit" className="w-4 h-4" /> Nhập mục tiêu
                    </Link>
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all">
                        <Icon name="refresh-cw" className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <select value={department} onChange={e => setDepartment(e.target.value)} className="sc-select">
                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select value={periodType} onChange={e => { setPeriodType(e.target.value); setPeriodValue(1); }} className="sc-select">
                    {PERIOD_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {periodType === 'month' && (
                    <select value={periodValue} onChange={e => setPeriodValue(+e.target.value)} className="sc-select">
                        {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                )}
                {periodType === 'quarter' && (
                    <select value={periodValue} onChange={e => setPeriodValue(+e.target.value)} className="sc-select">
                        {[1,2,3,4].map(q=><option key={q} value={q}>Quý {q}</option>)}
                    </select>
                )}
                <input type="number" value={periodYear} onChange={e => setPeriodYear(+e.target.value)} className="sc-select w-24" />
                <button onClick={fetchData} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-black text-sm hover:bg-blue-600 transition-all">Xem</button>

                <div className="border-l border-slate-200 h-6 mx-1" />

                {/* Filter by status */}
                <div className="flex gap-1.5">
                    {['all','achieved','on_track','behind'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                                filterStatus === s
                                    ? s === 'achieved' ? 'bg-emerald-500 text-white border-emerald-500'
                                    : s === 'on_track' ? 'bg-amber-400 text-white border-amber-400'
                                    : s === 'behind'   ? 'bg-rose-500 text-white border-rose-500'
                                    : 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}>
                            {s === 'all' ? '🗂️ Tất cả' : STATUS_CONFIG[s].emoji + ' ' + STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>

                {/* Filter by type */}
                {uniqueTypes.length > 1 && (
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="sc-select ml-auto">
                        <option value="all">🔍 Mọi loại</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}
                    </select>
                )}

                {/* Search */}
                <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm tên..." className="sc-input pl-8 w-44" />
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 shrink-0">
                {[
                    { label: 'Tổng KPI', value: stats.total, color: 'blue',    icon: '📋', sub: `${data?.period?.dateFrom || ''} → ${data?.period?.dateTo || ''}` },
                    { label: 'Đã đạt',   value: stats.achieved, color: 'emerald', icon: '🏆', sub: `${stats.achievePct}% trên tổng số` },
                    { label: 'Theo dõi', value: stats.on_track, color: 'amber',   icon: '📈', sub: 'Tiến độ 70% - 99%' },
                    { label: 'Chưa đạt', value: stats.behind,   color: 'rose',    icon: '⚠️', sub: 'Cần nỗ lực thêm' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${c.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all duration-300">{c.icon}</span>
                            <span className={`text-4xl font-black text-${c.color}-600 tracking-tighter`}>{c.value}</span>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{c.label}</div>
                        <div className="text-[10px] text-slate-300 mt-1 relative z-10 font-medium">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── TABLE ── */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="py-24 text-center text-slate-300 font-bold animate-pulse uppercase text-xs tracking-widest">
                            ⚡ Đang tính toán bảng điểm...
                        </div>
                    ) : filteredSorted.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="text-5xl mb-4">🏆</div>
                            <p className="text-slate-400 font-bold">Không tìm thấy KPI phù hợp</p>
                            <a href="/kpi/entry" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition">
                                → Đặt mục tiêu ngay
                            </a>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                <tr className="text-left border-b border-slate-100">
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 w-10 bg-slate-50/50">#</th>
                                    <SortTH label="Đối tượng mục tiêu"  col="target_name" className="text-slate-600 min-w-[250px] bg-slate-50/50" />
                                    <SortTH label="Thực đạt"    col="actual_value" className="text-slate-500 text-right bg-slate-50/50" />
                                    <SortTH label="Chỉ tiêu"   col="target_value" className="text-slate-500 text-right bg-slate-50/50" />
                                    <SortTH label="Tiến độ thực"  col="pct"          className="text-blue-600 w-44 bg-slate-50/50" />
                                    <SortTH label="Hơn/Kém" col="diff"         className="text-slate-500 bg-slate-50/50" />
                                    <SortTH label="Loại hình"   col="target_type"  className="text-slate-400 bg-slate-50/50" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSorted.map((item, i) => (
                                    <ScorecardRow
                                        key={item.id}
                                        idx={i + 1}
                                        item={item}
                                        onEntityClick={handleEntityClick}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-4 py-2 bg-slate-50 border-t text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                    <span>Hiển thị {filteredSorted.length} / {summary.length} KPI</span>
                    <span className="text-blue-500">Click tên SP/KH/NCC → xem chi tiết</span>
                </div>
            </div>

            {/* ── MODALS ── */}
            {viewingProduct  && <ProductDetailModal  productId={viewingProduct}   onClose={() => setViewingProduct(null)} />}
            {viewingCustomer && <CustomerDetailModal customerId={viewingCustomer} onClose={() => setViewingCustomer(null)} />}
            {viewingSupplier && <SupplierDetailModal supplierId={viewingSupplier} onClose={() => setViewingSupplier(null)} />}
            
            {viewingEmployee && (
                <EmployeePerformanceModal 
                    employeeId={viewingEmployee} 
                    onClose={() => setViewingEmployee(null)} 
                    type={viewingType}
                    dateRange={{
                        date_from: data?.period?.dateFrom,
                        date_to: data?.period?.dateTo
                    }}
                />
            )}

            {/* Brand Detail Placeholder (Can be linked to BrandSelectionModal if needed) */}
            {viewingBrand && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden relative border border-white/20">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">🏷️ Thương hiệu: {viewingBrand}</h3>
                            <button onClick={() => setViewingBrand(null)} className="font-black text-slate-400 hover:text-rose-500">✕</button>
                        </div>
                        <div className="p-12 text-center">
                            <p className="text-slate-500 font-medium">Báo cáo thương hiệu chi tiết đang được tách ra module riêng để hiển thị đầy đủ tồn kho và doanh số từng nhóm SP.</p>
                            <button onClick={() => setViewingBrand(null)} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-xl font-black">Quay lại</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .sc-select { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#334155; outline:none; transition:all .15s; }
                .sc-select:focus { border-color:#3b82f6; background:white; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
                .sc-input  { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:600; color:#334155; outline:none; transition:all .15s; }
                .sc-input:focus { border-color:#3b82f6; background:white; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
                .custom-scrollbar::-webkit-scrollbar { width:6px; height:6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background:#f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#cbd5e1; }
            `}</style>
        </div>
    );
};

export default KpiScorecardPage;

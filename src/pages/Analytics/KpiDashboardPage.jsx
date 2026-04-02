// src/pages/Analytics/KpiDashboardPage.jsx
// Dashboard KPI đơn giản hóa — Tổng quan chiến lược, không ôm đồm
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Icon } from '../../components/ui.jsx';

import { ProductDetailModal }  from '../../components/modals/ProductDetailModal.jsx';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal.jsx';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal.jsx';
import { EmployeePerformanceModal } from '../../components/modals/EmployeePerformanceModal.jsx';

// ─── Constants ──────────────────────────────────────────────────────────────
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

const STATUS_COLOR = { achieved: '#10b981', on_track: '#f59e0b', behind: '#ef4444', no_target: '#94a3b8' };
const STATUS_LABEL = { achieved: 'Đạt', on_track: 'Đang theo dõi', behind: 'Chưa đạt', no_target: 'Chưa có KPI' };

const fmt = (v) => {
    if (!v && v !== 0) return '–';
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
};

// ─── Custom Tooltip cho chart ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white rounded-xl px-4 py-2 shadow-2xl text-xs">
            <div className="font-black mb-1">{label}</div>
            {payload.map(p => (
                <div key={p.name} className="flex justify-between gap-4">
                    <span className="opacity-70">{p.name}</span>
                    <span className="font-black">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Gauge Widget ────────────────────────────────────────────────────────────
const GaugeWidget = ({ value, label, color, max = 100 }) => {
    const pct = Math.min(Math.max(value || 0, 0), 100);
    const angle = (pct / 100) * 180;
    const r = 60;
    const cx = 80, cy = 80;
    const toRad = (deg) => (deg - 180) * Math.PI / 180;
    const x = cx + r * Math.cos(toRad(angle));
    const y = cy + r * Math.sin(toRad(angle));
    return (
        <div className="flex flex-col items-center">
            <svg width={160} height={90} viewBox="0 0 160 90">
                <path d={`M20,80 A60,60 0 0,1 140,80`} fill="none" stroke="#e2e8f0" strokeWidth={12} strokeLinecap="round" />
                <path
                    d={`M20,80 A60,60 0 0,1 ${x},${y}`}
                    fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
                    style={{ transition: 'all 1s' }}
                />
                <text x={80} y={72} textAnchor="middle" fontSize={22} fontWeight={900} fill={color}>{pct}%</text>
            </svg>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest -mt-2">{label}</div>
        </div>
    );
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
const KpiDashboardPage = () => {
    const [department,  setDepartment]  = useState('sales');
    const [periodType,  setPeriodType]  = useState('month');
    const [periodYear,  setPeriodYear]  = useState(moment().year());
    const [periodValue, setPeriodValue] = useState(moment().month() + 1);
    const [data,        setData]        = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [history,     setHistory]     = useState([]); // Multi-month trend

    // Drilling Modals
    const [viewingProduct,  setViewingProduct]  = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [viewingType,     setViewingType]     = useState('employee');

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/kpi/dashboard', {
                params: { department, period_type: periodType, period_year: periodYear, period_value: periodValue, kpi_scope: 'global' }
            });
            setData(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [department, periodType, periodYear, periodValue]);

    // Lấy lịch sử 6 tháng để vẽ trend
    const fetchHistory = useCallback(async () => {
        if (periodType !== 'month') return;
        try {
            const promises = [];
            for (let i = 5; i >= 0; i--) {
                const m = moment().subtract(i, 'months');
                promises.push(
                    axios.get('/api/v2/kpi/dashboard', {
                        params: { department, period_type: 'month', period_year: m.year(), period_value: m.month() + 1, kpi_scope: 'global' }
                    }).then(r => ({
                        month: m.format('MM/YYYY'),
                        achieved: r.data?.summary?.filter(s => s.status === 'achieved').length || 0,
                        total: r.data?.summary?.length || 0,
                    }))
                );
            }
            const results = await Promise.all(promises);
            setHistory(results);
        } catch (e) { /* ignore */ }
    }, [department, periodType]);

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
    };

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const summary  = data?.summary  || [];
    const byType   = data?.by_type  || {};

    const stats = useMemo(() => ({
        total:       summary.length,
        achieved:    summary.filter(s => s.status === 'achieved').length,
        on_track:    summary.filter(s => s.status === 'on_track').length,
        behind:      summary.filter(s => s.status === 'behind').length,
        achievePct:  summary.length > 0 ? Math.round((summary.filter(s => s.status === 'achieved').length / summary.length) * 100) : 0,
        avgPct:      summary.length > 0 ? Math.round(summary.reduce((a, s) => a + (s.pct || 0), 0) / summary.length) : 0,
    }), [summary]);

    // Top performers và bottom performers
    const withPct = summary.filter(s => s.has_target);
    const topPerformers    = [...withPct].sort((a,b) => (b.pct||0) - (a.pct||0)).slice(0, 5);
    const bottomPerformers = [...withPct].sort((a,b) => (a.pct||0) - (b.pct||0)).slice(0, 5);

    // Pie data cho biểu đồ trạng thái
    const statusBreakdown = [
        { name: 'Đạt',       value: stats.achieved,  color: '#10b981' },
        { name: 'Theo dõi',  value: stats.on_track,  color: '#f59e0b' },
        { name: 'Chưa đạt', value: stats.behind,    color: '#ef4444' },
    ].filter(s => s.value > 0);

    return (
        <div className="p-6 space-y-6 min-h-full bg-slate-50">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">🎯 Tổng quan KPI</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Chiến lược & xu hướng — thực chiến xem tại <Link to="/kpi/scorecard" className="text-blue-500 font-bold hover:underline">Bảng điểm</Link></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link to="/kpi/scorecard" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-100">
                        <Icon name="bar-chart" className="w-4 h-4" /> Bảng điểm
                    </Link>
                    <Link to="/kpi/setup" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:border-blue-300 hover:text-blue-600 transition flex items-center gap-2">
                        <Icon name="edit" className="w-4 h-4" /> Nhập mục tiêu
                    </Link>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                {DEPARTMENTS.map(d => (
                    <button key={d.value} onClick={() => setDepartment(d.value)}
                        className={`px-4 py-2 rounded-xl font-black text-sm transition-all border ${
                            department === d.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}>{d.label}</button>
                ))}
                <div className="border-l border-slate-200 h-6 mx-1" />
                <select value={periodType} onChange={e => { setPeriodType(e.target.value); setPeriodValue(1); }} className="kd-select">
                    {PERIOD_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {periodType === 'month' && (
                    <select value={periodValue} onChange={e => setPeriodValue(+e.target.value)} className="kd-select">
                        {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                )}
                {periodType === 'quarter' && (
                    <select value={periodValue} onChange={e => setPeriodValue(+e.target.value)} className="kd-select">
                        {[1,2,3,4].map(q=><option key={q} value={q}>Quý {q}</option>)}
                    </select>
                )}
                <input type="number" value={periodYear} onChange={e => setPeriodYear(+e.target.value)} className="kd-select w-24" />
                <button onClick={fetchDashboard} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-black text-sm hover:bg-blue-600 transition-all">Xem</button>
                {data?.period && (
                    <span className="text-xs text-slate-300 ml-auto font-bold">{data.period.dateFrom} → {data.period.dateTo}</span>
                )}
            </div>

            {loading ? (
                <div className="py-32 text-center text-slate-300 font-bold animate-pulse uppercase text-xs tracking-widest">
                    ⚡ Đang tổng hợp dữ liệu KPI...
                </div>
            ) : (
                <>
                    {/* ── TOP ROW: Gauge + Stats ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Gauge tỷ lệ đạt */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
                            <GaugeWidget value={stats.achievePct} label="Tỷ lệ đạt KPI" color="#10b981" />
                            <div className="mt-3 text-center">
                                <div className="text-sm text-slate-400">Trung bình tiến độ</div>
                                <div className="text-2xl font-black text-blue-600">{stats.avgPct}%</div>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Tổng KPI', value: stats.total,    color: 'slate',   icon: '📋' },
                                { label: 'Đã đạt',   value: stats.achieved, color: 'emerald', icon: '✅' },
                                { label: 'Theo dõi', value: stats.on_track, color: 'amber',   icon: '⚠️' },
                                { label: 'Chưa đạt', value: stats.behind,   color: 'rose',    icon: '🔴' },
                            ].map(c => (
                                <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all cursor-default">
                                    <div className="text-2xl mb-2">{c.icon}</div>
                                    <div className={`text-3xl font-black text-${c.color}-600`}>{c.value}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{c.label}</div>
                                </div>
                            ))}

                            {/* Mini bar chart by type */}
                            <div className="col-span-2 md:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Trạng thái theo loại đối tượng</div>
                                <div className="space-y-2">
                                    {Object.entries(byType).map(([type, items]) => {
                                        const ach = items.filter(i => i.status === 'achieved').length;
                                        const total = items.length;
                                        const pct = total > 0 ? Math.round(ach/total*100) : 0;
                                        return (
                                            <div key={type} className="flex items-center gap-3">
                                                <div className="w-28 text-[11px] font-bold text-slate-500 shrink-0 truncate">{type}</div>
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%`, transition: 'width 1s' }} />
                                                </div>
                                                <div className="w-12 text-right text-[11px] font-black text-blue-600">{pct}%</div>
                                                <div className="text-[10px] text-slate-300">{ach}/{total}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── TREND CHART (6 tháng) ── */}
                    {periodType === 'month' && history.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                📈 Xu hướng số KPI đạt — 6 tháng gần nhất
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="achieved" name="Đạt" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
                                    <Area type="monotone" dataKey="total" name="Tổng" stroke="#e2e8f0" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* ── TOP & BOTTOM PERFORMERS ── */}
                    {summary.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Top performers */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">🏅 Top 5 — Tiến độ tốt nhất</div>
                                <div className="space-y-3">
                                    {topPerformers.map((item, i) => (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                                i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : 'bg-amber-700/30 text-amber-700'
                                            }`}>{i+1}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-black text-slate-700 truncate cursor-pointer hover:text-blue-600 hover:underline transition-all"
                                                     onClick={() => handleEntityClick(item)}>
                                                    {item.target_name || item.target_key}
                                                </div>
                                                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(item.pct||0,100)}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-sm font-black text-emerald-600 shrink-0">{item.pct}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom performers */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">🚨 Top 5 — Cần chú ý nhất</div>
                                <div className="space-y-3">
                                    {bottomPerformers.map((item, i) => (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 bg-rose-100 text-rose-600">{i+1}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-black text-slate-700 truncate cursor-pointer hover:text-blue-600 hover:underline transition-all"
                                                     onClick={() => handleEntityClick(item)}>
                                                    {item.target_name || item.target_key}
                                                </div>
                                                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(item.pct||0,100)}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-sm font-black text-rose-600 shrink-0">{item.pct}%</div>
                                        </div>
                                    ))}
                                </div>
                                <a href="/kpi/scorecard" className="mt-4 flex items-center justify-center gap-2 text-[11px] font-black text-blue-600 hover:underline">
                                    Xem đầy đủ tại Bảng điểm →
                                </a>
                            </div>
                        </div>
                    )}

                    {summary.length === 0 && !loading && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-24 text-center">
                            <div className="text-5xl mb-4">🎯</div>
                            <h3 className="text-slate-500 font-black text-lg">Chưa có KPI trong kỳ này</h3>
                            <p className="text-slate-400 text-sm mt-1">Bắt đầu bằng cách đặt mục tiêu cho nhân viên hoặc sản phẩm</p>
                            <div className="flex gap-3 justify-center mt-5">
                                <a href="/kpi/entry" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                                    + Đặt mục tiêu đầu tiên
                                </a>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
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

            <style>{`
                .kd-select { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#334155; outline:none; transition:all .15s; }
                .kd-select:focus { border-color:#3b82f6; background:white; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
            `}</style>
        </div>
    );
};

export default KpiDashboardPage;

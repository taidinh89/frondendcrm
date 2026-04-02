import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Icon } from '../../components/ui.jsx';
import { FastUpdateModal } from './KpiPerformancePage'; // Assuming it's in the same or separate file but here we keep it locally if needed
import { EmployeePerformanceModal } from '../../components/modals/EmployeePerformanceModal';
import { ProductDetailModal } from '../../components/modals/ProductDetailModal';
import { CustomerDetailModal } from '../../components/modals/CustomerDetailModal';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal';

// Mock/Import helper for formatting
const fmt = (v) => v ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : '0';

/**
 * PAGE: HIỆU SUẤT & PHÂN BỔ KPI (V2 PREMIUM)
 * -----------------------------------------
 * Dashboard 360 độ theo dõi thực đạt sales, lợi nhuận và gán mục tiêu KPI linh hoạt.
 */
const KpiPerformancePage = () => {
    // 1. State & Filters
    const [periodYear,  setPeriodYear]  = useState(nowYear());
    const [periodValue, setPeriodValue] = useState(nowMonth());
    const [targetType,  setTargetType]  = useState('employee');
    const [loading,     setLoading]     = useState(true);
    const [data,        setData]        = useState(null);
    const [sort,        setSort]        = useState({ key: 'revenue', dir: 'desc' });
    const [editItem,    setEditItem]    = useState(null);

    // Date Range state for dynamic filtering
    const [dateRange, setDateRange] = useState({
        start: moment().startOf('month').format('YYYY-MM-DD'),
        end:   moment().endOf('month').format('YYYY-MM-DD')
    });
    const [dateMode, setDateMode] = useState('month');

    // Drill-down Modals
    const [viewingProduct,  setViewingProduct]  = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [viewingType,     setViewingType]     = useState('employee');

    function nowYear()  { return moment().year(); }
    function nowMonth() { return moment().month() + 1; }

    const handleQuickDate = (mode) => {
        setDateMode(mode);
        let start = moment();
        let end = moment();
        switch(mode) {
            case '7_days': start = moment().subtract(7, 'days'); break;
            case '30_days': start = moment().subtract(30, 'days'); break;
            case '90_days': start = moment().subtract(90, 'days'); break;
            case 'month':   start = moment().startOf('month'); end = moment().endOf('month'); break;
            case 'last_month': start = moment().subtract(1, 'month').startOf('month'); end = moment().subtract(1, 'month').endOf('month'); break;
            case 'all': start = moment('2020-01-01'); end = moment(); break;
            default: start = moment().startOf('month'); end = moment().endOf('month');
        }
        setDateRange({ start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') });
        if (mode === 'month') {
            setPeriodValue(start.month() + 1);
            setPeriodYear(start.year());
        }
    };

    const fetchPerformance = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/kpi/performance', {
                params: { 
                    period_type: 'month', 
                    period_year: periodYear, 
                    period_value: periodValue, 
                    target_type: targetType,
                    date_from: dateRange.start,
                    date_to:   dateRange.end
                }
            });
            setData(res.data);
        } catch (e) {
            console.error('Lỗi khi fetch KPI performance:', e);
        } finally {
            setLoading(false);
        }
    }, [periodYear, periodValue, targetType, dateRange]);

    useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

    const sortedRows = useMemo(() => {
        if (!data?.rows) return [];
        return [...data.rows].sort((a,b) => {
            const va = a[sort.key] || 0;
            const vb = b[sort.key] || 0;
            return sort.dir === 'asc' ? va - vb : vb - va;
        });
    }, [data, sort]);

    const handleSort = (k) => setSort(prev => ({ key: k, dir: prev.key === k && prev.dir === 'desc' ? 'asc' : 'desc' }));

    const handleEntityClick = (row) => {
        const key = row.entity_key;
        const type = row.target_type || targetType;
        
        if (type === 'product') setViewingProduct(key);
        else if (type === 'customer') setViewingCustomer(key);
        else if (type === 'supplier') setViewingSupplier(key);
        else if (['employee', 'customer_group', 'brand', 'product_group_l2'].includes(type)) {
            setViewingType(type);
            setViewingEmployee(key);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="text-4xl text-blue-600 animate-pulse">🎯</span> Hiệu suất & Phân bổ KPI
                    </h1>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Báo cáo thực đạt thời gian thực — Tự động tính toán Pacing & Phủ mục tiêu</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm grow-0 shrink-0">
                    {[
                        { id: 'employee', label: 'Nhân viên', icon: 'user' },
                        { id: 'customer_group', label: 'Nhóm khách', icon: 'users' },
                        { id: 'product', label: 'Sản phẩm', icon: 'package' },
                        { id: 'brand', label: 'Thương hiệu', icon: 'tag' }
                    ].map(t => (
                        <button key={t.id} onClick={() => setTargetType(t.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                targetType === t.id ? 'bg-slate-800 text-white shadow-xl shadow-slate-200 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}>
                            <Icon name={t.icon} className="w-3.5 h-3.5" /> {t.label.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Summary Grid (Premium style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tổng doanh thu', value: fmt(data?.summary?.total_revenue), sub: 'Thực đạt kỳ này', color: 'blue', icon: '💰' },
                    { label: 'Tổng lợi nhuận', value: fmt(data?.summary?.total_profit), sub: 'Biên LN: ' + (data?.summary?.avg_margin || 0).toFixed(1) + '%', color: 'emerald', icon: '🏆' },
                    { label: 'Đã gán KPI', value: (data?.summary?.entities_with_kpi || 0) + ' / ' + (data?.rows?.length || 0), sub: 'Tỷ lệ phủ mục tiêu', color: 'amber', icon: '🎯' },
                    { label: 'Trạng thái', value: (data?.summary?.entities_achieved || 0) + ' Đạt', sub: (data?.summary?.entities_behind || 0) + ' Cần cố gắng', color: 'rose', icon: '🔥' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group transition-all hover:-translate-y-1">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${s.color === 'emerald' ? 'green' : s.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-2xl">{s.icon}</span>
                            <span className={`text-2xl font-black text-${s.color === 'emerald' ? 'green' : s.color}-600 tracking-tighter`}>{s.value}</span>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-bold italic">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Controls */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bộ lọc thời gian</div>
                            <div className="space-y-3">
                                <div className="relative">
                                    <select 
                                        value={dateMode}
                                        onChange={(e) => handleQuickDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="month">Tùy chọn theo tháng</option>
                                        <option value="7_days">7 ngày vừa qua</option>
                                        <option value="30_days">30 ngày vừa qua</option>
                                        <option value="90_days">90 ngày vừa qua</option>
                                        <option value="last_month">Tháng trước đó</option>
                                    </select>
                                    <Icon name="calendar" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>

                                {dateMode === 'month' && (
                                    <div className="flex gap-2 animate-fadeIn">
                                        <select value={periodValue} onChange={e=>setPeriodValue(+e.target.value)} className="kd-select flex-1">
                                            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                                        </select>
                                        <input type="number" value={periodYear} onChange={e=>setPeriodYear(+e.target.value)} className="kd-select w-24" />
                                    </div>
                                )}

                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <input type="date" value={dateRange.start} onChange={e=>setDateRange({...dateRange, start:e.target.value})} className="bg-transparent text-[11px] font-black text-slate-600 focus:outline-none w-full" />
                                    <span className="text-slate-300">→</span>
                                    <input type="date" value={dateRange.end} onChange={e=>setDateRange({...dateRange, end:e.target.value})} className="bg-transparent text-[11px] font-black text-slate-600 focus:outline-none w-full" />
                                </div>
                            </div>
                        </div>

                        <button onClick={fetchPerformance} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95">
                            <Icon name="refresh" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
                            {loading ? 'Đang cập nhật...' : 'Cập nhật ngay'}
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-200">
                        <div className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Mẹo tăng hiệu suất</div>
                        <p className="text-sm font-bold leading-relaxed">Luôn gán KPI tối thiểu 80% cho nhân sự mới để duy trì động lực làm việc trong giai đoạn đầu.</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-black">
                            <span>Sửa KPI nhanh</span> <Icon name="arrow-right" className="w-3 h-3" />
                        </div>
                    </div>
                </div>

                {/* Main Table Content */}
                <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đối tượng / Mã</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition" onClick={()=>handleSort('revenue')}>
                                        Thực đạt {sort.key === 'revenue' && (sort.dir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ KPI Doanh thu</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">KPI Lợi nhuận</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-bold animate-pulse text-xs uppercase tracking-widest">⚡ Đang xử lý dữ liệu Big-Data...</td></tr>
                                ) : sortedRows.length === 0 ? (
                                    <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-black uppercase tracking-widest italic">Không tìm thấy dữ liệu phát sinh trong kỳ này</td></tr>
                                ) : sortedRows.map(row => (
                                    <tr key={row.entity_key} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                                        <td className="px-6 py-5">
                                            <div onClick={() => handleEntityClick(row)} className="font-black text-slate-800 cursor-pointer hover:text-blue-600 hover:underline transition-all decoration-2 underline-offset-4">
                                                {row.entity_name}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{row.entity_key}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-black text-slate-800 text-lg tracking-tight">{fmt(row.revenue)}</div>
                                            <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Margin: {row.margin_pct}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 min-w-[240px]">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase">
                                                    <span className="text-slate-400">KPI: {row.revenue_target ? fmt(row.revenue_target) : '–'}</span>
                                                    <span className={`${row.revenue_status === 'achieved' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                        {row.revenue_pct || 0}%
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            row.revenue_status === 'achieved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 
                                                            row.revenue_status === 'behind' ? 'bg-rose-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${Math.min(row.revenue_pct || 0, 100)}%` }} 
                                                    />
                                                </div>
                                                {row.revenue_pacing_pct !== null && (
                                                    <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                        <span className="text-slate-300 italic tracking-tighter">Tiến độ đến hôm nay</span>
                                                        <span className={row.revenue_pacing_pct >= 100 ? 'text-emerald-500' : 'text-rose-500'}>
                                                            {row.revenue_pacing_pct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 min-w-[200px]">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase">
                                                    <span className="text-slate-400">Lợi nhuận thực</span>
                                                    <span className="text-emerald-700 font-black">{row.profit_pct ? row.profit_pct + '%' : fmt(row.profit)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${row.profit_status === 'achieved' ? 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.3)]' : 'bg-slate-300'}`}
                                                        style={{ width: `${Math.min(row.profit_pct || 0, 100)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button onClick={()=>setEditItem(row)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95 group/btn">
                                                <Icon name="edit" className="w-3.5 h-3.5 transition group-hover/btn:rotate-12"/> {row.revenue_target ? 'ĐIỀU CHỈNH' : 'GÁN KPI'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals Section */}
            {editItem && <FastUpdateModal item={editItem} onSave={fetchPerformance} onClose={()=>setEditItem(null)} />}
            
            {viewingProduct  && <ProductDetailModal  productIdentifier={viewingProduct}   onClose={() => setViewingProduct(null)} />}
            {viewingCustomer && <CustomerDetailModal customerIdentifier={viewingCustomer} onClose={() => setViewingCustomer(null)} />}
            {viewingSupplier && <SupplierDetailModal supplierIdentifier={viewingSupplier} onClose={() => setViewingSupplier(null)} />}
            {viewingEmployee && (
                <EmployeePerformanceModal 
                    employeeId={viewingEmployee} 
                    onClose={() => setViewingEmployee(null)} 
                    type={viewingType}
                    dateRange={dateRange}
                />
            )}

            <style>{`
                .kd-select { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:800; color:#334155; outline:none; transition:all .2s; cursor:pointer; }
                .kd-select:focus { border-color:#3b82f6; box-shadow:0 0 0 4px rgba(59,130,246,.08); }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

/**
 * MODAL CẬP NHẬT NHANH (FAST UPDATE)
 */
export const FastUpdateModal = ({ item, onSave, onClose }) => {
    const [revVal, setRevVal] = useState(item.revenue_target || 0);
    const [prfVal, setPrfVal] = useState(item.profit_target  || 0);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Upsert Revenue KPI
            await axios.post('/api/v2/kpi/targets', {
                target_type: item.target_type,
                target_key:  item.entity_key,
                target_name: item.entity_name,
                metric: 'revenue',
                target_value: revVal,
                period_type: 'month',
                period_year: moment().year(),
                period_value: moment().month() + 1
            });
            // Upsert Profit KPI
            await axios.post('/api/v2/kpi/targets', {
                target_type: item.target_type,
                target_key:  item.entity_key,
                target_name: item.entity_name,
                metric: 'profit',
                target_value: prfVal,
                period_type: 'month',
                period_year: moment().year(),
                period_value: moment().month() + 1
            });
            onSave();
            onClose();
        } catch (e) {
            console.error('Lỗi khi lưu KPI:', e);
            alert('Lỗi khi lưu KPI');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Thiết lập mục tiêu</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.entity_name}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center font-black transition-colors">✕</button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mục tiêu Doanh thu (VNĐ)</label>
                        <input 
                            type="number" 
                            value={revVal} 
                            onChange={(e)=>setRevVal(+e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                            placeholder="Nhập con số kỳ vọng..."
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mục tiêu Lợi nhuận (VNĐ)</label>
                        <input 
                            type="number" 
                            value={prfVal} 
                            onChange={(e)=>setPrfVal(+e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Nhập con số lợi nhuận..."
                        />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                    <button onClick={onClose} className="px-6 py-4 flex-1 text-slate-500 font-black text-sm hover:bg-slate-100 rounded-2xl transition">HỦY BỎ</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-6 py-4 flex-1 bg-slate-800 text-white font-black text-sm rounded-2xl hover:bg-blue-600 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                        {saving ? 'ĐANG LƯU...' : 'LƯU MỤC TIÊU'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KpiPerformancePage;

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Users, PieChart, Award, TrendingUp, 
    ArrowUpRight, ArrowDownRight, Search, 
    Filter, Calendar, ChevronRight, UserCheck 
} from 'lucide-react';
import moment from 'moment';
import { EmployeePerformanceModal } from '../../components/modals/EmployeePerformanceModal';

const HRPerformancePage = () => {
    const [loading, setLoading] = useState(true);
    const [perfData, setPerfData] = useState({ rows: [], summary: {}, period: {} });
    const [filters, setFilters] = useState({
        period_year: moment().year(),
        period_value: moment().month() + 1,
        period_type: 'month',
        target_type: 'employee'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [sort, setSort] = useState({ key: 'revenue', dir: 'desc' });

    const filteredRows = useMemo(() => {
        const rows = perfData?.rows || [];
        if (!searchTerm) return rows;
        const low = searchTerm.toLowerCase();
        return rows.filter(r => 
            (r?.entity_name || '').toLowerCase().includes(low) || 
            (r?.entity_key || '').toLowerCase().includes(low)
        );
    }, [perfData?.rows, searchTerm]);

    const sortedRows = useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            const va = a?.[sort.key] ?? 0;
            const vb = b?.[sort.key] ?? 0;
            return sort.dir === 'asc' ? va - vb : vb - va;
        });
    }, [filteredRows, sort]);

    const handleSort = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v3/kpi/performance', { params: filters });
            const data = res.data?.data || res.data;
            if (data) {
                setPerfData({
                    rows: data.rows || [],
                    summary: data.summary || {},
                    period: data.period || {}
                });
            }
        } catch (err) {
            console.error('HR Performance fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const formatCurrency = (val) => {
        const amount = typeof val === 'number' ? val : 0;
        return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
    };

    const renderStatusBadge = (status) => {
        const theme = {
            achieved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            on_track: 'bg-blue-100 text-blue-700 border-blue-200',
            behind:   'bg-rose-100 text-rose-700 border-rose-200',
            no_target: 'bg-slate-100 text-slate-500 border-slate-200'
        };
        const labels = { achieved: 'Đạt', on_track: 'Tốt', behind: 'Chậm', no_target: 'No KPI' };
        const label = labels[status] || 'Unknown';
        return <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${theme[status] || theme.no_target}`}>{label}</span>;
    };

    if (loading) return (
        <div className="p-24 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Phân tích thực tế...</p>
        </div>
    );

    const s = perfData.summary || {};
    const p = perfData.period || {};

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Giám sát Hiệu suất V3</h1>
                        <p className="text-slate-400 text-xs font-bold">
                            Kỳ: Tháng {filters.period_value}/{filters.period_year} ({p.days_passed || 0}/{p.total_days || 0} ngày - {((p.pacing_ratio || 0) * 100).toFixed(0)}%)
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <select 
                            className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer"
                            value={filters.period_value}
                            onChange={(e) => setFilters(prev => ({ ...prev, period_value: parseInt(e.target.value) }))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer ml-2"
                            value={filters.period_year}
                            onChange={(e) => setFilters(prev => ({ ...prev, period_year: parseInt(e.target.value) }))}
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>Năm {y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => setFilters(prev => ({ ...prev, target_type: 'employee' }))}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filters.target_type === 'employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Nhân viên
                        </button>
                        <button 
                            onClick={() => setFilters(prev => ({ ...prev, target_type: 'customer_group' }))}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filters.target_type === 'customer_group' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Đội nhóm
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                    label="Tổng Doanh thu Nhóm" 
                    value={formatCurrency(s.total_revenue || 0)} 
                    color="blue"
                />
                <StatCard 
                    label="Tiến độ Doanh số" 
                    value={(s.kpi_achievement || 0).toFixed(1) + '%'} 
                    desc={`${s.entities_achieved || 0} / ${s.entities_with_kpi || 0} MV đã về đích`}
                    color="emerald" 
                />
                <StatCard 
                    label="Tổng Đơn Hàng" 
                    value={s.total_orders || 0} 
                    unit="Đơn" 
                    color="blue" 
                />
                <StatCard 
                    label="Biên Lợi Nhuận Gộp (TB)" 
                    value={(s.avg_margin || 0).toFixed(1) + '%'} 
                    color="rose" 
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">Bảng chi tiết hiệu suất cá nhân</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tên, mã..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('entity_name')}>
                                    {filters.target_type === 'employee' ? 'Nhân viên' : filters.target_type === 'customer_group' ? 'Đội nhóm' : 'Đối tác'} {sort.key === 'entity_name' && (sort.dir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-left cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('revenue')}>
                                    Doanh thu / KPI {sort.key === 'revenue' && (sort.dir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-left cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('profit')}>
                                    Lợi nhuận {sort.key === 'profit' && (sort.dir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-left cursor-pointer hover:text-blue-500 transition-colors" onClick={() => handleSort('revenue_pct')}>
                                    Pacing (Hôm nay) {sort.key === 'revenue_pacing_pct' && (sort.dir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-left">Tỷ lệ Trả / Hỗ trợ</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Không có dữ liệu hiển thị</td>
                                </tr>
                            ) : sortedRows.map((row, idx) => (
                                <tr 
                                    key={idx} 
                                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    onClick={() => setViewingEmployee(row.entity_key)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-blue-300 transition-colors">
                                                {row.entity_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{row.entity_name || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400">Targeting: {formatCurrency(row.target_revenue)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold">{formatCurrency(row.revenue)}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(row.revenue_pct || 0, 100)}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">{row.revenue_pct || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-semibold text-slate-600">{formatCurrency(row.profit)}</div>
                                        <div className="text-[10px] text-slate-400">Margin: {row.margin_pct || 0}%</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {renderStatusBadge(row.revenue_status)}
                                            <span className="text-[10px] text-slate-400">Tiến độ: {row.revenue_pacing_pct || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div title="Tỷ lệ trả hàng">
                                                <div className="text-[10px] font-bold opacity-60 uppercase text-slate-400">Return</div>
                                                <div className={`text-xs font-bold ${row.return_pct > 10 ? 'text-rose-500' : 'text-slate-600'}`}>{row.return_pct || 0}%</div>
                                            </div>
                                            <div title="Tỷ lệ hỗ trợ">
                                                <div className="text-[10px] font-bold opacity-60 uppercase text-slate-400">Support</div>
                                                <div className="text-xs font-bold text-emerald-600">{(row.support_pct || 0).toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingEmployee && (
                <EmployeePerformanceModal 
                    employeeCode={viewingEmployee} 
                    onClose={() => setViewingEmployee(null)} 
                    periodFilters={filters}
                />
            )}
        </div>
    );
};

const StatCard = ({ label, value, unit = '', desc = '', color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-600',
        emerald: 'bg-emerald-500',
        rose: 'bg-rose-500',
        violet: 'bg-violet-500'
    };

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${colors[color] || colors.blue} animate-pulse`} />
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
                {unit && <span className="text-slate-400 text-xs font-bold">{unit}</span>}
            </div>
            {desc && <p className="mt-2 text-[10px] text-slate-400 font-bold opacity-80 uppercase leading-none">{desc}</p>}
        </div>
    );
};

export default HRPerformancePage;

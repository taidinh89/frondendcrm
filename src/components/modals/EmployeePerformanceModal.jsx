import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Icon } from '../ui.jsx';
import { CustomerDetailModal } from './CustomerDetailModal.jsx';

const formatPrice = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));
const formatCompact = (v) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + ' tỷ';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + ' tr';
    return formatPrice(v);
};

const TYPE_LABELS = {
    employee:          'Nhân viên',
    customer_group:    'Nhóm khách hàng',
    brand:             'Thương hiệu',
    product:           'Sản phẩm',
    product_group_l2:  'Nhóm sản phẩm L2',
};

export const EmployeePerformanceModal = ({ employeeId, onClose, dateRange, type = 'employee' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewingCustomer, setViewingCustomer] = useState(null);

    const [localDateRange, setLocalDateRange] = useState(dateRange || {
        start: moment().startOf('month').format('YYYY-MM-DD'),
        end:   moment().endOf('month').format('YYYY-MM-DD')
    });

    useEffect(() => {
        const fetch = async () => {
            if (!employeeId) return;
            setLoading(true);
            try {
                const res = await axios.get(`/api/v2/kpi/performance/${encodeURIComponent(employeeId)}`, {
                    params: { 
                        date_from: localDateRange.start || localDateRange.dateFrom, 
                        date_to:   localDateRange.end   || localDateRange.dateTo, 
                        type 
                    }
                });
                setData(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [employeeId, localDateRange, type]);

    if (!employeeId) return null;

    const label = TYPE_LABELS[type] || 'Đối tượng';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative border border-white/20">
                
                {/* Header */}
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-slate-50 to-white gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-slate-200">
                            {employeeId.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{employeeId}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Phân tích hiệu suất {label}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm grow md:grow-0">
                            <Icon name="calendar" className="w-4 h-4 text-slate-400" />
                            <input type="date" value={localDateRange.start} onChange={e=>setLocalDateRange({...localDateRange, start:e.target.value})} className="bg-transparent text-[10px] font-black text-slate-600 focus:outline-none w-24" />
                            <span className="text-slate-300">→</span>
                            <input type="date" value={localDateRange.end} onChange={e=>setLocalDateRange({...localDateRange, end:e.target.value})} className="bg-transparent text-[10px] font-black text-slate-600 focus:outline-none w-24" />
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-all font-black text-lg shrink-0">✕</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                    {loading ? (
                        <div className="py-24 text-center font-black text-slate-300 animate-pulse tracking-widest uppercase">🚀 Đang trích xuất dữ liệu thực tế...</div>
                    ) : !data ? (
                        <div className="py-24 text-center text-slate-400">Không tìm thấy dữ liệu</div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Doanh thu', value: formatCompact(data.summary.revenue), sub: 'Tiền hàng', color: 'blue', icon: '💰' },
                                    { label: 'Lợi nhuận', value: formatCompact(data.summary.profit), sub: 'Lợi nhuận gộp', color: 'emerald', icon: '🏆' },
                                    { label: 'Tỷ suất LN', value: data.summary.margin + '%', sub: 'Gross Margin', color: 'amber', icon: '📈' },
                                    { label: 'Đơn hàng', value: data.summary.orders, sub: 'Số phiếu bán', color: 'rose', icon: '📦' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xl">{s.icon}</span>
                                            <span className={`text-2xl font-black text-${s.color}-600 tracking-tighter`}>{s.value}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                                        <div className="text-[10px] text-slate-300 mt-0.5 font-medium">{s.sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Trend Chart */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Icon name="activity" className="w-4 h-4 text-blue-500" /> Biểu hiện doanh thu theo ngày
                                    </h4>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data.charts.trend}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                    formatter={(v) => formatPrice(v)}
                                                />
                                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Top Brands */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Icon name="award" className="w-4 h-4 text-emerald-500" /> Top thương hiệu bán tốt
                                    </h4>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.charts.brands} layout="vertical">
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip formatter={(v) => formatPrice(v)} />
                                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {data.charts.brands.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ecfdf5'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Top Customers Table */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b bg-slate-50/50">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Icon name="users" className="w-4 h-4 text-blue-500" /> Khách hàng trọng tâm trong kỳ
                                    </h4>
                                </div>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                                            <th className="px-6 py-3">Khách hàng</th>
                                            <th className="px-6 py-3 text-right">Doanh số</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.charts.customers.map((c, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div 
                                                        onClick={() => setViewingCustomer(c.key)}
                                                        className="font-bold text-slate-700 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-xs cursor-pointer hover:text-blue-600 hover:underline transition-all"
                                                    >
                                                        {c.name}
                                                    </div>
                                                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{c.key}</div>
                                                </td>
                                                <td className="px-6 py-3 text-right font-black text-slate-800 text-sm">{formatPrice(c.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>

                {viewingCustomer && <CustomerDetailModal customerIdentifier={viewingCustomer} onClose={() => setViewingCustomer(null)} />}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar 
} from 'recharts';
import { 
    TrendingUp, Package, AlertCircle, ArrowUpRight, ArrowDownRight, 
    Filter, Calendar, Search, Clock, ExternalLink, ChevronUp, ChevronDown, RefreshCw
} from 'lucide-react';
import DataStateIndicator from '../../components/ui/DataStateIndicator';
import moment from 'moment';
import { SupplierDetailModal } from '../../components/modals/SupplierDetailModal';
import { Modal, NumericInput } from '../../components/ui.jsx';

const ForecastPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ forecasts: [], trend_history: [], period: {} });
    const [filters, setFilters] = useState({
        period_year: moment().year(),
        period_value: moment().month() + 1,
        period_type: 'month',
        days: 90
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'suggested_value', direction: 'desc' });
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [editingKpi, setEditingKpi] = useState(null); 

    const handleSetKpi = async (item, newValue) => {
        if (!item.ma_khncc || item.ma_khncc.startsWith('RETAIL_')) {
            alert('Lỗi: Đối tác vãng lai hoặc chưa có mã hệ thống, không thể thiết lập KPI.');
            return;
        }
        try {
            await axios.post('/api/v3/kpi/targets', {
                target_type: 'supplier',
                target_key: item.ma_khncc,
                target_name: item.target_name,
                metric: 'purchase_value',
                target_value: newValue,
                target_intent: 'forecast',
                department: filters.department || 'purchasing',
                period_type: filters.period_type,
                period_year: filters.period_year,
                period_value: filters.period_value,
            });
            fetchData(true);
        } catch (e) {
            console.error('Set KPI Error:', e);
            alert('Có lỗi xảy ra khi lưu KPI.');
        }
    };

    const fetchData = async (refresh = false) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v3/kpi/forecast-overview', { 
                params: { ...filters, refresh: refresh ? 1 : 0 } 
            });
            const actualData = res.data?.data || res.data;
            if (actualData && typeof actualData === 'object') {
                setData({
                    forecasts: actualData.forecasts || [],
                    trend_history: actualData.trend_history || [],
                    summary: actualData.summary || {},
                    period: actualData.period || {}
                });
            }
        } catch (err) {
            console.error('Failed to fetch forecast data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const formatCurrency = (val) => {
        if (!val) return '0 đ';
        return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
    };

    // Calculate overall stats from merged data
    const stats = useMemo(() => {
        const list = data.forecasts || [];
        const s = data.summary || {};
        return {
            total_forecast: s.total_forecast || list.reduce((acc, curr) => acc + (curr.forecast_value || 0), 0),
            total_actual: s.total_actual || list.reduce((acc, curr) => acc + (curr.actual_value || 0), 0),
            total_suggested: s.total_suggested_value || list.reduce((acc, curr) => acc + (curr.suggested_value || 0), 0),
            total_pos: s.total_pos || list.reduce((acc, curr) => acc + (curr.po_count || 0), 0),
            total_inventory: s.total_inventory_value || list.reduce((acc, curr) => acc + (curr.stock_value || 0), 0),
            total_debt: s.total_payable_debt || list.reduce((acc, curr) => acc + (curr.debt || 0), 0),
        };
    }, [data.forecasts, data.summary]);

    const overallPct = stats.total_forecast > 0 ? (stats.total_actual / stats.total_forecast) * 100 : 0;

    const filteredData = useMemo(() => {
        let result = (data.forecasts || []).filter(item => 
            item.target_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.ma_khncc?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (statusFilter === 'over') result = result.filter(item => item.actual_value > item.forecast_value && item.forecast_value > 0);
        if (statusFilter === 'under') result = result.filter(item => item.actual_value < item.forecast_value);
        if (statusFilter === 'no_target') result = result.filter(item => !item.forecast_value);

        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key] || 0;
                const bVal = b[sortConfig.key] || 0;
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }
        return result;
    }, [data.forecasts, searchTerm, statusFilter, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">DỰ BÁO NHẬP HÀNG (ERP STANDARD)</h1>
                        <p className="text-slate-500 text-sm font-semibold flex items-center gap-1">
                            <Clock size={14} /> Phân tích nhu cầu dựa trên tốc độ bán {filters.days} ngày
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {['month', 'year'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilters(prev => ({ ...prev, period_type: type }))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${filters.period_type === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                {type === 'month' ? 'Tháng' : 'Năm'}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => fetchData(true)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-colors shadow-sm"
                        title="Làm mới dữ liệu (Xóa cache)"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <DataStateIndicator 
                        scope="inventory" 
                        lastUpdated={data.period?.dateTo} 
                        onRefreshSuccess={() => fetchData(true)}
                    />
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                    title="MỤC TIÊU KPI" 
                    value={formatCurrency(stats.total_forecast)}
                    icon={<Calendar className="text-blue-500" />}
                    desc={`Tiến độ: ${overallPct.toFixed(1)}%`}
                    color="blue"
                />
                <StatCard 
                    title="THỰC NHẬP LŨY KẾ" 
                    value={formatCurrency(stats.total_actual)}
                    icon={<Package className="text-emerald-500" />}
                    desc={`${stats.total_pos} lệnh PO`}
                    color="emerald"
                />
                <StatCard 
                    title="VỐN ĐANG TỒN" 
                    value={formatCurrency(stats.total_inventory)}
                    icon={<TrendingUp className="text-indigo-500" />}
                    desc="Tổng giá trị kho hiện tại"
                    color="indigo"
                />
                <StatCard 
                    title="GỢI Ý NHẬP (AI)" 
                    value={formatCurrency(stats.total_suggested)}
                    icon={<AlertCircle className="text-amber-500" />}
                    desc="Dựa trên tốc độ bán"
                    color="amber"
                />
                <StatCard 
                    title="NỢ PHẢI TRẢ" 
                    value={formatCurrency(stats.total_debt)}
                    icon={<AlertCircle className="text-rose-500" />}
                    desc="Tổng công nợ NCC"
                    color="rose"
                />
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        XU HƯỚNG NHẬP KHO (6 THÁNG)
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trend_history || []}>
                                <defs>
                                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="20%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: '900'}} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => (v/1000000).toFixed(0) + 'M'} tick={{fill: '#94a3b8', fontWeight: '900'}} />
                                <Tooltip 
                                    formatter={v => formatCurrency(v)} 
                                    contentStyle={{ borderRadius: '16px', border: 'none', shadow: 'none', background: 'rgba(255,255,255,0.95)', border: '1px solid #f1f5f9' }}
                                />
                                <Legend iconType="circle" />
                                <Area type="monotone" dataKey="target" name="Mục tiêu" stroke="#94a3b8" fillOpacity={1} fill="url(#colorTarget)" strokeWidth={2} strokeDasharray="5 5" />
                                <Area type="monotone" dataKey="actual" name="Thực tế" stroke="#3b82f6" fillOpacity={1} fill="url(#colorActual)" strokeWidth={4} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 flex flex-col">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-8">PHÂN BỔ NHẬP KHO TOP 5</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...(data.forecasts || [])].sort((a,b) => b.actual_value - a.actual_value).slice(0, 5)} layout="vertical" margin={{ left: -20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="target_name" type="category" fontSize={10} width={120} axisLine={false} tickLine={false} tick={{fontWeight: '900', fill: '#475569'}} />
                                <Tooltip formatter={v => formatCurrency(v)} cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="actual_value" name="Giá trị" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">CHI TIẾT PHÂN TÍCH NHU CẦU THEO ĐỐI TÁC</h3>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Tìm đối tác hoặc mã NCC..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-72 pl-12 pr-6 py-3 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-inner bg-white/50"
                            />
                        </div>

                        <select 
                            className="px-6 py-3 border border-slate-200 rounded-2xl text-sm font-black bg-white shadow-sm outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">TẤT CẢ TRẠNG THÁI</option>
                            <option value="over">⚠️ NHẬP VƯỢT NGÂN SÁCH</option>
                            <option value="under">✅ TRONG KẾ HOẠCH</option>
                            <option value="no_target">❓ CHƯA CÓ MỤC TIÊU</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-6 cursor-pointer" onClick={() => handleSort('target_name')}>ĐỐI TÁC {sortConfig.key === 'target_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-4 py-6 cursor-pointer" onClick={() => handleSort('demand_value')}>NHU CẦU 30N</th>
                                <th className="px-4 py-6 cursor-pointer text-blue-600" onClick={() => handleSort('stock_value')}>GIÁ TRỊ TỒN</th>
                                <th className="px-4 py-6 cursor-pointer text-amber-600" onClick={() => handleSort('suggested_value')}>CẦN NHẬP (AI)</th>
                                <th className="px-4 py-6 cursor-pointer text-rose-600" onClick={() => handleSort('debt')}>NỢ PHẢI TRẢ</th>
                                <th className="px-4 py-6 cursor-pointer" onClick={() => handleSort('forecast_value')}>MỤC TIÊU KPI</th>
                                <th className="px-4 py-6 cursor-pointer" onClick={() => handleSort('actual_value')}>THỰC NHẬP</th>
                                <th className="px-6 py-6">TIẾN ĐỘ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {filteredData.map((item, idx) => {
                                const pacing = item.forecast_value > 0 ? (item.actual_value / item.forecast_value) * 100 : 0;
                                return (
                                    <tr 
                                        key={idx} 
                                        className="hover:bg-blue-50/50 transition-all group cursor-pointer"
                                        onClick={() => {
                                            const code = item.ma_khncc && !item.ma_khncc.startsWith('RETAIL_') ? item.ma_khncc : null;
                                            setViewingSupplier({ id: code, name: item.target_name });
                                        }}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="font-black uppercase text-xs text-slate-700 group-hover:text-blue-600 flex items-center gap-2">
                                                {item.target_name}
                                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold">ID: {item.ma_khncc || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 py-6 text-slate-500 font-bold text-[11px]">{formatCurrency(item.demand_value)}</td>
                                        <td className="px-4 py-6 text-blue-500 font-bold text-[11px]">{formatCurrency(item.stock_value)}</td>
                                        <td className="px-4 py-6 text-amber-700 font-black text-[12px] bg-amber-50/20">{formatCurrency(item.suggested_value)}</td>
                                        <td className="px-4 py-6 text-rose-600 font-bold text-[11px]">{formatCurrency(item.debt)}</td>
                                        <td className="px-4 py-6 text-slate-400 font-bold text-[11px]">
                                            <div className="flex items-center gap-2 group/kpi">
                                                <span className={item.forecast_value > 0 ? "text-slate-700" : "italic"}>
                                                    {formatCurrency(item.forecast_value)}
                                                </span>
                                                <button 
                                                    className="hidden group-hover/kpi:flex items-center gap-1 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-2 py-1 rounded shadow-sm text-[9px] uppercase tracking-wider font-black transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!item.ma_khncc || item.ma_khncc.startsWith('RETAIL_')) {
                                                            alert('Chưa có mã hệ thống, không thể cấu hình mục tiêu!');
                                                            return;
                                                        }
                                                        setEditingKpi({
                                                            item: item,
                                                            value: item.forecast_value || Math.round(item.suggested_value || 0)
                                                        });
                                                    }}
                                                >
                                                    Sửa KPI
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="font-black text-slate-800 text-[12px]">{formatCurrency(item.actual_value)}</div>
                                            <div className="text-[9px] text-blue-500 font-black uppercase">{item.po_count} PHIẾU</div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-[80px] bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-700 ${pacing >= 100 ? 'bg-rose-500' : (pacing >= 80 ? 'bg-blue-500' : 'bg-emerald-500')}`}
                                                        style={{ width: `${Math.min(pacing, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] font-black text-slate-700">{pacing.toFixed(0)}%</div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingSupplier && (
                <SupplierDetailModal 
                    supplierIdentifier={viewingSupplier.id} 
                    supplierName={viewingSupplier.name}
                    onClose={() => setViewingSupplier(null)} 
                />
            )}

            {/* MODAL SET KPI CUSTOM */}
            <Modal 
                isOpen={!!editingKpi} 
                onClose={() => setEditingKpi(null)} 
                title="ĐẶT MỤC TIÊU KPI"
                maxWidthClass="max-w-md"
                footer={(
                    <div className="flex gap-2 w-full">
                        <button className="px-6 py-3 flex-1 text-slate-500 font-black text-sm hover:bg-slate-100 rounded-2xl transition uppercase" onClick={() => setEditingKpi(null)}>HỦY BỎ</button>
                        <button 
                            className="px-6 py-3 flex-1 !text-base font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100 rounded-2xl transition" 
                            onClick={() => {
                                handleSetKpi(editingKpi.item, editingKpi.value);
                                setEditingKpi(null);
                            }}
                        >
                            LƯU MỤC TIÊU
                        </button>
                    </div>
                )}
            >
                <div className="p-8 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Nhà cung cấp</div>
                        <div className="text-lg font-black text-slate-800 tracking-tight leading-tight uppercase">
                            {editingKpi?.item?.target_name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ID: {editingKpi?.item?.ma_khncc}</div>
                    </div>

                    <NumericInput 
                        label="Nhập số tiền mục tiêu (VNĐ)"
                        value={editingKpi?.value}
                        onChange={(val) => setEditingKpi(prev => ({ ...prev, value: val }))}
                        placeholder="VD: 50.000.000"
                        className="!py-4 !text-2xl"
                    />

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-2">Thông tin thực tế & Gợi ý</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-bold">Gợi ý từ AI:</span>
                                <span className="text-amber-700 font-black">{formatCurrency(editingKpi?.item?.suggested_value)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-bold">Nợ hiện tại:</span>
                                <span className="text-rose-600 font-black">{formatCurrency(editingKpi?.item?.debt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const StatCard = ({ title, value, icon, desc, progress, color = 'blue', alert }) => {
    const schemes = {
        blue: 'border-blue-100 text-blue-600',
        emerald: 'border-emerald-100 text-emerald-600',
        amber: 'border-amber-100 text-amber-600',
        rose: 'border-rose-100 text-rose-600',
    };
    
    return (
        <div className={`p-6 rounded-3xl border bg-white shadow-xl shadow-slate-100 flex flex-col justify-between h-44 hover:-translate-y-1 transition-all duration-300 group ${schemes[color]}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-current">{title}</span>
                <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-current group-hover:text-white transition-colors">
                    {icon}
                </div>
            </div>
            
            <div>
                <div className="text-3xl font-black text-slate-800 mb-1 tracking-tighter">{value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{desc}</div>
            </div>
            
            {progress !== undefined && (
                <div className="mt-4 w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-current transition-all duration-1000" 
                        style={{ width: `${Math.min(progress, 100)}%` }} 
                    />
                </div>
            )}
        </div>
    );
};

export default ForecastPage;

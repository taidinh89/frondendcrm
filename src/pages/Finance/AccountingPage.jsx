import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    DollarSign, CreditCard, PieChart, Info, 
    Search, Filter, ChevronRight, ArrowUpRight, ArrowDownRight, 
    MoreVertical, Download, ExternalLink, RefreshCw 
} from 'lucide-react';
import DataStateIndicator from '../../components/ui/DataStateIndicator';
import moment from 'moment';

const AccountingPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ all_customers: [], meta: {} });
    const [filters, setFilters] = useState({
        type: 'receivable', // Phải thu
        min_debt: 100000,
        search: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v3/debt-analysis', { params: filters });
            setData(res.data);
        } catch (err) {
            console.error('Accounting data fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.type]); // Fetch lại khi đổi tab AR/AP

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

    const filteredList = data.all_customers.filter(c => 
        c.name.toLowerCase().includes(filters.search.toLowerCase()) || 
        c.code.toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" />
                        Không gian Kế toán & Công nợ
                    </h1>
                    <p className="text-slate-500 text-sm">Quản lý dòng tiền, hạn mức nợ và đối soát hóa đơn</p>
                </div>
                
                <DataStateIndicator 
                    scope="accounting" 
                    lastUpdated={data.meta?.last_refresh} 
                    onRefreshSuccess={fetchData}
                />
            </div>

            {/* Main Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-fit border border-slate-200">
                <button 
                    onClick={() => setFilters({...filters, type: 'receivable'})}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${filters.type === 'receivable' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Phải Thu (AR)
                </button>
                <button 
                    onClick={() => setFilters({...filters, type: 'payable'})}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${filters.type === 'payable' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Phải Trả (AP)
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    label="Tổng dư nợ" 
                    value={formatCurrency(data.meta?.total_system_debt || 0)} 
                    color="blue"
                    icon={<DollarSign size={20} />}
                />
                <SummaryCard 
                    label="Trong hạn" 
                    value={formatCurrency(data.meta?.aging_buckets?.safe || 0)} 
                    color="green"
                    icon={<CreditCard size={20} />}
                />
                <SummaryCard 
                    label="Quá hạn / Rủi ro" 
                    value={formatCurrency(data.meta?.aging_buckets?.risk || 0)} 
                    color="orange"
                    icon={<ArrowDownRight size={20} />}
                />
                <SummaryCard 
                    label="Nợ xấu / Khó đòi" 
                    value={formatCurrency(data.meta?.aging_buckets?.lost || 0)} 
                    color="red"
                    icon={<ArrowDownRight size={20} />}
                />
            </div>

            {/* Data Grid Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                            placeholder="Tìm kiếm khách hàng, mã NCC..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 font-medium">
                            <Filter size={16} /> Bộ lọc nâng cao
                        </button>
                        <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 shadow-sm">
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Đối tác</th>
                                <th className="px-6 py-4">Phân nhóm</th>
                                <th className="px-6 py-4">Dư nợ hiện tại</th>
                                <th className="px-6 py-4">Tuổi nợ TB</th>
                                <th className="px-6 py-4">Người phụ trách</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">
                                        <div className="flex justify-center mb-2"><RefreshCw className="animate-spin" /></div>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : filteredList.map((row) => (
                                <tr key={row.code} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{row.name}</div>
                                        <div className="text-xs text-slate-400 font-mono tracking-tighter">{row.code}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide">
                                            {row.group}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700">{formatCurrency(row.debt)}</div>
                                        {row.overdue_days > 0 && <span className="text-[10px] text-red-500 font-medium">Quá hạn {row.overdue_days} ngày</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${row.overdue_days > 30 ? 'bg-red-500' : (row.overdue_days > 7 ? 'bg-orange-400' : 'bg-emerald-500')}`} 
                                                    style={{ width: `${Math.min(row.overdue_days * 3, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">{row.overdue_days}d</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {row.manager}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                                                <ExternalLink size={16} />
                                            </button>
                                            <button className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, color, icon }) => {
    const themes = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        green: "text-emerald-600 bg-emerald-50 border-emerald-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        red: "text-rose-600 bg-rose-50 border-rose-100"
    };
    return (
        <div className={`p-4 bg-white rounded-xl shadow-sm border border-slate-200 transition-all hover:border-${color}-200`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${themes[color]}`}>{icon}</div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-lg font-black text-slate-800">{value}</div>
        </div>
    );
}

export default AccountingPage;

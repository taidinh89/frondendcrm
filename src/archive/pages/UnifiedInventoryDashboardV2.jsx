import React, { useState, useEffect } from 'react';
import { Icon, Button, Input, Pagination } from '../../components/ui';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * UnifiedInventoryDashboardV2.jsx - Nguồn sự thật duy nhất (Single Source of Truth)
 * Hiển thị đối soát tồn kho 3 nguồn: Nội bộ, Ecount, Misa và Giá vốn.
 */
const UnifiedInventoryDashboardV2 = () => {
    // --- 1. STATES ---
    const [inventory, setInventory] = useState([]);
    const [stats, setStats] = useState({ total_value: 0, gap_count: 0, streak_days: 0 });
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState(null);
    const [filters, setFilters] = useState({ search: '', status: 'all', warehouse: '' });

    // --- 2. LOAD DATA ---
    const fetchInventory = async (page = 1) => {
        setLoading(true);
        try {
            // API lấy dữ liệu tổng hợp từ bảng unified_inventory_dashboard_v2
            const res = await axios.get('/api/v2/inventory', {
                params: { ...filters, page }
            });
            setInventory(res.data.data);
            setStats(res.data.stats || { total_value: 0, gap_count: 0, streak_days: 0 });
            setPagination(res.data.meta || res.data);
        } catch (error) {
            toast.error("Lỗi kết nối Sổ cái nội bộ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, [filters]);

    // --- 3. UI HELPERS ---
    const getGapStatusStyle = (status) => {
        switch (status) {
            case 'MATCH': return 'bg-green-100 text-green-700 border-green-200';
            case 'GAP': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-500 border-gray-200';
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6 font-sans text-slate-800">
            
            {/* HEADER & STREAK 30 DAYS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg">📦</span>
                        Điều hành Kho & Giá vốn V2
                    </h1>
                    <p className="text-slate-400 text-xs mt-1 font-bold">Single Source of Truth • Real-time Monitoring</p>
                </div>

                {/* Chiến lược 30 ngày độc lập */}
                <div className="bg-white px-6 py-3 rounded-[1.5rem] border border-indigo-100 shadow-sm flex items-center gap-4">
                    <div className="text-2xl">🔥</div>
                    <div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">30 Days Streak</div>
                        <div className="flex items-center gap-2">
                            <div className="text-xl font-black text-indigo-600">{stats.streak_days}/30 Ngày</div>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full" style={{ width: `${(stats.streak_days/30)*100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Tổng giá trị tồn kho</div>
                    <div className="text-3xl font-black text-slate-800">{Number(stats.total_value).toLocaleString()} <span className="text-sm font-bold text-slate-400">VNĐ</span></div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                    <div className="text-[10px] font-black text-red-400 uppercase mb-2">Sản phẩm bị lệch (Gap)</div>
                    <div className="text-3xl font-black text-red-600">{stats.gap_count} <span className="text-sm font-bold text-slate-400">Mã hàng</span></div>
                </div>
                <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
                    <div className="text-[10px] font-black text-indigo-200 uppercase mb-2">Trạng thái hệ thống</div>
                    <div className="text-xl font-black flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                        ĐANG ĐỐI SOÁT T-2
                    </div>
                </div>
            </div>

            {/* FILTER TOOLBAR */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[300px]">
                    <Input 
                        placeholder="Tìm mã hoặc tên sản phẩm..." 
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="rounded-xl border-slate-100 bg-slate-50"
                    />
                </div>
                <select 
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="GAP">Chỉ xem hàng bị lệch</option>
                    <option value="MATCH">Chỉ xem hàng đã khớp</option>
                </select>
                <Button onClick={() => fetchInventory()} variant="secondary" className="rounded-xl px-6">Lọc dữ liệu</Button>
            </div>

            {/* MAIN DATA TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b">
                                <th className="px-8 py-5">Sản phẩm</th>
                                <th className="px-6 py-5 text-center bg-indigo-50/30">Nội bộ (V2)</th>
                                <th className="px-6 py-5 text-center">Ecount API</th>
                                <th className="px-6 py-5 text-center">Misa (Thuế)</th>
                                <th className="px-6 py-5 text-right">Giá vốn (Cost)</th>
                                <th className="px-8 py-5 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="py-20 text-center font-bold text-slate-400 animate-pulse">Đang bốc Snapshot từ Sổ cái...</td></tr>
                            ) : inventory.length > 0 ? inventory.map((item) => (
                                <tr key={item.prod_cd} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-black text-slate-800 text-sm">{item.prod_cd}</div>
                                        <div className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{item.product_name}</div>
                                    </td>
                                    {/* Tồn kho nội bộ - Nguồn sự thật */}
                                    <td className="px-6 py-5 text-center bg-indigo-50/30">
                                        <div className="text-lg font-black text-indigo-600">{Number(item.internal_stock).toLocaleString()}</div>
                                        <div className="text-[9px] text-indigo-400 font-bold uppercase">Actual Qty</div>
                                    </td>
                                    {/* Ecount Cloud */}
                                    <td className="px-6 py-5 text-center">
                                        <div className="text-sm font-bold text-slate-600">{Number(item.ecount_stock).toLocaleString()}</div>
                                        <div className="text-[9px] text-slate-300 font-bold uppercase">Ecount Cloud</div>
                                    </td>
                                    {/* Misa Tax */}
                                    <td className="px-6 py-5 text-center">
                                        <div className="text-sm font-bold text-slate-600">{Number(item.misa_stock).toLocaleString()}</div>
                                        <div className="text-[9px] text-slate-300 font-bold uppercase">Misa API</div>
                                    </td>
                                    {/* Giá vốn nội bộ (Cost After) */}
                                    <td className="px-6 py-5 text-right">
                                        <div className="text-sm font-black text-slate-700">{Number(item.internal_cost).toLocaleString()}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">Avg Cost</div>
                                    </td>
                                    {/* Gap Status */}
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getGapStatusStyle(item.gap_status)}`}>
                                            {item.gap_status === 'MATCH' ? '● Khớp' : `▲ Lệch ${item.gap_qty}`}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400 italic font-bold">Không có dữ liệu tồn kho để hiển thị.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/30">
                    <Pagination pagination={pagination} onPageChange={(p) => fetchInventory(p)} />
                </div>
            </div>

            {/* LỜI NHẮN TRỢ LÝ */}
            <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="text-4xl">🤖</div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest opacity-60">Decision Support</h4>
                        <p className="text-lg font-bold">Hệ thống đang tự động bù trừ (Adjustment) cho các mã hàng lệch mốc T-2.</p>
                    </div>
                </div>
                <Button onClick={() => window.location.href='/security/intelligence'} className="bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl">
                    Xem báo cáo thông minh
                </Button>
            </div>
        </div>
    );
};

export default UnifiedInventoryDashboardV2;
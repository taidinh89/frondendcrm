import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import * as UI from '../../components/ui.jsx';
import { Icon } from '../../components/ui.jsx';
import { useApiData } from '../../hooks/useApiData.jsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

/**
 * PURCHASING INTELLIGENCE HUB (V1.0)
 * Trang hỗ trợ quyết định nhập hàng nhanh cho bộ phận Thu mua
 */

const PurchasingIntelligenceHub = () => {
    const [filters, setFilters] = useState({
        site: 'ALL',
        category: '',
        brand: '',
        timeRange: '30'
    });

    // Mock Data for UI Proof-of-concept
    const kpis = [
        { title: 'Cần nhập gấp', value: '42', unit: 'SKUs', color: 'rose', icon: 'alert-triangle' },
        { title: 'Giá trị đề xuất', value: '1.2B', unit: 'VNĐ', color: 'indigo', icon: 'currency-dollar' },
        { title: 'Sức khỏe tồn', value: '78%', unit: 'OK', color: 'emerald', icon: 'heart' },
        { title: 'Hết hàng (7d)', value: '15', unit: 'SKUs', color: 'orange', icon: 'trending-down' },
    ];

    const decisionData = [
        { id: 1, name: 'Laptop ASUS ROG Strix G15', sku: 'ASUS-G15-001', stock: 2, min: 5, velocity: 0.8, days: 2, suggest: 20, vendor: 'FPT Synnex', status: 'CRITICAL' },
        { id: 2, name: 'Mainboard Gigabyte Z790 AORUS', sku: 'GIGA-Z790-PRO', stock: 1, min: 10, velocity: 0.5, days: 2, suggest: 15, vendor: 'Thủy Linh', status: 'CRITICAL' },
        { id: 3, name: 'VGA MSI RTX 4070 Ti Ventus', sku: 'MSI-4070TI-V', stock: 8, min: 10, velocity: 1.2, days: 6, suggest: 30, vendor: 'Mai Hoàng', status: 'WARNING' },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
            {/* 1. HEADER SECTION */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Icon name="shopping-cart" className="w-6 h-6" />
                        </div>
                        QUYẾT ĐỊNH NHẬP HÀNG NHANH
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 ml-1">Purchasing Intelligence Hub v1.0</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Icon name="filter" className="w-4 h-4" /> Bộ lọc
                    </button>
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100">
                        <Icon name="plus" className="w-4 h-4" /> Tạo PO mới
                    </button>
                    <button className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm">
                        <Icon name="bell" className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* 2. KPI CARDS SECTION */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full bg-${kpi.color}-600 group-hover:scale-150 transition-transform duration-700`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-${kpi.color}-50 text-${kpi.color}-600`}>
                                <Icon name={kpi.icon} className="w-6 h-6" />
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600 uppercase tracking-widest`}>Trend ▲</span>
                        </div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{kpi.title}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{kpi.value}</span>
                            <span className="text-slate-400 text-xs font-bold uppercase">{kpi.unit}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* 3. MAIN DECISION TABLE */}
            <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-800">Danh sách đề xuất nhập hàng</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Sắp xếp theo độ khẩn cấp (Stock-out Risk)</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Xuất Excel</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">Sản phẩm</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">Tồn kho</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b text-center">Tốc độ bán</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b text-center">Dự báo hết</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b text-center">Đề xuất nhập</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">NCC Gợi ý</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {decisionData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-slate-100 rounded-2xl p-2 flex-shrink-0">
                                                <div className="w-full h-full bg-slate-200 rounded-lg animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 font-mono mt-1">{item.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className={`text-xl font-black ${item.stock <= item.min ? 'text-rose-500' : 'text-slate-800'}`}>{item.stock}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Min: {item.min}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="text-sm font-black text-slate-700">{item.velocity}</span>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">SP/Ngày</p>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${item.days <= 3 ? 'bg-rose-50 text-rose-500 border border-rose-100 animate-pulse' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
                                            Còn {item.days} ngày
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="text-xl font-black text-indigo-600 underline decoration-indigo-200 underline-offset-4">{item.suggest}</span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Icon name="award" className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-xs font-black text-slate-600">{item.vendor}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">Nhập ngay</button>
                                            <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><Icon name="edit" className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 4. SMART SUGGESTIONS & INSIGHTS */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
                <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black tracking-tight text-slate-800">Biến động tồn kho toàn hệ thống</h2>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">30 ngày qua</div>
                    </div>
                    <div className="flex-1 w-full text-slate-400 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                        Chart Container (Waiting for Data)
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl flex flex-col relative overflow-hidden">
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                                <Icon name="zap" className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight text-white uppercase italic">AI Intelligence Suggestions</h2>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Gợi ý giá tốt</span>
                                    <span className="text-white font-black text-xs group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                                <p className="text-slate-300 text-sm font-bold leading-relaxed">Nhà cung cấp **Thiết bị Số** vừa giảm giá 5% cho dòng linh kiện Mainboard...</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Cảnh báo tồn dư</span>
                                </div>
                                <p className="text-slate-300 text-sm font-bold leading-relaxed">Sản phẩm **Màn hình Dell U2422** đang có xu hướng bán chậm, không nên nhập thêm trong tuần tới.</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <button className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95">Xem toàn bộ 24 gợi ý</button>
                        </div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] -mr-20 -mb-20"></div>
                </div>
            </section>
        </div>
    );
};

export default PurchasingIntelligenceHub;

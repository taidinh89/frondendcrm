// src/components/analysis/SalesAnalysisFilterBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import { debounce } from 'lodash';
import { Button, Input, Icon } from '../ui.jsx';

// --- COMPONENT ASYNC MULTI DROP (Custom) ---
const AsyncMultiDrop = ({ label, url, val = [], setVal, k = 'value', n = 'label', transform = null }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const [opts, setOpts] = useState([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => { 
        const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; 
        document.addEventListener("mousedown", fn); 
        return () => document.removeEventListener("mousedown", fn); 
    }, []);

    // Fetch data
    const fetchData = useCallback(debounce(async (search) => {
        setLoading(true);
        try {
            const res = await axios.get(url, { params: { search } });
            let data = res.data;
            if (transform) data = data.map(transform);
            // If data is just an array of strings, convert to {value, label}
            if (data.length > 0 && typeof data[0] === 'string') {
                data = data.map(item => ({ value: item, label: item }));
            }
            setOpts(data);
        } catch (e) { console.error("Filter Load Error", e); }
        setLoading(false);
    }, 300), [url, transform]);

    // Trigger fetch when opened or search text changes
    useEffect(() => {
        if (open) fetchData(txt);
    }, [open, txt, fetchData]);

    const tog = (o) => {
        const id = o[k];
        setVal(val.includes(id) ? val.filter(i => i !== id) : [...val, id]);
    };

    const isAll = opts.length > 0 && opts.every(o => val.includes(o[k]));

    return (
        <div className="relative w-full" ref={ref}>
            <div 
                onClick={() => setOpen(!open)} 
                className={`flex justify-between items-center w-full px-3 py-2 text-xs border rounded-xl cursor-pointer transition-all shadow-sm h-[38px] ${val.length ? 'border-indigo-500 ring-1 ring-indigo-100 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 bg-white text-slate-600'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{val.length === 0 ? label : `${label} (${val.length})`}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {val.length > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); setVal([]); }} className="hover:text-red-500 font-bold px-1 text-[10px]">✖</span>
                    )}
                    <span className={`text-[8px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </div>

            {open && (
                <div className="absolute z-[100] mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[400px] flex flex-col overflow-hidden animate-fadeIn left-0 xl:left-auto xl:right-0">
                    <div className="p-2 border-b bg-slate-50">
                        <div className="relative">
                            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                                placeholder={`Tìm ${label.toLowerCase()}...`} 
                                value={txt} 
                                onChange={e => setTxt(e.target.value)} 
                                autoFocus 
                            />
                        </div>
                    </div>
                    <div className="px-3 py-2 border-b flex justify-between items-center text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-white">
                        <span>Đã chọn: <b className="text-indigo-600">{val.length}</b></span>
                        <button 
                            type="button"
                            onClick={() => setVal(isAll ? [] : Array.from(new Set([...val, ...opts.map(o => o[k])])))} 
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            {isAll ? 'Bỏ hết' : 'Chọn hết trang'}
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 max-h-[250px] custom-scrollbar">
                        {loading && opts.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic">Đang tải...</div>
                        ) : opts.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic">Không tìm thấy kết quả</div>
                        ) : opts.map(o => {
                            const isSel = val.includes(o[k]);
                            return (
                                <div 
                                    key={o[k]} 
                                    onClick={() => tog(o)} 
                                    className={`flex items-center px-3 py-2 cursor-pointer rounded-xl text-xs mb-0.5 transition-all ${isSel ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <input type="checkbox" checked={isSel} readOnly className="mr-3 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none" />
                                    <span className="truncate">{o[n]}</span>
                                </div>
                            );
                        })}
                    </div>
                    {loading && opts.length > 0 && <div className="text-[9px] text-center py-1 bg-indigo-50 text-indigo-400 animate-pulse font-bold italic">Cập nhật danh sách mới...</div>}
                </div>
            )}
        </div>
    );
};

export const SalesAnalysisFilterBar = ({ onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState({
        date_from: moment().subtract(29, 'days').format('YYYY-MM-DD'),
        date_to: moment().format('YYYY-MM-DD'),
        employee_ids: [],
        brand_codes: [],
        category_codes: [],
        customer_ids: []
    });

    const [activePreset, setActivePreset] = useState('30days');

    const applyPreset = (preset) => {
        setActivePreset(preset);
        let from = moment().format('YYYY-MM-DD');
        let to = moment().format('YYYY-MM-DD');

        switch (preset) {
            case 'today': break;
            case 'yesterday': from = to = moment().subtract(1, 'days').format('YYYY-MM-DD'); break;
            case '7days': from = moment().subtract(6, 'days').format('YYYY-MM-DD'); break;
            case '30days': from = moment().subtract(29, 'days').format('YYYY-MM-DD'); break;
            case 'thisMonth': from = moment().startOf('month').format('YYYY-MM-DD'); break;
            case 'startQuarter': from = moment().startOf('quarter').format('YYYY-MM-DD'); break;
            case 'startYear': from = moment().startOf('year').format('YYYY-MM-DD'); break;
            default: return;
        }
        setFilters({ ...filters, date_from: from, date_to: to });
    };

    const handleReset = () => {
        const resetFilters = {
            date_from: moment().subtract(29, 'days').format('YYYY-MM-DD'),
            date_to: moment().format('YYYY-MM-DD'),
            employee_ids: [],
            brand_codes: [],
            category_codes: [],
            customer_ids: []
        };
        setFilters(resetFilters);
        setActivePreset('30days');
        onApplyFilters(resetFilters);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-2xl shadow-sm mb-6 border border-slate-100">
            <div className="flex flex-col xl:flex-row gap-6">
                {/* Nhóm 1: Thời gian */}
                <div className="flex-1 min-w-[220px] space-y-3">
                    <div className="flex items-center gap-2 font-black text-slate-800 text-[10px] uppercase tracking-widest">
                        <Icon name="calendar-clock" className="w-4 h-4 text-indigo-600" />
                        Thời gian
                    </div>
                    <div className="space-y-2">
                        <select 
                            value={activePreset} 
                            onChange={(e) => applyPreset(e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                        >
                            <option value="custom">-- Tùy chọn --</option>
                            <option value="today">Hôm nay</option>
                            <option value="yesterday">Hôm qua</option>
                            <option value="7days">7 ngày qua</option>
                            <option value="30days">30 ngày qua</option>
                            <option value="thisMonth">Tháng này</option>
                            <option value="startQuarter">Quý này</option>
                            <option value="startYear">Năm nay</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Từ" type="date" value={filters.date_from} onChange={e => {setFilters({...filters, date_from: e.target.value}); setActivePreset('custom');}} className="bg-slate-50 border-slate-200 rounded-xl font-bold text-[11px]" />
                            <Input placeholder="Đến" type="date" value={filters.date_to} onChange={e => {setFilters({...filters, date_to: e.target.value}); setActivePreset('custom');}} className="bg-slate-50 border-slate-200 rounded-xl font-bold text-[11px]" />
                        </div>
                    </div>
                </div>

                {/* Nhóm 2: Bộ lọc chuyên sâu - Custom AsyncMultiDrop */}
                <div className="flex-[4] space-y-4 border-l pl-6 border-slate-100">
                    <div className="flex items-center gap-2 font-black text-slate-800 text-[10px] uppercase tracking-widest mb-1">
                        <Icon name="filter-variant" className="w-4 h-4 text-purple-600" />
                        Bộ lọc Phân loại (Chỉ load 15 kết quả gợi ý)
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-tighter">Nhân viên</label>
                            <AsyncMultiDrop 
                                label="Chọn NV" 
                                url="/api/v2/filters/employees"
                                val={filters.employee_ids}
                                setVal={v => setFilters({...filters, employee_ids: v})}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-tighter">Thương hiệu</label>
                            <AsyncMultiDrop 
                                label="Chọn TH" 
                                url="/api/v2/filters/brands"
                                val={filters.brand_codes}
                                setVal={v => setFilters({...filters, brand_codes: v})}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-tighter">Nhóm hàng (L2)</label>
                            <AsyncMultiDrop 
                                label="Chọn nhóm" 
                                url="/api/v2/filters/categories"
                                val={filters.category_codes}
                                setVal={v => setFilters({...filters, category_codes: v})}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-tighter">Khách hàng</label>
                            <AsyncMultiDrop 
                                label="Tìm khách" 
                                url="/api/v2/filters/customers"
                                val={filters.customer_ids}
                                setVal={v => setFilters({...filters, customer_ids: v})}
                            />
                        </div>
                    </div>
                </div>

                {/* Nhóm 3: Hành động */}
                <div className="flex flex-col justify-end gap-2 min-w-[140px]">
                    <Button type="button" variant="secondary" onClick={handleReset} disabled={isLoading} className="w-full rounded-xl font-black h-[38px] uppercase text-[10px] tracking-widest shadow-sm flex items-center justify-center gap-2">
                        <Icon name="refresh" className="w-4 h-4" /> Reset
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading} className="w-full rounded-xl font-black h-[42px] uppercase text-[10px] tracking-widest shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                        {isLoading ? '...' : <><Icon name="filter-variant" className="w-4 h-4" /> Lọc ngay</>}
                    </Button>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </form>
    );
};

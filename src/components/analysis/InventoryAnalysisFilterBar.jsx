import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import * as UI from '../ui.jsx';

// --- COMPONENT MULTI DROP (Thừa hưởng từ PartnerAnalysis) ---
const MultiDrop = ({ label, opts = [], val = [], setVal, k = 'code', n = 'name' }) => {
    const [open, setOpen] = useState(false);
    const [txt, setTxt] = useState('');
    const ref = useRef(null);
    UI.useClickOutside(ref, () => setOpen(false));

    const fOpts = useMemo(() => {
        let res = opts.filter(o => !txt || String(o[n] || '').toLowerCase().includes(txt.toLowerCase()) || String(o[k] || '').toLowerCase().includes(txt.toLowerCase()));
        return res.sort((a, b) => (val.includes(a[k]) === val.includes(b[k])) ? 0 : val.includes(a[k]) ? -1 : 1);
    }, [opts, txt, val, k, n]);

    const tog = (o) => {
        const newVal = val.includes(o[k]) ? val.filter(i => i !== o[k]) : [...val, o[k]];
        setVal(newVal);
    };

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(!open)} className={`flex justify-between items-center min-w-[140px] max-w-[220px] h-11 px-4 text-sm border rounded-xl cursor-pointer shadow-sm transition-all hover:bg-white ${val.length ? 'border-blue-500 ring-2 ring-blue-500/10 text-blue-700 font-bold bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <span className="truncate mr-2 text-xs uppercase tracking-tighter">{val.length === 0 ? label : `${label} (${val.length})`}</span>
                <div className="flex items-center gap-1">
                    {val.length > 0 && <span onClick={(e) => { e.stopPropagation(); setVal([]) }} className="hover:text-red-500 font-bold px-1 text-xs">×</span>}
                    <UI.Icon name="chevronDown" className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {open && (
                <div className="absolute z-[210] mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[400px] flex flex-col overflow-hidden left-0 animate-fadeIn">
                    <div className="p-2 border-b bg-slate-50"><input className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold" placeholder={`Tìm ${label}...`} value={txt} onChange={e => setTxt(e.target.value)} autoFocus /></div>
                    <div className="p-2 border-b flex justify-between text-[10px] uppercase font-black text-slate-400 tracking-widest"><span>Đã chọn: <b className="text-blue-600">{val.length}</b></span><button type="button" onClick={() => setVal(val.length === opts.length ? [] : opts.map(o => o[k]))} className="text-blue-600 hover:underline">{val.length === opts.length ? 'Bỏ hết' : 'Chọn hết'}</button></div>
                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin">{fOpts.map(o => {
                        const isSel = val.includes(o[k]);
                        return <div key={o[k]} onClick={() => tog(o)} className={`flex items-center px-3 py-2 cursor-pointer rounded-lg text-xs mb-0.5 transition-colors ${isSel ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><input type="checkbox" checked={isSel} readOnly className="mr-3 w-4 h-4 rounded border-slate-300 text-blue-600 pointer-events-none" /><span className="truncate">{o[k] === o[n] ? o[n] : <>{o[n]} <span className="text-slate-400 font-normal text-[10px] ml-1">({o[k]})</span></>}</span></div>
                    })}</div>
                    {fOpts.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic font-medium">Không tìm thấy "{txt}"</div>}
                </div>
            )}
        </div>
    );
};

export const InventoryAnalysisFilterBar = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [tempSearch, setTempSearch] = useState(initialFilters.search || '');
    const searchRef = useRef(null);

    // Đồng bộ filters từ props nếu có thay đổi từ bên ngoài (ví dụ click chart)
    useEffect(() => {
        setFilters(initialFilters);
        if (initialFilters.search !== tempSearch) {
            setTempSearch(initialFilters.search || '');
        }
    }, [initialFilters]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'search') {
            setTempSearch(value);
            return;
        }
        const newFilters = { ...filters, [name]: value, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters); // Live Search cho dropdowns
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newFilters = { ...filters, search: tempSearch, page: 1 };
            setFilters(newFilters);
            onApplyFilters(newFilters);
        }
    };

    const applyQuickFilter = (key, value) => {
        const isToggleOff = filters[key] === value;
        let newTab = filters.tab;
        if (!isToggleOff) {
            if (key === 'urgency') newTab = (value === 'high' || value === 'warning') ? 'low_stock_active' : 'over_stock';
            if (key === 'sales_cycle') newTab = value === 'slow' ? 'dead_stock' : 'low_stock_active';
            if (key === 'active_only') newTab = filters.tab === 'by_supplier' ? 'by_supplier' : 'low_stock_active';
        }
        const newFilters = { ...filters, [key]: isToggleOff ? '' : value, tab: newTab, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters);
    };

    const handleUpdateMulti = (key, val) => {
        const newFilters = { ...filters, [key]: val, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters); // Live Select
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newFilters = { ...filters, search: tempSearch, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters);
    };

    const handleReset = () => {
        setTempSearch('');
        setFilters(initialFilters);
        onApplyFilters(initialFilters);
    };

    return (
        <div className="space-y-3">
            <form onSubmit={handleSubmit} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md">
                <div className="flex flex-col gap-3">
                    
                    {/* HÀNG 1: LOẠI TÌM KIẾM + PHÂN LOẠI + CÔNG CỤ */}
                    <div className="flex flex-wrap items-center gap-2">
                        
                        {/* 1. Chọn loại tìm kiếm (Đưa lên trên hàng nhóm) */}
                        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner">
                            {[
                                { id: 'all', label: 'TẤT CẢ', icon: 'search' },
                                { id: 'code', label: 'MÃ SP', icon: 'hash' },
                                { id: 'supplier', label: 'NCC', icon: 'user' },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                        const nf = { ...filters, search_field: m.id, page: 1 };
                                        setFilters(nf);
                                        onApplyFilters(nf);
                                    }}
                                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all flex items-center gap-1.5 ${(!filters.search_field && m.id === 'all') || filters.search_field === m.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                                >
                                    <UI.Icon name={m.icon} className="w-2.5 h-2.5" />
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

                        {/* 2. Các Nhóm phân cấp (Giữ tên cũ) */}
                        <MultiDrop 
                            label="NHÓM L1" 
                            opts={initialFilters.filterOptions?.brands || []} 
                            val={filters.brand || []} 
                            setVal={v => handleUpdateMulti('brand', v)} 
                        />
                        <MultiDrop 
                            label="NHÓM L2" 
                            opts={initialFilters.filterOptions?.categories || []} 
                            val={filters.category || []} 
                            setVal={v => handleUpdateMulti('category', v)} 
                        />
                        <MultiDrop 
                            label="NHÓM L3" 
                            opts={initialFilters.filterOptions?.sub_categories || []} 
                            val={filters.l3 || []} 
                            setVal={v => handleUpdateMulti('l3', v)} 
                        />

                        {/* 3. Chu kỳ Select */}
                        <div className="flex items-center bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-1.5 shadow-inner">
                            <span className="text-[9px] font-black text-blue-500 uppercase mr-2 font-mono">D:</span>
                            <select
                                name="days"
                                value={filters.days}
                                onChange={handleChange}
                                className="bg-transparent text-xs font-black text-blue-700 outline-none cursor-pointer"
                            >
                                <option value="7">7D</option>
                                <option value="14">14D</option>
                                <option value="30">30D</option>
                                <option value="60">60D</option>
                                <option value="90">90D</option>
                            </select>
                        </div>

                        <div className="flex-1"></div>

                        {/* 4. Nút hành động */}
                        <div className="flex gap-2">
                            <button type="button" onClick={handleReset} title="Reset" className="h-10 w-10 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                <UI.Icon name="refresh" className="w-4 h-4" />
                            </button>
                            <button type="submit" disabled={isLoading} className="px-5 h-10 bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-300">
                                <UI.Icon name="filter" className="w-3.5 h-3.5" />
                                LỌC NÂNG CAO
                            </button>
                        </div>
                    </div>

                    {/* HÀNG 2: THANH TÌM KIẾM THOÁNG (Bấm Enter để thực hiện) */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <UI.Icon name="search" className={`w-5 h-5 transition-colors ${isLoading ? 'text-blue-500 animate-spin' : 'text-slate-300 group-focus-within:text-blue-500'}`} />
                        </div>
                        <input
                            type="text"
                            name="search"
                            value={tempSearch}
                            onChange={handleChange}
                            onKeyDown={handleSearchKeyDown}
                            placeholder={
                                filters.search_field === 'code' ? "🔍 Nhập MÃ SẢN PHẨM và bấm ENTER để lọc nhanh..." :
                                    filters.search_field === 'supplier' ? "🔍 Nhập TÊN NHÀ CUNG CẤP và bấm ENTER để lọc nhanh..." :
                                        "🔍 Nhập nội dung bất kỳ (Mã SP, Tên hàng, Nhà cung cấp...) và bấm ENTER để tìm kiếm..."
                            }
                            className="w-full h-12 pl-12 pr-12 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 placeholder:text-slate-400 placeholder:font-normal italic shadow-inner"
                        />
                        
                        {tempSearch && (
                            <button type="button" onClick={() => {
                                setTempSearch('');
                                const nf = { ...filters, search: '', page: 1 };
                                setFilters(nf);
                                onApplyFilters(nf);
                            }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors">
                                <UI.Icon name="x" className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* Hàng Quick Filters (1 Click) - Cực kỳ tinh gọn */}
            <div className="flex flex-wrap items-center gap-3 px-1 ml-1 opacity-90">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
                    <UI.Icon name="zap" className="w-3 h-3 text-amber-500" />
                    Lọc nhanh:
                </span>

                {filters.tab !== 'by_supplier' && (<>
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {[
                            { id: 'fast', label: '🚀 FAST', color: 'text-orange-600 bg-white border-orange-200 shadow-sm' },
                            { id: 'medium', label: '📊 MED', color: 'text-blue-600 bg-white border-blue-200 shadow-sm' },
                            { id: 'slow', label: '🐢 SLOW', color: 'text-slate-500 bg-white border-slate-300 shadow-sm' },
                        ].map(btn => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => applyQuickFilter('sales_cycle', btn.id)}
                                className={`px-2 py-1 text-[9px] font-black rounded-md border transition-all ${filters.sales_cycle === btn.id ? btn.color : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {[
                            { id: 'high', label: '🔴 KHẨN', color: 'text-white bg-rose-500 border-rose-600 shadow-sm' },
                            { id: 'warning', label: '🟡 LƯU Ý', color: 'text-amber-900 bg-amber-400 border-amber-500 shadow-sm' },
                            { id: 'normal', label: '🟢 AN TOÀN', color: 'text-emerald-700 bg-white border-emerald-300 shadow-sm' },
                        ].map(btn => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => applyQuickFilter('urgency', btn.id)}
                                className={`px-2 py-1 text-[9px] font-black rounded-md border transition-all ${filters.urgency === btn.id ? btn.color : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </>)}

                <button
                    type="button"
                    onClick={() => applyQuickFilter('include_oos', 'true')}
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg border transition-all flex items-center gap-1.5 ${filters.include_oos === 'true' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 shadow-sm'}`}
                >
                    <UI.Icon name="package-x" className="w-3 h-3" />
                    BAO GỒM HÀNG HẾT
                </button>

                <button
                    type="button"
                    onClick={() => applyQuickFilter('active_only', 'true')}
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg border transition-all flex items-center gap-1.5 ${filters.active_only === 'true' ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600 shadow-sm'}`}
                >
                    <UI.Icon name="flame" className="w-3 h-3" />
                    {filters.tab === 'by_supplier' ? 'NCC CÓ DOANH SỐ' : 'ĐANG BÁN CHẠY'}
                </button>

                {(filters.sales_cycle || filters.urgency || filters.active_only) && (
                    <button
                        type="button"
                        onClick={() => {
                            const nf = { ...filters, sales_cycle: '', urgency: '', active_only: '', include_oos: '', page: 1 };
                            setFilters(nf);
                            onApplyFilters(nf);
                        }}
                        className="px-2.5 py-1.5 text-[9px] font-black rounded-lg text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-1"
                    >
                        <UI.Icon name="x" className="w-3 h-3" />
                        Xóa lọc nhanh
                    </button>
                )}
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as UI from '../ui.jsx';

export const InventoryAnalysisFilterBar = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [] });
    const [isCatOpen, setIsCatOpen] = useState(false);
    const catRef = useRef(null);

    UI.useClickOutside(catRef, () => setIsCatOpen(false));

    useEffect(() => {
        axios.get('/api/v1/direct-inventory/filter-options')
            .then(res => setFilterOptions(res.data))
            .catch(err => console.error("Lỗi tải options:", err));
    }, []);

    // Đồng bộ filters từ props nếu có thay đổi từ bên ngoài (ví dụ click chart)
    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value, page: 1 };
        setFilters(newFilters);
        // Live search cho ô nhập liệu
        if (name === 'search') {
            onApplyFilters(newFilters);
        }
    };

    const toggleCategory = (code) => {
        let currentCats = Array.isArray(filters.category_code) ? [...filters.category_code] : (filters.category_code ? [filters.category_code] : []);
        if (currentCats.includes(code)) {
            currentCats = currentCats.filter(c => c !== code);
        } else {
            currentCats.push(code);
        }
        const newFilters = { ...filters, category_code: currentCats, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters); // Apply ngay lập tức
    };

    const applyQuickFilter = (key, value) => {
        const newFilters = { ...filters, [key]: filters[key] === value ? '' : value, page: 1 };
        setFilters(newFilters);
        onApplyFilters(newFilters);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
    };

    const handleReset = () => {
        setFilters(initialFilters);
        onApplyFilters(initialFilters);
    };

    const selectedCatsCount = Array.isArray(filters.category_code) ? filters.category_code.length : (filters.category_code ? 1 : 0);

    return (
        <div className="space-y-4 mb-6">
            <form onSubmit={handleSubmit} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    
                    {/* Tìm kiếm Live */}
                    <div className="flex flex-col lg:col-span-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                            <span>Tìm kiếm Thông minh (1s)</span>
                            {isLoading && <span className="text-blue-500 animate-pulse lowercase font-bold italic">đang tìm...</span>}
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <UI.Icon name="search" className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                name="search"
                                value={filters.search || ''}
                                onChange={handleChange}
                                placeholder="Mã sản phẩm, tên, hoặc nhà cung cấp..."
                                className="w-full h-11 pl-10 pr-10 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-slate-700 hover:bg-white"
                            />
                            {filters.search && (
                                <button type="button" onClick={() => {
                                    const nf = { ...filters, search: '', page: 1 };
                                    setFilters(nf);
                                    onApplyFilters(nf);
                                }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 rounded-full p-1 hover:bg-rose-50 transition-all">
                                    <UI.Icon name="x" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Multi-select Category */}
                    <div className="flex flex-col lg:col-span-3" ref={catRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                            Nhóm sản phẩm ({selectedCatsCount})
                        </label>
                        <div className="relative">
                            <div 
                                onClick={() => setIsCatOpen(!isCatOpen)}
                                className={`w-full h-11 px-4 flex items-center justify-between text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all ${isCatOpen ? 'ring-2 ring-blue-500/20 border-blue-400' : ''}`}
                            >
                                <span className={selectedCatsCount ? 'text-blue-600' : 'text-slate-500'}>
                                    {selectedCatsCount === 0 ? 'Tất cả nhóm' : (selectedCatsCount === 1 ? '1 nhóm đã chọn' : `${selectedCatsCount} nhóm đã chọn`)}
                                </span>
                                <UI.Icon name="chevronDown" className={`w-4 h-4 text-slate-400 transition-transform ${isCatOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {isCatOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] max-h-64 overflow-y-auto p-2 scrollbar-thin">
                                    <div className="flex flex-col gap-1">
                                        {filterOptions.categories.map(cat => {
                                            const isChecked = Array.isArray(filters.category_code) ? filters.category_code.includes(cat.code) : filters.category_code === cat.code;
                                            return (
                                                <label key={cat.code} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked} 
                                                        onChange={() => toggleCategory(cat.code)}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs font-bold">{cat.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Brand */}
                    <div className="flex flex-col lg:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-center">Thương hiệu</label>
                        <select
                            name="brand_code"
                            value={filters.brand_code}
                            onChange={handleChange}
                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 hover:bg-white transition-all cursor-pointer text-center"
                        >
                            <option value="">Tất cả Brand</option>
                            {filterOptions.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                    </div>

                    {/* Tốc độ (Kỳ đánh giá) */}
                    <div className="flex flex-col lg:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-center font-mono">Chu kỳ (D)</label>
                        <select
                            name="days"
                            value={filters.days}
                            onChange={handleChange}
                            className="w-full h-11 px-2 text-sm font-black bg-blue-50 border border-blue-100 rounded-xl outline-none text-blue-700 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer text-center shadow-inner"
                        >
                            <option value="7">7D</option>
                            <option value="14">14D</option>
                            <option value="30">30D</option>
                            <option value="60">60D</option>
                            <option value="90">90D</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 lg:col-span-2">
                        <button type="button" onClick={handleReset} title="Reset về mặc định" className="h-11 w-11 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                            <UI.Icon name="refresh" className="w-5 h-5" />
                        </button>
                        <button type="submit" disabled={isLoading} className="flex-1 h-11 bg-slate-900 sky-900 text-white font-black text-xs uppercase tracking-tighter rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                             LỌC NÂNG CAO
                        </button>
                    </div>
                </div>
            </form>

            {/* Hàng Quick Filters (1 Click) */}
            <div className="flex flex-wrap items-center gap-3 px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mr-2">Quick Access:</span>
                
                {/* Chu kỳ bán */}
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
                    {[
                        { id: 'fast', label: '🚀 Fast', color: 'text-orange-600 bg-orange-50 border-orange-200' },
                        { id: 'medium', label: '📊 Med', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                        { id: 'slow', label: '🐢 Slow', color: 'text-slate-500 bg-slate-50 border-slate-300' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => applyQuickFilter('sales_cycle', btn.id)}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${filters.sales_cycle === btn.id ? btn.color + ' ring-2 ring-offset-1 ring-blue-500' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Mức khẩn */}
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
                    {[
                        { id: 'high', label: '🔴 Khẩn cấp', color: 'text-white bg-rose-500 border-rose-600' },
                        { id: 'warning', label: '🟡 Cần lưu ý', color: 'text-amber-900 bg-amber-400 border-amber-500' },
                        { id: 'normal', label: '🟢 An toàn', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => applyQuickFilter('urgency', btn.id)}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${filters.urgency === btn.id ? btn.color + ' shadow-md scale-105' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-50'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Toggle Hàng mới bán */}
                <button
                    type="button"
                    onClick={() => applyQuickFilter('active_only', 'true')}
                    className={`px-4 py-2 text-[10px] font-black rounded-xl border transition-all flex items-center gap-2 ${filters.active_only === 'true' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'}`}
                >
                    <UI.Icon name="flame" className="w-3.5 h-3.5" />
                    Chỉ hàng đang bán chạy
                </button>
            </div>
        </div>
    );
};

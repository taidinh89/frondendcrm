// src/components/analysis/SalesAnalysisFilterBar.jsx
import React, { useState } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { Button, Input, Icon } from '../ui.jsx';

// Format chuẩn cho API (YYYY-MM-DD)
const formatDate = (date) => date.toISOString().split('T')[0];

const searchTimer = {
    employee: null,
    brand: null,
    category: null,
    customer: null
};

const loadOptions = (url, transform = null) => (inputValue, callback) => {
    // Determine which timer to use based on URL
    let timerKey = 'employee';
    if (url.includes('brands')) timerKey = 'brand';
    if (url.includes('categories')) timerKey = 'category';
    if (url.includes('customers')) timerKey = 'customer';

    if (searchTimer[timerKey]) clearTimeout(searchTimer[timerKey]);
    searchTimer[timerKey] = setTimeout(() => {
        axios.get(url, { params: { search: inputValue } })
            .then(res => {
                const data = res.data;
                const options = transform ? data.map(transform) : data.map(item => ({ value: item, label: item }));
                callback(options);
            })
            .catch(() => callback([]));
    }, 300);
};

const selectStyles = {
    control: base => ({ ...base, minHeight: '38px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: 'bold' }),
    multiValue: base => ({ ...base, backgroundColor: '#eef2ff', borderRadius: '6px' }),
    multiValueLabel: base => ({ ...base, color: '#4f46e5', fontWeight: 'bold', fontSize: '11px' }),
    placeholder: base => ({ ...base, color: '#94a3b8', fontSize: '12px' }),
    menu: base => ({ ...base, zIndex: 9999, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }),
};

export const SalesAnalysisFilterBar = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [activePreset, setActivePreset] = useState('30days');
    
    // States for select labels
    const [employeeValues, setEmployeeValues] = useState([]);
    const [brandValues, setBrandValues] = useState([]);
    const [categoryValues, setCategoryValues] = useState([]);
    const [customerValues, setCustomerValues] = useState([]);

    const applyPreset = (preset) => {
        const today = new Date();
        let from = '';
        let to = formatDate(today);

        switch (preset) {
            case 'today': from = formatDate(today); break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                from = formatDate(yesterday);
                to = formatDate(yesterday);
                break;
            case '7days':
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 6);
                from = formatDate(last7);
                break;
            case '30days':
                const last30 = new Date(today);
                last30.setDate(last30.getDate() - 29);
                from = formatDate(last30);
                break;
            case 'thisMonth':
                from = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
                break;
            case 'startQuarter':
                from = formatDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1));
                break;
            case 'startYear':
                from = formatDate(new Date(today.getFullYear(), 0, 1));
                break;
            default: return;
        }

        setFilters(prev => ({ ...prev, date_from: from, date_to: to }));
        setActivePreset(preset);
    };

    const handleReset = () => {
        const today = new Date();
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        
        const defaultFilters = {
            ...initialFilters,
            date_from: formatDate(last30),
            date_to: formatDate(today),
            employee_ids: [],
            brand_codes: [],
            category_codes: [],
            customer_ids: [],
        };

        setFilters(defaultFilters);
        setActivePreset('30days');
        setEmployeeValues([]);
        setBrandValues([]);
        setCategoryValues([]);
        setCustomerValues([]);
        onApplyFilters(defaultFilters);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-2xl shadow-sm mb-6 border border-slate-100">
            <div className="flex flex-col gap-4">
                {/* Hàng 1: Thời gian & Nhân viên */}
                <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="col-span-2 lg:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Thời gian</label>
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
                    </div>
                    <div className="col-span-1 lg:col-span-2">
                        <Input label="Từ ngày" type="date" name="date_from" value={filters.date_from} onChange={e => {setFilters({...filters, date_from: e.target.value}); setActivePreset('custom');}} className="bg-slate-50 border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div className="col-span-1 lg:col-span-2">
                        <Input label="Đến ngày" type="date" name="date_to" value={filters.date_to} onChange={e => {setFilters({...filters, date_to: e.target.value}); setActivePreset('custom');}} className="bg-slate-50 border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div className="col-span-2 lg:col-span-6">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Nhân viên phụ trách</label>
                        <AsyncSelect 
                            isMulti 
                            loadOptions={loadOptions('/api/v2/filters/employees')} 
                            defaultOptions 
                            cacheOptions 
                            isClearable 
                            placeholder="Chọn nhân viên..." 
                            value={employeeValues}
                            onChange={(vals) => { setEmployeeValues(vals); setFilters(p => ({...p, employee_ids: vals ? vals.map(v => v.value) : []})); }}
                            styles={selectStyles}
                        />
                    </div>
                </div>

                {/* Hàng 2: Thương hiệu, Ngành hàng, Khách hàng */}
                <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="col-span-2 lg:col-span-3">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Thương hiệu</label>
                        <AsyncSelect 
                            isMulti 
                            loadOptions={loadOptions('/api/v2/filters/brands', b => ({value: b.value, label: b.label}))} 
                            defaultOptions 
                            cacheOptions 
                            isClearable 
                            placeholder="Tất cả thương hiệu..." 
                            value={brandValues}
                            onChange={(vals) => { setBrandValues(vals); setFilters(p => ({...p, brand_codes: vals ? vals.map(v => v.value) : []})); }}
                            styles={selectStyles}
                        />
                    </div>
                    <div className="col-span-2 lg:col-span-3">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Nhóm hàng (L2)</label>
                        <AsyncSelect 
                            isMulti 
                            loadOptions={loadOptions('/api/v2/filters/categories', c => ({value: c.value, label: c.label}))} 
                            defaultOptions 
                            cacheOptions 
                            isClearable 
                            placeholder="Tất cả nhóm hàng..." 
                            value={categoryValues}
                            onChange={(vals) => { setCategoryValues(vals); setFilters(p => ({...p, category_codes: vals ? vals.map(v => v.value) : []})); }}
                            styles={selectStyles}
                        />
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Khách hàng mục tiêu</label>
                        <AsyncSelect 
                            isMulti 
                            loadOptions={loadOptions('/api/v2/filters/customers', c => ({ value: c.ma_khncc, label: `${c.ma_khncc} - ${c.ten_cong_ty_khach_hang}` }))} 
                            defaultOptions 
                            cacheOptions 
                            isClearable 
                            placeholder="Tìm theo tên/mã/SĐT..." 
                            value={customerValues}
                            onChange={(vals) => { setCustomerValues(vals); setFilters(p => ({...p, customer_ids: vals ? vals.map(v => v.value) : []})); }}
                            styles={selectStyles}
                        />
                    </div>
                    <div className="col-span-2 lg:col-span-2 flex gap-2">
                        <Button type="button" variant="secondary" onClick={handleReset} disabled={isLoading} className="flex-1 rounded-xl font-black h-[38px] uppercase text-[10px] tracking-widest shadow-sm flex items-center justify-center gap-2">
                            <Icon name="refresh" className="w-4 h-4" /> Reset
                        </Button>
                        <Button type="submit" variant="primary" disabled={isLoading} className="flex-1 rounded-xl font-black h-[38px] uppercase text-[10px] tracking-widest shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            {isLoading ? '...' : <><Icon name="filter-variant" className="w-4 h-4" /> Lọc ngay</>}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
};
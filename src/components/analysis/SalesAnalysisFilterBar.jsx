// src/components/analysis/SalesAnalysisFilterBar.jsx
import React, { useState } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { Button, Input } from '../ui.jsx';

// =================================================================
// CẤU HÌNH DEBUG & CACHE (Giữ nguyên logic cũ)
// =================================================================

const DEBUG_MODE = 1; 
let searchTimer = null; 
const employeeCache = {}; 

// Format chuẩn cho API (YYYY-MM-DD) - KHÔNG ĐƯỢC SỬA HÀM NÀY ĐỂ TRÁNH LỖI API
const formatDate = (date) => date.toISOString().split('T')[0];

const loadEmployeeOptions = (inputValue, callback) => {
    if (employeeCache[inputValue]) {
        if (DEBUG_MODE) console.log(`%c[Cache Hit] ⚡ ${inputValue}`, 'color: orange');
        callback(employeeCache[inputValue]);
        return;
    }

    if (searchTimer) clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        axios.get('/api/v2/filters/employees', { params: { search: inputValue } })
            .then(res => {
                const options = res.data.map(name => ({ value: name, label: name }));
                employeeCache[inputValue] = options;
                callback(options);
            })
            .catch((err) => {
                console.error("Lỗi load nhân viên:", err);
                callback([]);
            });
    }, 300);
};

// =================================================================
// COMPONENT CHÍNH
// =================================================================

export const SalesAnalysisFilterBar = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [activePreset, setActivePreset] = useState('30days');
    const [employeeValues, setEmployeeValues] = useState([]);

    // --- Logic xử lý ngày tháng ---
    const applyPreset = (preset) => {
        const today = new Date();
        let from = '';
        let to = formatDate(today);

        switch (preset) {
            case 'today':
                from = formatDate(today);
                break;
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
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                from = formatDate(startMonth);
                break;
            case 'startQuarter':
                const quarter = Math.floor(today.getMonth() / 3);
                const startQuarter = new Date(today.getFullYear(), quarter * 3, 1);
                from = formatDate(startQuarter);
                break;
            case 'startYear':
                const startYear = new Date(today.getFullYear(), 0, 1);
                from = formatDate(startYear);
                break;
            default:
                return;
        }

        setFilters(prev => ({ ...prev, date_from: from, date_to: to }));
        setActivePreset(preset);
    };

    const handlePresetChange = (e) => applyPreset(e.target.value);
    
    const handleDateChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setActivePreset('custom');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
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
        };

        setFilters(defaultFilters);
        setActivePreset('30days');
        setEmployeeValues([]);
        onApplyFilters(defaultFilters);
    };

    return (
        <form onSubmit={handleSubmit} className="p-3 bg-white rounded-lg shadow-sm mb-4 border border-gray-100">
            {/* Grid Layout: Mobile 2 cột, Desktop 12 cột */}
            <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                
                {/* 1. Chọn nhanh thời gian (Full width mobile, 2 col desktop) */}
                <div className="col-span-2 lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                        Khoảng thời gian
                    </label>
                    <select
                        value={activePreset}
                        onChange={handlePresetChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
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

                {/* 2. Từ ngày - Đến ngày (Mobile: Song song, mỗi ô 1 cột. Desktop: 2 cột) */}
                <div className="col-span-1 lg:col-span-2">
                    <Input 
                        label="Từ ngày" 
                        type="date" 
                        name="date_from" 
                        value={filters.date_from} 
                        onChange={handleDateChange}
                        className="text-sm" // Giữ chữ nhỏ gọn
                    />
                </div>
                <div className="col-span-1 lg:col-span-2">
                    <Input 
                        label="Đến ngày" 
                        type="date" 
                        name="date_to" 
                        value={filters.date_to} 
                        onChange={handleDateChange} 
                        className="text-sm"
                    />
                </div>
                
                {/* 3. Chọn Nhân viên (Full width mobile, 4 col desktop) */}
                <div className="col-span-2 lg:col-span-4">
                    <label htmlFor="employee_ids" className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                        Nhân viên
                    </label>
                    <AsyncSelect
                        isMulti
                        name="employee_ids"
                        inputId="employee_ids"
                        loadOptions={loadEmployeeOptions}
                        defaultOptions={true}
                        cacheOptions={true}
                        isClearable
                        isSearchable
                        placeholder="Chọn nhân viên..."
                        value={employeeValues}
                        onChange={(selectedOptions) => {
                            setEmployeeValues(selectedOptions);
                            const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                            setFilters(prev => ({...prev, employee_ids: ids}));
                        }}
                        styles={{ 
                            control: base => ({ ...base, minHeight: '38px', borderColor: '#d1d5db', fontSize: '0.875rem' }), 
                            valueContainer: base => ({ ...base, padding: '0 6px' }),
                            menu: base => ({ ...base, zIndex: 9999 }),
                            multiValue: base => ({...base, backgroundColor: '#eff6ff'}), // Màu xanh nhạt cho tag
                        }}
                    />
                </div>

                {/* 4. Nút bấm (Full width mobile, 2 col desktop) */}
                <div className="col-span-2 lg:col-span-2 flex gap-2">
                    <Button type="button" variant="secondary" onClick={handleReset} disabled={isLoading} className="flex-1 h-[38px]">
                        Reset
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading} className="flex-1 h-[38px]">
                        {isLoading ? '...' : 'Lọc'}
                    </Button>
                </div>
            </div>
        </form>
    );
};
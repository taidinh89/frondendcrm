// src/components/dashboard/DashboardFilterBar.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { Button, Input } from '../ui.jsx';
import { dateUtils } from '../../utils/dateUtils.js';

// Hàm format date YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

export const DashboardFilterBar = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [activePreset, setActivePreset] = useState('30days'); 
    
    // State cho Select Nhân viên
    const [employeeValue, setEmployeeValue] = useState(null);

    // Hàm tính toán ngày dựa trên Preset
    const applyPreset = (preset) => {
        const today = new Date();
        let from = '';
        let to = formatDate(today); // Mặc định đến hôm nay

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
            case 'thisMonth': // Đầu tháng này
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                from = formatDate(startMonth);
                // to = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)); // Nếu muốn đến cuối tháng
                break;
            case 'startQuarter': // Đầu quý này
                const quarter = Math.floor(today.getMonth() / 3);
                const startQuarter = new Date(today.getFullYear(), quarter * 3, 1);
                from = formatDate(startQuarter);
                break;
            case 'startYear': // Đầu năm nay
                const startYear = new Date(today.getFullYear(), 0, 1);
                from = formatDate(startYear);
                break;
            default:
                return;
        }

        // Cập nhật state filters
        setFilters(prev => ({ ...prev, date_from: from, date_to: to }));
        setActivePreset(preset);
    };

    // Xử lý khi chọn Dropdown ngày
    const handlePresetChange = (e) => {
        applyPreset(e.target.value);
    };

    // Xử lý khi sửa tay ngày (sẽ chuyển preset về custom)
    const handleDateChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setActivePreset('custom');
    };

    // Load danh sách nhân viên (Async)
    const loadEmployeeOptions = (inputValue, callback) => {
        axios.get('/api/v2/filters/employees', { params: { search: inputValue } })
            .then(res => {
                const options = res.data.map(name => ({ value: name, label: name }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
    };
    
    const handleReset = () => {
        // Reset về mặc định (ví dụ: 30 ngày qua)
        const defaultPreset = '30days';
        applyPreset(defaultPreset); // Tính toán lại ngày
        
        // Reset các trường khác
        setEmployeeValue(null);
        setFilters(prev => ({
            ...prev,
            employee_id: ''
        }));
        
        // Gọi apply ngay lập tức sau khi tính xong ngày (cần dùng timeout nhỏ hoặc logic tính toán trực tiếp)
        // Ở đây ta gọi applyPreset sẽ set state, người dùng bấm Áp dụng sau. 
        // Hoặc nếu muốn reset xong tự load lại thì gọi onApplyFilters với giá trị default.
        const today = new Date();
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        
        onApplyFilters({
            date_from: formatDate(last30),
            date_to: formatDate(today),
            employee_id: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                
                {/* 1. Dropdown Chọn nhanh Ngày */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                    <select
                        value={activePreset}
                        onChange={handlePresetChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="custom">Tùy chọn...</option>
                        <option value="today">Hôm nay</option>
                        <option value="yesterday">Hôm qua</option>
                        <option value="7days">7 ngày qua</option>
                        <option value="30days">30 ngày qua</option>
                        <option value="thisMonth">Đầu tháng này</option>
                        <option value="startQuarter">Đầu quý này</option>
                        <option value="startYear">Đầu năm nay</option>
                    </select>
                </div>

                {/* 2. Date Inputs */}
                <div className="lg:col-span-2">
                    <Input
                        label="Từ ngày"
                        type="date"
                        name="date_from"
                        value={filters.date_from}
                        onChange={handleDateChange}
                    />
                </div>
                <div className="lg:col-span-2">
                    <Input
                        label="Đến ngày"
                        type="date"
                        name="date_to"
                        value={filters.date_to}
                        onChange={handleDateChange}
                    />
                </div>
                
                {/* 3. Bộ lọc Nhân viên (Async) */}
                <div className="lg:col-span-3">
                    <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                    <AsyncSelect
                        name="employee_id"
                        inputId="employee_id"
                        loadOptions={loadEmployeeOptions}
                        isClearable
                        isSearchable
                        placeholder="Tìm nhân viên..."
                        value={employeeValue}
                        onChange={(selectedOption) => {
                            setEmployeeValue(selectedOption);
                            setFilters(prev => ({...prev, employee_id: selectedOption ? selectedOption.value : ''}));
                        }}
                        defaultOptions
                        cacheOptions
                        styles={{ 
                            control: base => ({ ...base, minHeight: '38px', borderColor: '#d1d5db' }), 
                            valueContainer: base => ({ ...base, padding: '0 6px' }),
                            menu: base => ({ ...base, zIndex: 9999 }) // Đảm bảo dropdown nổi lên trên
                        }}
                    />
                </div>

                {/* 4. Nút bấm */}
                <div className="flex gap-2 lg:col-span-3">
                    <Button type="button" variant="secondary" onClick={handleReset} disabled={isLoading} className="flex-1">
                        Reset
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
                        {isLoading ? 'Đang tải...' : 'Áp dụng'}
                    </Button>
                </div>
            </div>
        </form>
    );
};
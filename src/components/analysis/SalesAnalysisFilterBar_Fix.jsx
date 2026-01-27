// SalesAnalysisFilterBar_Fix.jsx
import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { Button, Input } from '../ui.jsx';

const formatDate = (date) => date.toISOString().split('T')[0];

export const SalesAnalysisFilterBar_Fix = ({ initialFilters, onApplyFilters, isLoading }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [activePreset, setActivePreset] = useState('30days');
    const [employeeValues, setEmployeeValues] = useState([]);

    // FIX: AsyncSelect chỉ gọi 1 lần
    const hasLoadedEmployees = useRef(false);
    const loadEmployeeOptions = useCallback((inputValue, callback) => {
        if (hasLoadedEmployees.current && !inputValue) {
            console.log('%cAsyncSelect: SKIP duplicate load (defaultOptions)', 'color: orange;');
            callback([]);
            return;
        }

        const controller = new AbortController();
        console.log('%cAsyncSelect: LOADING employees...', 'color: #9b59b6;', inputValue || '(default)');

        axios.get('/api/v2/filters/employees', {
            params: { search: inputValue },
            signal: controller.signal,
            withCredentials: true
        })
        .then(res => {
            hasLoadedEmployees.current = true;
            const options = res.data.map(name => ({ value: name, label: name }));
            console.log('%cAsyncSelect: LOADED ' + options.length + ' employees', 'color: #9b59b6; font-weight: bold;');
            callback(options);
        })
        .catch(err => {
            if (!axios.isCancel(err)) {
                console.error('%cAsyncSelect: ERROR', 'color: red;', err.response || err);
                callback([]);
            }
        });

        return () => controller.abort();
    }, []);

    // ... giữ nguyên applyPreset, handleSubmit, handleReset ...

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-sm mb-6">
            {/* ... giữ nguyên JSX ... */}
            <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                <AsyncSelect
                    isMulti
                    cacheOptions
                    defaultOptions
                    loadOptions={loadEmployeeOptions}
                    placeholder="Chọn nhân viên..."
                    value={employeeValues}
                    onChange={(opts) => {
                        setEmployeeValues(opts);
                        setFilters(prev => ({ ...prev, employee_ids: opts ? opts.map(o => o.value) : [] }));
                    }}
                    styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
                />
            </div>
            {/* ... */}
        </form>
    );
};
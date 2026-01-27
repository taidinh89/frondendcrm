// src/components/EmployeeSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, X, Loader2, User } from 'lucide-react';

export const EmployeeSearch = ({ selectedEmployee, onSelect, className = "" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  // Xử lý tìm kiếm (Logic học từ SalesAnalysisFilterBar.jsx)
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!term.trim()) {
        setEmployees([]);
        return;
    }

    setLoading(true);
    setIsOpen(true);
    
    timeoutRef.current = setTimeout(async () => {
        try {
            // [FIX LỖI 404] Thêm /api/v2 vào đường dẫn
            const res = await axios.get('/api/v2/filters/employees', {
                params: { search: term }
            });
            
            // API filter thường trả về mảng string ["Tên A", "Tên B"] hoặc object
            const data = res.data.data || res.data;
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi tìm nhân viên:", error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }, 300); // Debounce 300ms giống code cũ
  };

  // Click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (emp) => {
    // Xử lý nếu API trả về String hoặc Object
    const empName = typeof emp === 'string' ? emp : (emp.name || emp.full_name);
    const empId = typeof emp === 'string' ? emp : (emp.id || emp.code);
    
    onSelect({ id: empId, name: empName });
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm('');
  };

  // UI khi đã chọn
  if (selectedEmployee) {
    return (
      <div className={`relative flex items-center w-full border border-gray-300 rounded px-3 py-2 bg-white ${className}`}>
        <User size={16} className="text-gray-400 mr-2" />
        <div className="flex-1 text-sm text-gray-900 font-medium truncate">
            {selectedEmployee.name || selectedEmployee}
        </div>
        <button onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={16} />
        </button>
      </div>
    );
  }

  // UI tìm kiếm
  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="text"
          className="block w-full pl-9 pr-8 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="Tìm nhân viên..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if(searchTerm) setIsOpen(true); }}
        />
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
          <User size={16} />
        </div>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
        </div>
      </div>

      {isOpen && employees.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-48 rounded border border-gray-200 overflow-auto text-sm">
            {employees.map((emp, index) => {
                const name = typeof emp === 'string' ? emp : (emp.name || emp.full_name);
                return (
                  <div
                    key={index}
                    className="cursor-pointer py-2 px-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 text-gray-700"
                    onClick={() => handleSelect(emp)}
                  >
                    {name}
                  </div>
                );
            })}
        </div>
      )}
      
      {isOpen && !loading && employees.length === 0 && searchTerm.length > 1 && (
         <div className="absolute z-50 mt-1 w-full bg-white shadow p-2 text-xs text-gray-500 border rounded">
            Không tìm thấy.
         </div>
      )}
    </div>
  );
};
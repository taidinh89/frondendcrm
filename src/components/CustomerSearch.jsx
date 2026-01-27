// src/components/CustomerSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Dùng axios thật
import { Search, X, Loader2 } from 'lucide-react';

export const CustomerSearch = ({ selectedCustomer, onSelect, className = "" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  // Xử lý tìm kiếm qua API (Debounce)
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!term.trim()) {
        setCustomers([]);
        return;
    }

    setLoading(true);
    setIsOpen(true);
    
    timeoutRef.current = setTimeout(async () => {
        try {
            // Gọi API thực tế
            const res = await axios.get('/api/v2/customers', {
                params: { search: term, per_page: 10 }
            });
            const data = res.data.data || res.data;
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Lỗi tìm khách hàng:", error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, 400); // Chờ 400ms sau khi ngừng gõ
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    onSelect(customer);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm('');
  };

  // UI khi đã chọn khách
  if (selectedCustomer) {
    return (
      <div className={`relative flex items-center w-full border border-gray-300 rounded hover:border-indigo-500 bg-white transition-colors ${className}`}>
        <div className="flex-1 px-3 py-1.5 text-sm text-gray-900 truncate">
            <span className="font-medium mr-2 text-indigo-700">
                {selectedCustomer.ma_khncc || selectedCustomer.code}
            </span>
            {selectedCustomer.ten_cong_ty_khach_hang || selectedCustomer.name}
        </div>
        <button onClick={handleClear} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
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
          className="block w-full pl-3 pr-10 py-1.5 border border-gray-300 rounded text-sm leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
          placeholder="Nhập tên, SĐT hoặc mã khách..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if(searchTerm) setIsOpen(true); }}
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
      </div>

      {isOpen && customers.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded border border-gray-200 overflow-auto text-sm">
            {customers.map((customer) => (
              <div
                key={customer.id || customer.ma_khncc}
                className="cursor-pointer py-2 px-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
                onClick={() => handleSelect(customer)}
              >
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                        {customer.ten_cong_ty_khach_hang}
                    </span>
                    <span className="text-xs text-gray-500">
                        Mã: {customer.ma_khncc} - SĐT: {customer.dien_thoai_1 || '---'}
                    </span>
                </div>
              </div>
            ))}
        </div>
      )}
      
      {isOpen && !loading && customers.length === 0 && searchTerm.length > 1 && (
         <div className="absolute z-50 mt-1 w-full bg-white shadow-lg p-3 text-sm text-gray-500 border border-gray-200 rounded">
            Không tìm thấy khách hàng.
         </div>
      )}
    </div>
  );
};
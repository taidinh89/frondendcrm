import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, ChevronRight, ChevronDown, Flame, Package, MapPin } from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const PRICE_TYPES = [
    { key: 'out_price', label: 'Giá Lẻ', color: 'text-blue-700' },
    { key: 'out_price1', label: 'Giá Sỉ 1', color: 'text-orange-600' },
    { key: 'out_price2', label: 'Giá Sỉ 2', color: 'text-orange-700' },
    { key: 'in_price', label: 'Giá Vốn', color: 'text-red-600' }
];

export const ProductSearchV2 = ({ onAddProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState(null); 
  
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Gọi API Tìm kiếm V2
  const fetchProducts = async (term) => {
      setLoading(true);
      try {
          const res = await axios.get('/api/v2/quotations/products/search', { 
              params: { search: term, limit: 20 } 
          });
          setProducts(res.data.data || []);
          setActiveIndex(0);
          setIsOpen(true);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      const timeoutId = setTimeout(() => {
          if (document.activeElement === inputRef.current) fetchProducts(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
      if (!isOpen && e.key === 'ArrowDown') {
          setIsOpen(true); fetchProducts(searchTerm); return;
      }
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex(prev => (prev < products.length - 1 ? prev + 1 : prev));
          document.getElementById(`item-v2-${activeIndex + 1}`)?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
          document.getElementById(`item-v2-${activeIndex - 1}`)?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (products[activeIndex]) handleAdd(products[activeIndex], 'out_price');
      } else if (e.key === 'ArrowRight') {
          // Phím phải để mở rộng xem chi tiết (Học từ bản cũ)
          e.preventDefault();
          if (products[activeIndex]) setExpandedId(products[activeIndex].id);
      } else if (e.key === 'Escape') {
          setIsOpen(false);
      }
  };

  const handleAdd = (product, priceKey) => {
      onAddProduct(product, priceKey);
      setSearchTerm('');
      setIsOpen(false);
      setProducts([]);
  };

  useEffect(() => {
      const handleClickOutside = (e) => {
          if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full z-50" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {loading ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Search className="text-gray-400" size={18} />}
        </div>
        <input
          id="product-search-input"
          ref={inputRef}
          type="text"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-300 text-gray-900 text-sm rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder-gray-400"
          placeholder="Tìm hàng (Mũi tên phải -> xem tồn kho & giá sỉ)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setIsOpen(true); if(products.length===0) fetchProducts(searchTerm); }}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div className="absolute w-full bg-white mt-1 rounded-lg shadow-2xl border border-gray-200 max-h-[500px] overflow-y-auto custom-scrollbar">
            {!searchTerm && products.length > 0 && (
                <div className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-bold border-b border-orange-100 flex items-center sticky top-0 bg-orange-50 z-10">
                    <Flame size={12} className="mr-1 fill-orange-500"/> SẢN PHẨM HOT
                </div>
            )}
            
            {products.map((product, index) => {
                const isActive = index === activeIndex;
                const isExpanded = expandedId === product.id;
                const isMisa = product.display_source === 'misa';

                return (
                    <div 
                        key={index} id={`item-v2-${index}`}
                        className={`border-b border-gray-50 flex flex-col transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                    >
                        <div className="flex w-full">
                            {/* VÙNG CHÍNH: CLICK CHỌN NGAY */}
                            <div 
                                className="flex-1 px-3 py-2 cursor-pointer"
                                onClick={() => handleAdd(product, 'out_price')}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-extrabold px-1 rounded border ${isMisa ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                        {isMisa ? 'MS' : 'EC'}
                                    </span>
                                    {product.is_hot && <Flame size={12} className="text-red-500 fill-red-500"/>}
                                    <span className="text-sm font-bold text-gray-800">{product.display_name}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 gap-3 mt-1">
                                    <span className="bg-gray-100 px-1 rounded font-mono">{product.product_code}</span>
                                    <span className="flex items-center gap-1"><Package size={10}/> Kho: <b>{product.inventory?.total || 0}</b> {product.unit}</span>
                                </div>
                            </div>

                            {/* VÙNG MỞ RỘNG */}
                            <div 
                                className={`w-24 border-l border-gray-200 flex flex-col justify-center items-end px-3 cursor-pointer ${isExpanded ? 'bg-blue-200' : 'hover:bg-blue-200'}`}
                                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : product.id); }}
                            >
                                <span className="font-bold text-blue-700">{formatCurrency(product.prices?.retail || 0)}</span>
                                {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            </div>
                        </div>
                        
                        {/* PANEL MỞ RỘNG (CHI TIẾT TỒN KHO + GIÁ) - HỌC TỪ BẢN CŨ */}
                        {isExpanded && (
                            <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 animate-in slide-in-from-top-1">
                                {/* 1. Chi tiết tồn kho (Kho Tổng, Kho Lẻ...) */}
                                {product.inventory?.locations?.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2 pb-2 border-b border-gray-200 border-dashed">
                                        {product.inventory.locations.map((loc, idx) => (
                                            <span key={idx} className="text-[10px] bg-white border border-gray-300 px-2 py-0.5 rounded flex items-center gap-1 text-gray-600">
                                                <MapPin size={8} /> {loc.warehouse_name}: <b className="text-black">{loc.quantity}</b>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 2. Chọn các loại giá khác nhau */}
                                <div className="grid grid-cols-2 gap-2">
                                    {PRICE_TYPES.map(pt => {
                                        const price = product.prices?.[pt.key] || 0;
                                        return (
                                            <button 
                                                key={pt.key}
                                                onClick={() => handleAdd(product, pt.key)}
                                                className="text-left text-xs p-2 bg-white border rounded hover:border-blue-500 hover:bg-blue-50 flex justify-between items-center shadow-sm group"
                                            >
                                                <span className="text-gray-500 group-hover:text-blue-600">{pt.label}</span>
                                                <span className={`font-bold ${pt.color}`}>{formatCurrency(price)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};
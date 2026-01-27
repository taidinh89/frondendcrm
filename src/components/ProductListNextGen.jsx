import React, { useState, useEffect, useMemo, useRef } from 'react';
import { productApi } from '../api/admin/productApi';
import { mediaApi } from '../api/admin/mediaApi';
import { Icon, Button } from './ui';
import ProductCardMobile from './ProductCardMobile';
import ProductRowMobile from './ProductRowMobile';
import ProductDetailMobile from './ProductDetailMobile';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Component chọn có tìm kiếm
const SearchableSelect = ({ label, options, value, onChange, placeholder = "Tìm kiếm..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            (opt.name || opt.code || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const selectedLabel = useMemo(() => {
        const selected = options.find(opt => opt.code === value);
        return selected ? (selected.name || selected.code) : '';
    }, [options, value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="text-[10px] font-black p-1 text-gray-400 uppercase">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-gray-50 border-2 transition-all rounded-2xl p-3 text-sm font-bold flex justify-between items-center cursor-pointer ${isOpen ? 'border-blue-500 bg-white ring-4 ring-blue-50' : (value ? 'border-blue-200 bg-blue-50/30' : 'border-transparent')}`}
            >
                <span className={selectedLabel ? 'text-blue-700 font-black' : 'text-gray-400'}>
                    {selectedLabel || placeholder}
                </span>
                <Icon name={isOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
                    <div className="p-3 border-b bg-gray-50">
                        <input
                            className="w-full px-4 py-2 text-sm bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-bold"
                            placeholder="Gõ để tìm nhanh..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                        <div
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className="px-4 py-2.5 text-xs font-black text-red-500 hover:bg-red-50 cursor-pointer border-b border-gray-50 mb-1"
                        >
                            --- BỎ CHỌN ---
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.code}
                                    onClick={() => { onChange(opt.code); setIsOpen(false); setSearch(''); }}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-all flex justify-between items-center ${value === opt.code ? 'bg-blue-600 text-white font-black' : 'text-gray-700 hover:bg-gray-50 font-bold'}`}
                                >
                                    <span>{opt.name || opt.code}</span>
                                    {value === opt.code && <Icon name="check" className="w-4 h-4" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-xs text-gray-400 italic font-bold">Không tìm thấy</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductListNextGen = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [apiStats, setApiStats] = useState(null);
    const [viewMode, setViewMode] = useState('grid');

    // Tape states
    const [tapeType, setTapeType] = useState('category');
    const [tapeSearch, setTapeSearch] = useState('');

    // Bộ lọc chính - KHỚP HOÀN TOÀN BACKEND
    const [filters, setFilters] = useState({
        is_on: 'ALL',
        stock_status: 'ALL',
        category_id: '',
        brand_id: '',
        flags: [], // hot, new, best_sell, sale_off, student_support, installment_0
        has_promotion: false,
        has_image: 'ALL',
        price_min: '',
        price_max: '',
        sort_by: 'updated_at',
        sort_direction: 'desc'
    });

    const [dictionary, setDictionary] = useState({ categories: [], brands: [] });
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mode, setMode] = useState('view');

    // Load meta data
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await axios.get('/api/v2/dictionary/list');
                const data = res.data || [];
                const brands = data.filter(i => i.type === 'BRAND').map(i => ({ code: i.code, name: i.current_name || i.code }));
                const cats = data.filter(i => String(i.type).startsWith('CAT')).map(i => ({ code: i.code, name: i.current_name || i.code }));
                setDictionary({ categories: cats, brands: brands });
            } catch (e) { console.error(e); }
        };
        fetchMeta();
    }, []);

    const tapeItems = useMemo(() => {
        const source = tapeType === 'category' ? dictionary.categories : dictionary.brands;
        if (!tapeSearch) return source;
        const s = tapeSearch.toLowerCase();
        return source.filter(i => (i.name || '').toLowerCase().includes(s) || (i.code || '').toLowerCase().includes(s));
    }, [tapeType, dictionary, tapeSearch]);

    const handleTapeClick = (code) => {
        if (tapeType === 'category') {
            setFilters(prev => ({ ...prev, category_id: code, brand_id: '' }));
        } else {
            setFilters(prev => ({ ...prev, brand_id: code, category_id: '' }));
        }
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const params = {
                search: search || undefined,
                page: 1,
                per_page: 48,
                is_on: filters.is_on === 'ALL' ? undefined : (filters.is_on === '1' ? 1 : 0),
                category_id: filters.category_id || undefined,
                brand_id: filters.brand_id || undefined,
                flags: filters.flags.length > 0 ? filters.flags.join(',') : undefined,
                has_promotion: filters.has_promotion ? 1 : undefined,
                price_min: filters.price_min || undefined,
                price_max: filters.price_max || undefined,
                stock_status: filters.stock_status === 'ALL' ? undefined : filters.stock_status,
                has_image: filters.has_image === 'ALL' ? undefined : (filters.has_image === 'YES' ? 1 : 0),
                sort_by: filters.sort_by,
                sort_direction: filters.sort_direction
            };

            const res = await productApi.getLibrary(params);
            setProducts(res.data.data || []);
            if (res.data.stats) setApiStats(res.data.stats);
        } catch (error) { toast.error("Lỗi nạp dữ liệu"); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        const timer = setTimeout(() => { fetchProducts(); }, 400);
        return () => clearTimeout(timer);
    }, [search, filters]);

    // Hàm tiện ích để áp dụng lọc nhanh từ Badge
    const applyQuickFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        toast.success(`Đang lọc theo: ${value === 'ALL' ? 'Tất cả' : value}`, { icon: '🔍', duration: 1000 });
    };

    const handleSyncOne = async (id) => {
        const toastId = toast.loading("Đang đồng bộ...");
        try {
            await productApi.syncOne(id);
            toast.success("Xong!", { id: toastId });
            fetchProducts();
        } catch (error) { toast.error("Lỗi", { id: toastId }); }
    };

    const handleSyncAllFromWeb = async () => {
        if (!window.confirm("CẢNH BÁO: Quá trình này sẽ quét toàn bộ sản phẩm trên Web QVC và cập nhật về đây.\n\nViệc này có thể mất vài phút. Bạn có chắc chắn không?")) return;
        const toastId = toast.loading("Đang đồng bộ dữ liệu từ Web (0%)...");
        try {
            const res = await mediaApi.syncFromSource();
            if (res.data.success) {
                toast.success(`Đã đồng bộ xong ${res.data.total} sản phẩm!`, { id: toastId });
                fetchProducts();
            } else { toast.error("Có lỗi: " + res.data.message, { id: toastId }); }
        } catch (error) { toast.error("Lỗi kết nối Server", { id: toastId }); }
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-gray-900">
            {/* 1. DASHBOARD STATS - BIẾN THÀNH CÁC NÚT LỌC NHANH */}
            <div className="bg-white border-b px-4 py-4 flex gap-4 overflow-x-auto no-scrollbar shadow-sm sticky top-0 md:static z-[45]">
                {[
                    { label: 'Tổng SP', val: apiStats?.total, color: 'text-gray-900', bg: 'bg-gray-100', active: filters.is_on === 'ALL' && filters.stock_status === 'ALL' && filters.has_image === 'ALL' && !filters.has_promotion, onClick: () => setFilters(p => ({ ...p, is_on: 'ALL', stock_status: 'ALL', has_image: 'ALL', has_promotion: false })) },
                    { label: 'Đang hiện', val: apiStats?.active, color: 'text-green-600', bg: 'bg-green-50', active: filters.is_on === '1', onClick: () => applyQuickFilter('is_on', '1') },
                    { label: 'Đang ẩn', val: apiStats?.inactive, color: 'text-gray-400', bg: 'bg-gray-50', active: filters.is_on === '0', onClick: () => applyQuickFilter('is_on', '0') },
                    { label: 'Hết hàng', val: apiStats?.out_stock, color: 'text-orange-600', bg: 'bg-orange-50', active: filters.stock_status === 'out_stock', onClick: () => applyQuickFilter('stock_status', 'out_stock') },
                    { label: 'Khuyến mãi', val: apiStats?.has_promo, color: 'text-red-600', bg: 'bg-red-50', active: filters.has_promotion, onClick: () => applyQuickFilter('has_promotion', true) },
                    { label: 'Thiếu ảnh', val: apiStats?.no_image, color: 'text-purple-600', bg: 'bg-purple-50', active: filters.has_image === 'NO', onClick: () => applyQuickFilter('has_image', 'NO') },
                ].map((s, i) => (
                    <button
                        key={i}
                        onClick={s.onClick}
                        className={`${s.bg} flex-shrink-0 px-6 py-4 rounded-3xl border-4 transition-all active:scale-95 flex flex-col items-center min-w-[130px] shadow-sm ${s.active ? 'border-blue-500 scale-105 shadow-blue-100 bg-white ring-8 ring-blue-50/50' : 'border-white hover:border-blue-100'}`}
                    >
                        <div className={`text-3xl font-black ${s.color}`}>{s.val ?? '--'}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</div>
                        {s.active && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 animate-bounce"></div>}
                    </button>
                ))}
            </div>

            {/* 2. SEARCH & CONTROLS */}
            <div className="sticky top-[108px] md:top-0 z-40 bg-white/95 backdrop-blur-2xl shadow-xl border-b border-blue-50">
                <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full relative group">
                            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Tìm theo Tên, SKU hoặc ID..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-black focus:bg-white focus:border-blue-500 transition-all shadow-inner outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm border-4 transition-all shadow-lg active:scale-95 ${showFilterDrawer ? 'bg-orange-500 border-orange-200 text-white' : 'bg-white border-blue-50 text-blue-600 hover:border-blue-400'}`}
                            >
                                <Icon name="filter" className="w-5 h-5" />
                                <span>BỘ LỌC</span>
                            </button>

                            <button onClick={handleSyncAllFromWeb} className="bg-orange-50 text-orange-600 p-4 rounded-2xl shadow-lg hover:bg-orange-100 active:scale-90 transition-all border-2 border-orange-100" title="Đồng bộ từ Web">
                                <Icon name="download" className="w-6 h-6" />
                            </button>

                            <button onClick={() => { setMode('create'); setIsModalOpen(true); }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl hover:bg-blue-700 active:scale-90 transition-all border-2 border-blue-500">
                                <Icon name="plus" className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tape Switcher */}
                    <div className="flex items-center gap-4 py-1">
                        <div className="inline-flex bg-gray-100 p-1.5 rounded-2xl border-2 border-gray-50 shadow-inner">
                            <button
                                onClick={() => {
                                    setTapeType('category');
                                    setTapeSearch('');
                                    setFilters(p => ({ ...p, brand_id: '' }));
                                }}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${tapeType === 'category' ? 'bg-white shadow-lg text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Danh mục
                            </button>
                            <button
                                onClick={() => {
                                    setTapeType('brand');
                                    setTapeSearch('');
                                    setFilters(p => ({ ...p, category_id: '' }));
                                }}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${tapeType === 'brand' ? 'bg-white shadow-lg text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Hãng
                            </button>
                        </div>

                        <div className="relative w-36 md:w-56 group border-r pr-4">
                            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                className="w-full pl-8 pr-3 py-3 bg-gray-50 border-none rounded-xl text-[11px] font-black focus:bg-white focus:ring-4 ring-blue-50 transition-all outline-none"
                                placeholder={`Tìm nhanh...`}
                                value={tapeSearch}
                                onChange={e => setTapeSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-x-auto gap-2 no-scrollbar flex items-center">
                            <button
                                onClick={() => setFilters(p => ({ ...p, category_id: '', brand_id: '' }))}
                                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black border-2 transition-all shadow-sm ${(!filters.category_id && !filters.brand_id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-400'}`}
                            >
                                🔥 TẤT CẢ
                            </button>
                            {tapeItems.map(item => {
                                const isSel = tapeType === 'category' ? filters.category_id === item.code : filters.brand_id === item.code;
                                return (
                                    <button
                                        key={item.code}
                                        onClick={() => handleTapeClick(item.code)}
                                        className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black transition-all border-2 whitespace-nowrap shadow-sm ${isSel ? 'bg-white border-blue-500 text-blue-700 ring-4 ring-blue-50' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-300 hover:text-gray-600'}`}
                                    >
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4">
                {/* 3. FILTER DRAWER */}
                {showFilterDrawer && (
                    <div className="bg-white rounded-[3.5rem] p-12 mb-8 shadow-2xl border-4 border-blue-50 animate-fadeIn space-y-12 relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            <SearchableSelect
                                label="Hãng (Thương hiệu)"
                                options={dictionary.brands}
                                value={filters.brand_id}
                                onChange={v => setFilters(p => ({ ...p, brand_id: v, category_id: '' }))}
                                placeholder="Gõ tên hãng..."
                            />
                            <SearchableSelect
                                label="Danh mục sản phẩm"
                                options={dictionary.categories}
                                value={filters.category_id}
                                onChange={v => setFilters(p => ({ ...p, category_id: v, brand_id: '' }))}
                                placeholder="Gõ tên nhóm..."
                            />
                            <div>
                                <label className="text-[10px] font-black p-1 text-gray-400 uppercase tracking-widest">Sắp xếp dữ liệu</label>
                                <select className="w-full bg-blue-50 border-none rounded-3xl p-5 text-sm font-black text-blue-900 outline-none hover:bg-white hover:ring-4 ring-blue-50 transition-all cursor-pointer" value={`${filters.sort_by}-${filters.sort_direction}`} onChange={e => {
                                    const [field, dir] = e.target.value.split('-');
                                    setFilters(p => ({ ...p, sort_by: field, sort_direction: dir }));
                                }}>
                                    <option value="updated_at-desc">🕑 Mới cập nhật</option>
                                    <option value="id-desc">🔥 ID Mới nhất</option>
                                    <option value="price_web-desc">💰 Giá giảm dần</option>
                                    <option value="price_web-asc">🏷️ Giá tăng dần</option>
                                    <option value="quantity_web-desc">📦 Có sẵn nhiều</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black p-1 text-gray-400 uppercase tracking-widest">Bộ lọc Hình ảnh</label>
                                <select className="w-full bg-gray-50 border-none rounded-3xl p-5 text-sm font-black outline-none" value={filters.has_image} onChange={e => setFilters(p => ({ ...p, has_image: e.target.value }))}>
                                    <option value="ALL">Mọi sản phẩm</option>
                                    <option value="YES">✅ Đã có ảnh</option>
                                    <option value="NO">❌ Chưa có ảnh</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-10 border-t-2 border-dashed border-gray-100 space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase block tracking-[0.2em] mb-4">Flags & Marketing Engine</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { k: 'hot', l: '🔥 SIÊU HOT', c: 'orange-600', b: 'orange-50' },
                                    { k: 'new', l: '✨ HÀNG MỚI', c: 'blue-600', b: 'blue-50' },
                                    { k: 'sale_off', l: '🏷️ XẢ KHO', c: 'red-600', b: 'red-50' },
                                    { k: 'best_sell', l: '🏆 BÁN CHẠY', c: 'yellow-600', b: 'yellow-50' },
                                    { k: 'student_support', l: '🎓 SINH VIÊN', c: 'green-600', b: 'green-50' },
                                    { k: 'installment_0', l: '💳 TRẢ GÓP 0%', c: 'purple-600', b: 'purple-50' },
                                ].map(f => (
                                    <button
                                        key={f.k}
                                        onClick={() => setFilters(p => ({ ...p, flags: p.flags.includes(f.k) ? p.flags.filter(i => i !== f.k) : [...p.flags, f.k] }))}
                                        className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase transition-all border-4 shadow-sm ${filters.flags.includes(f.k) ? `bg-${f.c} border-transparent text-white shadow-xl scale-110 z-10` : `bg-white text-gray-400 border-${f.b} hover:border-gray-200`}`}
                                    >
                                        {f.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black pb-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest text-center">Trạng thái tồn kho</label>
                                <div className="flex bg-gray-100 p-2 rounded-[2rem] shadow-inner">
                                    {['ALL', 'in_stock', 'out_stock', 'low_stock'].map(s => (
                                        <button key={s} onClick={() => setFilters(p => ({ ...p, stock_status: s }))} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${filters.stock_status === s ? 'bg-white shadow-xl text-blue-600 transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {s === 'ALL' ? 'TẤT CẢ' : s === 'in_stock' ? 'Còn hàng' : s === 'out_stock' ? 'Hết hàng' : 'Sắp hết'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest text-right">Khoảng giá lọc (VND)</label>
                                <div className="flex items-center gap-4">
                                    <input type="number" placeholder="Từ..." className="w-full bg-gray-50 border-4 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 text-sm font-black shadow-inner outline-none transition-all" value={filters.price_min} onChange={e => setFilters(p => ({ ...p, price_min: e.target.value }))} />
                                    <span className="text-gray-200 text-3xl font-light">/</span>
                                    <input type="number" placeholder="Đến..." className="w-full bg-gray-50 border-4 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 text-sm font-black shadow-inner outline-none transition-all" value={filters.price_max} onChange={e => setFilters(p => ({ ...p, price_max: e.target.value }))} />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t-4 border-gray-50 gap-6">
                            <button onClick={() => setFilters({ is_on: 'ALL', stock_status: 'ALL', category_id: '', brand_id: '', flags: [], has_promotion: false, has_image: 'ALL', price_min: '', price_max: '', sort_by: 'updated_at', sort_direction: 'desc' })} className="text-xs font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-2">
                                <Icon name="refresh" className="w-4 h-4" />
                                XÓA SẠCH BỘ LỌC
                            </button>
                            <Button variant="primary" onClick={() => setShowFilterDrawer(false)} className="bg-gray-900 text-white rounded-[2rem] px-24 py-6 shadow-2xl text-base font-black uppercase tracking-[0.2em] transform hover:-translate-y-2 transition-all">
                                THỰC THI LỌC DỮ LIỆU
                            </Button>
                        </div>
                    </div>
                )}

                {/* 4. PRODUCT FEED */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-48 gap-10">
                        <div className="relative">
                            <div className="w-24 h-24 border-[12px] border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-blue-600">QVC</div>
                        </div>
                        <div className="flex flex-col items-center gap-2 text-center">
                            <p className="text-gray-900 font-black uppercase tracking-[0.5em] text-sm animate-pulse">Syncing Database...</p>
                            <p className="text-gray-400 text-[10px] font-black uppercase">Đang đồng bộ logic Backend của bạn</p>
                        </div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-48 bg-white rounded-[5rem] border-8 border-dashed border-gray-50 flex flex-col items-center justify-center shadow-inner scale-95 opacity-80">
                        <div className="bg-gray-50 p-12 rounded-full mb-10 text-gray-200">
                            <Icon name="search" className="w-24 h-24" />
                        </div>
                        <p className="text-gray-900 font-black text-3xl uppercase tracking-tighter">Bộ lọc trống</p>
                        <p className="text-gray-400 text-sm mt-4 font-bold uppercase tracking-widest">Không có sản phẩm nào khớp với điều kiện lọc</p>
                        <Button variant="secondary" className="mt-12 px-12 py-5 rounded-3xl" onClick={() => setFilters(prev => ({ ...prev, is_on: 'ALL', stock_status: 'ALL', has_image: 'ALL', category_id: '', brand_id: '' }))}>QUAY LẠI TẤT CẢ SẢN PHẨM</Button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn" : "bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-white divide-y-8 divide-gray-50"}>
                        {products.map(prod => (
                            viewMode === 'grid' ? (
                                <ProductCardMobile
                                    key={prod.id}
                                    product={prod}
                                    onEdit={() => { setSelectedProduct(prod); setMode('edit'); setIsModalOpen(true); }}
                                    onSync={handleSyncOne}
                                />
                            ) : (
                                <ProductRowMobile
                                    key={prod.id}
                                    product={prod}
                                    onEdit={() => { setSelectedProduct(prod); setMode('edit'); setIsModalOpen(true); }}
                                    onSync={handleSyncOne}
                                />
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Detail */}
            {isModalOpen && (
                <ProductDetailMobile
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    product={selectedProduct}
                    mode={mode}
                    onRefresh={fetchProducts}
                />
            )}
        </div>
    );
};

export default ProductListNextGen;

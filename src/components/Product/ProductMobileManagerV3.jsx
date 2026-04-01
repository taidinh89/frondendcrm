import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { productApi } from '../../api/admin/productApi';
import { PLACEHOLDER_NO_IMAGE_SQUARE } from '../../constants/placeholders';
import { Icon } from '../ui';

export default function ProductMobileManagerV3() {
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [dictionary, setDictionary] = useState({ brands: [], categories: [] });
    const [activeFilters, setActiveFilters] = useState([]);

    // 0. Helpers
    const resolveUrl = (url) => {
        if (!url || url.startsWith('http') || url.startsWith('data:')) return url;
        const crmHost = window.location.origin.includes('maytinhquocviet.com') ? window.location.origin : 'https://crm.maytinhquocviet.com';
        return url.startsWith('/') ? crmHost + url : crmHost + '/' + url;
    };

    // 1. Fetch Data
    const fetchProducts = async (isRefresh = false) => {
        try {
            setLoading(true);
            const p = isRefresh ? 1 : page;
            const params = { page: p, search };

            if (activeFilters.includes('ACTIVE')) params.is_on = 1;
            if (activeFilters.includes('INACTIVE')) params.is_on = 0;
            if (activeFilters.includes('OUT_STOCK')) params.stock_status = 'out_stock';
            if (activeFilters.includes('IN_STOCK')) params.stock_status = 'in_stock';
            if (activeFilters.includes('NO_IMAGE')) params.has_image = 0;
            if (activeFilters.includes('HAS_IMAGE')) params.has_image = 1;
            if (activeFilters.includes('V3')) params.v3_variants = 1;
            if (activeFilters.includes('NO_CATEGORY')) params.missing_category = 1;
            if (activeFilters.includes('NO_DESC')) params.missing_desc = 1;
            if (activeFilters.includes('NO_SKU')) params.missing_sku = 1;

            const res = await productApi.getLibrary(params);

            const resData = res.data;
            const productsList = Array.isArray(resData) ? resData : (resData?.data || []);
            const meta = resData?._meta || resData?.meta || {};

            if (isRefresh) {
                setProducts(productsList);
            } else {
                setProducts(prev => [...prev, ...productsList]);
            }

            if (productsList.length === 0) setHasMore(false);
            if (meta.stats) setStats(meta.stats);

            if (meta.pagination) {
                if (p >= meta.pagination.total_pages) setHasMore(false);
            } else if (meta.total_pages) {
                if (p >= meta.total_pages) setHasMore(false);
            }

        } catch (e) {
            console.error("Fetch error", e);
            toast.error("Lỗi tải danh sách");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setPage(1);
            setHasMore(true);
            fetchProducts(true);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search, activeFilters]);

    // Load Meta
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [b, c, s] = await Promise.all([
                    productApi.getBrandsV2({ mode: 'simple', per_page: 500 }),
                    productApi.getCategoriesV2({ mode: 'simple', per_page: 500 }),
                    productApi.getSites()
                ]);

                // Standardized envelope handling (res.data.data)
                const brandList = b.data.data || b.data || [];
                const catList = c.data.data || c.data || [];
                const siteList = s.data.data || s.data || [];

                setDictionary({
                    brands: Array.isArray(brandList) ? brandList.map(i => ({ id: String(i.id), code: String(i.code || i.id), name: i.name })) : [],
                    categories: Array.isArray(catList) ? catList.map(i => ({ id: String(i.id), code: String(i.id), name: i.name, parent_id: i.parent_id })) : [],
                    sites: Array.isArray(siteList) ? siteList.filter(i => i.code !== 'QVC').map(i => ({ code: i.code, label: i.name, domain: i.domain })) : []
                });
            } catch (e) {
                console.error("Meta load error", e);
            }
        };
        fetchMeta();
    }, []);

    // Load More Handler
    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);

            const params = { page: nextPage, search };
            if (activeFilters.includes('ACTIVE')) params.is_on = 1;
            if (activeFilters.includes('INACTIVE')) params.is_on = 0;
            if (activeFilters.includes('OUT_STOCK')) params.stock_status = 'out_stock';
            if (activeFilters.includes('IN_STOCK')) params.stock_status = 'in_stock';
            if (activeFilters.includes('NO_IMAGE')) params.has_image = 0;
            if (activeFilters.includes('HAS_IMAGE')) params.has_image = 1;
            if (activeFilters.includes('V3')) params.v3_variants = 1;
            if (activeFilters.includes('NO_CATEGORY')) params.missing_category = 1;
            if (activeFilters.includes('NO_DESC')) params.missing_desc = 1;
            if (activeFilters.includes('NO_SKU')) params.missing_sku = 1;

            productApi.getLibrary(params)
                .then(res => {
                    const resData = res.data;
                    const newData = Array.isArray(resData) ? resData : (resData?.data || []);
                    setProducts(prev => [...prev, ...newData]);

                    const meta = resData?._meta || resData?.meta || {};
                    const lastPage = meta.pagination?.total_pages || meta.total_pages || 1;
                    if (newData.length === 0 || nextPage >= lastPage) setHasMore(false);
                }).catch(e => {
                    console.error("Load more error", e);
                    setHasMore(false);
                });
        }
    };

    // Open Create Page
    const handleCreate = () => {
        navigate('/product-mobile-v3/create', {
            state: { returnUrl: location.pathname + location.search }
        });
    };

    // Open Edit Page
    const handleEdit = (product) => {
        navigate(`/product-mobile-v3/${product.id}`, {
            state: { returnUrl: location.pathname + location.search }
        });
    };

    const toggleFilter = (key) => {
        if (key === 'ALL') {
            setActiveFilters([]);
            return;
        }
        setActiveFilters(prev => {
            if (prev.includes(key)) return prev.filter(k => k !== key);
            return [...prev, key];
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm border-b flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Icon name="package" className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-lg text-slate-800 leading-none">PRODUCTS V3</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unified Multi-Site Core</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-xs flex items-center gap-2 active:scale-95"
                >
                    <Icon name="plus" className="w-4 h-4" /> TẠO MỚI
                </button>
            </div>

            {/* Stats Bar */}
            {stats && (
                <div className="flex overflow-x-auto bg-slate-50 p-3 gap-3 border-b border-slate-200 no-scrollbar relative z-20 shadow-inner">
                    {activeFilters.length > 0 && (
                        <button
                            onClick={() => toggleFilter('ALL')}
                            className="shrink-0 px-4 py-2 bg-red-100 text-red-600 border border-red-200 rounded-xl hover:bg-red-200 hover:text-red-700 transition-all font-black text-[10px] uppercase flex items-center justify-center shadow-sm"
                        >
                            Xóa {activeFilters.length} Lọc ✖
                        </button>
                    )}
                    <button
                        onClick={() => toggleFilter('ACTIVE')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('ACTIVE') ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200 scale-105' : 'bg-white border-green-200 hover:bg-green-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('ACTIVE') ? 'text-green-100' : 'text-green-500'}`}>Đã hiển thị</p>
                        <p className={`text-sm font-black ${activeFilters.includes('ACTIVE') ? 'text-white' : 'text-green-700'}`}>{stats.active}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('INACTIVE')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('INACTIVE') ? 'bg-slate-700 border-slate-700 text-white shadow-md shadow-slate-300 scale-105' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('INACTIVE') ? 'text-slate-300' : 'text-slate-500'}`}>Chưa hiện thị</p>
                        <p className={`text-sm font-black ${activeFilters.includes('INACTIVE') ? 'text-white' : 'text-slate-700'}`}>{stats.total - stats.active}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('OUT_STOCK')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('OUT_STOCK') ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200 scale-105' : 'bg-white border-rose-200 hover:bg-rose-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('OUT_STOCK') ? 'text-rose-200' : 'text-rose-500'}`}>Hết hàng</p>
                        <p className={`text-sm font-black ${activeFilters.includes('OUT_STOCK') ? 'text-white' : 'text-rose-700'}`}>{stats.out_stock}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('IN_STOCK')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('IN_STOCK') ? 'bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-200 scale-105' : 'bg-white border-cyan-200 hover:bg-cyan-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('IN_STOCK') ? 'text-cyan-100' : 'text-cyan-600'}`}>Còn hàng</p>
                        <p className={`text-sm font-black ${activeFilters.includes('IN_STOCK') ? 'text-white' : 'text-cyan-800'}`}>{stats.total - stats.out_stock}</p>
                    </button>
                    <div className="w-[2px] shrink-0 bg-slate-200 rounded-full mx-1"></div>
                    <button
                        onClick={() => toggleFilter('NO_IMAGE')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('NO_IMAGE') ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200 scale-105' : 'bg-white border-orange-200 hover:bg-orange-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('NO_IMAGE') ? 'text-orange-100' : 'text-orange-500'}`}>Thiếu ảnh</p>
                        <p className={`text-sm font-black ${activeFilters.includes('NO_IMAGE') ? 'text-white' : 'text-orange-700'}`}>{stats.no_image}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('NO_CATEGORY')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('NO_CATEGORY') ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200 scale-105' : 'bg-white border-amber-200 hover:bg-amber-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('NO_CATEGORY') ? 'text-amber-100' : 'text-amber-500'}`}>Thiếu Danh Mục</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('NO_DESC')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('NO_DESC') ? 'bg-yellow-500 border-yellow-500 text-white shadow-md shadow-yellow-200 scale-105' : 'bg-white border-yellow-300 hover:bg-yellow-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('NO_DESC') ? 'text-yellow-100' : 'text-yellow-600'}`}>Thiếu Mô Tả</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('NO_SKU')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('NO_SKU') ? 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-200 scale-105' : 'bg-white border-pink-200 hover:bg-pink-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('NO_SKU') ? 'text-pink-100' : 'text-pink-500'}`}>Thiếu SKU</p>
                    </button>
                    <div className="w-[2px] shrink-0 bg-slate-200 rounded-full mx-1"></div>
                    <button
                        onClick={() => toggleFilter('HAS_IMAGE')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('HAS_IMAGE') ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-200 scale-105' : 'bg-white border-indigo-200 hover:bg-indigo-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('HAS_IMAGE') ? 'text-indigo-100' : 'text-indigo-500'}`}>CÓ ảnh</p>
                        <p className={`text-sm font-black ${activeFilters.includes('HAS_IMAGE') ? 'text-white' : 'text-indigo-700'}`}>{stats.total - stats.no_image}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('V3')}
                        className={`shrink-0 px-4 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.includes('V3') ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200 scale-105' : 'bg-white border-purple-200 hover:bg-purple-50'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest ${activeFilters.includes('V3') ? 'text-purple-200' : 'text-purple-500'}`}>Chỉnh sửa (V3)</p>
                        <p className={`text-sm font-black ${activeFilters.includes('V3') ? 'text-white' : 'text-purple-700'}`}>{stats.v3_variants || 'V3'}</p>
                    </button>
                    <button
                        onClick={() => toggleFilter('ALL')}
                        className={`shrink-0 px-5 py-2.5 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-[0.97] ${activeFilters.length === 0 ? 'bg-slate-800 border-slate-800 text-white shadow-md scale-105' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                    >
                        <p className={`text-[9px] font-black uppercase tracking-widest pl-1 ${activeFilters.length === 0 ? 'text-slate-300' : 'text-slate-500'}`}>Tổng</p>
                        <p className={`text-sm font-black pl-1 pr-2 ${activeFilters.length === 0 ? 'text-white' : 'text-slate-800'}`}>{stats.total}</p>
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="p-4 bg-white border-b sticky top-[73px] z-20">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 font-bold text-slate-700 transition-all placeholder:text-slate-300 shadow-inner"
                        placeholder="Tìm tên sản phẩm, mã SKU hoặc ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 pb-20 relative">
                {/* Loading indicator that is overlaid when loading with existing products */}
                {loading && products.length > 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-start justify-center pt-10">
                        <div className="bg-indigo-600 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest animate-pulse border border-indigo-400">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Đang lấy bộ lọc mới...
                        </div>
                    </div>
                )}

                {products.length > 0 ? products.map(item => (
                    <div
                        key={item.id}
                        onClick={() => handleEdit(item)}
                        className="group bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer transition-all active:scale-[0.98]"
                    >
                        {/* Thumb */}
                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden relative">
                            <img
                                src={resolveUrl(item.proThum) || PLACEHOLDER_NO_IMAGE_SQUARE}
                                className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-500"
                                alt=""
                            />
                            {item.media_count > 1 && (
                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-white/20">
                                    +{item.media_count - 1}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-extrabold text-slate-800 text-sm line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase">{item.proName}</h3>
                                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${item.v3_meta?.is_master ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {item.v3_meta?.site_code || 'QVC'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{item.storeSKU || 'MISSING SKU'}</span>
                                    {item.badges?.hot && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                                    {item.badges?.new && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 uppercase">New</span>}
                                </div>
                            </div>

                            <div className="flex justify-between items-end mt-2">
                                <div>
                                    <span className="text-rose-600 font-black text-base tracking-tight">
                                        {new Intl.NumberFormat('vi-VN').format(item.price_web)}<span className="text-[10px] ml-0.5 underline">đ</span>
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <Icon name="user" className="w-2.5 h-2.5 text-slate-400" />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">
                                            {item.last_modified?.by || 'System'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full shadow-sm border ${item.quantity_web > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        {item.quantity_web > 0 ? `${item.quantity_web} SP` : 'HẾT HÀNG'}
                                    </span>
                                    <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase tracking-tighter">Cập nhật: {item.last_modified?.time}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : !loading && (
                    <div className="py-20 flex flex-col items-center justify-center opacity-40 grayscale">
                        <Icon name="search" className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Không tìm thấy sản phẩm</p>
                    </div>
                )}

                {/* Load More Trigger */}
                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 bg-white border-2 border-dashed border-slate-100 rounded-3xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></span> ĐANG TẢI...</>
                        ) : '📂 XEM THÊM SẢN PHẨM'}
                    </button>
                )}

                <div className="h-20" />
            </div>
        </div>
    );
}

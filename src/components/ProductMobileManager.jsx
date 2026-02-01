import React, { useState, useEffect, useCallback, useRef } from 'react';
import { productApi } from '../api/admin/productApi';
import { Icon, Button, Modal } from './ui';
import ProductMobileDetail from './ProductMobileDetail';
import ProductMobileDetailV2 from './ProductMobileDetailV2';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const ProductMobileManager = () => {
    const getProductImage = (p, index) => {
        const resolve = (path, isProThum = false) => {
            if (!path || path === '0') return null;
            if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;

            let clean = path;
            if (isProThum) {
                clean = `/p/250_${path}`;
            } else {
                clean = path.startsWith('/') ? path : `/${path}`;
            }

            const finalPath = clean.replace(/\\/g, '/').replace(/\/+/g, '/');
            return `${window.location.origin}${finalPath}`;
        };

        const isFirstFew = index < 5;
        if (isFirstFew) {
            console.groupCollapsed(`[IMAGE_DEBUG] #${p.id} - ${p.proName?.substring(0, 30)}...`);
            console.log("Input Data:", {
                media: p.media,
                image: p.image,
                image_collection: p.image_collection,
                proThum: p.proThum
            });
        }

        let selection = { src: null, reason: "" };

        const mainMedia = p.media?.find(m => m.is_main) || p.media?.[0];
        const mediaSrc = mainMedia?.master_file?.paths?.original || mainMedia?.url;

        if (mediaSrc) {
            selection = { src: resolve(mediaSrc), reason: "Priority 1: Media Array (New API)" };
        } else if (p.image) {
            selection = { src: resolve(p.image), reason: "Priority 2: CRM 'image' field" };
        } else {
            const collectionImg = p.image_collection?.[0] || p.full_images?.[0];
            const collectionSrc = collectionImg?.relative_path || collectionImg?.url || collectionImg?.image_name;
            if (collectionSrc) {
                const finalSrc = (!collectionSrc.includes('/') && !collectionSrc.startsWith('http'))
                    ? `media/product/${collectionSrc}`
                    : collectionSrc;
                selection = { src: resolve(finalSrc), reason: "Priority 3: Collection / Full Images" };
            } else if (p.proThum && p.proThum !== '0') {
                selection = { src: resolve(p.proThum, true), reason: "Priority 4: Legacy proThum fallback" };
            }
        }

        const result = selection.src || STATIC_PLACEHOLDER;

        if (isFirstFew) {
            console.log("Decision:", selection.reason || "Placeholder");
            console.log("Final URL:", result);
            console.groupEnd();
        }

        return result;
    };

    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const loaderRef = useRef(null);

    // Filters & Sorting
    const [filters, setFilters] = useState({
        is_on: 'ALL', // 'ALL', '1', '0'
        stock_status: 'ALL', // 'ALL', 'in_stock', 'out_stock', 'low_stock'
        category_id: '',
        brand_id: '',
        has_image: 'ALL', // 'ALL', 'true', 'false'
        has_promotion: false,
        flags: [], // hot, new, best, sale, student, installment
        price_min: '',
        price_max: '',
        modified_by: '',
        sort_by: 'id',
        sort_direction: 'desc'
    });

    const [meta, setMeta] = useState({ categories: [], brands: [] });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailMode, setDetailMode] = useState('view');
    const [detailVersion, setDetailVersion] = useState(localStorage.getItem('pm_local_version') || 'v1');

    useEffect(() => {
        localStorage.setItem('pm_local_version', detailVersion);
    }, [detailVersion]);

    // Nạp Meta
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [b, c] = await Promise.all([
                    axios.get('/api/v1/brands'),
                    axios.get('/api/v1/categories?format=minimal')
                ]);
                setMeta({
                    brands: (b.data || []).map(i => ({ code: String(i.code), name: i.name })),
                    categories: (c.data || []).map(i => ({ code: String(i.id), name: i.name }))
                });
            } catch (e) { console.error("Lỗi nạp meta:", e); }
        };
        fetchMeta();
    }, []);

    const fetchProducts = useCallback(async (isNewSearch = false) => {
        if (isLoading) return;
        setIsLoading(true);
        const currentPage = isNewSearch ? 1 : page;

        try {
            const params = {
                search: search || undefined,
                is_on: (filters.is_on === '1' || filters.is_on === '0') ? filters.is_on : undefined,
                stock_status: filters.stock_status === 'ALL' ? undefined : filters.stock_status,
                category_id: filters.category_id || undefined,
                brand_id: filters.brand_id || undefined,
                has_image: filters.has_image === 'ALL' ? undefined : filters.has_image,
                has_promotion: filters.has_promotion ? 1 : undefined,
                flags: filters.flags.length > 0 ? filters.flags.join(',') : undefined,
                price_min: filters.price_min || undefined,
                price_max: filters.price_max || undefined,
                modified_by: filters.modified_by || undefined,
                sort_by: filters.sort_by,
                sort_direction: filters.sort_direction,
                page: currentPage,
                per_page: 20
            };

            const res = await productApi.getLibrary(params);
            const newData = res.data.data || [];
            const metaData = res.data.meta || {};

            if (isNewSearch) {
                setProducts(newData);
                setStats(res.data.stats);
                setTotalResults(metaData.total || 0);
            } else {
                setProducts(prev => [...prev, ...newData]);
            }

            setHasMore(newData.length === 20 && products.length + newData.length < (metaData.total || 0));
            setPage(currentPage + 1);
        } catch (e) {
            toast.error("Lỗi nạp dữ liệu");
            console.error(e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [search, filters, page, isLoading, products.length]);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                fetchProducts();
            }
        }, { threshold: 0.5 });

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, fetchProducts]);

    // Reset và nạp lại khi filter/search thay đổi
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(true);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, filters.is_on, filters.stock_status, filters.category_id, filters.brand_id, filters.has_image, filters.has_promotion, filters.flags, filters.sort_by, filters.sort_direction, filters.modified_by]);

    const handleQuickUpdate = async (product, field, value) => {
        try {
            const payload = { [field]: value };
            await productApi.update(product.id, payload);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, [field]: value } : p));
            toast.success("Đã cập nhật", { duration: 500 });
        } catch (e) { toast.error("Thất bại"); }
    };

    const toggleFlag = (flag) => {
        setFilters(prev => ({
            ...prev,
            flags: prev.flags.includes(flag)
                ? prev.flags.filter(f => f !== flag)
                : [...prev.flags, flag]
        }));
    };

    const getBrandName = (p) => {
        if (p.brand_name) return p.brand_name;
        if (!p.brandId) return 'N/A';
        const brand = meta.brands.find(b => b.code === String(p.brandId));
        return brand ? brand.name : 'N/A';
    };

    const getCategoryName = (p) => {
        if (p.category_name) return p.category_name;
        const catIds = p.product_cat_web || p.product_cat || '';
        const idList = String(catIds).split(',').filter(Boolean);
        if (idList.length === 0) return 'N/A';
        const cat = meta.categories.find(c => c.code === String(idList[0]));
        return cat ? cat.name : 'N/A';
    };

    return (
        <div className="bg-[#f8f9fc] min-h-screen pb-32 font-sans selection:bg-indigo-100">
            {/* TOP BAR PREMIUM - CLEAN VERSION */}
            {/* TOP BAR PREMIUM - CLEAN VERSION */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Icon name="search" className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                        className="w-full bg-gray-100 border-2 border-transparent rounded-[1.25rem] py-3 pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-400"
                        placeholder="Tìm mã, SKU, tên sản phẩm..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`p-3.5 rounded-2xl transition-all relative ${isFilterActive(filters) ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200'}`}
                >
                    <Icon name="sliders" className="w-5 h-5" />
                    {isFilterActive(filters) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                </button>
                <button
                    onClick={() => { setDetailMode('create'); setSelectedProduct(null); setIsDetailOpen(true); }}
                    className="bg-indigo-600 text-white p-3.5 rounded-2xl active:scale-95 shadow-xl shadow-indigo-100 transition-all"
                >
                    <Icon name="plus" className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setDetailVersion(v => v === 'v1' ? 'v2' : 'v1')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${detailVersion === 'v2' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}
                >
                    {detailVersion === 'v1' ? 'V1' : 'V2'}
                </button>
            </div>

            {/* STATS BAR - INTERACTIVE */}
            {stats && (
                <div className="flex overflow-x-auto no-scrollbar gap-3 px-4 py-2 mt-2">
                    {[
                        { label: 'TỔNG', val: stats.total, color: 'indigo', icon: 'grid', active: !isFilterActive(filters), onClick: () => setFilters({ is_on: 'ALL', stock_status: 'ALL', category_id: '', brand_id: '', has_image: 'ALL', has_promotion: false, flags: [], price_min: '', price_max: '', sort_by: 'id', sort_direction: 'desc' }) },
                        { label: 'ĐANG BẬT', val: stats.active, color: 'green', icon: 'check-circle', active: filters.is_on === '1', onClick: () => setFilters(p => ({ ...p, is_on: '1' })) },
                        { label: 'HẾT HÀNG', val: stats.out_stock, color: 'rose', icon: 'box', active: filters.stock_status === 'out_stock', onClick: () => setFilters(p => ({ ...p, stock_status: 'out_stock' })) },
                        { label: 'KHUYẾN MÃI', val: stats.has_promo, color: 'orange', icon: 'zap', active: filters.has_promotion, onClick: () => setFilters(p => ({ ...p, has_promotion: !p.has_promotion })) },
                        { label: 'ẨN', val: stats.inactive, color: 'gray', icon: 'eye-off', active: filters.is_on === '0', onClick: () => setFilters(p => ({ ...p, is_on: '0' })) },
                        { label: 'THIẾU ẢNH', val: stats.no_image, color: 'red', icon: 'image', active: filters.has_image === 'false', onClick: () => setFilters(p => ({ ...p, has_image: 'false' })) },
                    ].map((s, i) => (
                        <button
                            key={i}
                            onClick={s.onClick}
                            className={`flex-shrink-0 border-2 rounded-2xl p-3 min-w-[110px] flex flex-col transition-all active:scale-95 shadow-sm ${s.active ? `bg-${s.color}-50 border-${s.color}-500 ring-4 ring-${s.color}-50` : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className={`text-[8px] font-black flex items-center gap-1 uppercase tracking-tighter mb-1 ${s.active ? `text-${s.color}-600` : `text-${s.color}-500`}`}>
                                <Icon name={s.icon} className="w-2.5 h-2.5" /> {s.label}
                            </div>
                            <div className="text-sm font-black text-gray-900">{new Intl.NumberFormat('vi-VN').format(s.val)}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* QUICK FILTERS / CHIPS */}
            {isFilterActive(filters) && (
                <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 py-2">
                    <button
                        onClick={() => setFilters({ is_on: 'ALL', stock_status: 'ALL', category_id: '', brand_id: '', has_image: 'ALL', has_promotion: false, flags: [], price_min: '', price_max: '', sort_by: 'id', sort_direction: 'desc' })}
                        className="flex-shrink-0 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                        <Icon name="plus" className="w-3 h-3 rotate-45" /> Xóa tất cả
                    </button>
                    {filters.is_on !== 'ALL' && (
                        <Chip label={filters.is_on === '1' ? 'Đang bật' : 'Đang ẩn'} onClear={() => setFilters(p => ({ ...p, is_on: 'ALL' }))} />
                    )}
                    {filters.stock_status !== 'ALL' && (
                        <Chip label={filters.stock_status === 'out_stock' ? 'Hết hàng' : (filters.stock_status === 'low_stock' ? 'Sắp hết' : 'Còn hàng')} onClear={() => setFilters(p => ({ ...p, stock_status: 'ALL' }))} />
                    )}
                    {filters.has_promotion && (
                        <Chip label="Khuyến mãi" onClear={() => setFilters(p => ({ ...p, has_promotion: false }))} />
                    )}
                    {filters.has_image !== 'ALL' && (
                        <Chip label={filters.has_image === 'true' ? 'Có ảnh' : 'Thiếu ảnh'} onClear={() => setFilters(p => ({ ...p, has_image: 'ALL' }))} />
                    )}
                    {filters.category_id && (
                        <Chip label={`Cat: ${meta.categories.find(c => c.code === filters.category_id)?.name || '...'}`} onClear={() => setFilters(p => ({ ...p, category_id: '' }))} />
                    )}
                    {filters.brand_id && (
                        <Chip label={`Hãng: ${meta.brands.find(b => b.code === filters.brand_id)?.name || '...'}`} onClear={() => setFilters(p => ({ ...p, brand_id: '' }))} />
                    )}
                    {filters.modified_by && (
                        <Chip label={`Editor: ${stats?.editors?.find(e => String(e.id) === String(filters.modified_by))?.name || '...'}`} onClear={() => setFilters(p => ({ ...p, modified_by: '' }))} />
                    )}
                    {filters.flags.map(f => (
                        <Chip key={f} label={`Tag: ${f.toUpperCase()}`} onClear={() => toggleFlag(f)} />
                    ))}
                </div>
            )}

            {/* RESULT COUNT INDICATOR */}
            <div className="px-5 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Hiển thị <span className="text-indigo-600">{products.length}</span> / {new Intl.NumberFormat('vi-VN').format(totalResults)} kết quả
                    </span>
                </div>
                {isFilterActive(filters) && (
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-md">Đã lọc</span>
                )}
            </div>

            {/* PRODUCT LIST */}
            <div className="p-4 space-y-4">
                {products.length === 0 && !isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                        <Icon name="search" className="w-16 h-16 mb-4 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-xs">Không tìm thấy sản phẩm nào</p>
                    </div>
                ) : (
                    products.map((p, idx) => (
                        <div
                            key={`${p.id}-${idx}`}
                            onClick={() => { setSelectedProduct(p); setDetailMode('edit'); setIsDetailOpen(true); }}
                            className="bg-white rounded-3xl p-4 flex gap-4 active:scale-[0.98] transition-all shadow-sm border border-gray-100 group relative overflow-hidden"
                        >
                            {/* Status Indicator Bar */}
                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${p.isOn ? 'bg-green-500' : 'bg-gray-200'}`}></div>

                            {/* Left: Product Image */}
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50 relative">
                                <img
                                    src={getProductImage(p, idx)}
                                    className="w-full h-full object-contain"
                                    onError={e => e.target.src = STATIC_PLACEHOLDER}
                                    alt=""
                                />
                                <div className="absolute bottom-1 right-1 flex gap-1">
                                    {(p.marketing_flags?.includes('hot') || p.is_hot) && (
                                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm border border-white">
                                            <Icon name="flame" className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Rich Information Content */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                {/* Row 1: ID & SKU & Visibility */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">#{p.id}</span>
                                        <span className="text-[11px] font-medium text-gray-400 truncate max-w-[100px]">{p.storeSKU || 'No-SKU'}</span>
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase ${p.isOn ? 'text-green-600' : 'text-gray-400'}`}>
                                        {p.isOn ? 'Đang hiện' : 'Đang ẩn'}
                                    </div>
                                </div>

                                {/* Row 2: Product Name */}
                                <h3 className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2">
                                    {p.proName || p.name}
                                </h3>

                                {/* Row 3: Price & Tags */}
                                <div className="flex items-end justify-between gap-2">
                                    <div className="flex flex-col">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                {getBrandName(p)}
                                            </span>
                                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                                {getCategoryName(p)}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-extrabold text-blue-600 leading-none">
                                                {p.price_web > 0 ? `${new Intl.NumberFormat('vi-VN').format(p.price_web)}đ` : 'Liên hệ'}
                                            </span>
                                            {p.market_price > 0 && p.market_price > p.price_web && (
                                                <span className="text-[11px] text-gray-400 line-through font-medium">
                                                    {new Intl.NumberFormat('vi-VN').format(p.market_price)}đ
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase leading-none tracking-tighter">Tồn/Web</span>
                                            <span className={`text-[13px] font-bold ${p.quantity_web > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.quantity_web || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase leading-none tracking-tighter">Tồn/Kho</span>
                                            <span className="text-[13px] font-bold text-gray-700">{p.quantity_ecount || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 4: Timestamps & Footer */}
                                <div className="pt-2 mt-1 border-t border-dashed border-gray-100 flex items-center justify-between">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Sửa bởi</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-indigo-700 font-black">{p.last_modified?.by || 'System'}</span>
                                                <span className="text-[9px] text-gray-400 font-medium">{p.last_modified?.time || '--'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <Icon name="eye" className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{p.view_count || 0}</span>
                                        </div>
                                        <div className="w-[1px] h-3 bg-gray-200"></div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Sync</span>
                                            {p.needs_sync ? (
                                                <span className="text-rose-600 text-[9px] font-black animate-pulse">CẦN ĐỒNG BỘ</span>
                                            ) : (
                                                <span className="text-blue-600 text-[9px] font-black flex items-center gap-0.5">
                                                    <Icon name="check" className="w-2 h-2" /> OK
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Infinite Scroll Trigger / End of Result */}
                <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center gap-4">
                    {isLoading ? (
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : !hasMore && products.length > 0 ? (
                        <div className="flex flex-col items-center gap-2 opacity-40">
                            <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Đã hiện thị tất cả sản phẩm</p>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* FILTER SHEET */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300" onClick={() => setIsFilterOpen(false)}></div>
                    <div className="relative w-[85%] bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
                        <div className="p-6 bg-white border-b flex items-center justify-between">
                            <div>
                                <h2 className="font-black uppercase tracking-widest text-sm text-gray-900">Bộ lọc nâng cao</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Tối ưu tìm kiếm sản phẩm</p>
                            </div>
                            <button onClick={() => setIsFilterOpen(false)} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                                <Icon name="plus" className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                            {/* SORTING */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Icon name="arrow-up-down" className="w-3 h-3" /> Sắp xếp theo
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Mới nhất', k: 'id', d: 'desc' },
                                        { label: 'Vừa sửa xong', k: 'updated_at', d: 'desc' },
                                        { label: 'Giá thấp-cao', k: 'price', d: 'asc' },
                                        { label: 'Kho nhiều nhất', k: 'quantity', d: 'desc' },
                                    ].map(s => (
                                        <button
                                            key={s.label}
                                            onClick={() => setFilters(p => ({ ...p, sort_by: s.k, sort_direction: s.d }))}
                                            className={`p-3 text-[10px] font-black rounded-2xl border-2 transition-all ${filters.sort_by === s.k && filters.sort_direction === s.d ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-gray-50 text-gray-500 bg-gray-50/50'}`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* MARKETING FLAGS */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Icon name="award" className="w-3 h-3" /> Marketing Flags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'hot', label: 'Siêu Hot (Hot)', c: 'orange' },
                                        { id: 'new', label: 'Hàng Mới (New)', c: 'blue' },
                                        { id: 'best', label: 'Bán Chạy (Best)', c: 'purple' },
                                        { id: 'sale', label: 'Giảm Giá (Sale)', c: 'red' },
                                        { id: 'student', label: 'Hỗ trợ sinh viên', c: 'green' },
                                        { id: 'installment', label: 'Góp 0%', c: 'indigo' },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => toggleFlag(f.id)}
                                            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black border-2 transition-all ${filters.flags.includes(f.id) ? `bg-${f.c}-600 border-${f.c}-600 text-white shadow-lg` : 'border-gray-50 text-gray-500 bg-gray-50/50'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CATEGORY & BRAND */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Danh mục</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={filters.category_id}
                                        onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
                                    >
                                        <option value="">Tất cả danh mục</option>
                                        {meta.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Thương hiệu</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={filters.brand_id}
                                        onChange={e => setFilters(p => ({ ...p, brand_id: e.target.value }))}
                                    >
                                        <option value="">Tất cả hãng</option>
                                        {meta.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Người sửa cuối</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all font-black text-indigo-600"
                                        value={filters.modified_by}
                                        onChange={e => setFilters(p => ({ ...p, modified_by: e.target.value }))}
                                    >
                                        <option value="">Tất cả quản trị viên</option>
                                        {stats?.editors?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* PRICE RANGE */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Khoảng giá (VND)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="Từ..."
                                        className="p-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={filters.price_min}
                                        onChange={e => setFilters(p => ({ ...p, price_min: e.target.value }))}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Đến..."
                                        className="p-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        value={filters.price_max}
                                        onChange={e => setFilters(p => ({ ...p, price_max: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* CONSTRAINTS */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tiêu chí khác</label>
                                <div className="space-y-2">
                                    {[
                                        {
                                            label: 'Trạng thái',
                                            k: 'is_on',
                                            opt: [
                                                { l: 'Tất cả', v: 'ALL' },
                                                { l: 'Đang bật', v: '1' },
                                                { l: 'Đang ẩn', v: '0' }
                                            ]
                                        },
                                        {
                                            label: 'Tồn kho',
                                            k: 'stock_status',
                                            opt: [
                                                { l: 'Tất cả', v: 'ALL' },
                                                { l: 'Còn hàng', v: 'in_stock' },
                                                { l: 'Hết hàng', v: 'out_stock' },
                                                { l: 'Sắp hết', v: 'low_stock' }
                                            ]
                                        },
                                        {
                                            label: 'Hình ảnh',
                                            k: 'has_image',
                                            opt: [
                                                { l: 'Tất cả', v: 'ALL' },
                                                { l: 'Có ảnh', v: 'true' },
                                                { l: 'Thiếu ảnh', v: 'false' }
                                            ]
                                        },
                                        { label: 'Khuyến mãi', k: 'has_promotion', isBool: true }
                                    ].map(c => (
                                        <div key={c.label} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border-2 border-gray-50/50">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{c.label}</span>
                                            {c.isBool ? (
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={filters[c.k]}
                                                        onChange={e => setFilters(p => ({ ...p, [c.k]: e.target.checked }))}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/50">
                                                    {c.opt.map(o => (
                                                        <button
                                                            key={o.v}
                                                            onClick={() => setFilters(p => ({ ...p, [c.k]: o.v }))}
                                                            className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${filters[c.k] === o.v ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400'}`}
                                                        >
                                                            {o.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-white flex gap-4">
                            <button
                                onClick={() => {
                                    setFilters({ is_on: 'ALL', stock_status: 'ALL', category_id: '', brand_id: '', has_image: 'ALL', has_promotion: false, flags: [], price_min: '', price_max: '', sort_by: 'id', sort_direction: 'desc' });
                                    setIsFilterOpen(false);
                                }}
                                className="flex-1 py-5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                            >
                                Xóa bộ lọc
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-5 bg-indigo-600 text-white rounded-[1.75rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                            >
                                Áp dụng ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {isDetailOpen && (
                detailVersion === 'v1' ? (
                    <ProductMobileDetail
                        isOpen={isDetailOpen}
                        onClose={() => setIsDetailOpen(false)}
                        product={selectedProduct}
                        mode={detailMode}
                        onRefresh={() => fetchProducts(true)}
                        dictionary={meta}
                        onSwitchVersion={() => setDetailVersion('v2')}
                    />
                ) : (
                    <ProductMobileDetailV2
                        isOpen={isDetailOpen}
                        onClose={() => setIsDetailOpen(false)}
                        product={selectedProduct}
                        mode={detailMode}
                        onRefresh={() => fetchProducts(true)}
                        dictionary={meta}
                        onSwitchVersion={() => setDetailVersion('v1')}
                    />
                )
            )}
        </div>
    );
};

// Helper Component for Chips
const Chip = ({ label, onClear }) => (
    <div className="flex-shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 animate-scaleIn">
        <span className="truncate max-w-[100px]">{label}</span>
        <button onClick={onClear} className="bg-indigo-200/50 rounded-full p-0.5 hover:bg-indigo-200">
            <Icon name="plus" className="w-2.5 h-2.5 rotate-45" />
        </button>
    </div>
);

// Helper check filter active
const isFilterActive = (f) => {
    return (
        f.category_id !== '' ||
        f.brand_id !== '' ||
        f.has_image !== 'ALL' ||
        f.has_promotion ||
        f.flags.length > 0 ||
        f.price_min !== '' ||
        f.price_max !== '' ||
        f.sort_by !== 'id' ||
        f.modified_by !== '' ||
        f.is_on !== 'ALL' ||
        f.stock_status !== 'ALL'
    );
};

export default ProductMobileManager;

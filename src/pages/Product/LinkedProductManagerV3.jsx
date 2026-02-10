import React, { useState, useEffect, useCallback, useRef } from 'react';
import { productApi } from '../../api/admin/productApi';
import { Icon } from '../../components/ui';
import LinkedProductDetailV3 from '../../components/Product/LinkedProductDetailV3';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const STATIC_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const LinkedProductManagerV3 = ({ setAppTitle }) => {
    useEffect(() => {
        if (setAppTitle) setAppTitle("Quản lý Liên kết Sản phẩm V3");
    }, [setAppTitle]);

    const getProductImage = (p) => {
        // Simplified image resolution logic
        const resolve = (path, isProThum = false) => {
            if (!path || path === '0') return null;
            if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;
            const clean = isProThum ? `/p/250_${path}` : (path.startsWith('/') ? path : `/${path}`);
            return `${window.location.origin}${clean.replace(/\\/g, '/').replace(/\/+/g, '/')}`;
        };

        const mainMedia = p.media?.find(m => m.is_main) || p.media?.[0];
        if (mainMedia?.full_url) return mainMedia.full_url; // Use pre-calculated full_url from backend

        const mediaSrc = mainMedia?.master_file?.paths?.original || mainMedia?.url;
        if (mediaSrc) return resolve(mediaSrc);

        if (p.image) return resolve(p.image);
        if (p.proThum && p.proThum !== '0') return resolve(p.proThum, true);

        return STATIC_PLACEHOLDER;
    };

    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const loaderRef = useRef(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        is_on: 'ALL',
        stock_status: 'ALL',
        category_id: '',
        brand_id: '',
        sort_by: 'id',
        sort_direction: 'desc'
    });

    const [meta, setMeta] = useState({ categories: [], brands: [] });

    // Load Meta
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
            } catch (e) { console.error("Meta load error", e); }
        };
        fetchMeta();
    }, []);

    // Fetch Products
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
                sort_by: filters.sort_by,
                sort_direction: filters.sort_direction,
                page: currentPage,
                per_page: 20
            };

            // Use getLibrary for consistency
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

            setHasMore(newData.length === 20 && (products.length + newData.length < (metaData.total || 0)));
            setPage(currentPage + 1);
        } catch (e) {
            toast.error("Không thể tải danh sách sản phẩm");
        } finally {
            setIsLoading(false);
        }
    }, [search, filters, page, isLoading, products.length]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                fetchProducts();
            }
        }, { threshold: 0.5 });
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoading, fetchProducts]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(true);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, filters]);

    return (
        <div className="bg-[#f8f9fc] min-h-screen pb-32 font-sans selection:bg-indigo-100 flex flex-col h-screen overflow-hidden">
            {/* TOP BAR */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0 z-10">
                <div className="flex-1 relative group max-w-2xl">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Icon name="search" className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-400"
                        placeholder="Tìm kiếm sản phẩm để quản lý liên kết..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        className="bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
                        value={filters.category_id}
                        onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
                    >
                        <option value="">Tất cả danh mục</option>
                        {meta.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>

                    <select
                        className="bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
                        value={filters.brand_id}
                        onChange={e => setFilters(p => ({ ...p, brand_id: e.target.value }))}
                    >
                        <option value="">Tất cả thương hiệu</option>
                        {meta.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            {/* PRODUCT LIST */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto">
                    {products.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => { setSelectedProduct(p); setIsDetailOpen(true); }}
                            className="bg-white rounded-2xl p-3 flex gap-4 cursor-pointer hover:shadow-md hover:border-indigo-200 border border-gray-100 transition-all group items-center"
                        >
                            <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                <img
                                    src={getProductImage(p)}
                                    className="w-full h-full object-contain mix-blend-multiply"
                                    onError={e => e.target.src = STATIC_PLACEHOLDER}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{p.id}</span>
                                    <span className="text-[10px] font-mono text-gray-400">{p.storeSKU}</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                    {p.proName}
                                </h3>
                                <div className="flex gap-2 mt-1">
                                    <span className={`text-[10px] font-bold uppercase ${p.isOn ? 'text-green-600' : 'text-gray-400'}`}>
                                        {p.isOn ? 'Đang hiện' : 'Đang ẩn'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-4">
                                <button className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white transform translate-x-2 group-hover:translate-x-0">
                                    <Icon name="link" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div ref={loaderRef} className="py-8 text-center">
                        {isLoading && <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                        {!hasMore && products.length > 0 && <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Đã hiển thị hết sản phẩm</span>}
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL V3 */}
            {isDetailOpen && (
                <LinkedProductDetailV3
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    product={selectedProduct}
                    onRefresh={() => fetchProducts(true)}
                    dictionary={meta}
                />
            )}
        </div>
    );
};

export default LinkedProductManagerV3;

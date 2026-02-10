import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MediaStudioModal from '../Modals/MediaStudioModal';

import { Icon, Button } from '../ui';
import { mediaApi } from '../../api/admin/mediaApi';
import { productApi } from '../../api/admin/productApi';
import { metaApi } from '../../api/admin/metaApi';
import { toast } from 'react-hot-toast';
import axios from '../../axiosGlobal';

const MediaManager = ({ onSelect, multiple = false, type = 'all', isStandalone = false }) => {
    // --- KHỞI TẠO BỘ LỌC CƠ BẢN ---
    const initialFilters = {
        search: '',
        type: type,
        collection_id: null,
        product_search: '',
        brand_id: '',
        cat_id: '',
        usage_status: '',   // orphan | heavily_used | used
        sort_by: 'created_at',
        sort_dir: 'desc'
    };

    // --- STATE DỮ LIỆU ---
    const [files, setFiles] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [collections, setCollections] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);

    // --- STATE BỘ LỌC ---
    const [filters, setFilters] = useState(initialFilters);

    // --- STATE UI ---
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewMode, setViewMode] = useState('grid_md'); // 'grid_lg' | 'grid_md' | 'grid_sm' | 'list'
    const [largePreviewItem, setLargePreviewItem] = useState(null);
    const [activeItem, setActiveItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const observerTarget = useRef(null);
    const [isCreatingCol, setIsCreatingCol] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [uploading, setUploading] = useState(false);
    const failedPageRef = useRef(null); // Track failed pages to prevent loop
    const paginationRef = useRef(null); // Keep latest pagination for observer without re-triggering effect

    // Sync ref when pagination changes
    useEffect(() => {
        paginationRef.current = pagination;
    }, [pagination]);


    // --- STATE MEDIA STUDIO ---
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [studioLoading, setStudioLoading] = useState(false);
    const [studioType, setStudioType] = useState('frame'); // 'frame' | 'watermark'
    const [studioOverlay, setStudioOverlay] = useState(null); // File làm khung/logo
    const [showStudio, setShowStudio] = useState(false);


    const isFetchingRef = useRef(false);

    // --- 1. LOAD DATA ---
    const fetchFiles = useCallback(async (page = 1, append = false) => {
        // Safe lock to prevent concurrent requests
        if (isFetchingRef.current) return;

        // Prevent retrying the same failed page in infinite scroll loop
        if (append && failedPageRef.current === page) return;

        isFetchingRef.current = true;
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get('/api/v1/admin/media-library', { params: { ...filters, page } });
            const newFiles = res.data.data || [];

            // Safe update
            setFiles(prev => append ? [...prev, ...newFiles] : newFiles);
            setPagination(res.data);

            if (newFiles.length === 0 && append) {
                // No more data found on this page, mark as last to stop observer
                setPagination(prev => ({ ...prev, current_page: prev.last_page }));
            }
        } catch (err) {
            console.error("Fetch failed:", err);
            if (append) failedPageRef.current = page;
        } finally {
            // Small delay before unlocking to prevent rapid-fire triggers
            setTimeout(() => {
                setLoading(false);
                setLoadingMore(false);
                isFetchingRef.current = false;
            }, 300);
        }
    }, [filters]);

    const fetchMeta = async () => {
        try {
            const [colRes, brandRes, catRes] = await Promise.all([
                mediaApi.getCollections(),
                metaApi.getBrands(),
                metaApi.getCategoriesMinimal()
            ]);

            setCollections(Array.isArray(colRes.data) ? colRes.data : (colRes.data?.data || []));
            setBrands(Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data?.data || []));
            setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || []));
        } catch (e) {
            console.error("Meta load fail", e);
        }
    };

    useEffect(() => {
        fetchFiles(1, false);
        fetchMeta();
    }, [fetchFiles]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                const pag = paginationRef.current;

                // Only trigger if intersecting AND not already fetching AND there are more pages
                if (entry.isIntersecting && !isFetchingRef.current && pag) {
                    if (pag.current_page < pag.last_page) {
                        console.log(`[MediaManager] Triggering load more: ${pag.current_page + 1}`);
                        fetchFiles(pag.current_page + 1, true);
                    }
                }
            },
            { threshold: 0, rootMargin: '20px' } // Tiny margin to be extremely safe
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [fetchFiles]); // Only re-run if fetchFiles changes (which depends on filters)

    // --- 2. HANDLERS BỘ SƯU TẬP ---
    const handleCreateCollection = async () => {
        if (!newColName.trim()) return;
        try {
            await mediaApi.createCollection(newColName);
            toast.success("Đã tạo bộ sưu tập");
            setIsCreatingCol(false);
            setNewColName('');
            fetchMeta();
        } catch (e) { toast.error("Lỗi tạo bộ sưu tập"); }
    };

    const handleDeleteCollection = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Xóa bộ sưu tập này? (Không xóa file bên trong)")) return;
        try {
            await mediaApi.deleteCollection(id);
            toast.success("Đã xóa bộ sưu tập");
            if (filters.collection_id === id) setFilters({ ...filters, collection_id: null });
            fetchMeta();
        } catch (e) { toast.error("Lỗi xóa"); }
    }

    const handleAddToCollection = async (collectionId, targetIds = null) => {
        const ids = targetIds || selectedIds;
        if (ids.length === 0) return toast.error("Chọn ít nhất 1 ảnh");
        try {
            await mediaApi.addToCollection(collectionId, ids);
            toast.success("Đã thêm vào bộ sưu tập");
            fetchMeta();

            // Cập nhật local state: Tìm Collection vừa chọn
            const targetCol = collections.find(c => c.id == collectionId);
            if (targetCol) {
                // Update danh sách file
                setFiles(prev => prev.map(f => {
                    if (ids.includes(f.id)) {
                        const currentCols = f.collections || [];
                        // Avoid dups
                        if (!currentCols.find(c => c.id == collectionId)) {
                            return { ...f, collections: [...currentCols, targetCol] };
                        }
                    }
                    return f;
                }));

                // Update activeItem nếu đang chọn
                if (activeItem && ids.includes(activeItem.id)) {
                    setActiveItem(prev => {
                        const currentCols = prev.collections || [];
                        if (!currentCols.find(c => c.id == collectionId)) {
                            return { ...prev, collections: [...currentCols, targetCol] };
                        }
                        return prev;
                    });
                }
            }
        } catch (e) { toast.error("Lỗi thêm"); }
    };

    // --- 3. HANDLERS FILE ---
    const handleUpdateMeta = async () => {
        if (!activeItem) return;
        try {
            await mediaApi.updateMeta(activeItem.id, {
                original_name: activeItem.original_name,
                alt_text_default: activeItem.alt_text_default,
                internal_notes: activeItem.internal_notes
            });
            toast.success("Đã lưu thông tin");
            // Cập nhật local state thay vì fetch lại
            setFiles(prev => prev.map(f => f.id === activeItem.id ? {
                ...f, ...{
                    original_name: activeItem.original_name,
                    alt_text_default: activeItem.alt_text_default,
                    internal_notes: activeItem.internal_notes
                }
            } : f));
        } catch (e) { toast.error("Lỗi lưu metadata"); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const tid = toast.loading("Đang tải lên...");
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('source', 'media_manager_v2');
            await productApi.smartUpload(formData);
            toast.success("Xong!", { id: tid });
            fetchFiles(1);
        } catch (err) { toast.error("Lỗi upload", { id: tid }); }
        finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleDeleteFile = async (id) => {
        if (!window.confirm("Xóa vĩnh viễn file này?")) return;
        console.log("🖱️ [MEDIA_MANAGER] Bấm xóa file ID:", id);
        console.log("Danh sách file hiện tại:", files.map(f => f.id));
        try {
            await mediaApi.deleteMedia(id);
            toast.success("Đã xóa");
            if (activeItem?.id === id) setActiveItem(null);
            setSelectedIds(prev => prev.filter(i => i !== id));
            // Xóa local state thay vì fetch lại
            setFiles(prev => prev.filter(f => f.id !== id));

        } catch (e) {
            toast.error(e.response?.data?.message || "Lỗi xóa");
        }
    };

    const handleApplyEffect = async () => {
        if (!activeItem || !studioOverlay) return toast.error("Vui lòng chọn đủ nguyên liệu (Ảnh gốc & Khung/Logo)");
        setStudioLoading(true);
        const tid = toast.loading("Đang 'chế' ảnh, vui lòng chờ...");
        try {
            const res = await mediaApi.applyEffect({
                source_id: activeItem.id,
                overlay_id: studioOverlay.id,
                type: studioType
            });
            toast.success("Đã tạo ảnh mới!", { id: tid });
            setIsStudioOpen(false);
            setStudioOverlay(null);

            // Tải lại danh sách và chọn luôn cái mới nhất
            await fetchFiles(1);
            if (res.data?.data) {
                const newFile = res.data.data;
                setActiveItem(newFile);
            }
        } catch (e) {
            toast.error(e.response?.data?.message || "Lỗi xử lý ảnh", { id: tid });
        } finally {
            setStudioLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters(initialFilters);
        setSelectedIds([]);
        failedPageRef.current = null;
    };

    const getGridClass = () => {
        switch (viewMode) {
            case 'grid_huge': return 'grid-cols-1 md:grid-cols-2 gap-8';
            case 'grid_lg': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8';
            case 'grid_md': return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6';
            case 'grid_sm': return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3';
            case 'list': return 'grid-cols-1 gap-2';
            default: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6';
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename || "download";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast.error("Không thể tải ảnh");
        }
    };

    return (
        <div className={`flex h-full bg-slate-50 text-slate-700 text-xs ${isStandalone ? 'min-h-screen' : ''}`}>

            {/* === CỘT 1: SIDEBAR BỘ LỌC (Left) === */}
            <div className="w-64 bg-white border-r flex flex-col p-5 gap-7 overflow-y-auto hidden md:flex shadow-sm">

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                        <Icon name="image" className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Media Vault</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Hệ thống kho tập trung</p>
                    </div>
                </div>

                {/* A. BỘ SƯU TẬP */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black uppercase text-slate-400 text-[10px] tracking-widest">Bộ sưu tập</h3>
                        <button
                            onClick={() => setIsCreatingCol(!isCreatingCol)}
                            className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <Icon name="plus" className="w-3 h-3 text-indigo-600" />
                        </button>
                    </div>
                    {isCreatingCol && (
                        <div className="flex gap-1 animate-scaleIn">
                            <input
                                className="border border-slate-200 rounded-xl px-3 py-2 w-full text-[10px] focus:ring-2 focus:ring-indigo-100 outline-none"
                                placeholder="Tên bộ sưu tập..."
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                            />
                            <button onClick={handleCreateCollection} className="bg-emerald-500 text-white p-2 rounded-xl"><Icon name="check" className="w-3 h-3" /></button>
                        </div>
                    )}
                    <ul className="space-y-1.5">
                        <li
                            className={`cursor-pointer px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${!filters.collection_id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
                            onClick={() => setFilters({ ...filters, collection_id: null })}
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="package" className="w-4 h-4" /> Tất cả Media
                            </div>
                        </li>
                        {collections.map(col => (
                            <li
                                key={col.id}
                                className={`cursor-pointer px-4 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all group flex justify-between items-center ${filters.collection_id === col.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                onClick={() => setFilters({ ...filters, collection_id: col.id })}
                            >
                                <span className="truncate flex items-center gap-2">
                                    <Icon name="list" className="w-4 h-4 text-slate-400" /> {col.name}
                                    <span className="text-[8px] opacity-40 ml-1">({col.files_count || 0})</span>
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAddToCollection(col.id); }}
                                            title="Gán các ảnh đã chọn vào đây"
                                            className="w-5 h-5 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDeleteCollection(col.id, e)}
                                        className="w-5 h-5 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Icon name="trash" className="w-3 h-3" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* B. BỘ LỌC THÔNG MINH */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h3 className="font-black uppercase text-slate-400 text-[10px] tracking-widest">Lọc thông minh</h3>
                    <div className="space-y-1.5">
                        <button
                            onClick={() => setFilters({ ...filters, usage_status: filters.usage_status === 'orphan' ? '' : 'orphan' })}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${filters.usage_status === 'orphan' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Icon name="alert-triangle" className="w-4 h-4" /> Ảnh mồ côi
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, usage_status: filters.usage_status === 'heavily_used' ? '' : 'heavily_used' })}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${filters.usage_status === 'heavily_used' ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Icon name="globe" className="w-4 h-4" /> Dùng nhiều nơi
                        </button>
                    </div>
                </div>

                {/* C. BỘ LỌC NÂNG CAO */}
                <div className="border-t border-slate-100 pt-6 space-y-5">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black uppercase text-slate-400 text-[10px] tracking-widest">Bộ lọc sâu</h3>
                        <button onClick={resetFilters} className="text-[8px] font-black text-indigo-500 uppercase hover:underline">Xóa lọc</button>
                    </div>

                    <div>
                        <label className="block font-black text-[9px] text-slate-500 uppercase mb-2">Thương hiệu</label>
                        <select
                            className="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-[10px] focus:ring-2 focus:ring-indigo-200"
                            value={filters.brand_id}
                            onChange={e => setFilters({ ...filters, brand_id: e.target.value })}
                        >
                            <option value="">-- Tất cả --</option>
                            {brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-black text-[9px] text-slate-500 uppercase mb-2">Danh mục Web</label>
                        <select
                            className="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-[10px] focus:ring-2 focus:ring-indigo-200"
                            value={filters.cat_id}
                            onChange={e => setFilters({ ...filters, cat_id: e.target.value })}
                        >
                            <option value="">-- Tất cả danh mục --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-black text-[9px] text-slate-500 uppercase mb-2">Sản phẩm / SKU</label>
                        <input
                            className="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-[10px] focus:ring-2 focus:ring-indigo-200 outline-none"
                            placeholder="Gắn với sản phẩm..."
                            value={filters.product_search}
                            onChange={e => setFilters({ ...filters, product_search: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                            onClick={() => setFilters({ ...filters, type: 'image' })}
                            className={`py-3 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${filters.type === 'image' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >Ảnh</button>
                        <button
                            onClick={() => setFilters({ ...filters, type: 'video' })}
                            className={`py-3 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${filters.type === 'video' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >Video</button>
                    </div>
                </div>
            </div>

            {/* === CỘT 2: MAIN GRID === */}
            <div className="flex-1 flex flex-col min-w-0 bg-white md:rounded-l-[3rem] shadow-2xl relative z-10">
                <div className="h-20 border-b border-slate-100 px-8 flex items-center justify-between gap-4">
                    {/* SEARCH INPUT */}
                    <div className="flex-1 max-w-lg relative group">
                        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                        <input
                            className="bg-slate-50 rounded-2xl pl-12 pr-6 py-3 w-full border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-bold placeholder:text-slate-300 transition-all shadow-sm group-focus-within:shadow-indigo-50"
                            placeholder="Tìm tên file..."
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    {/* ACTIONS BAR (VIEW MODES & UPLOAD) */}
                    <div className="flex items-center gap-3">
                        {/* 4 VIEW MODES SWITCHER */}
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setViewMode('grid_huge')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid_huge' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Siêu lớn">
                                <Icon name="maximize" className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('grid_lg')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid_lg' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lưới lớn">
                                <Icon name="grid" className="w-4 h-4" /> {/* Icon đại diện Lớn */}
                            </button>
                            <button onClick={() => setViewMode('grid_md')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid_md' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lưới vừa">
                                <Icon name="grid" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setViewMode('grid_sm')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid_sm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lưới nhỏ">
                                <Icon name="grid" className="w-3 h-3" />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Danh sách">
                                <Icon name="list" className="w-4 h-4" />
                            </button>
                        </div>

                        <label className={`hidden md:flex bg-indigo-600 text-white px-6 py-3 rounded-2xl cursor-pointer hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all ${uploading ? 'opacity-50' : ''}`}>
                            <Icon name="cloud-upload" className="w-4 h-4" /> <span className="hidden xl:inline">Tải lên mới</span>
                            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>

                    {/* SELECTION ACTIONS */}
                    <div className="flex gap-2">
                        {!isStandalone && (
                            <button
                                onClick={() => {
                                    const selectedItems = files.filter(f => selectedIds.includes(f.id));
                                    if (onSelect) {
                                        // Case handling: 
                                        // 1. Array expected (multiple=true)
                                        // 2. Single item expected (multiple=false)
                                        onSelect(multiple ? selectedItems : (selectedItems[0] || null));
                                    }
                                }}
                                disabled={selectedIds.length === 0}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 whitespace-nowrap"
                            >
                                Xác nhận {selectedIds.length > 0 && `(${selectedIds.length})`}
                            </button>
                        )}
                        {isStandalone && selectedIds.length > 0 && (
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                            >
                                Bỏ ({selectedIds.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isStudioOpen ? (
                        <div className="h-full flex flex-col animate-scaleIn">
                            {/* Studio View Content same as before */}
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl tracking-tighter uppercase">Media Studio</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Tạo biến thể ảnh sản phẩm chuyên nghiệp</p>
                                </div>
                                <button
                                    onClick={() => setIsStudioOpen(false)}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200"
                                >
                                    <Icon name="plus" className="w-4 h-4 rotate-45" /> Thoát Studio
                                </button>
                            </div>

                            <div className="grid grid-cols-12 gap-10 flex-1 min-h-0">
                                <div className="col-span-4 space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Ảnh gốc (Sản phẩm)</h4>
                                    <div className="aspect-square bg-slate-50 rounded-[3rem] border-4 border-white shadow-xl overflow-hidden relative group">
                                        <img src={activeItem?.preview_url} className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-center font-bold text-[10px] text-slate-500 truncate">{activeItem?.original_name}</p>
                                </div>

                                <div className="col-span-4 flex flex-col justify-center gap-6">
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col gap-6">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-4 text-center">2. Chọn kiểu xử lý</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => setStudioType('frame')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${studioType === 'frame' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg' : 'border-slate-50 text-slate-400'}`}>Ốp Khung</button>
                                                <button onClick={() => setStudioType('watermark')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${studioType === 'watermark' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg' : 'border-slate-50 text-slate-400'}`}>Đóng Dấu</button>
                                            </div>
                                        </div>
                                        <div className="py-6 border-y border-dashed border-slate-200 flex flex-col items-center">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4"><Icon name="plus" className="w-6 h-6 text-indigo-600" /></div>
                                            <p className="text-[10px] font-medium text-slate-400 text-center px-4 leading-relaxed">{studioType === 'frame' ? 'Hệ thống sẽ kéo dãn khung để phủ kín ảnh sản phẩm.' : 'Logo sẽ được thu nhỏ và đặt ở góc dưới bên phải.'}</p>
                                        </div>
                                        <button disabled={!studioOverlay || studioLoading} onClick={handleApplyEffect} className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all ${!studioOverlay ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-indigo-100'}`}>{studioLoading ? 'ĐANG CHẾ BIẾN...' : 'XUẤT BẢN ẢNH'}</button>
                                    </div>
                                </div>

                                <div className="col-span-4 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Chọn Khung / Logo</h4>
                                        {studioOverlay && <button onClick={() => setStudioOverlay(null)} className="text-[8px] font-black text-red-500 uppercase underline">Bỏ chọn</button>}
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 p-6 overflow-y-auto custom-scrollbar">
                                        <div className="grid grid-cols-2 gap-4">
                                            {files.map(file => file.is_image && (
                                                <div key={file.id} onClick={() => setStudioOverlay(file)} className={`aspect-square rounded-2xl border-4 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md ${studioOverlay?.id === file.id ? 'border-emerald-500 scale-105 shadow-emerald-50' : 'border-white'}`}>
                                                    <img src={file.preview_url} className="w-full h-full object-contain" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {loading && files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Nạp dữ liệu từ kho...</span>
                                </div>
                            ) : (
                                <div className={`grid ${getGridClass()} auto-rows-max pb-4`}>
                                    {files.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => {
                                                setActiveItem(file);
                                                if (multiple) {
                                                    setSelectedIds(prev => prev.includes(file.id) ? prev.filter(i => i !== file.id) : [...prev, file.id]);
                                                } else {
                                                    setSelectedIds([file.id]);
                                                }
                                            }}
                                            className={`group relative transition-all cursor-pointer overflow-hidden 
                                                ${viewMode === 'list'
                                                    ? 'flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 shadow-sm'
                                                    : `aspect-square bg-white border-4 ${selectedIds.includes(file.id) ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl z-10' : (activeItem?.id === file.id ? 'border-indigo-300 shadow-md' : 'border-transparent hover:border-indigo-100 hover:shadow-lg shadow-sm')} rounded-[1.5rem]`
                                                }
                                            `}
                                        >
                                            {/* PREVIEW IMAGE/ICON logic */}
                                            {viewMode === 'list' ? (
                                                // LIST VIEW TEMPLATE
                                                <>
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                                        {file.is_image ? <img src={file.preview_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Icon name="file" className="w-5 h-5" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-xs truncate ${selectedIds.includes(file.id) ? 'text-indigo-700' : 'text-slate-700'}`}>{file.original_name}</p>
                                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">{file.size_kb} KB • {file.mime_type}</p>
                                                    </div>
                                                    {selectedIds.includes(file.id) && <Icon name="check-circle" className="w-5 h-5 text-indigo-600" />}
                                                </>
                                            ) : (
                                                // GRID VIEW TEMPLATE
                                                <>
                                                    {file.is_image ? <img src={file.preview_url} className={`w-full h-full ${viewMode === 'grid_lg' ? 'object-contain p-2' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`} alt={file.original_name} />
                                                        : <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-2"><Icon name="file-text" className={`${viewMode === 'grid_sm' ? 'w-6 h-6' : 'w-10 h-10'}`} /><span className="text-[8px] font-black uppercase tracking-widest">{file.mime_type?.split('/')[1]}</span></div>}

                                                    {/* Overlays */}
                                                    <div className={`absolute inset-0 bg-indigo-600/10 transition-opacity ${selectedIds.includes(file.id) ? 'opacity-100' : 'opacity-0'}`} />

                                                    {/* CHECK ICON */}
                                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg border transition-all flex items-center justify-center z-10 ${selectedIds.includes(file.id) ? 'bg-indigo-600 border-indigo-600 scale-100 shadow-lg' : 'bg-white/90 border-slate-200 opacity-0 group-hover:opacity-100'}`}>
                                                        {selectedIds.includes(file.id) && <Icon name="check" className="w-3 h-3 text-white" />}
                                                    </div>

                                                    {/* ZOOM BUTTON (Only show in Grid modes) */}
                                                    {file.is_image && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setLargePreviewItem(file); }}
                                                            className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/50 text-white backdrop-blur-sm border border-transparent hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                                                            title="Xem ảnh lớn"
                                                        >
                                                            <Icon name="maximize" className="w-3 h-3" />
                                                        </button>
                                                    )}

                                                    {/* INFO BAR */}
                                                    <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end transition-transform duration-300 ${viewMode === 'grid_sm' ? 'h-full opacity-0 group-hover:opacity-100' : 'translate-y-full group-hover:translate-y-0'}`}>
                                                        <p className="text-[9px] font-bold text-white truncate drop-shadow-md">{file.original_name}</p>
                                                        {viewMode !== 'grid_sm' && (
                                                            <div className="flex justify-between items-center mt-0.5">
                                                                <p className="text-[7px] font-black text-slate-300 uppercase">{file.size_kb} KB</p>
                                                                {file.usage_count > 0 && <span className="text-[7px] font-black text-emerald-400 uppercase">IN USE</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="py-6 flex flex-col items-center justify-center gap-2">
                    <div ref={observerTarget} className="h-4 w-full" />
                    {loadingMore && (
                        <div className="flex items-center gap-2 text-indigo-600 text-[10px] uppercase font-black animate-pulse bg-indigo-50 px-4 py-2 rounded-full">
                            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            Đang tải thêm...
                        </div>
                    )}
                    {pagination && pagination.current_page === pagination.last_page && files.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-300 text-[10px] uppercase font-black tracking-widest mt-4">
                            <span className="w-8 h-px bg-slate-200"></span>
                            Hết dữ liệu
                            <span className="w-8 h-px bg-slate-200"></span>
                        </div>
                    )}
                </div>
            </div>

            {/* === CỘT 3: INSPECTOR === */}
            {
                activeItem && (
                    <div className="w-80 bg-slate-50 flex flex-col p-6 overflow-y-auto animate-slideLeft shadow-inner">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Cấu hình tệp tin</h3>
                            <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-slate-600"><Icon name="x" className="w-4 h-4" /></button>
                        </div>

                        <div className="aspect-square bg-white rounded-[2rem] border-4 border-white shadow-xl p-2 mb-6 overflow-hidden relative group">
                            {activeItem.is_image ? <img src={activeItem.preview_url} className="w-full h-full object-contain rounded-[1.5rem]" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-4"><Icon name="file-text" className="w-16 h-16 text-slate-200" /><span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeItem.mime_type}</span></div>}

                            {/* Overlay Actions on Inspector Image */}
                            {activeItem.is_image && (
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-[1.5rem]">
                                    <button
                                        onClick={() => setLargePreviewItem(activeItem)}
                                        className="p-3 bg-white/90 text-slate-800 rounded-xl hover:scale-110 shadow-lg backdrop-blur"
                                        title="Xem full kích thước"
                                    >
                                        <Icon name="maximize" className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDownload(activeItem.preview_url, activeItem.original_name)}
                                        className="p-3 bg-white/90 text-slate-800 rounded-xl hover:scale-110 shadow-lg backdrop-blur"
                                        title="Tải xuống"
                                    >
                                        <Icon name="download" className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* THEO DÕI NGƯỜI TẠO */}
                            {activeItem.creator && (
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">{activeItem.creator.name.charAt(0)}</div>
                                    <div>
                                        <p className="text-[7px] font-black text-slate-400 uppercase">Người tải/chế ảnh:</p>
                                        <p className="text-[10px] font-black text-slate-700">{activeItem.creator.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 italic">{activeItem.creator.time}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                                <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Gán vào bộ sưu tập</label>
                                <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-bold" onChange={(e) => { if (e.target.value) handleAddToCollection(e.target.value, [activeItem.id]); e.target.value = ""; }}>
                                    <option value="">-- Chọn bộ sưu tập --</option>
                                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Đặt lại tên file</label>
                                <input className="w-full bg-white border-2 border-transparent focus:border-indigo-100 rounded-2xl px-5 py-3 outline-none font-bold text-xs" value={activeItem.original_name} onChange={e => setActiveItem({ ...activeItem, original_name: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[8px] font-black text-slate-400 uppercase">Alt Text (SEO)</label>
                                <input className="w-full bg-white border-2 border-transparent focus:border-indigo-100 rounded-2xl px-5 py-3 outline-none font-medium text-xs" value={activeItem.alt_text_default || ''} onChange={e => setActiveItem({ ...activeItem, alt_text_default: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[8px] font-black text-slate-400 uppercase">Ghi chú nội bộ (Comment)</label>
                                <textarea className="w-full bg-white border-2 border-transparent focus:border-indigo-100 rounded-2xl px-5 py-4 outline-none font-medium text-xs resize-none" rows={3} placeholder="Ghi chú về file này..." value={activeItem.internal_notes || ''} onChange={e => setActiveItem({ ...activeItem, internal_notes: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button onClick={handleUpdateMeta} variant="primary" className="rounded-2xl py-6 font-black uppercase text-[10px]">Lưu Thông Tin</Button>
                                <button onClick={() => handleDeleteFile(activeItem.id)} className="py-3 bg-white text-red-500 rounded-2xl font-black uppercase text-[10px] border-2 border-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm">Xóa vĩnh viễn</button>
                            </div>

                            {/* --- BUTTON MỞ STUDIO CHẾ ẢNH --- */}
                            <div className="pt-4 border-t border-dashed">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Công cụ nâng cao</label>
                                <button
                                    onClick={() => setShowStudio(true)}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:scale-105 transition-transform flex items-center justify-center gap-2 text-[10px]"
                                >
                                    <Icon name="wand" className="w-4 h-4" /> Media Studio (Chế ảnh)
                                </button>
                            </div>

                            <div className="pt-8 border-t border-slate-200">
                                <h4 className="font-black text-[9px] uppercase text-slate-400 mb-4">Sử dụng tại ({activeItem.usage_count})</h4>
                                <div className="space-y-3">
                                    {activeItem.used_in?.map((usage, idx) => (
                                        <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 space-y-3 group/usage hover:border-indigo-100 transition-all shadow-sm">
                                            <div className="min-w-0"><p className="text-[10px] font-black text-slate-700 truncate">{usage.name}</p><p className="text-[7px] font-bold text-slate-400 uppercase italic">ID: #{usage.id} • {usage.type}</p></div>
                                            <div className="flex gap-2"><a href={usage.link} target="_blank" rel="noreferrer" className="flex-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5"><Icon name="external-link" className="w-3 h-3" /> Xem CRM</a>{usage.web_link && <a href={usage.web_link} target="_blank" rel="noreferrer" className="flex-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5"><Icon name="globe" className="w-3 h-3" /> Xem Web</a>}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* --- MODAL CON: STUDIO --- */}
            {
                showStudio && activeItem && (
                    <MediaStudioModal
                        isOpen={true}
                        sourceFile={activeItem}
                        onClose={() => setShowStudio(false)}
                        files={files}
                        onSuccess={(newFile) => {
                            // Khi chế ảnh xong:
                            // 1. Thêm ảnh mới vào danh sách đang hiển thị
                            setFiles(prev => [newFile, ...prev]);
                            // 2. Chọn luôn ảnh mới đó để User dùng ngay
                            setActiveItem(newFile);
                            if (multiple) setSelectedIds(prev => [...prev, newFile.id]);
                            else setSelectedIds([newFile.id]);
                        }}
                    />
                )
            }

            {/* --- MODAL CON: LARGE IMAGE PREVIEW --- */}
            {
                largePreviewItem && (
                    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex flex-col animate-fadeIn">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6">
                            <div className="text-white/80">
                                <h3 className="text-lg font-bold">{largePreviewItem.original_name}</h3>
                                <p className="text-xs uppercase tracking-widest opacity-60">{largePreviewItem.mime_type} • {largePreviewItem.size_kb} KB</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleDownload(largePreviewItem.preview_url, largePreviewItem.original_name)}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                                    title="Tải xuống"
                                >
                                    <Icon name="download" className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => setLargePreviewItem(null)}
                                    className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all"
                                    title="Đóng"
                                >
                                    <Icon name="x" className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Main Image Area */}
                        <div className="flex-1 flex items-center justify-center p-10 overflow-hidden">
                            <img
                                src={largePreviewItem.preview_url}
                                className="max-w-full max-h-full object-contain shadow-2xl drop-shadow-2xl rounded-lg"
                                alt="Large View"
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MediaManager;

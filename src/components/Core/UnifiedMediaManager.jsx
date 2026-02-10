import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import UnifiedMediaService from '../../services/UnifiedMediaService';
import { Icon } from '../ui';
import axios from '../../axiosGlobal'; // For dictionary fetching if needed

// --- SUB-COMPONENTS ---
const LazyImage = ({ src, alt, className, onClick, selected, onSelect }) => {
    const [loaded, setLoaded] = useState(false);

    const handleClick = (e) => {
        if (onSelect) {
            // Shift key logic handled by parent usually, but here we just pass event
            onSelect(e);
        } else if (onClick) {
            onClick(e);
        }
    };

    return (
        <div
            className={`relative overflow-hidden bg-slate-100 cursor-pointer group transition-all duration-200 ${className} ${selected ? 'ring-4 ring-indigo-500 ring-inset opacity-100' : 'opacity-90 hover:opacity-100'}`}
            onClick={handleClick}
        >
            {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onLoad={() => setLoaded(true)}
                loading="lazy"
            />

            {/* Selection Checkmark */}
            {selected && (
                <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce-in">
                    <Icon name="check" className="w-3 h-3" />
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const UnifiedMediaManager = ({ onSelect, multiple = true, onClose }) => {
    // --- STATE ---
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        keyword: '',
        collection_id: null,
        brand_id: null,
        page: 1
    });
    const [hasMore, setHasMore] = useState(true);

    // Sidebar Data
    const [collections, setCollections] = useState([]);
    const [brands, setBrands] = useState([]); // Fetch from API or Dictionary

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [lastSelectedId, setLastSelectedId] = useState(null); // For Shift+Click

    // Inspector Data
    const [usageData, setUsageData] = useState([]);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // Refs
    const gridRef = useRef(null);

    // --- EFFECTS ---

    // 1. Init Load
    useEffect(() => {
        loadCollections();
        loadBrands();
        loadFiles(true);
    }, []);

    // 2. Reload when filter changes (except page)
    useEffect(() => {
        const timer = setTimeout(() => {
            setFiles([]);
            setFilters(prev => ({ ...prev, page: 1 }));
            loadFiles(true);
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [filters.keyword, filters.collection_id, filters.brand_id]);

    // 3. Load Usage when SINGLE item selected
    useEffect(() => {
        if (selectedIds.length === 1) {
            fetchUsage(selectedIds[0]);
        } else {
            setUsageData([]);
        }
    }, [selectedIds]);

    // --- API ACTIONS ---

    const loadFiles = async (reset = false) => {
        // Warning: This depends on the debounced effect. 
        // We'll trust the effect logic or direct call.
        // Actually, effect calls this.

        // Prevent race conditions or double calls if needed
        // but for now simple logic.

        try {
            setLoading(true);
            const currentFilters = reset ? { ...filters, page: 1 } : filters;

            const res = await UnifiedMediaService.list(currentFilters);
            const newItems = res.data.data.data || res.data.data; // Paging structure

            if (reset) setFiles(newItems);
            else setFiles(prev => [...prev, ...newItems]);

            setHasMore(res.data.data.next_page_url !== null);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi tải thư viện ảnh");
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!hasMore || loading) return;
        setFilters(prev => ({ ...prev, page: prev.page + 1 }));
        // Just update page, effect ? No, effect ignores page change to avoid reset.
        // We need explicit call for Load More.
        // Wait, the effect has [filters.keyword, ...] but NOT filters.page.
        // So we need to call loadFiles manual here.

        // Let's rely on state update callback or async
        const nextPage = filters.page + 1;
        // setFilters is async, so...
        // Better:
        // loadFiles(false) using updated page param?
        // Let's refactor: loadFiles accepts page override.

        UnifiedMediaService.list({ ...filters, page: nextPage }).then(res => {
            const newItems = res.data.data.data || res.data.data;
            setFiles(prev => [...prev, ...newItems]);
            setHasMore(res.data.data.next_page_url !== null);
            setFilters(prev => ({ ...prev, page: nextPage }));
        });
    };

    const loadCollections = async () => {
        try {
            const res = await UnifiedMediaService.getCollections();
            setCollections(res.data.data || []);
        } catch (e) { }
    };

    const loadBrands = async () => {
        // Assuming we have an endpoint or use existing
        try {
            // Using generic dictionary endpoint or QvcProductController
            const res = await axios.get('/api/v1/brands'); // Legacy or V1
            setBrands(res.data.data || res.data || []);
        } catch (e) { }
    };

    const fetchUsage = async (id) => {
        setLoadingUsage(true);
        try {
            const res = await UnifiedMediaService.getUsage(id);
            setUsageData(res.data.data || []);
        } catch (e) {
            setUsageData([]);
        } finally {
            setLoadingUsage(false);
        }
    };

    const handleUpload = async (fileList) => {
        setUploading(true);
        const tid = toast.loading("Đang upload...");
        try {
            const uploadedIds = [];
            for (const file of fileList) {
                const res = await UnifiedMediaService.upload(file);
                if (res.data.data) {
                    // Prepend to list
                    setFiles(prev => [res.data.data, ...prev]);
                    uploadedIds.push(res.data.data.id);
                }
            }
            toast.success(`Đã lên ${uploadedIds.length} ảnh`, { id: tid });

            // Auto select newly uploaded
            setSelectedIds(uploadedIds);
        } catch (e) {
            toast.error("Upload thất bại: " + e.message, { id: tid });
        } finally {
            setUploading(false);
        }
    };

    // --- HANDLERS ---

    const handleItemClick = (e, file) => {
        const id = file.id;

        if (multiple) {
            if (e.shiftKey && lastSelectedId) {
                // Range select logic (simple index based)
                const lastIdx = files.findIndex(f => f.id === lastSelectedId);
                const currIdx = files.findIndex(f => f.id === id);
                if (lastIdx !== -1 && currIdx !== -1) {
                    const start = Math.min(lastIdx, currIdx);
                    const end = Math.max(lastIdx, currIdx);
                    const rangeIds = files.slice(start, end + 1).map(f => f.id);
                    // Union
                    setSelectedIds(prev => [...new Set([...prev, ...rangeIds])]);
                }
            } else if (e.ctrlKey || e.metaKey) {
                // Toggle
                setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                setLastSelectedId(id);
            } else {
                // Single select (or reset and select, standard file explorer behavior)
                // Wait, users might find it annoying if it resets.
                // Let's implement: Click = Select Only This. Ctrl+Click = Toggle.
                setSelectedIds([id]);
                setLastSelectedId(id);
            }
        } else {
            // Single Mode
            setSelectedIds([id]);
            setLastSelectedId(id);
        }
    };

    const handleInsert = () => {
        if (!onSelect) return;
        const selectedItems = files.filter(f => selectedIds.includes(f.id));
        onSelect(selectedItems); // Pass full objects
        if (onClose) onClose();
    };

    // --- RENDER ---
    const activeFile = selectedIds.length === 1 ? files.find(f => f.id === selectedIds[0]) : null;

    return (
        <div className="flex h-[80vh] w-full bg-white rounded-xl shadow-2xl overflow-hidden text-slate-700 font-sans border border-slate-200">
            {/* 1. LEFT SIDEBAR */}
            <div className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col p-4 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Bộ Lọc</h3>

                {/* Collections */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-700 mb-2 block flex justify-between">
                        Bộ sưu tập
                        <button className="text-indigo-600 hover:text-indigo-800" title="Thêm Album">+</button>
                    </label>
                    <ul className="space-y-1">
                        <li>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, collection_id: null }))}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${!filters.collection_id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-600'}`}
                            >
                                Tất cả
                            </button>
                        </li>
                        {collections.map(c => (
                            <li key={c.id}>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, collection_id: c.id }))}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex justify-between ${filters.collection_id === c.id ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{c.name}</span>
                                    <span className="text-xs opacity-50 bg-white px-1.5 rounded-full">{c.files_count}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Brands */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <label className="text-xs font-bold text-slate-700 mb-2 block">Thương hiệu</label>
                    <ul className="space-y-1 pb-10">
                        <li>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, brand_id: null }))}
                                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all ${!filters.brand_id ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Tất cả
                            </button>
                        </li>
                        {brands.map(b => (
                            <li key={b.id}>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, brand_id: b.id }))}
                                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all truncate ${filters.brand_id === b.id ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {b.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* 2. MAIN CONTENT (MIDDLE) */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Toolbar */}
                <div className="h-16 border-b flex items-center px-4 justify-between bg-white z-10">
                    <div className="flex items-center gap-3 flex-1 max-w-lg">
                        <Icon name="search" className="w-5 h-5 text-slate-400" />
                        <input
                            className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-slate-300"
                            placeholder="Tìm kiếm theo tên file..."
                            value={filters.keyword}
                            onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase cursor-pointer hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Icon name="upload" className="w-4 h-4" />
                            )}
                            <span>Upload</span>
                            <input type="file" multiple className="hidden" accept="image/*" onChange={e => handleUpload(e.target.files)} />
                        </label>
                    </div>
                </div>

                {/* Grid */}
                <div
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight - scrollTop < clientHeight + 200) {
                            loadMore();
                        }
                    }}
                >
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                        {files.map(f => (
                            <div key={f.id} className="aspect-square relative">
                                <LazyImage
                                    src={f.preview_url || f.url}
                                    className="rounded-xl border shadow-sm h-full w-full"
                                    selected={selectedIds.includes(f.id)}
                                    onSelect={(e) => handleItemClick(e, f)}
                                />
                                <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-b-xl">
                                    <p className="text-[10px] text-white truncate px-1">{f.original_name}</p>
                                </div>
                            </div>
                        ))}

                        {/* Shimmer Loaders */}
                        {loading && Array.from({ length: 12 }).map((_, i) => (
                            <div key={`s-${i}`} className="aspect-square bg-slate-200 rounded-xl animate-pulse" />
                        ))}
                    </div>

                    {!loading && files.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Icon name="image" className="w-16 h-16 mb-2" />
                            <p>Không tìm thấy ảnh nào</p>
                        </div>
                    )}
                </div>

                {/* Footer Selection Bar */}
                <div className="p-3 border-t bg-white flex justify-between items-center slideUp">
                    <span className="text-sm font-medium text-slate-500">Đã chọn <b>{selectedIds.length}</b> ảnh</span>
                    <div className="flex gap-2">
                        {onClose && <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Đóng</button>}
                        <button
                            disabled={selectedIds.length === 0}
                            onClick={handleInsert}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all"
                        >
                            Chọn & Chèn
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. INSPECTOR (RIGHT SIDEBAR) */}
            {activeFile && (
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col animate-slideLeft shadow-2xl z-20">
                    <div className="h-60 bg-slate-100 flex items-center justify-center relative p-4 border-b">
                        <img src={activeFile.preview_url || activeFile.url} className="max-h-full max-w-full object-contain shadow-md rounded-lg" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                        {/* Info Block */}
                        <div>
                            <h4 className="text-sm font-black text-slate-800 break-words mb-1">{activeFile.original_name}</h4>
                            <p className="text-xs text-slate-400 uppercase font-mono">{activeFile.mime_type} • {Math.round(activeFile.size_kb)} KB</p>
                        </div>

                        {/* Usage Stats (Reverse Lookup) */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="link" className="w-3 h-3" /> Được dùng tại
                            </h5>

                            {loadingUsage ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2"></div>
                                </div>
                            ) : usageData.length > 0 ? (
                                <ul className="space-y-2">
                                    {usageData.map((u, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-xs">
                                            <span className={`px-1 rounded text-[10px] font-bold ${u.site_code === 'MASTER' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {u.site_code}
                                            </span>
                                            <div>
                                                <a href="#" className="font-bold text-indigo-600 hover:underline block truncate max-w-[150px]" title={u.model_name}>
                                                    {u.model_name}
                                                </a>
                                                <span className="text-slate-400">{u.model_type} • {u.use_group}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Chưa được sử dụng ở đâu.</p>
                            )}
                        </div>

                        {/* Editor Inputs */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tên file (SEO)</label>
                                <input
                                    className="w-full p-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    defaultValue={activeFile.original_name} // To be connected to update API
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Alt Text</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                    placeholder="Mô tả ảnh..."
                                ></textarea>
                            </div>
                            <button className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-all">Lưu Thông Tin</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedMediaManager;

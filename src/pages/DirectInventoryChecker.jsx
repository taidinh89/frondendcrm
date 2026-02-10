import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx';
import { InventoryDetailCard, InventoryDenseTable, InventoryCompactList, ProductDetailModal, InventoryVirtualizedTable, InventoryLegacyTable } from '../components/InventoryViews.jsx';
import toast from 'react-hot-toast';

const API_INDEX_ENDPOINT = '/api/v1/direct-inventory';
const API_CHECK_ENDPOINT = '/api/v1/direct-inventory/check';
const API_FILTERS_ENDPOINT = '/api/v1/direct-inventory/filter-options';
const SYNC_STATUS_ENDPOINT = '/api/v1/status';
const SYNC_TRIGGER_ENDPOINT = '/api/v1/trigger';

const SyncWidget = ({ label, data, onSync, isTriggering }) => {
    if (!data) return null;

    const isSyncing = data.is_syncing || isTriggering;
    const isError = data.status_text === 'Lỗi' || (data.message && data.message.toLowerCase().includes('lỗi'));

    const lastSync = data.last_sync_at
        ? new Date(data.last_sync_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        : 'Chưa chạy';

    return (
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm gap-3 hover:border-blue-200 transition-colors">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-bold text-slate-600 tabular-nums">{lastSync}</span>
            </div>
            <div className="flex items-center gap-1.5">
                {isError ? (
                    <div className="flex items-center text-rose-600 text-[10px] font-black uppercase" title={data.message}>
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                        Lỗi
                    </div>
                ) : isSyncing ? (
                    <div className="flex items-center text-blue-600 text-[10px] font-black uppercase italic">
                        <svg className="animate-spin h-3 w-3 mr-1 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12 a8 8 0 01 8-8 V0 C5.373 0 0 12h4 z m2 5.291 A7.962 7.962 0 01 4 12 H0 c0 3.042 1.135 5.824 3 7.938 l3-2.647 z"></path></svg>
                        Syncing...
                    </div>
                ) : (
                    <div className="flex items-center text-emerald-600 text-[10px] font-black uppercase">
                        <UI.Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 mr-1 text-emerald-500" />
                        OK
                    </div>
                )}
            </div>
            <button
                onClick={onSync}
                disabled={isSyncing}
                className={`p-1.5 rounded-lg hover:bg-slate-50 transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 active:scale-90 hover:shadow-inner'}`}
                title="Đồng bộ ngay"
            >
                <UI.Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export const DirectInventoryChecker = () => {
    const [mode, setMode] = useState('list'); // 'list' or 'check'
    const [viewMode, setViewMode] = useState('table_legacy'); // Default to Legacy Table
    const [sourceType, setSourceType] = useState('all'); // all, ecount_only, misa_only, both, unlinked
    const [skus, setSkus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [results, setResults] = useState([]);
    const [syncStatus, setSyncStatus] = useState({ ecount: null, misa: null });
    const [triggeringTypes, setTriggeringTypes] = useState([]);

    const scrollParentRef = React.useRef(null);

    // Modal state
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // List Mode States
    const [listData, setListData] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [filters, setFilters] = useState({
        search: '',
        brand: '',
        category: '',
        supplier: '',
        has_stock: false,
        vat_rate: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        brands: [],
        categories: [],
        suppliers: [],
        vat_rates: []
    });

    const openDetail = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const fetchFilterOptions = async () => {
        try {
            const res = await axios.get(API_FILTERS_ENDPOINT);
            setFilterOptions(res.data);
        } catch (e) { console.error("Filter options error:", e); }
    };


    const isFetchingRef = React.useRef(false);
    const nextPageRef = React.useRef(1);
    const loadMoreRef = React.useRef(null);

    const fetchList = useCallback(async (page = 1, isAppend = false) => {
        console.log(`%c[Inventory] Fetch Sequence: Page ${page}, Append: ${isAppend}`, "color: #3b82f6; font-weight: bold");

        if (isFetchingRef.current) {
            console.warn("[Inventory] Fetch blocked: already in progress");
            return;
        }

        isFetchingRef.current = true;
        if (isAppend) setIsFetchingNextPage(true);
        else setIsLoading(true);

        try {
            const res = await axios.get(API_INDEX_ENDPOINT, {
                params: { ...filters, page, source_type: sourceType }
            });

            const { data: newData, current_page, last_page, total } = res.data;
            console.log(`%c[Inventory] Received: ${newData?.length || 0} items, Page ${current_page}/${last_page}`, "color: #10b981");

            if (isAppend) {
                setListData(prev => {
                    const existingIds = new Set(prev.map(item => item.ecount_code || item.primary_code));
                    const uniqueNewData = (newData || []).filter(item => !existingIds.has(item.ecount_code || item.primary_code));

                    if (uniqueNewData.length === 0 && (newData || []).length > 0) {
                        console.warn("[Inventory] Duplicate page detected - pausing infinite scroll.");
                        setPagination(prev => ({ ...prev, last_page: prev.current_page })); // Lock pagination
                        return prev;
                    }

                    return [...prev, ...uniqueNewData];
                });
            } else {
                setListData(newData || []);
            }

            setPagination({
                current_page: current_page,
                last_page: (newData || []).length === 0 ? current_page : last_page, // Safety if empty
                total: total
            });
            nextPageRef.current = current_page + 1;
        } catch (e) {
            toast.error('Lỗi khi tải danh sách tồn kho');
            console.error("[Inventory] Error:", e);
        } finally {
            setIsLoading(false);
            setIsFetchingNextPage(false);
            // Lock release with minor safety delay
            setTimeout(() => {
                isFetchingRef.current = false;
            }, 100);
        }
    }, [filters, sourceType]);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // --- SYNC LOGIC ---
    const fetchSyncStatus = useCallback(async () => {
        try {
            const res = await axios.get(SYNC_STATUS_ENDPOINT);
            setSyncStatus(res.data);
        } catch (e) {
            console.error("Lỗi lấy trạng thái sync:", e);
        }
    }, []);

    useEffect(() => {
        fetchSyncStatus();
        const interval = setInterval(fetchSyncStatus, 10000);
        return () => clearInterval(interval);
    }, [fetchSyncStatus]);

    const handleTriggerSync = async (type) => {
        if (triggeringTypes.includes(type)) return;
        setTriggeringTypes(prev => [...prev, type]);
        try {
            await axios.post(SYNC_TRIGGER_ENDPOINT, { type });
            fetchSyncStatus();
            toast.success(`Đã kích hoạt đồng bộ ${type}`);
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            toast.error(`Lỗi kích hoạt đồng bộ ${type}: ${msg}`);
        } finally {
            setTimeout(() => {
                setTriggeringTypes(prev => prev.filter(t => t !== type));
            }, 1000);
        }
    };

    useEffect(() => {
        if (mode === 'list') {
            console.log("[Inventory] List mode reset - fetching page 1");
            nextPageRef.current = 1;
            fetchList(1);
        }
    }, [mode, filters.brand, filters.category, filters.has_stock, filters.vat_rate, sourceType, fetchList]);

    // Infinite Scroll via IntersectionObserver
    useEffect(() => {
        // Đợi một chút để DOM mount ổn định và ref được gán
        const timer = setTimeout(() => {
            if (!loadMoreRef.current) return;

            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    const hasMore = pagination.current_page < pagination.last_page;

                    // Chỉ cho phép trigger nếu đã cuộn xuống một khoảng (tránh lỗi auto-load tại đỉnh trang)
                    const container = scrollParentRef.current;
                    const scrollDepthOk = container ? (container.scrollTop > 300) : true;

                    console.log(`[Observer] Visible: true | ScrollDepth: ${scrollDepthOk} | Fetching: ${isFetchingRef.current} | ${pagination.current_page}/${pagination.last_page}`);

                    if (!isFetchingRef.current && hasMore && scrollDepthOk) {
                        const next = nextPageRef.current;
                        console.log(`[Observer] Triggering fetch for page ${next}`);
                        fetchList(next, true);
                    }
                }
            }, {
                root: viewMode.startsWith('table') ? scrollParentRef.current : null,
                rootMargin: '100px',
                threshold: 0.01
            });

            observer.observe(loadMoreRef.current);

            return () => {
                console.log("[Inventory] Observer disconnecting");
                observer.disconnect();
            };
        }, 500);

        return () => clearTimeout(timer);
    }, [pagination.current_page, pagination.last_page, viewMode, fetchList]);

    const handleCheck = async () => {
        if (!skus.trim()) {
            toast.error('Vui lòng nhập ít nhất một SKU');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(API_CHECK_ENDPOINT, { skus });
            setResults(response.data.data || []);
            toast.success(`Đã kiểm tra xong`);
        } catch (error) {
            toast.error('Có lỗi xảy ra khi kiểm tra tồn kho');
        } finally {
            setIsLoading(false);
        }
    };

    const renderData = (data) => {
        const props = {
            data,
            onSelectCode: openDetail,
            parentRef: scrollParentRef,
            loadMoreRef: loadMoreRef,
            isLoading: isFetchingNextPage
        };
        if (viewMode === 'table_legacy') return <InventoryLegacyTable {...props} />;
        if (viewMode === 'table_v2') return <InventoryVirtualizedTable {...props} />;
        if (viewMode === 'table') return <InventoryDenseTable {...props} />;
        if (viewMode === 'compact') return <InventoryCompactList {...props} />;
        return (
            <div className="space-y-4">
                {data.map((item, idx) => <InventoryDetailCard key={idx} item={item} onSelectCode={openDetail} />)}
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center text-[10px] text-slate-400 font-black tracking-widest uppercase opacity-50">
                    Pulling next block...
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex bg-blue-600 rounded-xl p-2 shadow-lg shadow-blue-200">
                        <UI.Icon path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Direct Stock <span className="text-blue-600">Pro</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Source-Level Intelligence</p>
                    </div>
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl ml-4">
                        {[
                            { id: 'list', label: 'DANH SÁCH', icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5' },
                            { id: 'check', label: 'NHẬP SKU', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center gap-2 ${mode === m.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                            >
                                <UI.Icon path={m.icon} className="w-3 h-3" />
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
                        {[
                            { id: 'table_legacy', title: 'Bản gốc', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6.25c-.621 0-1.125.504-1.125 1.125v8.25c0 .621.504 1.125 1.125 1.125h11.5c.621 0 1.125-.504 1.125-1.125V12c0-.621.504-1.125 1.125-1.125h2a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H18m-5.25-13.5h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25z' },
                            { id: 'table_v2', title: 'Siêu Bảng', icon: 'M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5' },
                            { id: 'table', title: 'Bảng Gọn', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5c-.621 0-1.125-.504-1.125-1.125m1.125 1.125v-1.5a3.375 3.375 0 003.375-3.375V4.5m17.25 15a1.125 1.125 0 001.125-1.125M20.625 19.5c.621 0 1.125-.504 1.125-1.125v-1.5a3.375 3.375 0 01-3.375-3.375V4.5' },
                            { id: 'card', title: 'Thẻ', icon: 'M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125c-.621 0-1.125.504-1.125 1.125v13.5c0 .621.504 1.125 1.125 1.125z' },
                            { id: 'compact', title: 'Danh mục', icon: 'M3.75 6h16.5M3.75 12h16.5m-16.5 5.25h16.5' }
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setViewMode(v.id)}
                                className={`p-2 rounded-lg transition-all shrink-0 ${viewMode === v.id ? 'bg-white shadow-sm text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                                title={v.title}
                            >
                                <UI.Icon path={v.icon} className="w-4 h-4" />
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-10 shrink-0">
                        <SyncWidget
                            label="Ecount"
                            data={syncStatus.ecount}
                            isTriggering={triggeringTypes.includes('ecount')}
                            onSync={() => handleTriggerSync('ecount')}
                        />
                        <SyncWidget
                            label="Misa"
                            data={syncStatus.misa}
                            isTriggering={triggeringTypes.includes('misa')}
                            onSync={() => handleTriggerSync('misa')}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
                {mode === 'list' ? (
                    <>
                        <div className="bg-white px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex flex-col gap-4 shadow-sm">
                            {/* Source Picker */}
                            <div className="flex flex-nowrap items-center gap-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Nguồn:</span>
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                                    {[
                                        { id: 'all', label: 'Tất cả' },
                                        { id: 'ecount_only', label: 'Chỉ Ecount' },
                                        { id: 'misa_only', label: 'Chỉ Misa' },
                                        { id: 'both', label: 'Đã khớp' },
                                        { id: 'unlinked', label: 'Chưa liên kết' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSourceType(s.id)}
                                            className={`shrink-0 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${sourceType === s.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-slate-600'}`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 ml-auto shrink-0 pl-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:inline">Tổng cộng:</span>
                                    <span className="text-blue-600 font-bold">{pagination.total} <span className="text-slate-400 text-[9px] uppercase">trình diện</span></span>
                                    {isFetchingNextPage && (
                                        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg animate-pulse">
                                            <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                            <span className="text-[9px] uppercase font-black">SYNCING...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-[300px] relative group">
                                    <UI.Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                                    <input
                                        type="text"
                                        placeholder="Mã SKU, tên sản phẩm..."
                                        className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        value={filters.search}
                                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && fetchList(1)}
                                    />
                                </div>
                                <select
                                    className="h-10 px-4 text-sm bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 min-w-[150px]"
                                    value={filters.brand}
                                    onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))}
                                >
                                    <option value="">Tất cả hãng</option>
                                    {filterOptions.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                </select>
                                <select
                                    className="h-10 px-4 text-sm bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 min-w-[150px]"
                                    value={filters.category}
                                    onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                >
                                    <option value="">Tất cả nhóm</option>
                                    {filterOptions.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                                <select
                                    className="h-10 px-4 text-sm bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 min-w-[120px]"
                                    value={filters.vat_rate}
                                    onChange={e => setFilters(f => ({ ...f, vat_rate: e.target.value }))}
                                >
                                    <option value="">Tất cả Thuế</option>
                                    {filterOptions.vat_rates.map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                                <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 h-10 px-4 rounded-xl hover:bg-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={filters.has_stock}
                                        onChange={e => setFilters(f => ({ ...f, has_stock: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Còn tồn</span>
                                </label>
                                <button
                                    onClick={() => fetchList(1)}
                                    className="h-10 px-8 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black active:scale-95 transition-all shadow-md"
                                >
                                    TRUY VẤN
                                </button>
                            </div>
                        </div>

                        <div
                            className={`flex-1 overflow-hidden p-6 ${['table_v2', 'table_legacy'].includes(viewMode) ? '' : 'overflow-y-auto'}`}
                            ref={['table_v2', 'table_legacy'].includes(viewMode) ? null : scrollParentRef}
                        >
                            {isLoading && listData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-300 italic">
                                    <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                                    <p className="font-black uppercase tracking-[0.2em] animate-pulse">Establishing Direct Link...</p>
                                </div>
                            ) : renderData(listData)}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-white px-8 py-8 border-b border-gray-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Batch Processing Node</h3>
                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                <textarea
                                    className="flex-1 h-32 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                                    placeholder="Dán danh sách mã SKU (Space, Commas, or Newlines)..."
                                    value={skus}
                                    onChange={(e) => setSkus(e.target.value)}
                                />
                                <button
                                    onClick={handleCheck}
                                    disabled={isLoading}
                                    className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                                >
                                    <UI.Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="w-5 h-5" />
                                    BẮT ĐẦU KIỂM TRA
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                            {results.length > 0 ? renderData(results) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <UI.Icon path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" className="w-16 h-16 opacity-20" />
                                    <p className="font-black uppercase tracking-widest text-xs">Waiting for Input Data...</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Global Detail Modal */}
            <ProductDetailModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

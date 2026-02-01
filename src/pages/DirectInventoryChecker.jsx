import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as UI from '../components/ui.jsx';
import { InventoryDetailCard, InventoryDenseTable, InventoryCompactList, ProductDetailModal, InventoryVirtualizedTable, InventoryLegacyTable } from '../components/InventoryViews.jsx';
import toast from 'react-hot-toast';

const API_INDEX_ENDPOINT = '/api/v1/direct-inventory';
const API_CHECK_ENDPOINT = '/api/v1/direct-inventory/check';
const API_FILTERS_ENDPOINT = '/api/v1/direct-inventory/filter-options';

export const DirectInventoryChecker = () => {
    const [mode, setMode] = useState('list'); // 'list' or 'check'
    const [viewMode, setViewMode] = useState('table_legacy'); // Default to Legacy Table
    const [sourceType, setSourceType] = useState('all'); // all, ecount_only, misa_only, both, unlinked
    const [skus, setSkus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [results, setResults] = useState([]);

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
        per_page: 50
    });
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [], suppliers: [] });

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

    const fetchList = useCallback(async (page = 1, isAppend = false) => {
        if (isAppend) setIsFetchingNextPage(true);
        else setIsLoading(true);

        try {
            const res = await axios.get(API_INDEX_ENDPOINT, {
                params: { ...filters, page, source_type: sourceType }
            });

            const newData = res.data.data || [];
            if (isAppend) {
                setListData(prev => [...prev, ...newData]);
            } else {
                setListData(newData);
            }

            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total
            });
        } catch (e) {
            toast.error('Lỗi khi tải danh sách tồn kho');
            console.error(e);
        } finally {
            setIsLoading(false);
            setIsFetchingNextPage(false);
        }
    }, [filters, sourceType]);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        if (mode === 'list') fetchList(1);
    }, [mode, filters.brand, filters.category, filters.has_stock, sourceType, fetchList]);

    // Infinite Scroll Handler
    useEffect(() => {
        const container = scrollParentRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Higher sensitivity: Trigger when 1000px from bottom (approx 15-20 rows)
            if (scrollHeight - scrollTop - clientHeight < 1000 && !isLoading && !isFetchingNextPage) {
                if (pagination.current_page < pagination.last_page) {
                    fetchList(pagination.current_page + 1, true);
                }
            }
        };

        container.addEventListener('scroll', handleScroll);
        // Important: Re-attach when viewMode changes as the ref might move to a different element
        return () => container.removeEventListener('scroll', handleScroll);
    }, [pagination, isLoading, isFetchingNextPage, fetchList, viewMode]);

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
            isLoading: isFetchingNextPage // Pass loading state to table for overlay
        };
        if (viewMode === 'table_legacy') return <InventoryLegacyTable {...props} />;
        if (viewMode === 'table_v2') return <InventoryVirtualizedTable {...props} />;
        if (viewMode === 'table') return <InventoryDenseTable {...props} />;
        if (viewMode === 'compact') return <InventoryCompactList {...props} />;
        return <div className="space-y-4">{data.map((item, idx) => <InventoryDetailCard key={idx} item={item} onSelectCode={openDetail} />)}</div>;
    };

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between sticky top-0 z-10 shadow-sm gap-4">
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

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl">
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
                                className={`p-2 rounded-lg transition-all ${viewMode === v.id ? 'bg-white shadow-sm text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                                title={v.title}
                            >
                                <UI.Icon path={v.icon} className="w-4 h-4" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {mode === 'list' ? (
                    <>
                        <div className="bg-white px-6 py-4 border-b border-gray-100 flex flex-col gap-4">
                            {/* Source Picker */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn:</span>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
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
                                            className={`px-4 py-1 text-[11px] font-bold rounded-lg transition-all ${sourceType === s.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-4 text-[11px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-widest">TỔNG CỘNG:</span>
                                    <span className="text-blue-600">{pagination.total} <span className="text-slate-400">sản phẩm</span></span>
                                    {pagination.current_page < pagination.last_page && (
                                        <>
                                            <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                            <button
                                                onClick={() => fetchList(pagination.current_page + 1, true)}
                                                disabled={isLoading || isFetchingNextPage}
                                                className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isFetchingNextPage ? <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <UI.Icon path="M12 4.5v15m7.5-7.5h-15" className="w-3 h-3" />}
                                                TẢI THÊM
                                            </button>
                                        </>
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

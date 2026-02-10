// src/pages/EcountProductManager.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ecountApi } from '../../api/admin/ecountApi';
import { standardizationApi } from '../../api/admin/standardizationApi';
import { metaApi } from '../../api/admin/metaApi';
import ProductMobileDetail from '../../archive/components/ProductMobileDetail.jsx';
import * as UI from '../../components/ui.jsx';
import { mapEcountToQvc } from '../../utils/ecountMapper';
import toast from 'react-hot-toast';

const SYSTEM_COLOR = "indigo"; // Theme chính cho ECount

// Bảng ánh xạ mã Ecount sang ID hệ thống QVC (Dữ liệu Master QVC)
// Bảng ánh xạ mã Ecount sang ID hệ thống QVC (Dữ liệu Master QVC)
// Đã chuyển sang utils/ecountMapper.js để dùng chung

const RawDataModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-white/10 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#252526]">
                    <div>
                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Neural ECount Master Frame</h3>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">SKU Hash: {data.product?.prod_cd || 'N/A'}</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
                        <UI.Icon name="plus" className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                    <pre className="text-emerald-400 font-mono text-xs leading-relaxed selection:bg-emerald-500/20">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
                <div className="p-6 border-t border-white/5 bg-[#252526] flex justify-end">
                    <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest">Close Inspector</button>
                </div>
            </div>
        </div>
    );
};

export const EcountProductManager = ({ setAppTitle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [], suppliers: [] });
    const [webDictionary, setWebDictionary] = useState({ brands: [], categories: [] });

    // Filters
    const [search, setSearch] = useState('');
    const [localFilters, setLocalFilters] = useState({
        brand: '',
        category: '',
        supplier: '',
        has_stock: false,
        filter_status: '', // '', 'linked', 'unlinked', 'conflict'
        sort_by: '',
        sort_dir: ''
    });

    const [showFilters, setShowFilters] = useState(false);
    const [viewingDetail, setViewingDetail] = useState(null); // Detailed product data
    const [viewingRawData, setViewingRawData] = useState(null);
    const [creatingEntity, setCreatingEntity] = useState(null); // Data for product to be created
    const [editingWebProductId, setEditingWebProductId] = useState(null); // ID of web product to edit
    const [isCreatingWeb, setIsCreatingWeb] = useState(null); // ID of product being synced
    const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'compact'

    const sanitizeUrl = (url) => url?.replace('http://', 'https://');

    useEffect(() => {
        setAppTitle('📦 Quản lý Kho ECount (Master)');
    }, [setAppTitle]);

    // Lấy Filter Options ban đầu & Web Dictionary đẻ mapping
    const fetchFilters = useCallback(async () => {
        try {
            const res = await ecountApi.getFilterOptions();
            const raw = res.data || {};

            setFilterOptions({
                brands: Array.isArray(raw.brands) ? raw.brands : [],
                categories: Array.isArray(raw.categories) ? raw.categories : [],
                suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : []
            });
        } catch (e) {
            console.error("Lỗi nạp bộ lọc ECount:", e);
        }
    }, []);

    const fetchWebDict = useCallback(async () => {
        try {
            const [brandRes, catRes] = await Promise.all([
                metaApi.getBrands(),
                metaApi.getCategoriesMinimal()
            ]);
            setWebDictionary({
                brands: Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data?.data || []),
                categories: Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || [])
            });
        } catch (e) {
            console.error("Lỗi nạp danh mục/thương hiệu Web:", e);
        }
    }, []);

    useEffect(() => {
        fetchFilters();
        fetchWebDict();
    }, [fetchFilters, fetchWebDict]);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                search: search || undefined,
                brand: localFilters.brand || undefined,
                category: localFilters.category || undefined,
                supplier: localFilters.supplier || undefined,
                has_stock: localFilters.has_stock ? 1 : undefined,
                filter_status: localFilters.filter_status || undefined,
                sort_by: localFilters.sort_by || undefined,
                sort_dir: localFilters.sort_dir || undefined,
                per_page: 30
            };
            const res = await ecountApi.getProducts(params);
            setProducts(res.data.data || []);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total
            });
        } catch (error) {
            toast.error("Không thể tải dữ liệu ECount");
        } finally {
            setLoading(false);
        }
    }, [search, localFilters]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const handleShowDetail = async (prodCd) => {
        setLoading(true);
        try {
            const res = await ecountApi.showProduct(prodCd);
            setViewingDetail(res.data);
        } catch (e) {
            toast.error("Lỗi lấy chi tiết sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateToWeb = async (ecountCode, existingData = null) => {
        if (!webDictionary) {
            toast.error("Đang tải dữ liệu danh mục...");
            return;
        }

        setIsCreatingWeb(ecountCode);
        const tid = toast.loading("Đang chuẩn bị dữ liệu...");
        try {
            // 1. Get Ecount Info
            // 1. Get Ecount Info
            let ecountData = existingData;
            if (!ecountData) {
                // Try from viewingDetail
                if (viewingDetail && viewingDetail.product.prod_cd === ecountCode) {
                    ecountData = viewingDetail.product;
                } else {
                    // Fetch fresh if not found
                    console.log("[DEBUG] Fetching Ecount Data for code:", ecountCode);
                    const res = await ecountApi.showProduct(ecountCode);
                    ecountData = res.data.product || res.data;
                }
            }

            if (!ecountData) throw new Error("Không tìm thấy dữ liệu nguồn");

            console.log("[DEBUG] Raw Ecount Data:", ecountData);
            const mappedData = mapEcountToQvc(ecountData, webDictionary);
            console.log("[DEBUG] Mapped QVC Data:", mappedData);

            // Navigate to separate route
            navigate('/product-edit/new', {
                state: {
                    product: mappedData,
                    dictionary: webDictionary,
                    returnUrl: location.pathname
                }
            });

            toast.dismiss(tid);
            setViewingDetail(null); // Close detail modal
        } catch (e) {
            toast.error("Lỗi: " + e.message, { id: tid });
        } finally {
            setIsCreatingWeb(null);
        }
    };

    const handleEditWebProduct = (id) => {
        setEditingWebProductId(id);
        if (viewingDetail) setViewingDetail(null);
    };

    const renderDetailedView = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Master Identity</th>
                        <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Web Status</th>
                        <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Inventory</th>
                        <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Price Recap</th>
                        <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {products.map(item => (
                        <tr key={item.id} className="hover:bg-indigo-50/20 group transition-all duration-300 border-b border-slate-50">
                            <td className="p-8">
                                <div className="flex items-center gap-8">
                                    {item.qvc_link?.image ? (
                                        <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm flex items-center justify-center shrink-0">
                                            <img src={sanitizeUrl(item.qvc_link.image)} className="w-full h-full object-contain" alt="" />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                                            <UI.Icon name="image" className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-base font-black text-slate-800 group-hover:text-indigo-600 cursor-pointer leading-tight transition-colors" onClick={() => handleShowDetail(item.prod_cd)}>
                                            {item.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-[10px] px-2.5 py-1 bg-slate-900 text-white rounded-lg font-black tracking-widest uppercase">{item.prod_cd}</code>
                                            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">{item.unit || 'cái'}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8">
                                {item.qvc_link?.is_linked ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all`}
                                                onClick={() => handleEditWebProduct(item.qvc_link.id)}
                                                title="Quản lý trên QVC"
                                            >
                                                <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${item.qvc_link.sync_status?.startsWith('conflict') ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'}`}></div>
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${item.qvc_link.sync_status?.startsWith('conflict') ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {item.qvc_link.sync_status === 'conflict_url_mismatch' ? 'SAI URL WEB' :
                                                        item.qvc_link.sync_status === 'conflict_sku_taken' ? 'TRÙNG SKU KHÁC' :
                                                            item.qvc_link.sync_status === 'conflict_price' ? 'SAI GIÁ WEB' :
                                                                item.qvc_link.sync_status === 'conflict_stock' ? 'LỆCH TỒN KHO' :
                                                                    'ĐÃ LIÊN KẾT WEB'}
                                                </span>
                                            </div>
                                            {item.qvc_link.url && (
                                                <a
                                                    href={`https://qvc.vn${item.qvc_link.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Xem trực tiếp trên Web"
                                                >
                                                    <UI.Icon name="globe" className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-fit flex items-center gap-2">
                                            WEB ID: <span className="text-slate-900">#{item.qvc_link.id}</span>
                                            <button
                                                onClick={() => handleEditWebProduct(item.qvc_link.id)}
                                                className="p-1 hover:bg-white hover:text-indigo-600 rounded-md transition-all border border-transparent hover:border-slate-200"
                                                title="Xem/Sửa trên Web"
                                            >
                                                <UI.Icon name="edit" className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {!item.qvc_link.status && (
                                            <span className="text-[9px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-1 rounded-lg w-fit border border-rose-100">Đang ẩn</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">NOT ON WEB</span>
                                    </div>
                                )}
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex flex-col">
                                    <span className={`text-xl font-black ${parseFloat(item.stock) > 0 ? (item.qvc_link?.sync_status === 'conflict_stock' ? 'text-amber-500' : 'text-indigo-600') : 'text-rose-400'}`}>
                                        {parseFloat(item.stock).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ECount Stock</span>
                                    {item.qvc_link?.sync_status === 'conflict_stock' && (
                                        <div className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-100">
                                            Web: {item.quantities?.web?.toLocaleString() || 0}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-end gap-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EC Master:</span>
                                        <span className="text-sm font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(item.prices?.ecount || 0)}đ</span>
                                    </div>
                                    {item.qvc_link?.is_linked && (
                                        <div className={`flex items-center justify-end gap-3 px-3 py-1.5 rounded-xl border ${item.qvc_link?.sync_status === 'conflict_price' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WEB Current:</span>
                                            <span className={`text-sm font-black ${item.qvc_link?.sync_status === 'conflict_price' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {item.prices?.web > 0 ? new Intl.NumberFormat('vi-VN').format(item.prices.web) + 'đ' : '---'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleShowDetail(item.prod_cd)} title="Xem chi tiết Master" className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                        <UI.Icon name="eye" className="w-4 h-4" />
                                    </button>
                                    {item.qvc_link?.is_linked && (
                                        <a href={item.qvc_link.url} target="_blank" rel="noreferrer" title="Mở trên Website" className="p-3 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                                            <UI.Icon name="globe" className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button onClick={async () => {
                                        const res = await ecountApi.showProduct(item.prod_cd);
                                        setViewingRawData(res.data);
                                    }} title="Xem Raw JSON" className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all">
                                        <UI.Icon name="file-text" className="w-4 h-4" />
                                    </button>
                                    {!item.qvc_link?.is_linked ? (
                                        <button
                                            onClick={() => handleCreateToWeb(item.prod_cd)}
                                            disabled={isCreatingWeb === item.prod_cd}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
                                                ${isCreatingWeb === item.prod_cd ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95'}`}
                                        >
                                            {isCreatingWeb === item.prod_cd ? 'Đang khởi tạo...' : 'KHỞI TẠO TRÊN WEBSITE'}
                                        </button>
                                    ) : (
                                        <div className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                                            <UI.Icon name="check" className="w-3.5 h-3.5" /> ĐÃ ĐỒNG BỘ
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCompactView = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID/Identity</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stock</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {products.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 group transition-all">
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                    {item.qvc_link?.image && (
                                        <img src={sanitizeUrl(item.qvc_link.image)} className="w-8 h-8 rounded-lg object-contain border border-slate-100 p-0.5" alt="" />
                                    )}
                                    <div className="flex flex-col">
                                        <span onClick={() => handleShowDetail(item.prod_cd)} className="text-[11px] font-black text-slate-800 hover:text-indigo-600 cursor-pointer line-clamp-1">{item.name}</span>
                                        <code className="text-[9px] text-slate-400 font-mono tracking-tighter">#{item.prod_cd}</code>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-3">
                                {item.qvc_link?.is_linked ? (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-2 h-2 rounded-full ${item.qvc_link.sync_status?.startsWith('conflict') ? 'bg-rose-500' : 'bg-emerald-500'} cursor-pointer`}
                                            onClick={() => handleEditWebProduct(item.qvc_link.id)}
                                            title="Sửa trên QVC"
                                        ></div>
                                        {item.qvc_link.url && (
                                            <a href={`https://qvc.vn${item.qvc_link.url}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">
                                                <UI.Icon name="globe" className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-black text-slate-300 uppercase">OFFLINE</span>
                                )}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <span className={`text-xs font-black ${parseFloat(item.stock) > 0 ? (item.qvc_link?.sync_status === 'conflict_stock' ? 'text-amber-500' : 'text-indigo-600') : 'text-rose-400'}`}>
                                    {Math.floor(parseFloat(item.stock))}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <span className={`text-xs font-black ${item.qvc_link?.sync_status === 'conflict_price' ? 'text-amber-600' : 'text-slate-900'}`}>{new Intl.NumberFormat('vi-VN').format(item.prices?.ecount || 0)}đ</span>
                            </td>
                            <td className="px-6 py-3">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleShowDetail(item.prod_cd)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all">
                                        <UI.Icon name="eye" className="w-3.5 h-3.5" />
                                    </button>
                                    {!item.qvc_link?.is_linked ? (
                                        <button onClick={() => handleCreateToWeb(item.prod_cd)} className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-tighter">Link</button>
                                    ) : (
                                        <button onClick={() => handleEditWebProduct(item.qvc_link.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-all">
                                            <UI.Icon name="edit" className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* TOP BAR PREMIUM */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-40 relative gap-8">
                <div className="flex items-center gap-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-[1.2rem] transition-all shadow-sm ${showFilters ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                            <UI.Icon name="sliders" className="w-5 h-5" />
                        </button>

                        {/* View Switcher Quick Link */}
                        <div className="flex bg-slate-50 p-1 rounded-xl items-center border border-slate-100">
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'detailed' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <UI.Icon name="layout" className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <UI.Icon name="list" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-[1.4rem] flex items-center justify-center text-white shadow-lg shadow-indigo-100 overflow-hidden relative group">
                            <UI.Icon name="package" className="w-7 h-7 relative z-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">QUẢN LÝ KHO MASTER</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">TRUNG TÂM DỮ LIỆU ECOUND</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK QUICK FILTERS ON HEADER AREA */}
                <div className="flex-1 hidden xl:flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <div className="h-8 w-px bg-slate-100 mx-1"></div>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: '' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2
                            ${localFilters.filter_status === '' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'linked' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 flex items-center gap-1.5
                            ${localFilters.filter_status === 'linked' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        <div className={`w-1 h-1 rounded-full ${localFilters.filter_status === 'linked' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        Đã khớp
                    </button>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'unlinked' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2
                            ${localFilters.filter_status === 'unlinked' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        Chưa khớp
                    </button>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 flex items-center gap-1.5
                            ${localFilters.filter_status === 'conflict' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        <UI.Icon name="alert-triangle" className="w-3 h-3" />
                        URL
                    </button>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict_price' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 flex items-center gap-1.5
                            ${localFilters.filter_status === 'conflict_price' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        <UI.Icon name="dollar-sign" className="w-3 h-3" />
                        Sai Giá
                    </button>
                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict_stock' }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 flex items-center gap-1.5
                            ${localFilters.filter_status === 'conflict_stock' ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        <UI.Icon name="package" className="w-3 h-3" />
                        Lệch Kho
                    </button>

                    <div className="h-6 w-px bg-slate-100 mx-1"></div>

                    <div className="flex items-center gap-2">
                        <select className="bg-slate-50/50 border-transparent rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50 max-w-[120px]"
                            value={localFilters.brand} onChange={e => setLocalFilters(f => ({ ...f, brand: e.target.value }))}>
                            <option value="">Thương hiệu</option>
                            {filterOptions.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                        <select className="bg-slate-50/50 border-transparent rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50 max-w-[120px]"
                            value={localFilters.category} onChange={e => setLocalFilters(f => ({ ...f, category: e.target.value }))}>
                            <option value="">Danh mục</option>
                            {filterOptions.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="h-6 w-px bg-slate-100 mx-1"></div>

                    <button
                        onClick={() => setLocalFilters(f => ({ ...f, has_stock: !f.has_stock }))}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 flex items-center gap-1.5
                            ${localFilters.has_stock ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                    >
                        <UI.Icon name="package" className="w-3 h-3" />
                        Còn kho
                    </button>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative group">
                        <UI.Input
                            placeholder="Mã SP, Barcode..."
                            className="w-[200px] bg-slate-100/50 border-transparent rounded-xl pl-10 py-2.5 text-[11px] font-bold focus:bg-white focus:ring-4 ring-indigo-50 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchData(1)}
                        />
                        <UI.Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <button onClick={() => fetchData(1)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:translate-y-[-1px] active:translate-y-0 transition-all">
                        TRUY XUẤT
                    </button>
                </div>
            </div>

            {/* MOBILE QUICK FILTERS SCROLLABLE */}
            <div className="xl:hidden bg-white border-b border-slate-100 px-6 py-3 overflow-x-auto no-scrollbar flex items-center gap-3">
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: '' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === '' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'linked' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === 'linked' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Đã Khớp
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'unlinked' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === 'unlinked' ? 'bg-amber-600 border-amber-200 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Chưa Khớp
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === 'conflict' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    URL
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict_price' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === 'conflict_price' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Sai Giá
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, filter_status: 'conflict_stock' }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.filter_status === 'conflict_stock' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Lệch Kho
                </button>
                <button
                    onClick={() => setLocalFilters(f => ({ ...f, has_stock: !f.has_stock }))}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all
                        ${localFilters.has_stock ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                    Còn Kho
                </button>
            </div>

            {/* HORIZONTAL FILTER PANEL */}
            <div className={`bg-white border-b border-slate-100 overflow-hidden transition-all duration-500 shadow-sm ${showFilters ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-4 gap-8">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Thương hiệu / Brand</label>
                            <select className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50"
                                value={localFilters.brand} onChange={e => setLocalFilters(f => ({ ...f, brand: e.target.value }))}>
                                <option value="">Tất cả Thương hiệu</option>
                                {filterOptions.brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Danh mục Master</label>
                            <select className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50"
                                value={localFilters.category} onChange={e => setLocalFilters(f => ({ ...f, category: e.target.value }))}>
                                <option value="">Tất cả Category</option>
                                {filterOptions.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Nhà cung cấp / Cust</label>
                            <select className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50"
                                value={localFilters.supplier} onChange={e => setLocalFilters(f => ({ ...f, supplier: e.target.value }))}>
                                <option value="">Tất cả Nhà cung cấp</option>
                                {filterOptions.suppliers.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Sắp xếp theo</label>
                            <div className="flex gap-2">
                                <select className="flex-1 bg-slate-50 border-transparent rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50"
                                    value={localFilters.sort_by} onChange={e => setLocalFilters(f => ({ ...f, sort_by: e.target.value }))}>
                                    <option value="">Mặc định</option>
                                    <option value="prod_cd">Mã SP</option>
                                    <option value="name">Tên SP</option>
                                    <option value="out_price">Giá bán</option>
                                    <option value="stock">Tồn kho</option>
                                </select>
                                <select className="w-24 bg-slate-50 border-transparent rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-50"
                                    value={localFilters.sort_dir} onChange={e => setLocalFilters(f => ({ ...f, sort_dir: e.target.value }))}>
                                    <option value="">---</option>
                                    <option value="asc">Tăng</option>
                                    <option value="desc">Giảm</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLocalFilters(f => ({ ...f, has_stock: !f.has_stock }))}
                                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${localFilters.has_stock ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${localFilters.has_stock ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hiển thị SP còn tồn kho</span>
                        </div>
                        <button onClick={() => { setLocalFilters({ brand: '', category: '', supplier: '', has_stock: false, filter_status: '', sort_by: '', sort_dir: '' }); setSearch(''); }} className="px-6 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all ml-auto">
                            Xóa tất cả bộ lọc
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-auto p-8 relative space-y-6 custom-scrollbar bg-slate-50">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center animate-in fade-in duration-300">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Nạp dữ liệu từ ECount...</span>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Mini Cards */}
                    <div className="grid grid-cols-4 gap-6 mb-2">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tổng số thực thể</span>
                            <span className="text-2xl font-black text-slate-900">{pagination.total?.toLocaleString()} <small className="text-[10px] text-slate-400">Items</small></span>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Đang nạp từ Page</span>
                            <span className="text-2xl font-black text-slate-900">{pagination.current_page} <small className="text-[10px] text-slate-400">/ {pagination.last_page}</small></span>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                        <div className="p-8">
                            {products.length > 0 ? (
                                viewMode === 'compact' ? renderCompactView() : renderDetailedView()
                            ) : (
                                <div className="py-40 flex flex-col items-center justify-center gap-6">
                                    <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                        <UI.Icon name="package" className="w-12 h-12" />
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu</span>
                                </div>
                            )}
                        </div>

                        {/* PAGINATION */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                KHO DỮ LIỆU: <span className="text-slate-900 font-black">{products.length} Sản phẩm đã tải</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={pagination.current_page === 1 || loading}
                                    onClick={() => fetchData(pagination.current_page - 1)}
                                    className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center hover:border-indigo-500 hover:text-indigo-600 transition-all disabled:opacity-30"
                                >
                                    <UI.Icon name="chevronLeft" className="w-5 h-5" />
                                </button>
                                <div className="h-12 px-8 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-[11px] tracking-widest shadow-xl shadow-indigo-100">
                                    TRANG {pagination.current_page} / {pagination.last_page}
                                </div>
                                <button
                                    disabled={pagination.current_page === pagination.last_page || loading}
                                    onClick={() => fetchData(pagination.current_page + 1)}
                                    className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center hover:border-indigo-500 hover:text-indigo-600 transition-all disabled:opacity-30"
                                >
                                    <UI.Icon name="chevronRight" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            {/* DETAIL MODAL */}
            {
                viewingDetail && (
                    <UI.Modal isOpen={!!viewingDetail} onClose={() => setViewingDetail(null)} title="🔍 Chi tiết Sản phẩm ECount Master" maxWidthClass="max-w-6xl">
                        <div className="flex flex-col bg-slate-50 min-h-[600px]">
                            {/* Summary Header */}
                            <div className="p-8 bg-white border-b border-slate-100 flex items-start gap-8">
                                <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 shadow-inner overflow-hidden">
                                    {viewingDetail.qvc_link?.image ? (
                                        <img src={viewingDetail.qvc_link.image} className="w-full h-full object-contain" alt="" />
                                    ) : (
                                        <UI.Icon name="package" className="w-12 h-12" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest font-mono">#{viewingDetail.product.prod_cd}</span>
                                            {viewingDetail.metadata?.is_service && <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">DỊCH VỤ / MASTER</span>}
                                            {viewingDetail.qvc_link?.is_linked ? (
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`px-3 py-1 text-white text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all ${viewingDetail.qvc_link.sync_status?.startsWith('conflict') ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                        onClick={() => handleEditWebProduct(viewingDetail.qvc_link.id)}
                                                        title="Chỉnh sửa chi tiết trên QVC"
                                                    >
                                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                                        {viewingDetail.qvc_link.sync_status === 'conflict_url_mismatch' ? 'XUNG ĐỘT URL' :
                                                            viewingDetail.qvc_link.sync_status === 'conflict_sku_taken' ? 'XUNG ĐỘT SKU' :
                                                                viewingDetail.qvc_link.sync_status === 'conflict_price' ? 'SAI GIÁ WEB' :
                                                                    viewingDetail.qvc_link.sync_status === 'conflict_stock' ? 'LỆCH TỒN KHO' :
                                                                        'ĐÃ LIÊN KẾT WEB'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleEditWebProduct(viewingDetail.qvc_link.id)}
                                                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-lg transition-all shadow-sm"
                                                            title="Chỉnh sửa nhanh QVC"
                                                        >
                                                            <UI.Icon name="edit" className="w-3.5 h-3.5" />
                                                        </button>
                                                        {viewingDetail.qvc_link.url && (
                                                            <a
                                                                href={`https://qvc.vn${viewingDetail.qvc_link.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-lg transition-all shadow-sm"
                                                                title="Xem trực tiếp trên Web"
                                                            >
                                                                <UI.Icon name="globe" className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="px-3 py-1 bg-slate-200 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">CHƯA LIÊN KẾT</span>
                                            )}
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter ml-auto">Barcode: {viewingDetail.product.bar_code || '---'}</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{viewingDetail.product.name}</h2>
                                        {viewingDetail.qvc_link?.is_linked && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Liên kết Website:</span>
                                                <a href={viewingDetail.qvc_link.url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-600 hover:underline">{viewingDetail.qvc_link.name}</a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-6">
                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cơ bản</span>
                                            <span className="text-sm font-black text-slate-700">{viewingDetail.product.unit || 'Cái'} / {viewingDetail.product.prod_type === '3' ? 'Hàng hóa' : 'Dịch vụ'}</span>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Classification</span>
                                            <span className="text-xs font-black text-slate-900 line-clamp-1">{viewingDetail.product.class_cd} • {viewingDetail.product.class_cd2} • {viewingDetail.product.class_cd3}</span>
                                        </div>
                                        <div className="p-4 bg-indigo-50 rounded-2xl">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Giá nhập System</span>
                                            <span className="text-sm font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(viewingDetail.product.in_price || 0)}đ</span>
                                        </div>
                                        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                                            <span className="text-[9px] font-black text-indigo-200 uppercase block mb-1 text-center">Giá bán Niêm yết</span>
                                            <div className="text-center font-black text-lg leading-none mt-1">{new Intl.NumberFormat('vi-VN').format(viewingDetail.product.out_price || 0)}đ</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-12 gap-8">
                                {/* Inventory Breakdown */}
                                <div className="col-span-8 space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                                            Ma trận tồn kho theo chi nhánh (Warehouse Breakdown)
                                        </h4>
                                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase">Mã Kho</th>
                                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase">Tên Chi Nhánh / Vị Trí</th>
                                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase text-right">Tồn thực tế</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {viewingDetail.inventory && viewingDetail.inventory.length > 0 ? viewingDetail.inventory.map((inv, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-5">
                                                                <span className="text-[10px] font-black font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{inv.wh_cd}</span>
                                                            </td>
                                                            <td className="p-5">
                                                                <span className="text-xs font-bold text-slate-700">{inv.wh_des || 'Location ' + inv.wh_cd}</span>
                                                            </td>
                                                            <td className="p-5 text-right">
                                                                <span className={`text-sm font-black ${parseFloat(inv.bal_qty) > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                                                    {parseFloat(inv.bal_qty).toLocaleString()} <small className="text-[10px]">{viewingDetail.product.unit}</small>
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="3" className="p-10 text-center">
                                                                <UI.Icon name="activity" className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Không tìm thấy dữ liệu tồn kho đồng bộ</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="bg-indigo-600 text-white">
                                                        <td colSpan="2" className="p-5 font-black text-[10px] uppercase tracking-widest">TỔNG CỘNG HỆ THỐNG ECOUND</td>
                                                        <td className="p-5 text-right">
                                                            <span className="text-base font-black">
                                                                {viewingDetail.total_stock.toLocaleString()} {viewingDetail.product.unit}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Pricing Strategy Grid */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <UI.Icon name="sliders" className="w-4 h-4" /> Ma trận Chiến lược Giá (10 Mức giá)
                                        </h4>
                                        <div className="grid grid-cols-5 gap-3">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                                                const priceKey = `out_price${level}`;
                                                const val = viewingDetail.product[priceKey];
                                                return (
                                                    <div key={level} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Mức giá {level}</span>
                                                        <span className={`text-[11px] font-black ${val > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                                            {val > 0 ? new Intl.NumberFormat('vi-VN').format(val) + 'đ' : '---'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Supplementary Metadata */}
                                <div className="col-span-4 space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin Master ECount</h4>
                                    <div className="space-y-6">
                                        <div className="p-6 bg-white rounded-3xl border border-slate-100 space-y-5 shadow-sm">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase">Nhà cung cấp / Supplier Master</span>
                                                <div className="text-xs font-black text-slate-800">{viewingDetail.product.cust || 'CHƯA KHAI BÁO NCC'}</div>
                                            </div>
                                            <div className="w-full h-[1px] bg-slate-50"></div>
                                            <div className="space-y-2">
                                                <span className="text-[8px] font-black text-slate-400 uppercase">Luồng dữ liệu bổ sung</span>
                                                <div className="space-y-2">
                                                    {viewingDetail.product.cont1 && <div className="text-[10px] font-bold text-indigo-600 underline line-clamp-1">{viewingDetail.product.cont1}</div>}
                                                    {['cont2', 'cont3', 'cont4'].map(k => viewingDetail.product[k] && (
                                                        <div key={k} className="flex items-center gap-2">
                                                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                            <span className="text-[10px] font-bold text-slate-500">{viewingDetail.product[k]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="w-full h-[1px] bg-slate-50"></div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-slate-400 uppercase">Đồng bộ cuối lúc</span>
                                                <span className="font-black text-emerald-500">{new Date(viewingDetail.product.last_synced_at).toLocaleString('vi-VN')}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {!viewingDetail.qvc_link?.is_linked ? (
                                                <button
                                                    onClick={() => handleCreateToWeb(viewingDetail.product.prod_cd)}
                                                    disabled={isCreatingWeb === viewingDetail.product.prod_cd}
                                                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                >
                                                    <UI.Icon name="globe" className="w-5 h-5" />
                                                    <span>KHỞI TẠO TRÊN WEBSITE</span>
                                                </button>
                                            ) : (
                                                <div className="w-full py-5 bg-emerald-50 text-emerald-600 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-emerald-100">
                                                    <UI.Icon name="check" className="w-5 h-5" />
                                                    <span>DỮ LIỆU ĐÃ KHỚP WEBSITE</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setViewingRawData(viewingDetail)}
                                                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <UI.Icon name="file-text" className="w-3.5 h-3.5" />
                                                XEM MASTER RAW JSON
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </UI.Modal>
                )
            }

            {
                viewingRawData && (
                    <RawDataModal
                        data={viewingRawData}
                        onClose={() => setViewingRawData(null)}
                    />
                )
            }


        </div >
    );
};

export default EcountProductManager;

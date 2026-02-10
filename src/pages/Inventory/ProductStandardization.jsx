// src/pages/ProductStandardization.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as UI from '../../components/ui.jsx';
import toast from 'react-hot-toast';
import { ProductDetailModal } from '../../components/Modals/ProductDetailModal.jsx';

const API_BASE = '/api/v2/v1/admin/standardization';

// Local Raw Data Modal for inspection
const RawDataModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-white/10 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#252526]">
                    <div>
                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Neural Data Packet Inspector</h3>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">Entity Hash: {data.id} • SKU: {data.sku || 'N/A'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-white/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center font-black"
                    >
                        <UI.Icon name="x" className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                    <pre className="text-emerald-400 font-mono text-xs leading-relaxed selection:bg-emerald-500/20">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
                <div className="p-6 border-t border-white/5 bg-[#252526] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Close Inspector
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProductStandardization = ({ setAppTitle }) => {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // '' or 'unmapped'
    const [conflictFilter, setConflictFilter] = useState(''); // '', 'price', 'stock', 'sku'
    const [confirmingId, setConfirmingId] = useState(null);

    // UI Modals
    const [viewingDetailId, setViewingDetailId] = useState(null);
    const [viewingRawData, setViewingRawData] = useState(null);

    useEffect(() => {
        setAppTitle('Đối soát Sản phẩm Đa kênh');
    }, [setAppTitle]);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(API_BASE, {
                params: {
                    page,
                    search,
                    status: statusFilter,
                    conflict: conflictFilter
                }
            });
            setProducts(response.data.data);
            setPagination(response.data.meta);
        } catch (error) {
            console.error('Error fetching standardization data:', error);
            toast.error('Không thể tải dữ liệu đối soát');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, conflictFilter]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const handleConfirmMapping = async (product) => {
        setConfirmingId(product.id);
        try {
            const payload = {
                qvc_web_id: product.id,
                master_sku: product.sku,
                ecount_code: product.ecount?.code,
                misa_code: product.misa_code || '',
            };

            const response = await axios.post(`${API_BASE}/map`, payload);
            if (response.data.success) {
                toast.success(response.data.message);
                setProducts(prev => prev.map(p =>
                    p.id === product.id
                        ? { ...p, status: { ...p.status, is_confirmed: true } }
                        : p
                ));
            }
        } catch (error) {
            console.error('Error confirming mapping:', error);
            toast.error(error.response?.data?.error || 'Lỗi khi chốt mapping');
        } finally {
            setConfirmingId(null);
        }
    };

    const getStatusBadge = (statusObj) => {
        if (statusObj.is_confirmed) {
            return <span className="px-2 py-1 rounded-full text-[10px] bg-green-100 text-green-800 font-black uppercase ring-1 ring-green-200">ĐÃ ĐỐI SOÁT</span>;
        }
        if (statusObj.is_linked) {
            return <span className="px-2 py-1 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black uppercase ring-1 ring-blue-200">ĐÃ LIÊN KẾT</span>;
        }
        if (!statusObj.on_web) {
            return <span className="px-2 py-1 rounded-full text-[10px] bg-slate-100 text-slate-400 font-black uppercase ring-1 ring-slate-200">OFF WEB</span>;
        }
        return <span className="px-2 py-1 rounded-full text-[10px] bg-amber-100 text-amber-800 font-black uppercase ring-1 ring-amber-200">CHỜ XỬ LÝ</span>;
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <UI.Icon name="sliders" className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Chuẩn hóa Dữ liệu Sản phẩm</h1>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                                System Sync Center <span className="w-1 h-1 bg-slate-300 rounded-full"></span> V3.0 Reconciler
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchData(pagination.current_page)}
                            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                        >
                            <UI.Icon name="activity" className="w-4 h-4 text-indigo-500" />
                            LÀM MỚI DỮ LIỆU
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/50 mb-8 flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[300px] group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-600 transition-colors">Tìm kiếm</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                <UI.Icon name="search" className="w-5 h-5" />
                            </div>
                            <input
                                placeholder="Nhập tên, SKU hoặc ID..."
                                className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-100/50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchData(1)}
                            />
                        </div>
                    </div>
                    <div className="w-48 group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-600 transition-colors">Mapping</label>
                        <select
                            className="w-full h-14 px-5 rounded-2xl bg-slate-100/50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-sm font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            <option value="unmapped">Chưa chốt</option>
                            <option value="confirmed">Đã chốt</option>
                        </select>
                    </div>
                    <div className="w-64 group">
                        <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-rose-600 transition-colors">Loại Xung đột</label>
                        <select
                            className="w-full h-14 px-5 rounded-2xl bg-rose-50/50 border-2 border-transparent focus:border-rose-500 focus:bg-white outline-none text-sm font-black text-rose-700 transition-all appearance-none cursor-pointer"
                            value={conflictFilter}
                            onChange={(e) => setConflictFilter(e.target.value)}
                        >
                            <option value="">Không lọc xung đột</option>
                            <option value="sku">⚠️ Xung đột Mã (SKU)</option>
                            <option value="price">💰 Xung đột Giá</option>
                            <option value="stock">📦 Xung đột Số lượng</option>
                        </select>
                    </div>
                    <button
                        onClick={() => fetchData(1)}
                        className="h-14 px-10 bg-indigo-600 rounded-2xl font-black text-xs text-white uppercase tracking-widest hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-indigo-100"
                    >
                        LỌC DỮ LIỆU
                    </button>
                </div>

                {/* Main Table Container */}
                <div className="bg-white/40 backdrop-blur-sm rounded-[3rem] shadow-2xl shadow-slate-300/20 border border-white overflow-hidden mb-20">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50/80 sticky top-0 z-40 backdrop-blur-md">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">Dữ liệu Website (QVC)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">Hệ thống ERP (ECount)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">Kế toán (MISA/Other)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100 text-center">Trạng thái</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {products.map((p) => {
                                const status = p.status || {};
                                const web = p.web || {};
                                const ec = p.ecount || null;
                                const conflicts = p.conflicts || { price: false, stock: false };
                                const isSkuConflict = ec && p.sku !== ec.code;

                                return (
                                    <tr key={p.id} className={`group hover:bg-white transition-all ${status.is_confirmed ? 'bg-emerald-50/20' : ''}`}>
                                        {/* QVC WEB COLUMN */}
                                        <td className="p-6 align-top max-w-sm">
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setViewingDetailId(p.sku || p.id)}
                                                    className="w-20 h-20 rounded-2xl bg-white border border-slate-100 overflow-hidden flex-shrink-0 shadow-sm relative group-hover:scale-105 transition-transform duration-300"
                                                >
                                                    {p.thumb ? (
                                                        <img src={p.thumb} alt={p.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                            <UI.Icon name="image" className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                    {status.on_web && (
                                                        <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></div>
                                                    )}
                                                </button>
                                                <div className="flex flex-col justify-center gap-1">
                                                    <span
                                                        onClick={() => setViewingDetailId(p.sku || p.id)}
                                                        className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    >
                                                        {p.name || 'Sản phẩm không tên'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative group/sku">
                                                            <code className={`text-[10px] px-2 py-0.5 rounded-lg font-mono font-black ${isSkuConflict ? 'bg-rose-500 text-white animate-pulse' : (p.sku ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500 animate-pulse')}`}>
                                                                {p.sku || 'MISSING SKU'}
                                                            </code>
                                                            {isSkuConflict && (
                                                                <div className="absolute bottom-full left-0 mb-2 invisible group-hover/sku:visible bg-rose-900 text-white text-[9px] font-bold p-3 rounded-xl shadow-2xl w-48 z-50">
                                                                    <div className="flex flex-col gap-1 text-left">
                                                                        <span className="uppercase opacity-70 underline">Lệch mã SKU:</span>
                                                                        <div className="flex justify-between"><span>WEB:</span><span className="font-mono">{p.sku}</span></div>
                                                                        <div className="flex justify-between"><span>ERP:</span><span className="font-mono">{ec.code}</span></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <a
                                                            href={`https://qvc.vn/index.php?route=product/product&product_id=${p.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-slate-300 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                                            title="Xem trên QVC website"
                                                        >
                                                            ID: {p.id}
                                                            <UI.Icon name="external-link" className="w-2.5 h-2.5" />
                                                        </a>
                                                    </div>
                                                    <div className="flex gap-3 mt-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Web:</span>
                                                            <span className="text-[10px] font-black text-slate-700">{new Intl.NumberFormat('vi-VN').format(web.price || 0)}đ</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tồn:</span>
                                                            <span className="text-[10px] font-black text-slate-700">{web.stock || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* ECOUNT COLUMN */}
                                        <td className="p-6 align-top">
                                            {ec ? (
                                                <div className={`p-4 rounded-[1.5rem] border-2 transition-all relative group/ec ${conflicts.price || conflicts.stock || isSkuConflict ? 'bg-rose-50 border-rose-100 shadow-lg shadow-rose-100' : 'bg-white border-slate-50 shadow-sm'}`}>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                                            <span className={`text-xs font-black font-mono tracking-tighter ${isSkuConflict ? 'text-rose-600' : 'text-indigo-600'}`}>{ec.code}</span>
                                                            {(conflicts.price || conflicts.stock) && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className={`flex justify-between items-center px-2 py-1 rounded-lg transition-colors relative ${conflicts.price ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-700'}`}>
                                                                <span className="text-[9px] font-black uppercase opacity-70">ERP Price</span>
                                                                <span className="text-[10px] font-black">{new Intl.NumberFormat('vi-VN').format(ec.price || 0)}đ</span>
                                                                {conflicts.price && (
                                                                    <div className="absolute left-full ml-2 top-0 invisible group-hover/ec:visible bg-slate-900 text-white text-[9px] font-bold p-3 rounded-xl shadow-2xl w-40 z-50">
                                                                        <div className="flex flex-col gap-1 text-left">
                                                                            <span className="uppercase opacity-70">Lệch giá:</span>
                                                                            <div className="flex justify-between"><span>WEB:</span><span>{new Intl.NumberFormat('vi-VN').format(web.price || 0)}đ</span></div>
                                                                            <div className="flex justify-between text-rose-400 font-black"><span>- {new Intl.NumberFormat('vi-VN').format(Math.abs(web.price - ec.price))}đ</span></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={`flex justify-between items-center px-2 py-1 rounded-lg transition-colors relative ${conflicts.stock ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-700'}`}>
                                                                <span className="text-[9px] font-black uppercase opacity-70">ERP Stock</span>
                                                                <span className="text-[10px] font-black">{parseFloat(ec.stock).toFixed(0)}</span>
                                                                {conflicts.stock && (
                                                                    <div className="absolute left-full ml-2 bottom-0 invisible group-hover/ec:visible bg-slate-900 text-white text-[9px] font-bold p-3 rounded-xl shadow-2xl w-40 z-50">
                                                                        <div className="flex flex-col gap-1 text-left">
                                                                            <span className="uppercase opacity-70">Lệch tồn:</span>
                                                                            <div className="flex justify-between"><span>WEB:</span><span>{web.stock}</span></div>
                                                                            <div className="flex justify-between text-rose-400 font-black"><span>- {Math.abs(web.stock - parseFloat(ec.stock))}</span></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-bold truncate italic tracking-tighter">
                                                            {ec.category_path}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center p-4 rounded-[1.5rem] border-2 border-dashed border-slate-100 bg-slate-50/30">
                                                    <UI.Icon name="activity" className="w-6 h-6 text-slate-200 mb-2" />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Chưa map ERP</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* OPTIONALHUB COLUMN */}
                                        <td className="p-6 align-top">
                                            <div className="h-full flex flex-col items-center justify-center p-4 rounded-[1.5rem] border-2 border-dashed border-slate-100 bg-slate-50/30 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <UI.Icon name="cloud-upload" className="w-6 h-6 text-slate-200 mb-2" />
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic text-center">MISA Sync Engine Offline</span>
                                            </div>
                                        </td>

                                        {/* PROTOCOL STATUS */}
                                        <td className="p-6 text-center align-middle">
                                            <div className="flex flex-col items-center gap-2">
                                                {getStatusBadge(status)}
                                                {(conflicts.price || conflicts.stock || isSkuConflict) && (
                                                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-[120px]">
                                                        {isSkuConflict && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black shadow-lg shadow-amber-200">ID CLASH</span>}
                                                        {conflicts.price && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black shadow-lg shadow-rose-200">PRICE</span>}
                                                        {conflicts.stock && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black shadow-lg shadow-rose-200">STOCK</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* COMMAND ACTIONS */}
                                        <td className="p-6 text-center align-middle px-8">
                                            <div className="flex flex-col gap-2">
                                                {status.is_confirmed ? (
                                                    <button disabled className="w-full h-11 rounded-xl bg-slate-50 text-slate-300 text-[10px] font-black uppercase cursor-not-allowed border border-slate-100">
                                                        SYSTEM LOCKED
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConfirmMapping(p)}
                                                        disabled={confirmingId === p.id || !ec}
                                                        className={`w-full h-11 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200
                                                            ${ec
                                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-0.5 active:translate-y-0'
                                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        {confirmingId === p.id ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <>
                                                                <UI.Icon name="save" className="w-4 h-4" />
                                                                CHỐT MÃ
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setViewingRawData(p)}
                                                    className="w-full h-9 rounded-xl border border-slate-200 text-slate-500 text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <UI.Icon name="eye" className="w-3.5 h-3.5" />
                                                    RECON RAW
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center sticky bottom-0 z-30">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            SCANNING <span className="text-indigo-600 font-black">{products.length}</span> / <span className="text-slate-900 font-black">{pagination.total}</span> MASTER ENTITIES
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={pagination.current_page === 1 || loading}
                                onClick={() => fetchData(pagination.current_page - 1)}
                                className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center hover:border-indigo-500 hover:text-indigo-600 transition-all disabled:opacity-30"
                            >
                                <UI.Icon name="chevronLeft" className="w-5 h-5" />
                            </button>
                            <div className="h-12 px-8 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-[11px] tracking-widest">
                                PAGE {pagination.current_page} OF {pagination.last_page}
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

            {/* NEURAL MODALS */}
            {viewingDetailId && (
                <ProductDetailModal
                    productIdentifier={viewingDetailId}
                    onClose={() => setViewingDetailId(null)}
                />
            )}

            {viewingRawData && (
                <RawDataModal
                    data={viewingRawData}
                    onClose={() => setViewingRawData(null)}
                />
            )}

            {/* Neural Loading System */}
            {loading && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center">
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <div className="w-20 h-20 border-8 border-slate-100 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <UI.Icon name="activity" className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 text-indigo-600" />
                        </div>
                        <div className="text-center space-y-1">
                            <span className="block font-black text-slate-800 text-xl uppercase tracking-tighter">Synchronizing Neural Field</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] block">Fetching cross-platform master data...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductStandardization;

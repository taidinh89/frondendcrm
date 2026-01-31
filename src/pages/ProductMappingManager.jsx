// x:\frontend\src\pages\ProductMappingManager.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { standardizationApi } from '../api/admin/standardizationApi';
import * as UI from '../components/ui.jsx';
import toast from 'react-hot-toast';

const DEFAULT_WAREHOUSES = [
    { id: '02', name: 'Kho Vinh (02)' },
    { id: '06', name: 'Kho Hà Nội (06)' },
    { id: '01', name: 'Kho Tổng (01)' },
    { id: '03', name: 'Kho HCM (03)' }
];

const PRICE_LEVELS = [
    { id: 'out_price', name: 'Giá Chuẩn (Standard)' },
    { id: 'out_price1', name: 'Giá 1' },
    { id: 'out_price2', name: 'Giá 2' },
    { id: 'out_price3', name: 'Giá 3' },
    { id: 'out_price4', name: 'Giá 4' },
    { id: 'out_price5', name: 'Giá 5 (Khuyến khích)' }
];

export const ProductMappingManager = ({ productId: propProductId, initialData: propInitialData, onClose, onRefresh }) => {
    const params = useParams();
    const productId = propProductId || params.id;

    const [activeTab, setActiveTab] = useState('product'); // 'product' | 'category'
    const [loading, setLoading] = useState(false);
    const [fetchingRecord, setFetchingRecord] = useState(false);

    // --- 1. PRODUCT MAPPING STATE ---
    const [mapping, setMapping] = useState({
        master_sku: '',
        ecount_code: '',
        misa_code: '',
        mapping_type: 'SKU',
        is_confirmed: true,
        is_active: true,
        internal_notes: '',
        sync_config: { warehouses: ['02', '06'], price_priority: ['out_price5', 'out_price'] }
    });

    // --- 2. CATEGORY RULES STATE ---
    const [categoryRules, setCategoryRules] = useState([]);
    const [editingRule, setEditingRule] = useState(null);

    // Fetch initial data for product mapping
    const fetchMappingData = useCallback(async () => {
        if (!productId) return;
        setFetchingRecord(true);
        try {
            const res = await standardizationApi.showMapping(productId);
            if (res.data) {
                const data = res.data;
                setMapping({
                    master_sku: data.master_sku || '',
                    ecount_code: data.ecount_code || '',
                    misa_code: data.misa_code || '',
                    mapping_type: data.mapping_type || 'SKU',
                    is_confirmed: !!data.is_confirmed,
                    is_active: !!data.is_active,
                    internal_notes: data.internal_notes || '',
                    sync_config: data.sync_config ? (typeof data.sync_config === 'string' ? JSON.parse(data.sync_config) : data.sync_config) : { warehouses: ['02', '06'], price_priority: ['out_price5', 'out_price'] }
                });
            }
        } catch (e) {
            console.warn("Chưa có bản ghi mapping cho sản phẩm này.");
        } finally {
            setFetchingRecord(false);
        }
    }, [productId]);

    const fetchCategoryRules = useCallback(async () => {
        try {
            const res = await standardizationApi.getCategoryRules();
            setCategoryRules(res.data || []);
        } catch (e) {
            toast.error("Không thể tải quy tắc danh mục");
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'product') fetchMappingData();
        if (activeTab === 'category') fetchCategoryRules();
    }, [activeTab, fetchMappingData, fetchCategoryRules]);

    // Handlers for Product Mapping
    const handleSaveMapping = async () => {
        if (!mapping.ecount_code) return toast.error("Vui lòng nhập mã Ecount");
        setLoading(true);
        try {
            await standardizationApi.updateFullMapping({
                qvc_web_id: productId,
                ...mapping
            });
            toast.success("Đã cập nhật Mapping toàn diện!");
            onRefresh && onRefresh();
            if (onClose) onClose();
        } catch (e) {
            toast.error("Lỗi khi cập nhật mapping");
        } finally {
            setLoading(false);
        }
    };

    // Handlers for Category Rules
    const handleSaveCategoryRule = async (ruleData) => {
        setLoading(true);
        try {
            await standardizationApi.updateCategoryRule(ruleData);
            toast.success("Đã lưu quy tắc danh mục!");
            setEditingRule(null);
            fetchCategoryRules();
        } catch (e) {
            toast.error("Lỗi khi lưu quy tắc");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategoryRule = async (id) => {
        if (!window.confirm("Xóa quy tắc này?")) return;
        try {
            await standardizationApi.deleteCategoryRule(id);
            toast.success("Đã xóa quy tắc");
            fetchCategoryRules();
        } catch (e) {
            toast.error("Lỗi khi xóa");
        }
    };

    return (
        <div className="flex flex-col gap-0 bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            {/* COMPACT TABS HEADER */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                    onClick={() => setActiveTab('product')}
                    className={`flex-1 py-6 px-8 flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'product' ? 'bg-white text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <UI.Icon name="package" className="w-4 h-4" /> Product Entity Master
                </button>
                <button
                    onClick={() => setActiveTab('category')}
                    className={`flex-1 py-6 px-8 flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'category' ? 'bg-white text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <UI.Icon name="layers" className="w-4 h-4" /> Category Logic Rules
                </button>
                {onClose && (
                    <button onClick={onClose} className="px-8 text-slate-300 hover:text-rose-500 transition-colors">
                        <UI.Icon name="x" className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className="p-10 overflow-y-auto max-h-[80vh] no-scrollbar">
                {fetchingRecord ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nạp dữ liệu bản ghi...</p>
                    </div>
                ) : activeTab === 'product' ? (
                    <div className="space-y-10">
                        {/* IDENTITIES GRID */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Core Identifiers
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">ECount Code (Prod_CD)</label>
                                        <UI.Input value={mapping.ecount_code} onChange={e => setMapping({ ...mapping, ecount_code: e.target.value, master_sku: e.target.value })} className="rounded-2xl bg-slate-50 border-slate-100 font-mono font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">MISA Code (Stock ID)</label>
                                        <UI.Input value={mapping.misa_code} onChange={e => setMapping({ ...mapping, misa_code: e.target.value })} className="rounded-2xl bg-slate-50 border-slate-100 font-mono font-black" />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase">Mapping Type</label>
                                            <select value={mapping.mapping_type} onChange={e => setMapping({ ...mapping, mapping_type: e.target.value })} className="w-full h-12 rounded-2xl bg-slate-50 border-slate-100 text-xs font-black px-4 outline-none">
                                                <option value="SKU">Mã SKU duy nhất</option>
                                                <option value="LINK">Liên kết mã cha</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 space-y-2 text-center">
                                            <label className="text-[9px] font-black text-slate-400 uppercase block">Active</label>
                                            <button onClick={() => setMapping({ ...mapping, is_active: !mapping.is_active })} className={`w-full h-12 rounded-2xl font-black text-[10px] uppercase transition-all ${mapping.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                {mapping.is_active ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Operational Notes
                                </h4>
                                <textarea
                                    className="w-full h-[180px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 text-sm font-medium focus:bg-white focus:border-indigo-600 transition-all outline-none"
                                    placeholder="Ghi chú nội bộ cho vận hành hoặc người quản lý tiếp theo..."
                                    value={mapping.internal_notes}
                                    onChange={e => setMapping({ ...mapping, internal_notes: e.target.value })}
                                />
                                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 border-dashed">
                                    <UI.Icon name="info" className="w-4 h-4 text-amber-600" />
                                    <span className="text-[10px] font-bold text-amber-700 uppercase">Chỉnh sửa sẽ được ghi vết bởi hệ thống quản trị.</span>
                                </div>
                            </div>
                        </div>

                        {/* CONFIG SYNC SECTION */}
                        <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-10">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Warehouse Aggregation</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {DEFAULT_WAREHOUSES.map(wh => (
                                        <button key={wh.id} onClick={() => {
                                            const newWhs = mapping.sync_config.warehouses.includes(wh.id)
                                                ? mapping.sync_config.warehouses.filter(i => i !== wh.id)
                                                : [...mapping.sync_config.warehouses, wh.id];
                                            setMapping({ ...mapping, sync_config: { ...mapping.sync_config, warehouses: newWhs } });
                                        }} className={`p-4 rounded-2xl border-2 font-black text-[10px] transition-all ${mapping.sync_config.warehouses.includes(wh.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            {wh.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Price Priority (Fallback)</label>
                                <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 space-y-2">
                                    {PRICE_LEVELS.map(lvl => (
                                        <button key={lvl.id} onClick={() => {
                                            const curr = mapping.sync_config.price_priority;
                                            const newP = curr.includes(lvl.id) ? curr.filter(i => i !== lvl.id) : [...curr, lvl.id];
                                            setMapping({ ...mapping, sync_config: { ...mapping.sync_config, price_priority: newP } });
                                        }} className={`w-full p-2.5 rounded-xl flex items-center justify-between text-[10px] font-bold transition-all ${mapping.sync_config.price_priority.includes(lvl.id) ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 grayscale'}`}>
                                            {lvl.name} {mapping.sync_config.price_priority.includes(lvl.id) && <span className="bg-indigo-600 text-white w-4 h-4 rounded flex items-center justify-center text-[8px]">{mapping.sync_config.price_priority.indexOf(lvl.id) + 1}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-10 border-t border-slate-100">
                            <UI.Button variant="primary" className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:scale-105 transition-all" onClick={handleSaveMapping} disabled={loading}>
                                {loading ? 'UPDATING...' : 'COMMIT FULL MAPPING RECORD'}
                            </UI.Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* CATEGORY RULES MASTER */}
                        <div className="flex justify-between items-center">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Category Mapping Rules</h4>
                            <UI.Button variant="primary" size="sm" onClick={() => setEditingRule({ ecount_class_cd: '', is_active: true })} className="rounded-xl px-6 py-3 font-black text-[10px] uppercase bg-indigo-600 outline-none border-0">Add New Rule</UI.Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {categoryRules.map(rule => (
                                <div key={rule.id} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-xl transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 font-black">CD</div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-black text-slate-800 uppercase">{rule.ecount_class_cd}</span>
                                                <UI.Icon name="arrow-right" className="w-3 h-3 text-slate-400" />
                                                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">QVC: {rule.qvc_cat_id || 'NULL'}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold italic">{rule.notes || "No rule descriptions."}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${rule.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                            {rule.is_active ? 'RUNNING' : 'PAUSED'}
                                        </span>
                                        <button onClick={() => setEditingRule(rule)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><UI.Icon name="edit-3" className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteCategoryRule(rule.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><UI.Icon name="trash-2" className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* RULE MODAL */}
            {editingRule && (
                <UI.Modal isOpen={!!editingRule} onClose={() => setEditingRule(null)} title="Rule Architect">
                    <div className="p-10 space-y-8 bg-white rounded-[3rem]">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Class CD (ERP)</label>
                                <UI.Input value={editingRule.ecount_class_cd} onChange={e => setEditingRule({ ...editingRule, ecount_class_cd: e.target.value })} className="rounded-xl bg-slate-50 font-black border-slate-100" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Class CD 2 (ERP Opt)</label>
                                <UI.Input value={editingRule.ecount_class_cd2 || ''} onChange={e => setEditingRule({ ...editingRule, ecount_class_cd2: e.target.value })} className="rounded-xl bg-slate-50 font-black border-slate-100" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Web Category ID (QVC)</label>
                                <UI.Input type="number" value={editingRule.qvc_cat_id || ''} onChange={e => setEditingRule({ ...editingRule, qvc_cat_id: e.target.value })} className="rounded-xl bg-slate-50 font-black border-slate-100" />
                            </div>
                            <div className="space-y-2 text-center">
                                <label className="text-[9px] font-black text-slate-400 uppercase block">Rule Status</label>
                                <button onClick={() => setEditingRule({ ...editingRule, is_active: !editingRule.is_active })} className={`w-full h-12 rounded-xl font-black text-[10px] uppercase transition-all ${editingRule.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {editingRule.is_active ? 'ENABLED' : 'DISABLED'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Operational Notes</label>
                            <UI.Input value={editingRule.notes || ''} onChange={e => setEditingRule({ ...editingRule, notes: e.target.value })} placeholder="Vd: Nhóm đồ gia dụng Kangaroo..." className="rounded-xl bg-slate-50 font-bold border-slate-100" />
                        </div>
                        <UI.Button variant="primary" className="w-full py-5 rounded-2xl bg-indigo-600 font-black uppercase text-xs" onClick={() => handleSaveCategoryRule(editingRule)} disabled={loading}>
                            Save Rule Definition
                        </UI.Button>
                    </div>
                </UI.Modal>
            )}
        </div>
    );
};

export default ProductMappingManager;

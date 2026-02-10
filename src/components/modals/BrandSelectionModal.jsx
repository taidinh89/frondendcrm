import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { metaApi } from '../../api/admin/metaApi';
import { Icon, Button, Modal } from '../ui';
import { ToggleSwitch, EditableField } from '../Product/ProductQvcComponents';
import { toast } from 'react-hot-toast';

const BrandSelectionModal = ({ isOpen, onClose, onSelect, selectedId }) => {
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit'
    const [isCompact, setIsCompact] = useState(true);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    // Edit Mode State
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [selectedBrandObj, setSelectedBrandObj] = useState(null);

    // Search Debounce Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                setPage(1);
                fetchBrands(1, true);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchBrands = async (targetPage = 1, isNewSearch = false) => {
        setIsLoading(true);
        try {
            const res = await metaApi.getBrandsV2({
                page: targetPage,
                search: search || undefined,
                mode: 'simple',
                per_page: 48 // Use a reasonable number for grid
            });

            const newData = res.data.data || res.data || [];
            const pagination = res.data.pagination || {};

            if (isNewSearch) {
                setBrands(newData);
            } else {
                setBrands(prev => [...prev, ...newData]);
            }

            setTotalItems(pagination.total_items || 0);
            setHasMore(pagination.current_page < pagination.total_pages);
            setPage(pagination.current_page);
        } catch (error) {
            toast.error("Không thể tải danh sách thương hiệu");
        } finally {
            setIsLoading(false);
        }
    };

    // Effect to maintain selectedBrandObj
    useEffect(() => {
        if (!selectedId) {
            setSelectedBrandObj(null);
            return;
        }

        // 1. Try to find in current list
        const found = brands.find(b => String(b.id) === String(selectedId));
        if (found) {
            setSelectedBrandObj(found);
        } else if (!selectedBrandObj || String(selectedBrandObj.id) !== String(selectedId)) {
            // 2. Fetch from API if not found and not already loaded
            metaApi.getBrandDetailV2(selectedId).then(res => {
                setSelectedBrandObj(res.data.data || res.data);
            }).catch(() => { });
        }
    }, [selectedId, brands, isOpen]);

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            fetchBrands(page + 1);
        }
    };

    // We use brands directly as it's now filtered via server-side search
    const filteredBrands = brands;

    const handleSelect = (brand) => {
        if (onSelect) {
            onSelect(brand);
            onClose();
        }
    };

    const handleEdit = (brand) => {
        setEditingItem(brand);
        setFormData({ ...brand });
        setViewMode('edit');
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Tên thương hiệu không được để trống");
            return;
        }
        setIsSaving(true);
        try {
            let res;
            if (editingItem.id) {
                // UPDATE V2
                res = await metaApi.updateBrandV2(editingItem.id, formData);
                setBrands(prev => prev.map(b => b.id === editingItem.id ? { ...b, ...formData } : b));
                toast.success("Cập nhật thành công");
            } else {
                // CREATE V2
                res = await metaApi.createBrandV2(formData);
                const newBrand = res.data.data || res.data;
                setBrands(prev => [newBrand, ...prev]);
                toast.success("Tạo mới thành công");
            }

            setViewMode('list');
            setEditingItem(null);
        } catch (error) {
            toast.error("Lỗi lưu trữ: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = () => {
        setEditingItem({ id: null });
        setFormData({ name: '', is_active: true, image: '', meta_description: '' });
        setViewMode('edit');
    };

    const handleDelete = async () => {
        if (!window.confirm(`Bạn có chắc muốn xóa thương hiệu "${editingItem.name}"?`)) return;
        setIsSaving(true);
        try {
            await metaApi.deleteBrandV2(editingItem.id);
            toast.success("Đã xóa thương hiệu");
            setBrands(prev => prev.filter(b => b.id !== editingItem.id));
            if (String(selectedId) === String(editingItem.id) && onSelect) onSelect(null);
            setViewMode('list');
            setEditingItem(null);
        } catch (error) {
            toast.error("Lỗi xóa: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isFullScreen={true}
            title={
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-100">
                        <Icon name="award" className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Brand Selector</div>
                        <h2 className="text-lg font-black text-gray-900 uppercase leading-none">
                            {viewMode === 'edit' ? (editingItem?.id ? `Chỉnh sửa: ${editingItem.name}` : 'Thêm thương hiệu mới') : 'Chọn Thương Hiệu'}
                        </h2>
                    </div>
                </div>
            }
            footer={
                <div className="w-full flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-xs uppercase hover:bg-gray-200">Đóng</button>
                    {viewMode === 'edit' && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase shadow-lg shadow-orange-200 disabled:opacity-50"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                        </button>
                    )}
                </div>
            }
        >
            <div className="h-full flex flex-col bg-[#f8fafc]">
                {viewMode === 'list' ? (
                    <>
                        {/* Header Controls */}
                        <div className="p-4 bg-white border-b sticky top-0 z-10 flex gap-3">
                            <div className="relative flex-1">
                                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-orange-500 rounded-2xl outline-none transition-all font-bold text-sm"
                                    placeholder="Tìm kiếm thương hiệu..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setIsCompact(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isCompact ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>
                                    <Icon name="list" className="w-4 h-4" /> Gọn
                                </button>
                                <button onClick={() => setIsCompact(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${!isCompact ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>
                                    <Icon name="image" className="w-4 h-4" /> Ảnh
                                </button>
                            </div>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-100 hover:scale-105 transition-all"
                            >
                                <Icon name="plus" className="w-4 h-4" /> Thêm Mới
                            </button>
                        </div>

                        {/* Content List */}
                        <div className="flex-1 overflow-y-auto p-4 content-start">
                            {isLoading ? (
                                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : (
                                <div className="space-y-6">
                                    {/* SELECTED ON TOP (Always show if exists) */}
                                    {selectedBrandObj && (
                                        <div className="mb-6 bg-indigo-50/50 p-4 rounded-[2rem] border-2 border-indigo-100 shadow-sm sticky top-0 z-[5]">
                                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex justify-between items-center">
                                                <span className="flex items-center gap-2">
                                                    <Icon name="check-circle" className="w-3.5 h-3.5" /> Thương hiệu đang chọn
                                                </span>
                                                <button
                                                    onClick={() => handleSelect(null)}
                                                    className="text-rose-500 hover:text-rose-700 bg-white px-3 py-1 rounded-lg border border-rose-100 transition-all text-[9px] font-black"
                                                >
                                                    GỠ BỎ
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-indigo-200">
                                                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2 shadow-inner border border-slate-50">
                                                    {selectedBrandObj.image ? (
                                                        <img src={selectedBrandObj.image} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Icon name="award" className="w-8 h-8 text-slate-200" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-base font-black text-slate-900 truncate uppercase">{selectedBrandObj.name}</div>
                                                    <div className="flex gap-4 mt-1">
                                                        <div className="text-[10px] text-indigo-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> SELECTED
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                            ID: {selectedBrandObj.id}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(selectedBrandObj)}
                                                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                        title="Chỉnh sửa thương hiệu này"
                                                    >
                                                        <Icon name="sliders" className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={onClose}
                                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-0.5 transition-all"
                                                    >
                                                        Giữ nguyên
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MAIN LIST */}
                                    {isCompact ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {filteredBrands.map(brand => {
                                                const isSel = String(brand.id) === String(selectedId);
                                                return (
                                                    <div
                                                        key={brand.id}
                                                        onClick={() => handleSelect(brand)}
                                                        className={`
                                                            flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md
                                                            ${isSel ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 hover:border-orange-200'}
                                                        `}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center p-1 ${isSel ? 'bg-white border border-gray-100' : 'bg-gray-50'}`}>
                                                            {brand.image ? <img src={brand.image} className="w-full h-full object-contain" /> : <Icon name="award" className="w-5 h-5 text-gray-300" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-bold truncate ${isSel ? 'text-orange-700' : 'text-gray-700'}`}>{brand.name}</div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(brand); }}
                                                            className="p-2 text-gray-300 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Icon name="sliders" className="w-3.5 h-3.5" />
                                                        </button>
                                                        {isSel && <Icon name="check" className="w-4 h-4 text-orange-500" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {/* Create New Placeholder */}
                                            <div
                                                onClick={handleCreate}
                                                className="aspect-square rounded-[2rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all group text-gray-400 hover:text-orange-500"
                                            >
                                                <Icon name="plus" className="w-8 h-8 opacity-50 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Thêm mới</span>
                                            </div>

                                            {filteredBrands.map(brand => {
                                                const isSelected = String(brand.id) === String(selectedId);
                                                return (
                                                    <div
                                                        key={brand.id}
                                                        onClick={() => handleSelect(brand)}
                                                        className={`
                                                            relative bg-white rounded-[2rem] p-4 shadow-sm border-2 cursor-pointer transition-all group flex flex-col items-center text-center gap-3
                                                            ${isSelected ? 'border-orange-500 ring-4 ring-orange-50' : 'border-transparent hover:border-gray-100 hover:shadow-md'}
                                                        `}
                                                    >
                                                        {/* Actions */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(brand); }}
                                                            className="absolute top-2 right-2 p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                                        >
                                                            <Icon name="sliders" className="w-3.5 h-3.5" />
                                                        </button>

                                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2">
                                                            {brand.image ? (
                                                                <img src={brand.image} className="w-full h-full object-contain mix-blend-multiply" alt={brand.name} />
                                                            ) : (
                                                                <Icon name="award" className="w-6 h-6 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="w-full">
                                                            <div className="text-xs font-black text-gray-800 uppercase truncate">{brand.name}</div>
                                                            <div className={`text-[9px] font-bold mt-1 ${brand.is_active ? 'text-green-500' : 'text-gray-400'}`}>
                                                                {brand.is_active ? 'Active' : 'Hidden'}
                                                            </div>
                                                        </div>

                                                        {isSelected && (
                                                            <div className="absolute top-2 left-2 bg-orange-500 text-white p-1 rounded-full shadow-lg">
                                                                <Icon name="check" className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Load More Button */}
                                    {hasMore && (
                                        <div className="flex justify-center pt-8 pb-12">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={isLoading}
                                                className="px-10 py-4 bg-white border-2 border-orange-200 text-orange-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {isLoading ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                ) : <Icon name="refresh" className="w-4 h-4" />}
                                                Xem thêm thương hiệu ({totalItems - brands.length} còn lại)
                                            </button>
                                        </div>
                                    )}

                                    {!isLoading && filteredBrands.length === 0 && (
                                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                            <Icon name="search" className="w-16 h-16" />
                                            <p className="font-black uppercase tracking-[0.2em] text-xs">Không tìm thấy thương hiệu nào</p>
                                            <button onClick={handleCreate} className="mt-2 text-orange-600 font-bold border-b border-orange-200">Bấm vào đây để tạo mới</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setViewMode('list')} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <Icon name="chevronLeft" className="w-4 h-4" /> Quay lại danh sách
                            </button>
                            {editingItem?.id && (
                                <button onClick={handleDelete} disabled={isSaving} className="text-red-400 hover:text-red-600 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                    <Icon name="trash" className="w-3.5 h-3.5" /> Xóa
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-32 h-32 rounded-[2rem] bg-gray-50 border-4 border-white shadow-inner flex items-center justify-center p-6">
                                    {formData.image ? <img src={formData.image} className="w-full h-full object-contain" /> : <Icon name="image" className="w-10 h-10 text-gray-300" />}
                                </div>
                            </div>

                            <EditableField label="Tên Thương hiệu" value={formData.name} onChange={v => setFormData(p => ({ ...p, name: v }))} hideOriginal />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</label>
                                    <ToggleSwitch checked={formData.is_active} onChange={v => setFormData(p => ({ ...p, is_active: v }))} label="Hiển thị" color="orange" />
                                </div>
                            </div>

                            <EditableField label="Mô tả SEO" type="textarea" value={formData.meta_description} onChange={v => setFormData(p => ({ ...p, meta_description: v }))} hideOriginal rows={3} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BrandSelectionModal;

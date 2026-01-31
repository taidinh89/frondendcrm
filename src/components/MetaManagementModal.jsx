import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { metaApi } from '../api/admin/metaApi';
import { Icon, Button, Modal } from './ui';
import { ToggleSwitch, EditableField } from './ProductQvcComponents';
import { toast } from 'react-hot-toast';

/**
 * MetaManagementModal - Unified Manager for Brands and Categories
 * Designed for use within Product Detail views.
 */
const MetaManagementModal = ({
    type = 'brand', // 'brand' | 'cat'
    isOpen,
    onClose,
    onSelect,
    currentValue
}) => {
    const isBrand = type === 'brand';
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table' | 'edit'
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});

    // Fetch data based on type
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            let res;
            if (isBrand) {
                // For selection, we might want all/compact but for management we want full data
                res = await metaApi.getBrands({ all: 1, search: search || undefined });
                setItems(res.data.data || res.data || []);
            } else {
                res = await metaApi.getCategoriesMinimal({ all: 1, search: search || undefined });
                // If it's categories, it might be a nested structure or flat
                setItems(res.data.data || res.data || []);
            }
        } catch (error) {
            toast.error(`Lỗi tải danh sách ${isBrand ? 'thương hiệu' : 'danh mục'}`);
        } finally {
            setIsLoading(false);
        }
    }, [isBrand, search]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Filter items locally if needed, or rely on API
    const filteredItems = useMemo(() => {
        if (!search) return items;
        const s = search.toLowerCase();
        return items.filter(item =>
            (item.name || '').toLowerCase().includes(s) ||
            (item.code || '').toLowerCase().includes(s)
        );
    }, [items, search]);

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ ...item });
        setViewMode('edit');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isBrand) {
                await metaApi.updateBrand(editingItem.id, formData);
            } else {
                // Assuming updateCategory exists in metaApi or use a generic one
                await metaApi.updateCategory(editingItem.id, formData);
            }
            toast.success("Cập nhật thành công!");
            setViewMode(viewMode === 'edit' ? 'grid' : viewMode);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectItem = (item) => {
        if (onSelect) {
            onSelect(item.id || item.code);
            onClose();
        }
    };

    const modalTitle = (
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl text-white shadow-lg ${isBrand ? 'bg-orange-600 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
                <Icon name={isBrand ? 'award' : 'folder'} className="w-5 h-5" />
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    {isBrand ? 'Brand Hub' : 'Category Engine'}
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                    Quản lý {isBrand ? 'Thương hiệu' : 'Danh mục'}
                </h2>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            isFullScreen={true}
        >
            <div className="flex flex-col h-full bg-[#f8fafc]">
                {/* SUB HEADER / CONTROLS */}
                {viewMode !== 'edit' && (
                    <div className="px-8 py-6 bg-white/50 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1 min-w-[300px] relative group">
                            <Icon name="search" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder={`Tìm ${isBrand ? 'thương hiệu' : 'danh mục'}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-16 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[2rem] text-sm font-bold focus:border-indigo-500 transition-all outline-none shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-[1.8rem]">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}
                            >
                                <Icon name="image" className="w-4 h-4 inline mr-2" />
                                Lưới
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}
                            >
                                <Icon name="list" className="w-4 h-4 inline mr-2" />
                                Bảng
                            </button>
                        </div>

                        <Button
                            className={`rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isBrand ? 'bg-orange-600' : 'bg-indigo-600'}`}
                        >
                            <Icon name="plus" className="w-4 h-4 mr-2" /> Thêm mới
                        </Button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 pb-32">
                    {viewMode === 'edit' ? (
                        <div className="max-w-4xl mx-auto animate-fadeInUp">
                            <div className="mb-8 flex items-center justify-between">
                                <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest">
                                    <Icon name="chevronLeft" className="w-4 h-4" /> Quay lại
                                </button>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Editing ID</span>
                                    <div className="text-md font-black text-slate-900">#{editingItem?.id}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                <div className="md:col-span-4">
                                    <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-100 shadow-sm text-center space-y-4">
                                        <div className="aspect-square bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center p-8 relative group overflow-hidden">
                                            {formData.image ? (
                                                <img src={formData.image} className="w-full h-full object-contain" />
                                            ) : (
                                                <Icon name="image" className="w-12 h-12 text-slate-200" />
                                            )}
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer">
                                                <span className="text-white text-[10px] font-black uppercase">Change Image</span>
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase">Logo / Icon</h3>
                                    </div>
                                </div>

                                <div className="md:col-span-8 space-y-6">
                                    <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-100 shadow-sm space-y-6">
                                        <EditableField label="Tên Hiển thị" value={formData.name} onChange={v => setFormData(p => ({ ...p, name: v }))} hideOriginal />
                                        {!isBrand && <EditableField label="Mã Slug / Code" value={formData.code} onChange={v => setFormData(p => ({ ...p, code: v }))} hideOriginal />}

                                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái vận hành</div>
                                                <div className="text-[9px] font-bold text-slate-300 italic">Hiển thị dữ liệu ngoài Web QVC</div>
                                            </div>
                                            <ToggleSwitch checked={formData.is_active} onChange={v => setFormData(p => ({ ...p, is_active: v }))} color={isBrand ? 'orange' : 'indigo'} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-100 shadow-sm space-y-6">
                                        <EditableField label="Mô tả SEO" type="textarea" value={formData.meta_description} onChange={v => setFormData(p => ({ ...p, meta_description: v }))} hideOriginal rows={4} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fadeIn">
                            {filteredItems.map(item => {
                                const isSelected = String(currentValue).includes(String(item.id || item.code));
                                return (
                                    <div
                                        key={item.id || item.code}
                                        className={`group relative bg-white rounded-[2.5rem] p-5 shadow-sm border-4 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center ${isSelected ? 'border-indigo-600 ring-8 ring-indigo-50' : 'border-white hover:border-slate-100'}`}
                                        onClick={() => handleSelectItem(item)}
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform overflow-hidden relative">
                                            {item.image ? (
                                                <img src={item.image} className="w-full h-full object-contain p-3" />
                                            ) : (
                                                <Icon name={isBrand ? 'award' : 'folder'} className="w-8 h-8 text-slate-200" />
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                                    <Icon name="check" className="w-8 h-8 text-indigo-600" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">
                                            {item.name}
                                        </div>

                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                                                title="Sửa thông tin"
                                            >
                                                <Icon name="edit" className="w-3.5 h-3.5" />
                                            </button>
                                            <div className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                                                <Icon name="check" className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-2xl animate-scaleIn">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã/Slug</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Sản phẩm</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Trạng thái</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                                        {item.image ? <img src={item.image} className="w-full h-full object-contain p-2" /> : <Icon name={isBrand ? 'award' : 'folder'} className="w-5 h-5 text-slate-300" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 uppercase">{item.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400">ID: #{item.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-mono text-xs font-bold text-slate-500">
                                                {item.code || '--'}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">
                                                    {item.products_count || 0} SP
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-center">
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                                        {item.is_active ? 'Công khai' : 'Tạm ẩn'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleSelectItem(item)}
                                                        className="px-6 py-2 bg-indigo-600 text-white text-[9px] font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest"
                                                    >
                                                        Chọn
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                                    >
                                                        <Icon name="edit" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer fixed */}
                <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-2xl border-t-2 z-[60] flex gap-4">
                    <button onClick={onClose} className="flex-1 py-5 rounded-[2.2rem] bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                        Đóng lại
                    </button>
                    {viewMode === 'edit' && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-[3] py-5 rounded-[2.2rem] text-white font-black text-xs uppercase tracking-widest shadow-2xl transition-all disabled:opacity-50 ${isBrand ? 'bg-orange-600 shadow-orange-100' : 'bg-indigo-600 shadow-indigo-100'}`}
                        >
                            {isSaving ? 'ĐANG LƯU...' : 'LƯU & ĐỒNG BỘ WEB'}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeInUp { animation: fadeInUp 0.5s ease-out; }
            `}</style>
        </Modal>
    );
};

export default MetaManagementModal;

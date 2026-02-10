import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { metaApi } from '../../api/admin/metaApi';
import { Icon, Button, Modal } from '../ui';
import { ToggleSwitch, EditableField } from '../Product/ProductQvcComponents';
import { toast } from 'react-hot-toast';

const CategorySelectionModal = ({ isOpen, onClose, onSelect, selectedId, multiple = false }) => {
    const [categories, setCategories] = useState([]);
    const [treeCategories, setTreeCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'grid' | 'edit'
    const [isCompact, setIsCompact] = useState(true); // Default to "Raw/Compact" view as requested
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Edit Mode State
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const res = await metaApi.getCategoriesMinimalV2();
            const data = res.data.data || res.data || [];

            setTreeCategories(data);
            setCategories(data);

            // Auto expand logic
            // Auto expand logic: ONLY expand branches containing selected items
            if (selectedId) {
                const selectedIdsStr = Array.isArray(selectedId) ? selectedId.map(String) : String(selectedId).split(',').filter(Boolean);
                const toExpand = new Set();

                // Build parent map for easy traversal
                const parentMap = {};
                data.forEach(c => { parentMap[c.id] = c.parent_id; });

                selectedIdsStr.forEach(id => {
                    let curr = parentMap[id];
                    while (curr) {
                        toExpand.add(curr);
                        curr = parentMap[curr];
                    }
                });
                setExpandedNodes(toExpand);
            }

        } catch (error) {
            toast.error("Không thể tải danh sách danh mục");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Tree Logic ---
    const treeData = useMemo(() => {
        const items = search ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : categories;
        if (search) return items; // Return flat list if searching

        // Build Tree
        const itemMap = {};
        items.forEach(item => { itemMap[item.id] = { ...item, children: [] }; });
        const roots = [];
        items.forEach(item => {
            const node = itemMap[item.id];
            if (!item.parent_id || !itemMap[item.parent_id]) {
                roots.push(node);
            } else {
                itemMap[item.parent_id].children.push(node);
            }
        });
        // Sort recursively by ID as requested ("id càng bé lên trước")
        const sortRecursive = (nodes) => {
            nodes.sort((a, b) => a.id - b.id);
            nodes.forEach(n => {
                if (n.children.length > 0) sortRecursive(n.children);
            });
            return nodes;
        };

        return sortRecursive(roots);
    }, [categories, search]);

    // Calculate Selected Items for "On Top" Display
    const selectedItems = useMemo(() => {
        if (!selectedId) return [];
        const sIds = Array.isArray(selectedId) ? selectedId.map(String) : String(selectedId).split(',').filter(Boolean);
        return categories.filter(c => sIds.includes(String(c.id)));
    }, [categories, selectedId]);

    const toggleNode = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // --- Selection Logic ---
    const handleSelect = (cat) => {
        if (onSelect) {
            // Support multiple if needed, currently single per click usually
            const val = String(cat.id);
            if (multiple) {
                // Logic for multiple selection passed from parent would be needed here
                // But typically selection modals return the clicked item and parent handles array
                // For now assume simple click = select/toggle
                onSelect(val);
            } else {
                onSelect(val);
                onClose();
            }
        }
    };

    const isSelected = (id) => {
        if (!selectedId) return false;
        const sid = String(id);
        if (Array.isArray(selectedId)) return selectedId.map(String).includes(sid);
        return String(selectedId).split(',').includes(sid);
    };

    // --- Edit Logic ---
    const handleEdit = (cat) => {
        setEditingItem(cat);
        setFormData({ ...cat });
        setViewMode('edit');
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Tên danh mục không được để trống");
            return;
        }
        setIsSaving(true);
        try {
            let res;
            if (editingItem.id) {
                // UPDATE V2
                res = await metaApi.updateCategoryV2(editingItem.id, formData);
                const updated = categories.map(c => c.id === editingItem.id ? { ...c, ...formData } : c);
                setCategories(updated);
                setTreeCategories(updated);
                toast.success("Cập nhật thành công");
            } else {
                // CREATE V2
                res = await metaApi.createCategoryV2(formData);
                const newCat = res.data.data || res.data;
                const newCategories = [...categories, newCat];
                setCategories(newCategories);
                setTreeCategories(newCategories);
                toast.success("Tạo mới thành công");
            }

            setViewMode(search ? 'grid' : 'tree');
            setEditingItem(null);
        } catch (error) {
            toast.error("Lỗi lưu trữ: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = () => {
        setEditingItem({ id: null });
        setFormData({
            name: '', code: '', sort_order: 0,
            is_active: true, is_featured: false, parent_id: null,
            image: '', meta_description: ''
        });
        setViewMode('edit');
    };

    const handleDelete = async () => {
        if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${editingItem.name}"?`)) return;
        setIsSaving(true);
        try {
            await metaApi.deleteCategoryV2(editingItem.id);
            toast.success("Đã xóa danh mục");
            const newCats = categories.filter(c => c.id !== editingItem.id);
            setCategories(newCats);
            setTreeCategories(newCats);
            if (String(selectedId) === String(editingItem.id) && onSelect) onSelect(null);
            setViewMode('tree');
            setEditingItem(null);
        } catch (error) {
            toast.error("Lỗi xóa: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    // --- Components ---
    const CategoryNode = ({ node, depth = 0 }) => {
        const hasChildren = node.children && node.children.length > 0;
        const expanded = expandedNodes.has(node.id);
        const selected = isSelected(node.id);

        if (isCompact) {
            return (
                <div className="flex flex-col select-none">
                    <div
                        className={`
                            flex items-center gap-2 py-1 px-2 transition-all border-b border-gray-50
                            ${selected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                        `}
                        style={{ paddingLeft: `${depth * 24 + 8}px` }}
                        onClick={() => handleSelect(node)}
                    >
                        {/* Toggle */}
                        <div
                            className="w-5 h-5 flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600"
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                        >
                            {hasChildren ? (
                                <div className={`border border-gray-300 bg-white w-3 h-3 flex items-center justify-center text-[8px] transition-transform ${expanded ? 'rotate-0' : ''}`}>
                                    {expanded ? '-' : '+'}
                                </div>
                            ) : <div className="w-3 h-3"></div>}
                        </div>

                        {/* Checkbox */}
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                            {selected && <Icon name="check" className="w-3 h-3 text-white" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center gap-2 cursor-pointer">
                            <span className={`text-xs ${selected ? 'font-bold text-blue-700' : 'font-medium text-gray-700'}`}>
                                {node.name}
                            </span>
                            {hasChildren && <span className="text-[9px] text-gray-400">({node.children.length})</span>}
                        </div>

                        {/* Quick Edit */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(node); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-blue-600"
                        >
                            <Icon name="edit" className="w-3 h-3" />
                        </button>
                    </div>

                    {hasChildren && expanded && (
                        <div className="flex flex-col">
                            {node.children.map(child => <CategoryNode key={child.id} node={child} depth={depth + 1} />)}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col select-none">
                <div
                    className={`
                        flex items-center gap-2 py-2 px-2 rounded-xl transition-all border border-transparent
                        ${selected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50'}
                    `}
                    style={{ marginLeft: `${depth * 20}px` }}
                    onClick={() => handleSelect(node)}
                >
                    {/* Toggle Button */}
                    <div
                        className="w-6 h-6 flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600"
                        onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                    >
                        {hasChildren ? (
                            <Icon name="chevronRight" className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        ) : <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex items-center gap-3 cursor-pointer">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${selected ? 'text-blue-600' : 'text-gray-400'}`}>
                            <Icon name={node.image ? 'image' : 'folder'} className="w-4 h-4" />
                        </div>
                        <span className={`text-sm ${selected ? 'font-black text-blue-700' : 'font-medium text-gray-700'}`}>
                            {node.name}
                        </span>
                        {hasChildren && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 rounded-md font-bold">{node.children.length}</span>}
                    </div>

                    {/* Quick Edit */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(node); }}
                        className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Icon name="sliders" className="w-4 h-4" />
                    </button>

                    {selected && <Icon name="check" className="w-4 h-4 text-blue-600 mr-2" />}
                </div>

                {hasChildren && expanded && (
                    <div className="flex flex-col border-l border-gray-100 ml-[15px]">
                        {node.children.map(child => <CategoryNode key={child.id} node={child} depth={depth + 1} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isFullScreen={true}
            title={
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                        <Icon name="folder" className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Category Selector</div>
                        <h2 className="text-lg font-black text-gray-900 uppercase leading-none">
                            {viewMode === 'edit' ? (editingItem?.id ? `Sửa: ${editingItem.name}` : 'Thêm Danh Mục Mới') : 'Chọn Danh Mục'}
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
                            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                        </button>
                    )}
                </div>
            }
        >
            <div className="h-full flex flex-col bg-[#fcfdfe]">
                {viewMode !== 'edit' ? (
                    <>
                        <div className="p-4 bg-white border-b sticky top-0 z-10 flex gap-3">
                            <div className="relative flex-1">
                                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-sm"
                                    placeholder="Tìm danh mục..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => { setViewMode('tree'); setIsCompact(true); }} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'tree' && isCompact ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <Icon name="list" className="w-4 h-4" /> Gọn
                                </button>
                                <button onClick={() => { setViewMode('tree'); setIsCompact(false); }} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'tree' && !isCompact ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <Icon name="folder" className="w-4 h-4" /> Đẹp
                                </button>
                                <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <Icon name="image" className="w-4 h-4" />
                                </button>
                                <button onClick={handleCreate} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 ml-2 shadow-lg shadow-blue-200">
                                    <Icon name="plus" className="w-4 h-4" /> Thêm
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 content-start">
                            {isLoading ? (
                                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : (
                                search || viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(search ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : categories).map(cat => (
                                            <div
                                                key={cat.id}
                                                onClick={() => handleSelect(cat)}
                                                className={`
                                                    p-4 rounded-2xl border-2 flex flex-col items-center text-center gap-3 cursor-pointer hover:shadow-md transition-all relative
                                                    ${isSelected(cat.id) ? 'border-blue-500 bg-blue-50/10' : 'border-gray-100 bg-white'}
                                                `}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(cat); }}
                                                    className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-blue-600 rounded-lg"
                                                >
                                                    <Icon name="sliders" className="w-3.5 h-3.5" />
                                                </button>

                                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">
                                                    {cat.image ? <img src={cat.image} className="w-full h-full object-cover rounded-xl" /> : <Icon name="folder" className="w-6 h-6" />}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 line-clamp-2">{cat.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {/* SELECTED ON TOP */}
                                        {selectedItems.length > 0 && (
                                            <div className="mb-4 pb-4 border-b border-blue-100 bg-blue-50/30 p-4 rounded-xl">
                                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Icon name="check" className="w-3 h-3" /> Đã chọn ({selectedItems.length})
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {selectedItems.map(item => (
                                                        <CategoryNode key={'sel-' + item.id} node={item} depth={0} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* MAIN TREE */}
                                        {treeData.map(root => <CategoryNode key={root.id} node={root} />)}
                                    </div>
                                )
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setViewMode(search ? 'grid' : 'tree')} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <Icon name="chevronLeft" className="w-4 h-4" /> Quay lại
                            </button>
                            {editingItem?.id && (
                                <button onClick={handleDelete} disabled={isSaving} className="text-red-400 hover:text-red-600 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                    <Icon name="trash" className="w-3.5 h-3.5" /> Xóa
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border-4 border-white shadow-inner flex items-center justify-center p-6">
                                    {formData.image ? <img src={formData.image} className="w-full h-full object-contain" /> : <Icon name="image" className="w-10 h-10 text-gray-300" />}
                                </div>
                            </div>

                            <EditableField label="Tên Danh mục" value={formData.name} onChange={v => setFormData(p => ({ ...p, name: v }))} hideOriginal />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <EditableField label="Mã Slug" value={formData.code} onChange={v => setFormData(p => ({ ...p, code: v }))} hideOriginal />
                                <EditableField label="Thứ tự" type="number" value={formData.sort_order} onChange={v => setFormData(p => ({ ...p, sort_order: v }))} hideOriginal />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cấu hình hiển thị</label>
                                    <div className="flex gap-8">
                                        <ToggleSwitch checked={formData.is_active} onChange={v => setFormData(p => ({ ...p, is_active: v }))} label="Đang hoạt động" color="blue" />
                                        <ToggleSwitch checked={formData.is_featured} onChange={v => setFormData(p => ({ ...p, is_featured: v }))} label="Nổi bật (Hot)" color="orange" />
                                    </div>
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

export default CategorySelectionModal;

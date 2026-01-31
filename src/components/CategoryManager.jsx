import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { metaApi } from '../api/admin/metaApi';
import { Icon, Button, Modal } from './ui';
import { ToggleSwitch, EditableField } from './ProductQvcComponents';
import { toast } from 'react-hot-toast';
import { productApi } from '../api/admin/productApi';
import axios from 'axios';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [treeCategories, setTreeCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [viewMode, setViewMode] = useState('tree'); // 'grid' or 'tree'
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [tempUploadedUrl, setTempUploadedUrl] = useState(null);

    // Xử lý sự kiện Paste
    useEffect(() => {
        if (!isModalOpen) return;

        const handlePaste = async (e) => {
            // Không xử lý nếu đang focus vào input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // A. Paste File
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    console.log("[DEBUG] Paste Image File into Category:", file.name);
                    smartUploadHandler(file);
                }
            }
            // B. Paste URL
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    console.log("[DEBUG] Paste Image URL into Category:", text);
                    if (window.confirm(`Sử dụng ảnh từ liên kết này?\n${text}`)) {
                        uploadUrlHandler(text);
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isModalOpen, formData.id]);

    const smartUploadHandler = async (file) => {
        if (!file) return;
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        formDataUpload.append('temp_context', `Category ${formData.name || 'New'}`);
        formDataUpload.append('source', 'category_manager');

        console.log("[DEBUG] Category Smart Uploading:", file.name);
        const tid = toast.loading("Đang đẩy ảnh lên server...");
        try {
            const res = await productApi.smartUpload(formDataUpload);
            console.log("[DEBUG] Category Smart Upload Success:", res.data);

            const newImage = res.data;
            setFormData(prev => ({ ...prev, image: newImage.url }));
            toast.success("Đã cập nhật ảnh tạm (Bấm Lưu để hoàn tất)", { id: tid });
        } catch (e) {
            console.error("[DEBUG] Category Smart Upload Error:", e);
            toast.error("Lỗi: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const uploadUrlHandler = async (url) => {
        if (!url) return;
        console.log("[DEBUG] Category Loading Image from URL:", url);
        const tid = toast.loading("Đang xử lý ảnh từ URL...");
        try {
            // Đối với Category, đơn giản là set URL vào image field, backend sẽ tự download nếu cần hoặc server qvc sẽ xử lý
            setFormData(prev => ({ ...prev, image: url }));
            toast.success("Đã nhận link ảnh! Bấm Lưu để server xử lý.", { id: tid });
        } catch (e) {
            toast.error("Lỗi liên kết ảnh", { id: tid });
        }
    };

    const fetchCategories = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            if (viewMode === 'tree') {
                const res = await metaApi.getCategoriesMinimal();
                const data = res.data || [];
                setTreeCategories(data);
                setPagination(p => ({ ...p, total: data.length }));
            } else {
                const res = await metaApi.getCategories({
                    search: search || undefined,
                    page,
                    per_page: search ? 100 : 20
                });
                setCategories(res.data.data || []);
                setPagination({
                    current_page: res.data.current_page,
                    last_page: res.data.last_page,
                    total: res.data.total
                });
            }
        } catch (error) {
            toast.error("Không thể tải danh sách danh mục");
        } finally {
            setIsLoading(false);
        }
    }, [search, viewMode]);

    useEffect(() => {
        const timer = setTimeout(() => fetchCategories(1), 500);
        return () => clearTimeout(timer);
    }, [fetchCategories]);

    const handleEdit = async (cat) => {
        setIsFetchingDetail(true);
        try {
            const res = await metaApi.getCategoryDetail(cat.id);
            const fullData = res.data || cat;
            setSelectedItem(fullData);
            setFormData({ ...fullData });
            setIsModalOpen(true);
        } catch (error) {
            toast.error("Không thể tải chi tiết danh mục");
            console.error(error);
        } finally {
            setIsFetchingDetail(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        console.log("[DEBUG] Saving Category:", formData.id, "Payload:", formData);
        try {
            await metaApi.updateCategory(selectedItem.id, formData);
            console.log("[DEBUG] Category Update Success");
            toast.success("Cập nhật danh mục thành công!");
            setIsModalOpen(false);
            fetchCategories(pagination.current_page);
        } catch (error) {
            console.error("[DEBUG] Category Save Error:", error);
            toast.error("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm chuẩn hóa URL hiển thị
    const getDisplayUrl = (url) => {
        if (!url) return null;
        let src = String(url);
        // 1. Fix dấu xuyệt ngược
        src = src.replace(/\\/g, '/');

        // 2. Nếu đã có http/https
        if (src.startsWith('http')) return src;

        // 3. Nếu bắt đầu bằng //
        if (src.startsWith('//')) return `https:${src}`;

        // 4. Đường dẫn storage local
        if (src.startsWith('/storage')) return window.location.origin + src;

        // 5. Đường dẫn media QVC
        if (src.startsWith('/media')) return `https://qvc.vn${src}`;

        // 6. Trường hợp còn lại (relative path)
        if (src.startsWith('uploads/') || src.startsWith('categories/')) {
            return `${window.location.origin}/storage/${src}`;
        }

        return src;
    };

    // Logic xử lý cây danh mục
    const treeData = useMemo(() => {
        // Sao chép và sắp xếp theo ID tăng dần
        const itemsToUse = [...(viewMode === 'tree' ? treeCategories : categories)].sort((a, b) => a.id - b.id);
        const itemMap = {};

        // Tạo map và khởi tạo children
        itemsToUse.forEach(item => {
            itemMap[item.id] = { ...item, children: [] };
        });

        const roots = [];
        itemsToUse.forEach(item => {
            const node = itemMap[item.id];
            const isRoot = !item.parent_id || item.parent_id === 0 || !itemMap[item.parent_id];

            if (isRoot) {
                roots.push(node);
            } else {
                if (itemMap[item.parent_id]) {
                    itemMap[item.parent_id].children.push(node);
                }
            }
        });

        return roots;
    }, [categories, treeCategories, viewMode]);

    const toggleNode = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        const allIds = treeCategories.map(c => c.id);
        setExpandedNodes(new Set(allIds));
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    const CategoryRow = ({ node, depth = 0 }) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div className="flex flex-col">
                <div
                    className={`
                        flex items-center gap-3 py-2.5 px-4 transition-all group border-b border-gray-100/50 
                        ${depth === 0 ? 'bg-white border-l-4 border-l-blue-600 shadow-sm mb-1 rounded-r-xl' : 'bg-transparent'}
                        hover:bg-blue-50/40 cursor-pointer
                    `}
                    style={{ paddingLeft: depth === 0 ? '16px' : `${depth * 28 + 16}px` }}
                    onClick={() => hasChildren && toggleNode(node.id)}
                >
                    {/* Đường kẻ phân cấp dọc mờ */}
                    {depth > 0 && Array.from({ length: depth }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute border-l border-gray-200/60"
                            style={{ left: `${i * 28 + 28}px`, top: 0, bottom: 0, pointerEvents: 'none' }}
                        />
                    ))}

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Nút Toggle */}
                        <div className="w-6 h-6 flex items-center justify-center">
                            {hasChildren ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                                    className={`p-1 rounded-md hover:bg-gray-200 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                >
                                    <Icon name="chevron-right" className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                            ) : (
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full ml-1" />
                            )}
                        </div>

                        {/* Icon hoặc Ảnh */}
                        <div className={`
                            w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100
                            ${node.image ? 'bg-white' : (hasChildren ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400')}
                        `}>
                            {node.image ? (
                                <img src={getDisplayUrl(node.image)} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <Icon name={hasChildren ? "folder" : "file"} className="w-4 h-4" />
                            )}
                        </div>

                        {/* Nội dung danh mục */}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs uppercase tracking-tight truncate ${depth === 0 ? 'text-gray-900 font-black' : 'text-gray-700 font-bold'}`}>
                                    {node.name}
                                </span>
                                {hasChildren && (
                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-black">
                                        {node.children.length}
                                    </span>
                                )}
                            </div>
                            <div className="text-[9px] text-gray-400 font-bold flex items-center gap-2">
                                <span>ID: {node.id}</span>
                                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                <span>STT: {node.sort_order}</span>
                            </div>
                        </div>
                    </div>

                    {/* Badge Trạng thái & Action */}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${node.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {node.is_active ? 'Active' : 'Hide'}
                        </div>
                        <button
                            onClick={() => handleEdit(node)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-1"
                        >
                            <Icon name="edit" className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase">Sửa</span>
                        </button>
                    </div>
                </div>

                {/* Render con nếu được expand */}
                {hasChildren && isExpanded && (
                    <div className="flex flex-col relative">
                        {node.children.map(child => (
                            <CategoryRow key={child.id} node={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-gray-900">
            {/* Header / Stats - Compact Version */}
            <div className="bg-white border-b px-6 py-4 shadow-sm z-[20]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                            <Icon name="folder" className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">Hệ thống Danh mục</h1>
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mt-1">Quản lý cấu trúc cây chuẩn SEO</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-50 p-1 rounded-xl flex shadow-inner">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-white/50'}`}
                            >Grid</button>
                            <button
                                onClick={() => setViewMode('tree')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-white/50'}`}
                            >Tree View</button>
                        </div>
                        {viewMode === 'tree' && (
                            <div className="flex gap-1.5">
                                <button onClick={expandAll} className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-gray-100 shadow-sm">Expand All</button>
                                <button onClick={collapseAll} className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-gray-100 shadow-sm">Collapse All</button>
                            </div>
                        )}
                        <div className="w-[1px] h-6 bg-gray-200"></div>
                        <div className="text-right">
                            <div className="text-xl font-black text-blue-600 leading-none">{pagination.total}</div>
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Nhóm SP</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Loader cho việc lấy chi tiết */}
            {isFetchingDetail && (
                <div className="fixed inset-0 bg-blue-900/10 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 border-4 border-white border-t-blue-600 rounded-full animate-spin shadow-2xl"></div>
                    <div className="bg-white px-6 py-2 rounded-full shadow-xl text-[10px] font-black uppercase tracking-widest text-blue-600 animate-bounce">
                        Fetching Deep Data...
                    </div>
                </div>
            )}

            {/* Controls - Compact */}
            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center mb-6">
                    <div className="flex-1 w-full relative group">
                        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Gõ tên danh mục..."
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:ring-4 ring-blue-50 transition-all outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-48 gap-8">
                        <div className="w-20 h-20 border-[8px] border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-extrabold text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Structure...</p>
                    </div>
                ) : (
                    viewMode === 'tree' ? (
                        <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden mb-20">
                            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category Deep Hierarchy</span>
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-black uppercase">Total: {treeCategories.length} Units</span>
                            </div>
                            <div className="bg-white">
                                {treeData.length > 0 ? (
                                    treeData.map(root => (
                                        <CategoryRow key={root.id} node={root} />
                                    ))
                                ) : (
                                    <div className="py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest italic">No complex structure found. Try searching...</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white rounded-[3rem] p-7 shadow-xl border-4 border-white hover:border-blue-500/10 transition-all group relative overflow-hidden flex flex-col">
                                    <div className="flex items-center gap-5 mb-6">
                                        <div className="w-20 h-20 rounded-[1.8rem] bg-gray-50 border-4 border-white shadow-inner flex-shrink-0 overflow-hidden relative">
                                            {cat.image ? (
                                                <img src={getDisplayUrl(cat.image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200"><Icon name="folder" className="w-8 h-8" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-black text-gray-900 line-clamp-2 uppercase leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                                                {cat.name}
                                            </h3>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: #{cat.id} • STT: {cat.sort_order}</div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 border-t-2 border-dashed border-gray-50 flex items-center justify-between">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cat.is_active ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-400'}`}>
                                            {cat.is_active ? 'Hoạt động' : 'Tạm ẩn'}
                                        </div>
                                        <button
                                            onClick={() => handleEdit(cat)}
                                            className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                                        >
                                            Chỉnh sửa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Pagination */}
                {pagination.last_page > 1 && viewMode === 'grid' && (
                    <div className="mt-16 flex justify-center gap-3">
                        {Array.from({ length: Math.min(pagination.last_page, 8) }).map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => fetchCategories(i + 1)}
                                className={`w-12 h-12 rounded-2xl font-black text-sm transition-all border-4 ${pagination.current_page === i + 1 ? 'bg-blue-600 border-blue-100 text-white shadow-2xl scale-110' : 'bg-white border-white text-gray-400 shadow-lg hover:border-blue-100'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal - Tái cấu trúc tinh gọn & Đẹp */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isFullScreen={true}
                title={
                    <div className="flex items-center justify-between w-full pr-12">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                                <Icon name="edit" className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Editor Engine</div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] md:max-w-md">{formData.name || 'Danh mục'}</h2>
                            </div>
                        </div>
                        <a
                            href={`https://qvc.vn${formData.request_path || '/' + (formData.url || '') + '.html'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-100 text-gray-600 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group/web shadow-sm"
                        >
                            <Icon name="external-link" className="w-4 h-4 transition-transform group-hover/web:scale-110" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Xem trên Web</span>
                        </a>
                    </div>
                }
            >
                <div className="flex flex-col h-full bg-[#f8fafc]">
                    <div className="flex-1 overflow-y-auto pb-32 pt-6">
                        <div className="max-w-4xl mx-auto px-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Logo/Image */}
                                <section
                                    className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center group relative overflow-hidden cursor-pointer"
                                    onClick={() => document.getElementById('cat-image-upload').click()}
                                >
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 shadow-inner flex items-center justify-center mb-0 border-4 border-white ring-4 ring-gray-50/50 group-hover:scale-105 transition-transform">
                                        {formData.image ? (
                                            <img src={getDisplayUrl(formData.image)} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon name="image" className="w-12 h-12 text-gray-200" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2.5rem]">
                                        <span className="text-white font-black text-[9px] uppercase tracking-widest">Đổi ảnh bìa</span>
                                    </div>
                                    <input
                                        type="file"
                                        id="cat-image-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files[0]) smartUploadHandler(e.target.files[0]);
                                            e.target.value = null;
                                        }}
                                    />
                                </section>

                                {/* Core Configuration */}
                                <section className="md:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <EditableField label="Tên Danh mục *" value={formData.name} onChange={(v) => setFormData(p => ({ ...p, name: v }))} hideOriginal />
                                        <EditableField label="Thứ tự hiển thị" type="number" value={formData.sort_order} onChange={(v) => setFormData(p => ({ ...p, sort_order: v }))} hideOriginal />
                                    </div>
                                    <div className="pt-6 border-t border-gray-50 flex flex-wrap gap-6 px-2">
                                        <div className="flex items-center gap-10">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Bật/Tắt hiển thị</span>
                                            </div>
                                            <ToggleSwitch label="" checked={formData.is_active} onChange={(v) => setFormData(p => ({ ...p, is_active: v }))} color="green" />
                                        </div>
                                        <div className="w-[1px] h-10 bg-gray-100 hidden md:block"></div>
                                        <div className="flex items-center gap-10">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nổi bật</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Trang chủ/Hot</span>
                                            </div>
                                            <ToggleSwitch label="" checked={formData.is_featured === 1} onChange={(v) => setFormData(p => ({ ...p, is_featured: v ? 1 : 0 }))} color="orange" />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Performance & Stats Panel */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Lượt truy cập', value: formData.visit || 0, icon: 'eye', color: 'blue' },
                                    { label: 'Sản phẩm', value: formData.proCount || 0, icon: 'shopping-bag', color: 'green' },
                                    { label: 'Like / Ưa thích', value: formData.like_count || 0, icon: 'heart', color: 'red' },
                                    { label: 'Ưu tiên hiển thị', value: formData.sort_order || 0, icon: 'star', color: 'orange' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[2rem] shadow-lg border border-gray-50 flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                            <Icon name={stat.icon} className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</div>
                                            <div className="text-xl font-black text-gray-900 leading-none mt-0.5">{stat.value.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* SEO Deep Panel */}
                            <section className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 space-y-8">
                                <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                                    <Icon name="search" className="w-4 h-4" />
                                    Search Engine Optimization (SEO) & URL Config
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <EditableField label="Meta Title" value={formData.meta_title} onChange={(v) => setFormData(p => ({ ...p, meta_title: v }))} hideOriginal />
                                        <EditableField label="URL Custom" value={formData.url} onChange={(v) => setFormData(p => ({ ...p, url: v }))} hideOriginal />
                                        <EditableField label="Meta Keywords" type="textarea" value={formData.meta_keyword} onChange={(v) => setFormData(p => ({ ...p, meta_keyword: v }))} hideOriginal rows={3} />
                                    </div>
                                    <div className="space-y-8">
                                        <EditableField label="Meta Description" type="textarea" value={formData.meta_description} onChange={(v) => setFormData(p => ({ ...p, meta_description: v }))} hideOriginal rows={3} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <EditableField label="Redirect URL" value={formData.redirect_url} onChange={(v) => setFormData(p => ({ ...p, redirect_url: v }))} hideOriginal />
                                            <EditableField label="Canonical" value={formData.url_canonical} onChange={(v) => setFormData(p => ({ ...p, url_canonical: v }))} hideOriginal />
                                        </div>
                                        <EditableField label="Hệ thống Tags (SEO)" type="textarea" value={formData.tags} onChange={(v) => setFormData(p => ({ ...p, tags: v }))} hideOriginal rows={2} />
                                    </div>
                                </div>
                            </section>

                            {/* Additional Config */}
                            <section className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Tóm tắt (Summary)</label>
                                        <textarea
                                            className="w-full p-6 bg-gray-50 border-none rounded-3xl text-sm font-bold min-h-[120px] focus:bg-white focus:ring-4 ring-gray-100 transition-all outline-none"
                                            value={formData.summary || ''}
                                            onChange={(e) => setFormData(p => ({ ...p, summary: e.target.value }))}
                                            placeholder="Gõ tóm tắt ngắn cho danh mục..."
                                        />
                                    </div>
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Mô tả chi tiết (Description Content)</label>
                                        <textarea
                                            className="w-full p-6 bg-gray-50 border-none rounded-3xl text-sm font-bold min-h-[120px] focus:bg-white focus:ring-4 ring-gray-100 transition-all outline-none"
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                            placeholder="Gõ mô tả chi tiết bằng HTML hoặc văn bản..."
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 pb-4">
                                    <div className="flex flex-col gap-1 relative z-10 w-full md:w-auto">
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Đường dẫn chuẩn SEO</span>
                                        <span className="text-sm font-black text-blue-400 break-all">{formData.request_path || '/' + (formData.url || '') + '.html'}</span>
                                    </div>
                                    <div className="text-right flex flex-col gap-1 relative z-10 w-full md:w-auto">
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Hash Định danh</span>
                                        <span className="text-[10px] font-mono text-gray-400">{formData.url_hash || '---'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
                                    <div className="flex gap-8">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Hierarchy Path</span>
                                            <span className="text-[10px] font-bold text-gray-400">{formData.catPath || 'Root'}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Display Template</span>
                                            <span className="text-[10px] font-bold text-gray-200 uppercase">{formData.display_option || 'default'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Update Lần cuối</span>
                                        <span className="text-xs font-bold italic text-gray-400">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-xl border-t-2 z-[60] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                        <div className="max-w-4xl mx-auto flex gap-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest border-4 border-gray-50 bg-white">Hủy bỏ</Button>
                            <Button variant="primary" onClick={handleSave} className="flex-[3] py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-200" disabled={isSaving}>
                                {isSaving ? "Đang đồng bộ..." : "Cập nhật Danh mục & Sync Web"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CategoryManager;

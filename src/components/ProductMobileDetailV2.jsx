import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast'; // Ensure single import
import { productApi } from '../api/admin/productApi';
import { metaApi } from '../api/admin/metaApi';
import { Icon, Modal } from './ui';
import { SectionHeader, FormField, ToggleField } from './ProductFormElements';
import ProductSeoSection from './ProductSeoSection';
import ProductContentSection from './ProductContentSection';

import BrandSelectionModal from './BrandSelectionModal';
import CategorySelectionModal from './CategorySelectionModal';
import MediaManagerModal from './MediaManagerModal';
import RichTextEditor, { cleanHtmlForEditor, processHtmlImages, getShortProName, logTrace } from './RichTextEditor';
import { PLACEHOLDER_NO_IMAGE_SQUARE } from '../constants/placeholders';

const ProductMobileDetailV2 = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess, onSwitchVersion }) => {
    // --- STATE MANAGEMENT ---
    const [currentMode, setCurrentMode] = useState(mode);
    const [currentId, setCurrentId] = useState(product?.id);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Refs
    const isProcessingPaste = useRef(false);
    const [globalTaskCount, setGlobalTaskCount] = useState(0);

    // Form Data
    const [formData, setFormData] = useState({
        proName: '', url: '', productModel: '', tags: '', storeSKU: '',
        weight: 0, brandId: '', proSummary: '', specialOffer: '',
        price: 0, market_price: 0, quantity: 0, warranty: '',
        condition: 'New', isOn: true, hasVAT: 0,
        is_hot: false, is_new: true, is_best_sell: false,
        is_sale_off: false, is_student_support: false, is_installment_0: false,
        catId: [], description: '', spec: '', purchase_price_web: 0,
        meta_title: '', meta_keyword: '', meta_description: '', accessory: '',
        view_count: 0, sold_count: 0, like_count: 0, updated_at: '', created_at: ''
    });

    // Sub-States
    const [fullImages, setFullImages] = useState([]);
    const [tempUploadedIds, setTempUploadedIds] = useState([]);
    const [tempBrand, setTempBrand] = useState(null);
    const [activeTab, setActiveTab] = useState('standard');
    const [standardContentSubTab, setStandardContentSubTab] = useState('summary');
    const [showAllStandardImages, setShowAllStandardImages] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [seoOpen, setSeoOpen] = useState(false);

    // Modals & Managers State
    const [brandManager, setBrandManager] = useState({ open: false, mode: 'list' });
    const [catManager, setCatManager] = useState({ open: false, mode: 'list' });
    const [fullEditor, setFullEditor] = useState({ open: false, type: 'description' });
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [mediaManagerMode, setMediaManagerMode] = useState('gallery'); // 'gallery' | 'editor'
    const [mediaLibraryCallback, setMediaLibraryCallback] = useState(null);
    const [previewImage, setPreviewImage] = useState(null); // [NEW] Lightbox State

    // --- EFFECTS ---
    useEffect(() => {
        if (currentMode === 'edit' && currentId) {
            fetchDetail(currentId);
        } else if (currentMode === 'create') {
            setFormData(prev => ({
                ...prev,
                isOn: true, is_new: true, condition: 'New',
                proName: '', storeSKU: '', price: 0, quantity: 0,
                ...product
            }));
            setFullImages([]);
        }
    }, [product, currentMode, currentId]);

    // Ensure Brand Detail is available
    useEffect(() => {
        const bId = formData.brandId;
        if (!bId) return;
        const strId = String(bId);
        const inDict = dictionary?.brands?.some(b => String(b.id || b.code) === strId);
        const inTemp = String(tempBrand?.id || tempBrand?.code) === strId;

        if (!inDict && !inTemp) {
            metaApi.getBrandDetail(bId)
                .then(res => setTempBrand(res.data.data || res.data))
                .catch(err => {
                    // [DEBUG] Brand 369 not found -> 404 is expected for deleted/legacy brands
                    // Suppress loud error, just warn
                    if (err.response?.status === 404) {
                        console.warn(`[Silent] Brand ID ${bId} not found (404).`);
                    } else {
                        console.warn("Brand detail fetch failed:", err);
                    }
                });
        }
    }, [formData.brandId, dictionary]);

    // [GLOBAL PASTE HANDLER]
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = async (e) => {
            const isInput = e.target.closest('input, textarea, [contenteditable]');
            if (isProcessingPaste.current) return;

            // Nếu paste vào input/textarea, để handler riêng hoặc browser lo
            if (isInput) return;

            // A. Xử lý File (Screenshot, Copy Image)
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    smartUploadHandler(file);
                }
            }
            // B. Xử lý URL (Copy Image Address)
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    if (window.confirm(`Bạn muốn tải ảnh từ liên kết này?\n${text}`)) {
                        smartUploadHandler(text, 'gallery');
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isOpen, activeTab]);

    // --- API HANDLERS ---
    const fetchDetail = async (id) => {
        setIsLoading(true);
        try {
            const res = await productApi.getDetail(id);
            const d = res.data;
            setFullImages(d.full_images || []);
            setFormData({
                ...d,
                request_path: d.request_path || d.url || '',
                productModel: d.productModel || d.model_code || '',
                tags: d.tags || '',
                storeSKU: d.storeSKU || d.sku || '',
                weight: d.weight || 0,
                brandId: String(d.brandId || ''),
                proSummary: d.proSummary || '',
                specialOffer: d.specialOffer || '',
                accessory: d.accessory || '',
                price: parseFloat(d.price_web || d.price || 0),
                market_price: parseFloat(d.market_price || 0),
                purchase_price_web: parseFloat(d.purchase_price_web || 0),
                hasVAT: d.hasVAT || 0,
                quantity: parseInt(d.quantity_web || d.quantity || 0),
                warranty: d.warranty_web || d.warranty || '',
                condition: d.condition || 'New',
                isOn: d.isOn == 1 || d.is_on == 1,
                is_hot: d.marketing_flags?.includes('hot') || d.is_hot == 1,
                is_new: d.marketing_flags?.includes('new') || d.is_new == 1,
                is_best_sell: d.marketing_flags?.includes('best') || d.is_best_sell == 1,
                is_sale_off: d.marketing_flags?.includes('sale') || d.is_sale_off == 1,
                is_student_support: d.is_student_support == 1,
                is_installment_0: d.is_installment_0 == 1,
                catId: d.product_cat_web ? String(d.product_cat_web).split(',').filter(Boolean) : (d.categories_list || []),
                description: d.description || d.details?.description || '',
                spec: d.spec || d.details?.spec || '',
                meta_title: d.meta_title || '',
                meta_keyword: d.meta_keyword || '',
                meta_description: d.meta_description || '',
                view_count: d.view_count || 0,
                sold_count: d.sold_count || 0,
                like_count: d.like_count || 0,
                updated_at: d.updated_at,
                created_at: d.created_at
            });
        } catch (e) {
            toast.error("Không nạp được dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (shouldClose = true) => {
        setIsSaving(true);
        const tid = toast.loading("Đang lưu dữ liệu...");
        try {
            const catIdArray = Array.isArray(formData.catId) ? formData.catId : [];
            const catIdString = catIdArray.length > 0 ? `,${catIdArray.join(',')},` : '';

            const payload = {
                ...formData,
                product_cat: catIdString,
                product_cat_web: catIdString,
                isOn: formData.isOn ? 1 : 0,
                is_hot: formData.is_hot ? 1 : 0,
                is_new: formData.is_new ? 1 : 0,
                is_best_sell: formData.is_best_sell ? 1 : 0,
                is_sale_off: formData.is_sale_off ? 1 : 0,
                is_student_support: formData.is_student_support ? 1 : 0,
                is_installment_0: formData.is_installment_0 ? 1 : 0,
                media_ids: Array.isArray(tempUploadedIds) ? tempUploadedIds : [],
                marketing_flags: [
                    formData.is_hot ? 'hot' : null,
                    formData.is_new ? 'new' : null,
                    formData.is_best_sell ? 'best' : null,
                    formData.is_sale_off ? 'sale' : null
                ].filter(Boolean)
            };

            if (currentMode === 'create') {
                const res = await productApi.create(payload);
                toast.success("Tạo mới thành công!", { id: tid });
                setTempUploadedIds([]);
                onRefresh && onRefresh();
                if (onSuccess) { onSuccess(res.data); onClose(); return; }
                if (res.data?.id) {
                    setCurrentId(res.data.id);
                    setCurrentMode('edit');
                    shouldClose ? onClose() : fetchDetail(res.data.id);
                }
            } else {
                await productApi.update(currentId || product?.id, payload);
                toast.success("Cập nhật thành công!", { id: tid });
                setTempUploadedIds([]);
                onRefresh && onRefresh();
                shouldClose ? onClose() : fetchDetail(currentId || product?.id);
            }
        } catch (e) {
            toast.error("Lỗi lưu dữ liệu: " + (e.response?.data?.message || e.message), { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // --- IMAGE HANDLERS ---
    const smartUploadHandler = async (fileOrUrl, targetMode = 'gallery', targetField = null) => {
        const tid = toast.loading("Đang xử lý ảnh...");
        try {
            const formDataUpload = new FormData();
            if (fileOrUrl instanceof File) formDataUpload.append('image', fileOrUrl);
            else formDataUpload.append('image_url', fileOrUrl);

            formDataUpload.append('temp_context', formData.proName ? formData.proName.substring(0, 20) : 'product');
            formDataUpload.append('source', 'mobile_v2');

            const res = await productApi.smartUpload(formDataUpload);
            const newImage = res.data;
            const finalUrl = newImage.url || newImage.image_url || newImage.displayUrl;

            if (targetMode === 'editor') {
                const field = targetField || standardContentSubTab;
                if (field === 'summary') { toast.error("Mô tả ngắn không hỗ trợ ảnh", { id: tid }); return; }
                const html = `<p><img src="${finalUrl}" alt="image" /></p>`;
                setFormData(prev => ({ ...prev, [field]: (prev[field] || '') + html }));
                toast.success("Đã chèn ảnh!", { id: tid });
            } else {
                setTempUploadedIds(prev => [...prev, newImage.id]);
                setFullImages(prev => [...prev, { id: newImage.id, url: finalUrl, displayUrl: finalUrl, is_temp: true }]);
                toast.success("Đã thêm vào thư viện!", { id: tid });
                if (typeof fileOrUrl === 'string') setShowUrlInput(false);
            }
        } catch (e) {
            toast.error("Lỗi upload: " + e.message, { id: tid });
        }
    };

    const handleDeleteImage = async (img) => {
        if (!window.confirm("Xóa ảnh này?")) return;
        try {
            if (img.id) await productApi.deleteImage(product.id, img.id);
            toast.success("Đã xóa");
            fetchDetail(product.id);
        } catch (e) { toast.error("Lỗi xóa: " + e.message); }
    };

    const handleSetMain = async (id) => {
        try {
            await productApi.setMainImage(product.id, id);
            toast.success("Đã đặt làm ảnh chính");
            fetchDetail(product.id);
        } catch (e) { toast.error("Lỗi: " + e.message); }
    };

    // [HANDLERS EXTENDED: DELETE & TOGGLE]
    const handleDeleteProduct = async () => {
        if (!window.confirm("CẢNH BÁO: Bạn chắc chắn muốn XÓA sản phẩm này?\nHành động này không thể hoàn tác!")) return;
        const tid = toast.loading("Đang xóa sản phẩm...");
        try {
            await productApi.delete(product.id);
            toast.success("Đã xóa sản phẩm thành công!", { id: tid });
            onRefresh && onRefresh();
            onClose();
        } catch (e) {
            toast.error("Lỗi xóa: " + e.message, { id: tid });
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = !formData.isOn;
        setFormData(prev => ({ ...prev, isOn: newStatus })); // Optimistic UI
        // Nếu cần gọi API ngay:
        // try {
        //     await productApi.toggleStatus(product.id);
        //     toast.success(newStatus ? "Đã bật hiển thị" : "Đã ẩn sản phẩm");
        // } catch (e) {
        //     setFormData(prev => ({ ...prev, isOn: !newStatus }));
        //     toast.error("Lỗi cập nhật trạng thái");
        // }
    };

    // [POWER-PASTE] Xử lý paste thông minh cho Textarea (Summary)
    const handlePasteForField = async (e, fieldName) => {
        const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
        if (!clipboardData) return;

        const htmlData = clipboardData.getData('text/html');
        const textPlain = clipboardData.getData('text/plain');
        const isWord = htmlData && (htmlData.includes('urn:schemas-microsoft-com:office:word') || htmlData.includes('mso-'));

        // Chỉ can thiệp nếu là Word hoặc có HTML cần dọn
        if (isWord || htmlData) {
            if (isProcessingPaste.current) {
                e.preventDefault(); return;
            }

            isProcessingPaste.current = true;
            e.preventDefault();
            e.stopPropagation();

            const tid = toast.loading("Đang dán và làm sạch nội dung...");
            try {
                // Sử dụng hàm dọn dẹp import từ RichTextEditor
                let contentToPaste = isWord ? cleanHtmlForEditor(htmlData || textPlain) : textPlain;

                // Nếu là word nhưng clean ra rỗng hoặc quá phức tạp, fallback về text
                if (!contentToPaste) contentToPaste = textPlain;

                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
                    const start = activeEl.selectionStart;
                    const end = activeEl.selectionEnd;
                    const val = formData[fieldName] || '';
                    const newVal = val.substring(0, start) + contentToPaste + val.substring(end);
                    setFormData(prev => ({ ...prev, [fieldName]: newVal }));
                }

                toast.success("Đã dán (Clean Mode)", { id: tid });
            } catch (err) {
                console.error(err);
                toast.error("Lỗi paste: " + err.message, { id: tid });
            } finally {
                setTimeout(() => { isProcessingPaste.current = false; }, 500);
            }
        }
    };

    // [HELPER] Download Image
    const downloadImage = async (url) => {
        if (!url) return;
        const tid = toast.loading("Đang chuẩn bị tải...");
        try {
            const response = await fetch(url, { mode: 'cors' });
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `product_img_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Đã tải xuống!", { id: tid });
        } catch (e) {
            // Fallback
            window.open(url, '_blank');
            toast.dismiss(tid);
        }
    };

    // --- DERIVED DATA ---
    const standardImages = useMemo(() => {
        const result = [...fullImages].map(img => {
            let url = img.url || img.image_url || img.image;
            if (url && !url.startsWith('http')) url = `https://qvc.vn/${url.replace(/^\//, '')}`;
            return { ...img, displayUrl: url || PLACEHOLDER_NO_IMAGE_SQUARE };
        });
        if (showAllStandardImages) return result;
        return result; // Mặc định hiển thị hết trong V2
    }, [fullImages, showAllStandardImages]);

    if (!isOpen) return null;

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 animate-slideUp">
            {/* HEADER */}
            <div className="px-5 py-4 bg-white border-b flex justify-between items-center shadow-sm z-50">
                <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-tight">
                        {currentMode === 'create' ? 'TẠO SẢN PHẨM MỚI (V2)' : 'CHỈNH SỬA SẢN PHẨM (V2)'}
                    </h2>
                    <p className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded inline-block mt-1">PRO VERSION - HIGH PERFORMANCE</p>
                </div>
                <div className="flex items-center gap-3">
                    {formData.request_path && (
                        <a
                            href={`https://qvc.vn${formData.request_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                        >
                            <Icon name="external-link" className="w-3 h-3" />
                            <span>Xem Web</span>
                        </a>
                    )}
                    {onSwitchVersion && (
                        <button onClick={onSwitchVersion} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-200 transition-all">
                            Switch to V1
                        </button>
                    )}
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                        <Icon name="x" className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* BODY SCROLL - DENSE DASHBOARD LAYOUT */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32 bg-slate-50/50">
                <div className="max-w-[1600px] mx-auto space-y-4">

                    {/* 1. TOP HEADER: NAME & PATH */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-[2]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên sản phẩm</label>
                                <input
                                    value={formData.proName}
                                    onChange={e => setFormData({ ...formData, proName: e.target.value })}
                                    className="w-full font-bold text-lg text-slate-800 border-b-2 border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
                                    placeholder="Nhập tên sản phẩm..."
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Đường dẫn (Slug)</label>
                                <input
                                    value={formData.request_path}
                                    onChange={e => setFormData({ ...formData, request_path: e.target.value })}
                                    className="w-full font-mono text-sm font-bold text-blue-600 border-b-2 border-transparent hover:border-slate-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
                                    placeholder="/duong-dan-san-pham"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. MAIN DASHBOARD GRID */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                        {/* COLUMN 1: SPECS & ATTRIBUTES (Width: 3/12) */}
                        <div className="xl:col-span-3 space-y-4">
                            {/* BLOCK: CLASS / BRAND */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <SectionHeader title="Phân loại" icon="hash" color="indigo" />
                                <div className="space-y-3 mt-4">
                                    <FormField type="select" label="Thương hiệu" options={dictionary?.brands} value={formData.brandId} onChange={v => setFormData({ ...formData, brandId: v })} isBrand={true} onManage={() => setBrandManager({ open: true, mode: 'list' })} />
                                    <FormField type="select" label="Danh mục" options={dictionary?.categories} value={formData.catId} onChange={v => setFormData({ ...formData, catId: v })} multiple={true} onManage={() => setCatManager({ open: true, mode: 'list' })} />
                                </div>
                            </div>

                            {/* BLOCK: IDENTITY */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <SectionHeader title="Định danh" icon="tag" color="blue" />
                                <div className="space-y-3 mt-4">
                                    <FormField label="Mã SKU" value={formData.storeSKU} onChange={v => setFormData({ ...formData, storeSKU: v })} />
                                    <FormField label="Model / NSX" value={formData.productModel} onChange={v => setFormData({ ...formData, productModel: v })} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField label="Weight (g)" type="number" value={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} />
                                        <div className="flex items-end pb-1">
                                            <ToggleField label="Hiện Web" checked={formData.isOn} onChange={v => setFormData({ ...formData, isOn: v })} color="green" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: VISUALS (Width: 5/12) */}
                        <div className="xl:col-span-5 space-y-4 h-full">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <SectionHeader title={`Thư viện ảnh (${standardImages.length})`} icon="image" color="orange" />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setMediaManagerMode('gallery'); setIsMediaManagerOpen(true); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Kho ảnh</button>
                                        <label className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all cursor-pointer">
                                            Upload
                                            <input type="file" className="hidden" onChange={e => e.target.files[0] && smartUploadHandler(e.target.files[0], 'gallery')} />
                                        </label>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[300px] bg-slate-50/50 rounded-2xl p-4 border border-slate-100 border-dashed">
                                    {standardImages.length > 0 ? (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                            {standardImages.map((img, i) => (
                                                <div key={i} className={`relative aspect-square rounded-xl border overflow-hidden bg-white group hover:border-orange-500 transition-all shadow-sm ${img.is_main ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-200'}`}>
                                                    <img src={img.displayUrl} className="w-full h-full object-contain p-1.5" />
                                                    {img.is_main && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg shadow-sm">MAIN</div>}
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-[1px]">
                                                        {!img.is_main && <button onClick={() => handleSetMain(img.id)} className="w-8 h-8 bg-white text-indigo-600 rounded-lg flex items-center justify-center hover:scale-110 shadow-lg transition-transform" title="Đặt làm chính"><Icon name="check" className="w-4 h-4" /></button>}
                                                        <button onClick={() => setPreviewImage(img.displayUrl)} className="w-8 h-8 bg-white text-blue-500 rounded-lg flex items-center justify-center hover:scale-110 shadow-lg transition-transform" title="Xem chi tiết"><Icon name="eye" className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteImage(img)} className="w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center hover:scale-110 shadow-lg transition-transform" title="Xóa"><Icon name="trash" className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-40 gap-3">
                                            <Icon name="image" className="w-12 h-12 text-slate-300" />
                                            <span className="text-xs font-black uppercase text-slate-400">Chưa có ảnh</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 3: SALES & CONTENT (Width: 4/12) */}
                        <div className="xl:col-span-4 space-y-4">
                            {/* PRICE & SALES */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <SectionHeader title="Giá bán & Kho vận" icon="dollar-sign" color="red" />
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giá bán lẻ (Web)</label>
                                        <div className="relative">
                                            <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full font-black text-xl text-red-600 border-b border-slate-200 focus:border-red-500 outline-none pb-1" />
                                            <span className="absolute right-0 bottom-1 text-xs font-bold text-red-400">VNĐ</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tồn kho</label>
                                        <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full font-black text-xl text-slate-800 border-b border-slate-200 focus:border-indigo-500 outline-none pb-1" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giá vốn</label>
                                        <input type="number" value={formData.purchase_price_web} onChange={e => setFormData({ ...formData, purchase_price_web: e.target.value })} className="w-full font-bold text-sm text-slate-600 border-b border-slate-200 outline-none pb-1" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bảo hành</label>
                                        <input value={formData.warranty} onChange={e => setFormData({ ...formData, warranty: e.target.value })} className="w-full font-bold text-sm text-slate-600 border-b border-slate-200 outline-none pb-1" />
                                    </div>
                                </div>
                            </div>

                            {/* SHORT DESCRIPTION (ALWAYS VISIBLE) */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col">
                                <SectionHeader title="Mô tả - Nội dung" icon="file-text" color="purple" />

                                <div className="mt-4 mb-2">
                                    <label className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block">Mô tả ngắn (Hiển thị ngay)</label>
                                    <textarea
                                        value={formData.proSummary}
                                        onChange={e => setFormData({ ...formData, proSummary: e.target.value })}
                                        onPaste={e => handlePasteForField(e, 'proSummary')} // [ATTACH PASTE HANDLER]
                                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-purple-500 transition-all min-h-[140px] resize-none"
                                        placeholder="Nhập tóm tắt đặc điểm nổi bật của sản phẩm..."
                                    ></textarea>
                                </div>

                                <div className="mt-2 pt-2 border-t border-dashed border-slate-100">
                                    <div className="flex gap-2">
                                        <button onClick={() => setFullEditor({ open: true, type: 'description' })} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                            <Icon name="edit" className="w-3 h-3" /> Chi tiết bài viết
                                        </button>
                                        <button onClick={() => setFullEditor({ open: true, type: 'spec' })} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                            <Icon name="list" className="w-3 h-3" /> Thông số KT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 3. CONTENT & SEO SECTION (PARITY WITH V1) */}
                <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        {/* LEFT: CONTENT (8/12) */}
                        <div className="xl:col-span-8 space-y-6">
                            <ProductContentSection
                                formData={formData}
                                onChange={setFormData}
                                proName={formData.proName}
                                productId={currentId || product?.id}
                                onSetGlobalTaskCount={(count) => setGlobalTaskCount(count)}
                                onMediaLibraryRequest={(callback) => {
                                    setMediaManagerMode('editor');
                                    setMediaLibraryCallback(() => callback);
                                    setIsMediaManagerOpen(true);
                                }}
                            />
                        </div>

                        {/* RIGHT: SEO (4/12) */}
                        <div className="xl:col-span-4 space-y-6">
                            <ProductSeoSection formData={formData} onChange={setFormData} />
                        </div>
                    </div>
                </div>
            </div>


            {/* ERROR / FOOTER ACTIONS */}
            <div className="bg-white/90 backdrop-blur-md p-4 border-t flex gap-4 md:px-20 lg:px-40">
                {currentMode === 'edit' && (
                    <button onClick={handleDeleteProduct} className="w-12 h-full flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                        <Icon name="trash" className="w-5 h-5" />
                    </button>
                )}
                <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Đóng</button>
                <button onClick={() => handleSave(false)} className="flex-1 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all">Lưu & Tiếp tục</button>
                <button onClick={() => handleSave(true)} disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                    {isSaving ? 'ĐANG LƯU...' : 'LƯU & ĐÓNG'}
                </button>
            </div>

            {/* MODALS */}
            <BrandSelectionModal isOpen={brandManager.open} onClose={() => setBrandManager({ ...brandManager, open: false })} onSelect={b => setFormData({ ...formData, brandId: b.id })} selectedId={formData.brandId} />
            <CategorySelectionModal isOpen={catManager.open} onClose={() => setCatManager({ ...catManager, open: false })} onSelect={ids => setFormData({ ...formData, catId: ids })} selectedId={formData.catId} multiple={true} />

            <MediaManagerModal
                isOpen={isMediaManagerOpen}
                onClose={() => setIsMediaManagerOpen(false)}
                onSelect={(items) => {
                    if (mediaLibraryCallback) {
                        mediaLibraryCallback(items);
                    } else if (mediaManagerMode === 'gallery') {
                        // Batch add to gallery
                        const newImages = items.map(media => ({
                            id: media.id,
                            url: media.url,
                            displayUrl: media.url,
                            is_temp: false
                        }));
                        setFullImages(prev => [...prev, ...newImages]);
                        toast.success(`Đã thêm ${items.length} ảnh`);
                    }
                    setMediaLibraryCallback(null);
                }}
                mode={mediaManagerMode === 'editor' ? 'select' : 'multi-select'}
            />

            {/* Full Editor Modal (Legacy/Fallback if needed) */}
            <Modal isOpen={fullEditor.open} onClose={() => setFullEditor({ ...fullEditor, open: false })} title={fullEditor.type === 'description' ? 'Chi tiết bài viết' : 'Thông số kỹ thuật'}>
                <RichTextEditor
                    value={fullEditor.type === 'description' ? formData.description : formData.spec}
                    onChange={v => setFormData({ ...formData, [fullEditor.type]: v })}
                    proName={formData.proName}
                    productId={currentId || product?.id}
                    className="h-[600px]"
                />
            </Modal>

            {/* [LIGHTBOX MOI] */}
            {previewImage && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-fadeIn" onClick={() => setPreviewImage(null)}>
                    {/* Toolbar */}
                    <div className="absolute top-6 right-6 flex items-center gap-3">
                        <button
                            className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white backdrop-blur-md"
                            onClick={(e) => { e.stopPropagation(); downloadImage(previewImage); }}
                            title="Tải ảnh về máy"
                        >
                            <Icon name="download" className="w-6 h-6" />
                        </button>
                        <button
                            className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white backdrop-blur-md"
                            onClick={() => setPreviewImage(null)}
                        >
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    </div>

                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scaleIn select-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div >
    );
};

export default ProductMobileDetailV2;

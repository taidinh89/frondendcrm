import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { productApi } from '../../api/admin/productApi';
import { metaApi } from '../../api/admin/metaApi';
import { Icon, Modal } from '../ui';
import { SectionHeader, FormField, ToggleField } from './ProductFormElements';
import ProductSeoSection from './ProductSeoSection';
import ProductContentSection from './ProductContentSection';
import axiosClient from '../../axiosGlobal';
import RichTextEditor, { cleanHtmlForEditor } from '../Core/RichTextEditor';

// Placeholders
import { PLACEHOLDER_NO_IMAGE_SQUARE } from '../../constants/placeholders';
import BrandSelectionModal from '../Modals/BrandSelectionModal';
import CategorySelectionModal from '../Modals/CategorySelectionModal';
import MediaManagerModal from '../Modals/MediaManagerModal';

const LinkedProductDetailV3 = ({ isOpen, onClose, product, onRefresh, dictionary }) => {
    // --- STATE MANAGEMENT ---
    const [activeTabId, setActiveTabId] = useState(null);
    const [tabs, setTabs] = useState([]);

    // Core State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
    const isProcessingPaste = useRef(false);

    // Form Data
    const [formData, setFormData] = useState({
        proName: '', request_path: '', productModel: '', tags: '', storeSKU: '',
        weight: 0, brandId: '', proSummary: '', specialOffer: '',
        price: 0, market_price: 0, quantity: 0, warranty: '',
        condition: 'New', isOn: true, hasVAT: 0,
        is_hot: false, is_new: true, is_best_sell: false, is_sale_off: false,
        catId: [], description: '', spec: '', purchase_price_web: 0,
        meta_title: '', meta_keyword: '', meta_description: '', accessory: '',
        view_count: 0, sold_count: 0, like_count: 0,
        parent_id: null,
        site_code: 'QVC' // Default
    });

    const [fullImages, setFullImages] = useState([]);
    const [parentData, setParentData] = useState(null);

    // Sub-States
    const [tempUploadedIds, setTempUploadedIds] = useState([]);
    const [brandManager, setBrandManager] = useState({ open: false, mode: 'list' });
    const [catManager, setCatManager] = useState({ open: false, mode: 'list' });

    // Media Manager State
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [mediaManagerMode, setMediaManagerMode] = useState('gallery');
    const [mediaLibraryCallback, setMediaLibraryCallback] = useState(null);
    const [previewImage, setPreviewImage] = useState(null); // Lightbox State

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && product) {
            initializeMainTab(product.id);
        }
    }, [isOpen, product]);

    const initializeMainTab = async (rootId) => {
        setIsLoading(true);
        try {
            const resMain = await productApi.getDetail(rootId);
            const mainProd = resMain.data;
            const resLinks = await axiosClient.get(`/api/v2/product-links/${rootId}`);
            const links = resLinks.data.data || [];

            const newTabs = [
                { id: mainProd.id, site_code: 'QVC', proName: mainProd.proName, is_root: true, data: mainProd }
            ];

            links.forEach(link => {
                if (link.target_product) {
                    newTabs.push({
                        id: link.target_product_id,
                        site_code: link.site_code,
                        proName: link.target_product.proName,
                        is_root: false,
                        data: null
                    });
                }
            });

            setTabs(newTabs);
            setActiveTabId(rootId);
            mapProductToForm(mainProd, 'QVC');
            setParentData(null);

        } catch (e) {
            toast.error("Lỗi khởi tạo dữ liệu: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchTab = async (tabId) => {
        if (tabId === activeTabId) return;
        setIsLoading(true);
        try {
            const tab = tabs.find(t => t.id === tabId);
            if (!tab) return;

            const res = await productApi.getDetail(tabId);
            const prodData = res.data;

            setActiveTabId(tabId);
            mapProductToForm(prodData, tab.site_code);

            if (!tab.is_root) {
                const rootTab = tabs.find(t => t.is_root);
                if (rootTab) {
                    if (!rootTab.data) {
                        const resRoot = await productApi.getDetail(rootTab.id);
                        setParentData(resRoot.data);
                        setTabs(prev => prev.map(t => t.id === rootTab.id ? { ...t, data: resRoot.data } : t));
                    } else {
                        setParentData(rootTab.data);
                    }
                }
            } else {
                setParentData(null);
            }
        } catch (e) {
            toast.error("Lỗi chuyển tab");
        } finally {
            setIsLoading(false);
        }
    };

    const mapProductToForm = (d, forceSiteCode = null) => {
        setFullImages(d.full_images || []);
        const siteCode = forceSiteCode || d.site_code || 'QVC';

        setFormData({
            ...d,
            request_path: d.request_path || d.url || '',
            productModel: d.productModel || d.model_code || '',
            storeSKU: d.storeSKU || d.sku || '',
            brandId: String(d.brandId || ''),
            proSummary: d.proSummary || '',
            specialOffer: d.specialOffer || '', // [NEW]
            price: parseFloat(d.price_web || d.price || 0),
            quantity: parseInt(d.quantity_web || d.quantity || 0),
            isOn: d.isOn == 1 || d.is_on == 1,
            catId: d.product_cat_web ? String(d.product_cat_web).split(',').filter(Boolean) : (d.categories_list || []),
            description: d.description || d.details?.description || '',
            spec: d.spec || d.details?.spec || '', // [NEW]

            // SEO & Extra Fields
            meta_title: d.meta_title || '',
            meta_keyword: d.meta_keyword || '',
            meta_description: d.meta_description || '',
            weight: d.weight || 0,
            hasVAT: d.hasVAT || 0,
            warranty: d.warranty || '',
            purchase_price_web: d.purchase_price_web || 0, // [NEW]

            parent_id: d.parent_id,
            site_code: siteCode
        });
    };

    // --- GLOBAL PASTE HANDLER ---
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = async (e) => {
            const isInput = e.target.closest('input, textarea, [contenteditable]');
            if (isProcessingPaste.current) return;
            if (isInput) return; // Let RichTextEditor or Input handle itself

            // A. File (Screenshot)
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    smartUploadHandler(file);
                }
            }
            // B. URL
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    if (window.confirm(`Tải ảnh từ link?\n${text}`)) {
                        smartUploadHandler(text, 'gallery');
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isOpen, activeTabId]); // Re-bind on tab change if needed

    // --- SMART UPLOAD ---
    const smartUploadHandler = async (fileOrUrl, targetMode = 'gallery') => {
        const tid = toast.loading("Đang xử lý ảnh...");
        try {
            const formDataUpload = new FormData();
            if (fileOrUrl instanceof File) formDataUpload.append('image', fileOrUrl);
            else formDataUpload.append('image_url', fileOrUrl);

            // "id alt thong minh" - Backend uses temp_context for naming/alt
            formDataUpload.append('temp_context', formData.proName ? formData.proName.substring(0, 50) : 'product');
            formDataUpload.append('source', 'v3_linked_manager');

            const res = await productApi.smartUpload(formDataUpload);
            const newImage = res.data;
            const finalUrl = newImage.url || newImage.image_url || newImage.displayUrl;

            // Add to Gallery
            setTempUploadedIds(prev => [...prev, newImage.id]);
            setFullImages(prev => [...prev, { id: newImage.id, url: finalUrl, displayUrl: finalUrl, is_temp: true }]);
            // Auto Sync separation if editing child site?
            // If in Child Site, adding an image will trigger Diff immediately on Save.

            toast.success("Đã thêm ảnh!", { id: tid });
        } catch (e) {
            toast.error("Lỗi upload: " + e.message, { id: tid });
        }
    };

    // --- IMAGE ACTIONS ---
    const handleDeleteImage = async (imgId) => {
        if (!window.confirm("Xóa ảnh này?")) return;
        // In V3 Linked, we just remove from UI first. Real delete on Save or explicit API?
        // V2 deletes immediately. Let's match V2.
        try {
            await productApi.deleteImage(activeTabId, imgId);
            setFullImages(prev => prev.filter(img => img.id !== imgId));
            toast.success("Đã xóa");
        } catch (e) {
            toast.error("Lỗi xóa: " + e.message);
        }
    };

    const handleSetMain = async (imgId) => {
        try {
            await productApi.setMainImage(activeTabId, imgId);
            // Optimistic update
            setFullImages(prev => prev.map(img => ({ ...img, is_main: img.id === imgId })));
            toast.success("Đã đặt làm ảnh chính");
        } catch (e) {
            toast.error("Lỗi: " + e.message);
        }
    };

    const downloadImage = async (url) => {
        if (!url) return;
        const tid = toast.loading("Đang tải...");
        try {
            const response = await fetch(url, { mode: 'cors' });
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `img_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Đã tải!", { id: tid });
        } catch (e) {
            window.open(url, '_blank');
            toast.dismiss(tid);
        }
    };

    // --- SAVE LOGIC ---
    const handleSave = async () => {
        if (!activeTabId) return;
        setIsSaving(true);
        const tid = toast.loading(`Đang lưu ${formData.site_code}...`);
        try {
            const catIdArray = Array.isArray(formData.catId) ? formData.catId : [];
            const catIdString = catIdArray.length > 0 ? `,${catIdArray.join(',')},` : '';

            const payload = {
                ...formData,
                product_cat: catIdString,
                product_cat_web: catIdString,
                isOn: formData.isOn ? 1 : 0
                // Add specific overrides logic if needed, but simple update works for now
                // Backend V2 Link Controller might need to know which fields are "Overrides"
                // But typically update() just updates the row.
            };

            await productApi.update(activeTabId, payload);
            toast.success("Lưu thành công!", { id: tid });

            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, data: payload } : t));
            if (onRefresh) onRefresh();

        } catch (e) {
            toast.error("Lỗi lưu dữ liệu: " + e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // --- CREATE LOGIC ---
    const handleCreateForSite = async (targetSiteCode) => {
        if (!targetSiteCode) return;
        if (!window.confirm(`Tạo bản sao cho site [${targetSiteCode}]?`)) return;

        setIsLoading(true);
        const tid = toast.loading(`Đang khởi tạo ${targetSiteCode}...`);
        try {
            const rootTab = tabs.find(t => t.is_root);
            const resRoot = await productApi.getDetail(rootTab.id);
            const rootData = resRoot.data;

            const payload = {
                ...rootData,
                proName: `${rootData.proName}`,
                storeSKU: `${rootData.storeSKU}`,
                site_code: targetSiteCode,
                isOn: 0
            };

            delete payload.id;
            delete payload.created_at;
            delete payload.updated_at;

            const createRes = await productApi.create(payload);
            const newProdId = createRes.data?.id || createRes.data?.data?.id;

            if (!newProdId) throw new Error("Không lấy được ID sản phẩm mới");

            await axiosClient.post(`/api/v2/product-links`, {
                source_product_id: rootTab.id,
                target_product_id: newProdId,
                link_type: 'VARIANT',
                site_code: targetSiteCode
            });

            toast.success(`Đã tạo site ${targetSiteCode}`, { id: tid });
            setIsAddSiteOpen(false);
            initializeMainTab(rootTab.id);

        } catch (e) {
            console.error(e);
            toast.error("Lỗi tạo site mới: " + e.message, { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    // --- SYNC HELPERS ---
    const isSeparated = (field) => {
        if (!parentData || !formData.parent_id) return false;
        return formData[field] != parentData[field];
    };

    const renderSyncStatus = (field) => {
        if (!parentData) return null;
        const separated = isSeparated(field);
        return (
            <div className="absolute right-0 top-0 -mt-2 -mr-2 z-10">
                {separated ? (
                    <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1 py-0.5 rounded border border-orange-200 flex items-center gap-1 shadow-sm" title="Khác QVC">
                        <Icon name="unlink" className="w-3 h-3" /> RIM
                    </span>
                ) : (
                    <span className="text-[8px] font-black bg-indigo-100 text-indigo-400 px-1 py-0.5 rounded flex items-center gap-1 opacity-50 hover:opacity-100 cursor-help" title="Tiếp tục đồng bộ">
                        <Icon name="link" className="w-3 h-3" /> SYNC
                    </span>
                )}
            </div>
        );
    };

    const handleResync = (field) => {
        if (!parentData) return;
        if (window.confirm(`Đồng bộ lại [${field}] theo QVC?`)) {
            setFormData(prev => ({ ...prev, [field]: parentData[field] }));
            toast.success("Đã đồng bộ!");
        }
    };

    const handlePreview = () => {
        if (!formData.request_path) return;
        const siteParam = formData.site_code === 'QVC' ? '' : `?site=${formData.site_code}`;
        window.open(`/products${formData.request_path}${siteParam}`, '_blank');
    };

    if (!isOpen) return null;

    const SITE_OPTIONS = [
        { code: 'THIENDUC', label: 'Thiên Đức' },
        { code: 'BANBUON', label: 'Bán Buôn' },
        { code: 'HOCSINH', label: 'Học Sinh' }
    ];
    const availableSites = SITE_OPTIONS.filter(s => !tabs.some(t => t.site_code === s.code));

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 animate-slideUp">
            {/* 1. TOP BAR */}
            <div className="bg-white border-b px-4 pt-4 flex items-end gap-2 shadow-sm z-50">
                <div className="flex-1 flex overflow-x-auto custom-scrollbar items-end gap-2 pb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleSwitchTab(tab.id)}
                            className={`
                                relative px-5 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest border-t border-x transition-all flex items-center gap-2 min-w-[140px] whitespace-nowrap group
                                ${activeTabId === tab.id
                                    ? 'bg-slate-50 border-slate-200 text-indigo-600 shadow-[0_4px_0_white] z-10'
                                    : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-200 hover:text-gray-600'}
                            `}
                        >
                            {tab.is_root && <Icon name="database" className="w-3 h-3" />}
                            {tab.site_code === 'QVC' ? 'QVC (GỐC)' : tab.site_code}
                            <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl transition-colors ${activeTabId === tab.id ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-gray-300'}`}></div>
                        </button>
                    ))}
                </div>

                <div className="relative pb-1 shrink-0">
                    <button onClick={() => setIsAddSiteOpen(!isAddSiteOpen)} className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all mb-1.5"><Icon name="plus" className="w-4 h-4" /></button>
                    {isAddSiteOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-[100] animate-scaleIn origin-top-right">
                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-2">Tạo Site Mới</div>
                            {availableSites.map(s => (
                                <button key={s.code} onClick={() => handleCreateForSite(s.code)} className="w-full text-left px-2 py-2 rounded-lg hover:bg-emerald-50 text-xs font-bold text-slate-700 flex justify-between items-center group">
                                    {s.label}
                                    <Icon name="plus-circle" className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 pb-2 pl-2 border-l border-gray-100 ml-2 shrink-0">
                    <button onClick={handlePreview} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-[10px] font-black uppercase hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center gap-2">
                        <Icon name="eye" className="w-3 h-3" /> PREVIEW {formData.site_code}
                    </button>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-rose-100 hover:text-rose-500">
                        <Icon name="x" className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT - EXACT V2 LAYOUT */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32">
                <div className="max-w-[1600px] mx-auto space-y-4">

                    {/* NAME HEADER */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
                        {renderSyncStatus('proName')}
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-[2]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên sản phẩm</label>
                                <input
                                    value={formData.proName}
                                    onChange={e => setFormData({ ...formData, proName: e.target.value })}
                                    className="w-full font-bold text-lg text-slate-800 border-b-2 border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Slug</label>
                                <input
                                    value={formData.request_path}
                                    readOnly={formData.site_code !== 'QVC'}
                                    className={`w-full font-mono text-sm font-bold text-blue-600 border-b-2 border-transparent outline-none ${formData.site_code !== 'QVC' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* V2 GRID SYSTEM */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                        {/* COLUMN 1: SPECS (3/12) */}
                        <div className="xl:col-span-3 space-y-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('brandId')}
                                <SectionHeader title="Phân loại" icon="hash" color="indigo" />
                                <div className="space-y-3 mt-4">
                                    <FormField type="select" label="Thương hiệu" options={dictionary?.brands} value={formData.brandId} onChange={v => setFormData({ ...formData, brandId: v })} onManage={() => setBrandManager({ open: true, mode: 'list' })} />
                                    <FormField type="select" label="Danh mục" options={dictionary?.categories} value={formData.catId} onChange={v => setFormData({ ...formData, catId: v })} multiple={true} onManage={() => setCatManager({ open: true, mode: 'list' })} />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('storeSKU')}
                                <SectionHeader title="Định danh" icon="tag" color="blue" />
                                <div className="space-y-3 mt-4">
                                    <FormField label="Mã SKU" value={formData.storeSKU} onChange={v => setFormData({ ...formData, storeSKU: v })} />
                                    <FormField label="Model / NSX" value={formData.productModel} onChange={v => setFormData({ ...formData, productModel: v })} />
                                    <FormField label="Khối lượng (g)" type="number" value={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} />
                                    <div className="pt-2"><ToggleField label="Hiện Web" checked={formData.isOn} onChange={v => setFormData({ ...formData, isOn: v })} color="green" /></div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: IMAGES (5/12) */}
                        <div className="xl:col-span-5 space-y-4 h-full">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col relative">
                                {renderSyncStatus('fullImages')}
                                <div className="flex justify-between items-center mb-4">
                                    <SectionHeader title={`Thư viện ảnh (${fullImages.length})`} icon="image" color="orange" />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setMediaManagerMode('gallery'); setIsMediaManagerOpen(true); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Kho ảnh</button>
                                        <label className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all cursor-pointer">
                                            + Upload
                                            <input type="file" className="hidden" onChange={e => smartUploadHandler(e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                                <div className={`flex-1 min-h-[300px] bg-slate-50/50 rounded-xl border border-dashed p-4 grid grid-cols-4 gap-3 ${isSeparated('fullImages') ? 'border-orange-300' : 'border-slate-200'}`}>
                                    {fullImages.length > 0 ? fullImages.map((img, i) => (
                                        <div key={i} className={`relative aspect-square rounded-xl border overflow-hidden bg-white group ${img.is_main ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-200'}`}>
                                            <img src={img.url || img.displayUrl} onClick={() => setPreviewImage(img.url || img.displayUrl)} className="w-full h-full object-contain p-1 cursor-pointer" />
                                            {img.is_main && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg">MAIN</div>}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                {!img.is_main && <button onClick={() => handleSetMain(img.id)} className="p-1 bg-white rounded shadow text-indigo-600"><Icon name="check" className="w-3 h-3" /></button>}
                                                <button onClick={() => handleDeleteImage(img.id)} className="p-1 bg-white rounded shadow text-red-600"><Icon name="trash" className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="col-span-full flex flex-col items-center justify-center text-slate-300">
                                            <Icon name="image" className="w-10 h-10" />
                                            <span className="text-xs font-bold uppercase mt-2">Chưa có ảnh</span>
                                        </div>
                                    )}
                                </div>
                                {isSeparated('fullImages') && <button onClick={() => handleResync('fullImages')} className="text-[10px] text-orange-500 underline text-right mt-2">Đồng bộ lại ảnh</button>}
                            </div>
                        </div>

                        {/* COLUMN 3: SALES & CONTENT (4/12) */}
                        <div className="xl:col-span-4 space-y-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('price')}
                                <SectionHeader title="Giá & Kho" icon="dollar-sign" color="red" />
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giá bán lẻ</label>
                                        <div className="relative">
                                            <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full font-black text-xl text-red-600 border-b border-slate-200 outline-none pb-1" />
                                            <span className="absolute right-0 bottom-1 text-xs font-bold text-red-400">VNĐ</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tồn kho</label>
                                        <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full font-black text-xl text-slate-800 border-b border-slate-200 outline-none pb-1" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Giá vốn</label>
                                        <input type="number" value={formData.purchase_price_web} onChange={e => setFormData({ ...formData, purchase_price_web: e.target.value })} className="w-full font-bold text-sm text-slate-600 border-b border-slate-200 outline-none pb-1" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bảo hành</label>
                                        <input value={formData.warranty} onChange={e => setFormData({ ...formData, warranty: e.target.value })} className="w-full font-bold text-sm text-slate-600 border-b border-slate-200 outline-none pb-1" />
                                    </div>
                                    {isSeparated('price') && <div className="col-span-2 text-right"><button onClick={() => handleResync('price')} className="text-[10px] text-orange-500 underline">Đồng bộ lại</button></div>}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative flex-1">
                                {renderSyncStatus('proSummary')}
                                <SectionHeader title="Mô tả - Nội dung" icon="file-text" color="purple" />
                                <div className="mt-4">
                                    <label className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block">Mô tả ngắn</label>
                                    <textarea
                                        value={formData.proSummary}
                                        onChange={e => setFormData({ ...formData, proSummary: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-purple-500 transition-all min-h-[140px] resize-none"
                                        placeholder="Nhập tóm tắt..."
                                    ></textarea>
                                </div>
                                <div className="mt-2 text-right text-[10px] text-gray-400 italic">Hỗ trợ dán ảnh từ Clipboard (Ctrl+V)</div>
                            </div>
                        </div>

                    </div>

                    {/* BOTTOM: TABS FOR DESC, SPEC, OFFER */}
                    <div className="pt-4 border-t border-dashed border-slate-200 grid grid-cols-1 xl:grid-cols-12 gap-4">
                        {/* LEFT: CONTENT (8/12) */}
                        <div className="xl:col-span-8 space-y-6">
                            {/* KHUYEN MAI (SPECIAL OFFER) */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('specialOffer')}
                                <SectionHeader title="Khuyến mãi & Ưu đãi" icon="gift" color="rose" />
                                <div className="mt-4">
                                    <RichTextEditor
                                        value={formData.specialOffer}
                                        onChange={v => setFormData({ ...formData, specialOffer: v })}
                                        className="min-h-[150px]"
                                        placeholder="Nhập nội dung khuyến mãi..."
                                    />
                                </div>
                            </div>

                            {/* MAIN CONTENT */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('description')}
                                <SectionHeader title="Chi tiết bài viết" icon="align-left" color="slate" />
                                <div className={`mt-4 rounded-xl border overflow-hidden ${isSeparated('description') ? 'border-orange-300 ring-2 ring-orange-50' : 'border-slate-200'}`}>
                                    <RichTextEditor
                                        value={formData.description}
                                        onChange={v => setFormData({ ...formData, description: v })}
                                        className="min-h-[500px]"
                                    />
                                </div>
                                {isSeparated('description') && <div className="mt-2 text-right"><button onClick={() => handleResync('description')} className="text-[10px] font-bold text-white bg-orange-500 px-3 py-1 rounded-lg shadow uppercase">Đồng bộ lại với QVC</button></div>}
                            </div>

                            {/* SPECS */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('spec')}
                                <SectionHeader title="Thông số kỹ thuật" icon="list" color="blue" />
                                <div className="mt-4">
                                    <RichTextEditor
                                        value={formData.spec}
                                        onChange={v => setFormData({ ...formData, spec: v })}
                                        className="min-h-[300px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: SEO (4/12) */}
                        <div className="xl:col-span-4">
                            <ProductSeoSection formData={formData} onChange={setFormData} />
                        </div>
                    </div>

                </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md p-4 border-t flex gap-4 justify-end md:px-20 lg:px-40 z-[60]">
                <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold uppercase text-xs hover:bg-slate-200">Đóng</button>
                <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                    {isSaving ? 'Đang lưu...' : `Lưu thay đổi (${formData.site_code})`}
                </button>
            </div>

            <BrandSelectionModal isOpen={brandManager.open} onClose={() => setBrandManager({ ...brandManager, open: false })} />
            <CategorySelectionModal isOpen={catManager.open} onClose={() => setCatManager({ ...catManager, open: false })} />

            <MediaManagerModal
                isOpen={isMediaManagerOpen}
                onClose={() => setIsMediaManagerOpen(false)}
                onSelect={(items) => {
                    const newImages = items.map(media => ({
                        id: media.id,
                        url: media.url,
                        displayUrl: media.url,
                        is_temp: false
                    }));
                    setFullImages(prev => [...prev, ...newImages]);
                    setIsMediaManagerOpen(false);
                }}
            />

            {previewImage && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-10 animate-fadeIn" onClick={() => setPreviewImage(null)}>
                    <button onClick={(e) => { e.stopPropagation(); downloadImage(previewImage); }} className="absolute top-6 right-20 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white"><Icon name="download" className="w-6 h-6" /></button>
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white"><Icon name="x" className="w-6 h-6" /></button>
                    <img src={previewImage} className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}

        </div>
    );
};

export default LinkedProductDetailV3;

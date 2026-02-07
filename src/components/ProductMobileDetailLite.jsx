import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { productApi } from '../api/admin/productApi';
import { Icon } from './ui';
import { SectionHeader, FormField, ToggleField } from './ProductFormElements';
import ProductSeoSection from './ProductSeoSection';
import ProductContentSection from './ProductContentSection';
import axiosClient from '../axiosGlobal';

import BrandSelectionModal from './BrandSelectionModal';
import CategorySelectionModal from './CategorySelectionModal';
import UnifiedMediaManagerModal from './UnifiedMediaManagerModal';
import { PLACEHOLDER_NO_IMAGE_SQUARE } from '../constants/placeholders';

/**
 * [V4 - LITE MODE] Pure Mobile Optimized Layout
 * Focuses on vertical stacking, large touch targets, and minimalist overhead.
 */
const ProductMobileDetailLite = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess, onSwitchVersion }) => {
    // --- BASIC LOGIC REUSED FROM V3 ---
    const [currentMode, setCurrentMode] = useState(mode);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        proName: '', url: '', productModel: '', tags: '', storeSKU: '',
        weight: 0, brandId: '', proSummary: '', specialOffer: '',
        price: 0, market_price: 0, quantity: 0, warranty: '',
        condition: 'New', isOn: true,
        catId: [], description: '', spec: '', media_ids: [], site_code: 'QVC'
    });
    const [fullImages, setFullImages] = useState([]);
    const [baseData, setBaseData] = useState(null);
    const [activeSection, setActiveSection] = useState('basic'); // 'basic', 'media', 'content', 'seo'

    // Modals
    const [brandManager, setBrandManager] = useState({ open: false });
    const [catManager, setCatManager] = useState({ open: false });
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // [V4.1] Multi-Site Support
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);

    // [V4.1] Paste Logic
    const isProcessingPaste = useRef(false);
    const [isMouseInMediaZone, setIsMouseInMediaZone] = useState(false);
    const mouseInMediaZoneRef = useRef(false);
    const formDataRef = useRef(formData);

    useEffect(() => { mouseInMediaZoneRef.current = isMouseInMediaZone; }, [isMouseInMediaZone]);
    useEffect(() => { formDataRef.current = formData; }, [formData]);

    // CTRL+V Image Upload Logic
    useEffect(() => {
        const handlePaste = async (e) => {
            if (!isOpen || !mouseInMediaZoneRef.current) return;
            if (isProcessingPaste.current) return;

            const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
            if (!items) return;

            const filesToUpload = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) filesToUpload.push(blob);
                }
            }

            if (filesToUpload.length === 0) return;

            e.preventDefault();
            isProcessingPaste.current = true;
            try {
                for (const blob of filesToUpload) {
                    const currentForm = formDataRef.current;
                    const baseName = currentForm.proName || 'img-paste';
                    const slug = baseName.toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '');

                    const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
                    const fileName = `${slug}-${randomId}.png`;
                    const file = new File([blob], fileName, { type: 'image/png' });
                    await smartUploadHandler(file);
                }
            } finally {
                setTimeout(() => { isProcessingPaste.current = false; }, 500);
            }
        };

        if (isOpen) { window.addEventListener('paste', handlePaste); }
        return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && product) {
            if (product.id && product.id !== 'temp') {
                initializeTabs(product.id);
            } else {
                mapProductToForm(product);
                setActiveTabId('temp');
            }
        }
    }, [isOpen, product]);

    const initializeTabs = async (rootId) => {
        setIsLoading(true);
        try {
            const resMain = await productApi.getDetailV2(rootId);
            const mainProd = resMain.data.data || resMain.data;

            const resLinks = await axiosClient.get(`/api/v2/product-links/${rootId}`);
            const links = resLinks.data.data || [];

            const newTabs = [
                { id: mainProd.id, site_code: 'QVC', is_root: true, data: mainProd }
            ];

            links.forEach(link => {
                if (link.target_product) {
                    newTabs.push({
                        id: link.target_product_id,
                        site_code: link.site_code,
                        is_root: false,
                        data: null
                    });
                }
            });

            setTabs(newTabs);
            setActiveTabId(mainProd.id);
            mapProductToForm(mainProd);
        } catch (e) {
            toast.error("Lỗi nạp danh sách chi nhánh");
            fetchDetail(rootId); // Fallback to single detail
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchTab = async (tabId) => {
        if (tabId === activeTabId) return;
        setIsLoading(true);
        try {
            const res = await productApi.getDetailV2(tabId);
            const prodData = res.data.data || res.data;
            setActiveTabId(tabId);
            mapProductToForm(prodData);
        } catch (e) {
            toast.error("Lỗi chuyển chi nhánh");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateForSite = async (targetSite) => {
        if (!window.confirm(`Kích hoạt sản phẩm này cho chi nhánh ${targetSite}?`)) return;

        setIsLoading(true);
        const tid = toast.loading(`Đang khởi tạo bản cho ${targetSite}...`);
        try {
            const rootId = tabs.find(t => t.is_root)?.id;
            const res = await axiosClient.post(`/api/v2/product-links/${rootId}/sync/${targetSite}`);
            const newProd = res.data.data || res.data;

            toast.success(`Đã kích hoạt ${targetSite}!`, { id: tid });
            setIsAddSiteOpen(false);
            initializeTabs(rootId); // Refresh tabs
        } catch (e) {
            toast.error("Lỗi kích hoạt: " + (e.response?.data?.message || e.message), { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDetail = async (id) => {
        if (!id || id === 'temp') {
            mapProductToForm(product);
            return;
        }
        setIsLoading(true);
        try {
            const res = await productApi.getDetailV2(id);
            mapProductToForm(res.data.data || res.data);
            setActiveTabId(id);
        } catch (e) {
            toast.error("Lỗi nạp dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    const mapProductToForm = (d) => {
        const images = (d.media || d.full_images || []).map(m => ({
            ...m,
            id: m.master_file?.id || m.media_file_id || m.id,
            displayUrl: m.url || m.preview_url
        }));
        setFullImages(images);

        const data = {
            proName: d.proName || '',
            request_path: d.request_path || d.url || '',
            productModel: d.productModel || d.model_code || '',
            tags: d.tags || '',
            storeSKU: d.storeSKU || d.sku || '',
            weight: d.weight || 0,
            brandId: d.brandId ? String(d.brandId) : '',
            proSummary: d.proSummary || '',
            price: parseFloat(d.price_web || d.price || 0),
            market_price: parseFloat(d.market_price || 0),
            quantity: parseInt(d.quantity_web || d.quantity || 0),
            warranty: d.warranty_web || d.warranty || '',
            condition: d.condition || 'New',
            isOn: d.isOn == 1 || d.is_on == 1,
            catId: d.product_cat_web ? String(d.product_cat_web).split(',').filter(Boolean) : (d.categories_list || []),
            description: d.description || d.details?.description || '',
            spec: d.spec || d.details?.spec || '',
            media_ids: d.media_ids || images.map(img => img.id),
            site_code: d.site_code || 'QVC',
            is_hot: !!(d.marketing_flags?.is_hot || d.is_hot),
            is_new: !!(d.marketing_flags?.is_new || d.is_new),
            is_best_sell: !!(d.marketing_flags?.is_best_sell || d.is_best_sell),
            is_sale_off: !!(d.marketing_flags?.is_sale_off || d.is_sale_off)
        };
        setFormData(data);
        setBaseData(JSON.parse(JSON.stringify(data)));
    };

    const isDirty = useMemo(() => {
        if (!baseData) return false;
        return JSON.stringify(formData) !== JSON.stringify(baseData);
    }, [formData, baseData]);

    const isFieldDirty = (f) => {
        if (!baseData) return false;
        return JSON.stringify(formData[f]) !== JSON.stringify(baseData[f]);
    };

    const standardImages = useMemo(() => {
        const crmHost = window.location.origin.includes('maytinhquocviet.com') ? window.location.origin : 'https://crm.maytinhquocviet.com';
        return fullImages.map(img => {
            let url = img.full_url || img.url || img.image_url || img.displayUrl || img.preview_url || img.master_file?.paths?.original;
            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                url = url.startsWith('/') ? crmHost + url : crmHost + '/' + url;
            }
            return { ...img, displayUrl: url || PLACEHOLDER_NO_IMAGE_SQUARE };
        });
    }, [fullImages]);

    const handleSave = async () => {
        setIsSaving(true);
        const tid = toast.loading("Đang lưu...");
        try {
            const payload = { ...formData };
            // Simple mapping for Lite
            payload.product_cat_web = payload.catId.length > 0 ? `,${payload.catId.join(',')},` : '';

            if (product?.id && product.id !== 'temp') {
                await productApi.updateV2(product.id, payload);
            } else {
                await productApi.createV2(payload);
            }
            toast.success("Lưu thành công", { id: tid });
            setBaseData(JSON.parse(JSON.stringify(formData))); // Reset base after save
            onRefresh && onRefresh();
            if (!product?.id || product.id === 'temp') {
                onSuccess && onSuccess();
            }
        } catch (e) {
            toast.error("Lỗi: " + e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn XÓA sản phẩm này? Thao tác này không thể hoàn tác.")) return;
        setIsLoading(true);
        const tid = toast.loading("Đang xóa...");
        try {
            await productApi.deleteV2(product.id);
            toast.success("Đã xóa sản phẩm", { id: tid });
            onRefresh && onRefresh();
            onClose();
        } catch (e) {
            toast.error("Lỗi xóa: " + e.message, { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (isDirty) {
            if (!window.confirm("Bạn có thay đổi chưa lưu. Vẫn muốn đóng?")) return;
        }
        onClose();
    };

    const getPlatformUrl = (siteCode, slug, id) => {
        if (!slug && !id) return '#';
        const cleanPath = (slug || String(id)).replace(/^\/+/, '');
        if (siteCode === 'QVC') {
            let finalSlug = cleanPath;
            if (!finalSlug.endsWith('.html')) finalSlug += '.html';
            return `https://qvc.vn/${finalSlug}`;
        }
        const currentOrigin = window.location.origin;
        const targetSite = siteCode === 'QVC_INTERNAL' ? 'QVC' : siteCode;
        let finalPath = cleanPath;
        if (!finalPath.endsWith('.html')) finalPath += '.html';
        return `${currentOrigin}/products/${finalPath}?site=${targetSite}`;
    };

    const handleDeleteImage = (id) => {
        setFullImages(prev => prev.filter(i => i.id !== id));
        setFormData(prev => ({ ...prev, media_ids: prev.media_ids.filter(i => i !== id) }));
    };

    const smartUploadHandler = async (fileOrUrl) => {
        const tid = toast.loading("Đang tải ảnh...");
        try {
            const fd = new FormData();
            if (fileOrUrl instanceof File) fd.append('image', fileOrUrl);
            else fd.append('image_url', fileOrUrl);

            fd.append('temp_context', (formData.proName || 'context').substring(0, 30));
            fd.append('source', 'mobile_lite_paste');

            const res = await productApi.smartUpload(fd);
            const newImg = res.data.data || res.data;
            const url = newImg.url || newImg.displayUrl || newImg.preview_url;
            const fileId = newImg.id || newImg.master_file_id || (newImg.data && newImg.data.id);

            if (!fileId) throw new Error("ID ảnh trống");

            setFullImages(prev => [...prev, { ...newImg, id: fileId, displayUrl: url, is_temp: true }]);
            setFormData(prev => ({
                ...prev,
                media_ids: [...new Set([...(prev.media_ids || []), fileId])]
            }));

            toast.success("Đã dán ảnh!", { id: tid });
        } catch (e) {
            toast.error("Lỗi: " + e.message, { id: tid });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col font-sans overflow-hidden">
            {/* STICKY HEADER - LITE */}
            <div className="shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button onClick={handleBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <Icon name="arrow-left" className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
                            {formData.proName || 'Sản phẩm mới'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">LITE (V4) • {formData.site_code}</span>
                            {typeof onSwitchVersion === 'function' && (
                                <button onClick={onSwitchVersion} className="text-[10px] font-bold text-slate-400 underline">V3</button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {!isDirty && product?.id && product.id !== 'temp' && (
                        <>
                            <a
                                href={getPlatformUrl('QVC', formData.request_path, product.id)}
                                target="_blank" rel="noopener noreferrer"
                                className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                title="Xem trên QVC.VN"
                            >
                                <Icon name="external-link" className="w-4.5 h-4.5" />
                            </a>
                            <a
                                href={getPlatformUrl(formData.site_code, formData.request_path, product.id)}
                                target="_blank" rel="noopener noreferrer"
                                className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                title="Xem Nội Bộ"
                            >
                                <Icon name="eye" className="w-4.5 h-4.5" />
                            </a>
                            <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa sản phẩm">
                                <Icon name="trash" className="w-4.5 h-4.5" />
                            </button>
                        </>
                    )}

                    {(isDirty || !product?.id || product.id === 'temp') ? (
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all animate-scaleIn"
                        >
                            {isSaving ? '...' : (!product?.id || product.id === 'temp' ? 'TẠO MỚI' : 'LƯU')}
                        </button>
                    ) : (
                        <button
                            onClick={handleBack}
                            className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                        >
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* SITES TAB (MULTISITE LITE) */}
            <div className="shrink-0 bg-white border-b flex items-center overflow-x-auto no-scrollbar px-4 py-2 gap-2 z-20 relative">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleSwitchTab(tab.id)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                            ${activeTabId === tab.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                    >
                        {tab.site_code === 'QVC' ? 'MASTER' : tab.site_code}
                    </button>
                ))}

                {activeTabId !== 'temp' && (
                    <button
                        onClick={() => setIsAddSiteOpen(!isAddSiteOpen)}
                        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all border
                            ${isAddSiteOpen ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
                    >
                        <Icon name={isAddSiteOpen ? "x" : "plus"} className="w-4 h-4" />
                    </button>
                )}

                {/* Add Site Popover */}
                {isAddSiteOpen && (
                    <div className="absolute top-[100%] left-4 right-4 mt-2 bg-white rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 p-2 z-[100] animate-slideUp max-h-[200px] overflow-y-auto">
                        <div className="text-[9px] font-black text-slate-400 p-2 uppercase tracking-widest border-b mb-1">Kích hoạt Site</div>
                        <div className="grid grid-cols-2 gap-1">
                            {dictionary?.sites?.filter(s => !tabs.some(t => t.site_code === s.code)).map(s => (
                                <button
                                    key={s.code}
                                    onClick={() => handleCreateForSite(s.code)}
                                    className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all text-left flex justify-between items-center"
                                >
                                    {s.code}
                                    <Icon name="plus" className="w-3 h-3" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* QUICK SECTIONS TAB (FOR MOBILE) */}
            <div className="shrink-0 bg-slate-50 border-b flex overflow-x-auto no-scrollbar px-2 z-20">
                {[
                    { id: 'basic', label: 'Cơ bản', icon: 'settings' },
                    { id: 'media', label: 'Hình ảnh', icon: 'image' },
                    { id: 'content', label: 'Nội dung', icon: 'file-text' },
                    { id: 'seo', label: 'SEO', icon: 'search' }
                ].map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex-shrink-0 px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2
                            ${activeSection === s.id ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400'}`}
                    >
                        <Icon name={s.icon} className="w-3.5 h-3.5" /> {s.label}
                    </button>
                ))}
            </div>

            {/* BODY - VERTICAL SCROLL */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 space-y-4 pb-24">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* BASIC INFO SECTION */}
                        {activeSection === 'basic' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <FormField label="Tên sản phẩm" value={formData.proName} onChange={v => setFormData({ ...formData, proName: v })} isDirty={isFieldDirty('proName')} />
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <FormField label="Model / MSX" value={formData.productModel} onChange={v => setFormData({ ...formData, productModel: v })} isDirty={isFieldDirty('productModel')} />
                                        <FormField label="SKU" value={formData.storeSKU} onChange={v => setFormData({ ...formData, storeSKU: v })} isDirty={isFieldDirty('storeSKU')} />
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
                                    <FormField label="Giá bán" type="number" value={formData.price} onChange={v => setFormData({ ...formData, price: v })} isDirty={isFieldDirty('price')} />
                                    <FormField label="Giá hãng" type="number" value={formData.market_price} onChange={v => setFormData({ ...formData, market_price: v })} isDirty={isFieldDirty('market_price')} />
                                    <FormField label="Số lượng" type="number" value={formData.quantity} onChange={v => setFormData({ ...formData, quantity: v })} isDirty={isFieldDirty('quantity')} />
                                    <FormField label="Bảo hành" value={formData.warranty} onChange={v => setFormData({ ...formData, warranty: v })} isDirty={isFieldDirty('warranty')} />
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                                    <FormField
                                        label="Thương hiệu"
                                        type="select"
                                        value={formData.brandId}
                                        options={dictionary?.brands || []}
                                        onChange={v => setFormData({ ...formData, brandId: v })}
                                        onManage={() => setBrandManager({ open: true })}
                                        isBrand
                                        isDirty={isFieldDirty('brandId')}
                                    />
                                    <FormField
                                        label="Danh mục"
                                        type="select"
                                        multiple
                                        value={formData.catId}
                                        options={dictionary?.categories || []}
                                        onChange={v => setFormData({ ...formData, catId: v })}
                                        onManage={() => setCatManager({ open: true })}
                                        isDirty={isFieldDirty('catId')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <ToggleField label="Hiển thị WEB" checked={formData.isOn} onChange={v => setFormData({ ...formData, isOn: v })} color="green" />
                                    <ToggleField label="Sản phẩm HOT" checked={formData.is_hot} onChange={v => setFormData({ ...formData, is_hot: v })} color="orange" />
                                </div>
                            </div>
                        )}

                        {/* MEDIA SECTION */}
                        {activeSection === 'media' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bộ sưu tập ({standardImages.length})</h3>
                                        <button onClick={() => setIsMediaManagerOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                            + Thêm ảnh
                                        </button>
                                    </div>
                                    <div
                                        onMouseEnter={() => setIsMouseInMediaZone(true)}
                                        onMouseLeave={() => setIsMouseInMediaZone(false)}
                                        className={`grid grid-cols-3 gap-3 p-4 border-2 border-dashed rounded-2xl transition-all ${isMouseInMediaZone ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-50'}`}
                                    >
                                        {standardImages.map(img => (
                                            <div key={img.id} className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden border group">
                                                <img src={img.displayUrl} className="w-full h-full object-contain p-1" />
                                                <button onClick={() => handleDeleteImage(img.id)} className="absolute top-1 right-1 w-6 h-6 bg-white/90 text-red-500 rounded-lg flex items-center justify-center shadow-md">
                                                    <Icon name="trash" className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {standardImages.length === 0 && (
                                            <div className="col-span-full py-10 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                                Dán ảnh (Ctrl+V) <br /> hoặc chọn từ kho
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONTENT SECTION */}
                        {activeSection === 'content' && (
                            <div className="space-y-4 animate-fadeIn">
                                <ProductContentSection
                                    formData={formData}
                                    onChange={setFormData}
                                    proName={formData.proName}
                                    productId={product.id}
                                    onMediaLibraryRequest={() => setIsMediaManagerOpen(true)}
                                />
                            </div>
                        )}

                        {/* SEO SECTION */}
                        {activeSection === 'seo' && (
                            <div className="space-y-4 animate-fadeIn">
                                <ProductSeoSection formData={formData} onChange={setFormData} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODALS REUSED */}
            <BrandSelectionModal isOpen={brandManager.open} onClose={() => setBrandManager({ open: false })} onSelect={b => setFormData({ ...formData, brandId: b.id })} selectedId={formData.brandId} />
            <CategorySelectionModal isOpen={catManager.open} onClose={() => setCatManager({ open: false })} onSelect={id => {
                const current = formData.catId;
                const sid = String(id);
                setFormData({ ...formData, catId: current.includes(sid) ? current.filter(x => x !== sid) : [...current, sid] });
            }} selectedId={formData.catId} multiple={true} />
            <UnifiedMediaManagerModal isOpen={isMediaManagerOpen} onClose={() => setIsMediaManagerOpen(false)} onSelect={items => {
                const newIds = items.map(m => m.id);
                const newImgs = items.map(m => ({ id: m.id, displayUrl: m.url || m.preview_url }));
                setFullImages(prev => [...prev, ...newImgs]);
                setFormData(prev => ({ ...prev, media_ids: [...new Set([...(prev.media_ids || []), ...newIds])] }));
            }} />
        </div>
    );
};

export default ProductMobileDetailLite;

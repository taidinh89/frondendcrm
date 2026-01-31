import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { productApi } from '../api/admin/productApi';
import { metaApi } from '../api/admin/metaApi';
import { Icon, Modal } from './ui';
import { SectionHeader, FormField, ToggleField } from './ProductFormElements';
import RichTextEditor from './RichTextEditor';
import BrandSelectionModal from './BrandSelectionModal';
import CategorySelectionModal from './CategorySelectionModal';
import MediaManagerModal from './MediaManagerModal';

const ProductMobileDetailV2 = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess }) => {
    // --- STATE MANAGEMENT ---
    const [currentMode, setCurrentMode] = useState(mode);
    const [currentId, setCurrentId] = useState(product?.id);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
                .catch(err => console.error("Missing Brand Detail:", err));
        }
    }, [formData.brandId, dictionary]);

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

    // --- DERIVED DATA ---
    const standardImages = useMemo(() => {
        const result = [...fullImages].map(img => {
            let url = img.url || img.image_url || img.image;
            if (url && !url.startsWith('http')) url = `https://qvc.vn/${url.replace(/^\//, '')}`;
            return { ...img, displayUrl: url || 'https://placehold.co/100x100?text=NoImage' };
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
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                        <Icon name="x" className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* BODY SCROLL */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. INFO */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <SectionHeader title="Thông tin chung" icon="info" color="blue" />
                            <div className="space-y-4">
                                <FormField label="Tên sản phẩm *" value={formData.proName} onChange={v => setFormData({ ...formData, proName: v })} placeholder="Nhập tên sản phẩm..." />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Mã SKU" value={formData.storeSKU} onChange={v => setFormData({ ...formData, storeSKU: v })} />
                                    <FormField label="Model / Mã NSX" value={formData.productModel} onChange={v => setFormData({ ...formData, productModel: v })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Request Path (Slug)" value={formData.request_path} onChange={v => setFormData({ ...formData, request_path: v })} />
                                    <FormField label="Trọng lượng (g)" type="number" value={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} />
                                </div>
                            </div>
                        </div>

                        {/* 2. CONTENT */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <SectionHeader title="Nội dung chi tiết" icon="file-text" color="purple" />
                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                                {['summary', 'description', 'spec'].map(t => (
                                    <button key={t} onClick={() => setStandardContentSubTab(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${standardContentSubTab === t ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {t === 'summary' ? 'Mô tả ngắn' : (t === 'description' ? 'Chi tiết' : 'Thông số')}
                                    </button>
                                ))}
                            </div>

                            {standardContentSubTab === 'summary' ? (
                                <FormField type="textarea" placeholder="Mô tả ngắn..." value={formData.proSummary} onChange={v => setFormData({ ...formData, proSummary: v })} />
                            ) : (
                                <RichTextEditor
                                    value={formData[standardContentSubTab]}
                                    onChange={v => setFormData({ ...formData, [standardContentSubTab]: v })}
                                    proName={formData.proName}
                                    onLibraryRequest={(cb) => {
                                        setMediaManagerMode('editor');
                                        setMediaLibraryCallback(() => cb);
                                        setIsMediaManagerOpen(true);
                                    }}
                                />
                            )}
                        </div>

                        {/* 3. IMAGES */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <SectionHeader title={`Thư viện ảnh (${standardImages.length})`} icon="image" color="orange" />
                                <div className="flex gap-2">
                                    <button onClick={() => { setMediaManagerMode('gallery'); setIsMediaManagerOpen(true); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Kho ảnh</button>
                                    <label className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all cursor-pointer">
                                        Tải lên
                                        <input type="file" className="hidden" onChange={e => e.target.files[0] && smartUploadHandler(e.target.files[0], 'gallery')} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                {standardImages.map((img, i) => (
                                    <div key={i} className={`relative aspect-square rounded-2xl border-2 overflow-hidden bg-white group hover:border-orange-400 transition-all ${img.is_main ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
                                        <img src={img.displayUrl} className="w-full h-full object-contain p-2" />
                                        {img.is_main && <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">MAIN</div>}
                                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                                            {!img.is_main && <button onClick={() => handleSetMain(img.id)} className="px-2 py-1 bg-white text-indigo-600 rounded text-[8px] font-black uppercase">Chính</button>}
                                            <button onClick={() => handleDeleteImage(img)} className="px-2 py-1 bg-white text-red-600 rounded text-[8px] font-black uppercase">Xóa</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        {/* CATEGORY & BRAND */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <SectionHeader title="Phân loại" icon="folder" color="indigo" />
                            <div className="space-y-4">
                                <FormField
                                    type="select"
                                    label="Thương hiệu"
                                    placeholder="Chọn thương hiệu..."
                                    value={formData.brandId}
                                    options={dictionary?.brands}
                                    onChange={v => setFormData({ ...formData, brandId: v })}
                                    isBrand={true}
                                    onManage={() => setBrandManager({ open: true, mode: 'list' })}
                                />
                                <FormField
                                    type="select"
                                    label="Danh mục"
                                    placeholder="Chọn danh mục..."
                                    value={formData.catId}
                                    options={dictionary?.categories}
                                    multiple={true}
                                    onChange={v => setFormData({ ...formData, catId: v })}
                                    onManage={() => setCatManager({ open: true, mode: 'list' })}
                                />
                            </div>
                        </div>

                        {/* STATUS */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <SectionHeader title="Trạng thái" icon="activity" color="green" />
                            <ToggleField label="Hiển thị trên Web" checked={formData.isOn} onChange={v => setFormData({ ...formData, isOn: v })} color="green" />
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                                <div><span className="text-[9px] text-slate-400 font-black uppercase">Ngày tạo</span><div className="text-[10px] font-bold">{formData.created_at ? new Date(formData.created_at).toLocaleDateString() : '--'}</div></div>
                                <div><span className="text-[9px] text-slate-400 font-black uppercase">Cập nhật</span><div className="text-[10px] font-bold">{formData.updated_at ? new Date(formData.updated_at).toLocaleDateString() : 'Now'}</div></div>
                            </div>
                        </div>

                        {/* PRICE & STOCK */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <SectionHeader title="Giá & Kho" icon="tag" color="red" />
                            <div className="space-y-4">
                                <FormField label="Giá bán lẻ" type="number" value={formData.price} onChange={v => setFormData({ ...formData, price: v })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Giá vốn" type="number" value={formData.purchase_price_web} onChange={v => setFormData({ ...formData, purchase_price_web: v })} />
                                    <FormField label="Bảo hành" value={formData.warranty} onChange={v => setFormData({ ...formData, warranty: v })} />
                                </div>
                                <FormField label="Tồn kho" type="number" value={formData.quantity} onChange={v => setFormData({ ...formData, quantity: v })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ERROR / FOOTER ACTIONS */}
            <div className="bg-white/90 backdrop-blur-md p-4 border-t flex gap-4 md:px-20 lg:px-40">
                <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Đóng</button>
                <button onClick={() => handleSave(false)} className="flex-1 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all">Lưu & Tiếp tục</button>
                <button onClick={() => handleSave(true)} disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                    {isSaving ? 'ĐANG LƯU...' : 'LƯU & ĐÓNG'}
                </button>
            </div>

            {/* MODALS */}
            <BrandSelectionModal isOpen={brandManager.open} onClose={() => setBrandManager({ ...brandManager, open: false })} onSelect={b => setFormData({ ...formData, brandId: b.id })} selectedId={formData.brandId} />
            <CategorySelectionModal isOpen={catManager.open} onClose={() => setCatManager({ ...catManager, open: false })} onSelect={id => {
                const current = Array.isArray(formData.catId) ? formData.catId : [];
                const sId = String(id);
                setFormData({ ...formData, catId: current.includes(sId) ? current.filter(x => x !== sId) : [...current, sId] });
            }} selectedId={formData.catId} multiple={true} />
            <MediaManagerModal isOpen={isMediaManagerOpen} title={mediaManagerMode === 'editor' ? "Chèn ảnh" : "Thư viện"} onClose={() => setIsMediaManagerOpen(false)} multiple={true} onSelect={items => {
                // Simplified logic for V2
                if (mediaManagerMode === 'editor' && mediaLibraryCallback) {
                    mediaLibraryCallback(Array.isArray(items) ? items : [items]);
                    setMediaLibraryCallback(null);
                    setIsMediaManagerOpen(false);
                } else if (mediaManagerMode === 'gallery') {
                    // Add to fullImages
                    const arr = Array.isArray(items) ? items : [items];
                    // Fake add to list to show
                    const newImgs = arr.map(i => ({
                        id: i.id, url: i.path ? i.path : (i.url || i.displayUrl),
                        displayUrl: i.preview_url || i.url,
                        is_temp: true
                    }));
                    setTempUploadedIds(prev => [...prev, ...arr.map(i => i.id)]);
                    setFullImages(prev => [...prev, ...newImgs]);
                    toast.success(`Đã thêm ${arr.length} ảnh vào thư viện tạm`);
                    setIsMediaManagerOpen(false);
                }
            }} />
        </div>
    );
};

export default ProductMobileDetailV2;

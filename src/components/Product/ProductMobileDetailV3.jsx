import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { productApi } from '../../api/admin/productApi';
import { metaApi } from '../../api/admin/metaApi';
import { Icon, Modal } from '../ui';
import { SectionHeader, FormField, ToggleField } from './ProductFormElements';
import ProductSeoSection from './ProductSeoSection';
import ProductContentSection from './ProductContentSection';
import axiosClient from '../../axiosGlobal';

import BrandSelectionModal from '../modals/BrandSelectionModal';
import CategorySelectionModal from '../modals/CategorySelectionModal';
import UnifiedMediaManagerModal from '../modals/UnifiedMediaManagerModal';
import RichTextEditor, { cleanHtmlForEditor } from '../Core/RichTextEditor';
import { PLACEHOLDER_NO_IMAGE_SQUARE } from '../../constants/placeholders';

// [V3 UPGRADE - MULTI SITE & LINKING]
// [V3] Initial State constant for resets and comparison
const INITIAL_FORM_STATE = {
    proName: '', url: '', productModel: '', tags: '', storeSKU: '',
    weight: 0, brandId: '', proSummary: '', specialOffer: '',
    price_web: 0, market_price: 0, quantity_web: 0, warranty_web: '',
    condition: 'New', isOn: true, hasVAT: 0,
    is_hot: false, is_new: true, is_best_sell: false,
    is_sale_off: false, is_student_support: false, is_installment_0: false,
    ordering_web: 0,
    catId: [], description: '', spec: '', purchase_price_web: 0,

    meta_title: '', meta_keyword: '', meta_description: '', accessory: '',
    media_ids: [], site_code: 'QVC', parent_id: null,
    request_path: ''
};

const ProductMobileDetailV3 = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess, onSwitchVersion }) => {
    // --- STATE MANAGEMENT ---
    const [currentMode, setCurrentMode] = useState(mode);
    const [activeTabId, setActiveTabId] = useState(null);
    const [tabs, setTabs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);

    // Form Data
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    const [fullImages, setFullImages] = useState([]);
    const [parentData, setParentData] = useState(null);
    // [V3] State to store Parent's Original Data for inheritance comparison
    const [parentOrigin, setParentOrigin] = useState(null);
    // [V3] State to track changes (Dirty checking)
    const [baseData, setBaseData] = useState(null);

    const [tempBrand, setTempBrand] = useState(null);
    const isProcessingPaste = useRef(false);
    const [isMouseInMediaZone, setIsMouseInMediaZone] = useState(false);
    const mouseInMediaZoneRef = useRef(false);
    const formDataRef = useRef(formData);
    const parentOriginRef = useRef(parentOrigin);

    useEffect(() => { mouseInMediaZoneRef.current = isMouseInMediaZone; }, [isMouseInMediaZone]);
    useEffect(() => { formDataRef.current = formData; }, [formData]);
    useEffect(() => { parentOriginRef.current = parentOrigin; }, [parentOrigin]);

    // Modals State
    const [brandManager, setBrandManager] = useState({ open: false });
    const [catManager, setCatManager] = useState({ open: false });
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [mediaLibraryCallback, setMediaLibraryCallback] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [fullEditor, setFullEditor] = useState({ open: false, type: 'description' });

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && product) {
            // [LOGIC Má»šI - FINAL]
            const isCreatingChild = (currentMode === 'create_child') || (product.id && !product.parent_id && currentMode !== 'edit');
            const isEditingChild = !!product.parent_id;

            // 1. XÃ¡c Ä‘á»‹nh Parent Data
            let origin = null;
            if (isCreatingChild) {
                origin = product; // Cha lÃ  chÃ­nh nÃ³
            } else if (isEditingChild) {
                origin = product.parent; // Cha lÃ  parent (náº¿u cÃ³)
            }
            setParentOrigin(origin);

            // 2. Setup Form
            if (isCreatingChild) {
                // --- MODE: Táº O LIÃŠN Káº¾T (SITE CON) ---
                const cleanMediaIds = (product.media || []).map(m => m.master_file?.id || m.media_file_id || m.id).filter(id => id);

                const initialForm = {
                    ...product,
                    id: null,
                    parent_id: product.id,
                    site_code: 'THIENDUC', // Máº·c Ä‘á»‹nh hardcode theo yÃªu cáº§u, hoáº·c Ä‘á»ƒ user chá»‰nh
                    media_ids: cleanMediaIds,
                    isOn: false,

                    // [IMPORTANT] Set Null Ä‘á»ƒ hiá»ƒn thá»‹ tráº¡ng thÃ¡i káº¿ thá»«a (Placeholder mode)
                    proName: null,
                    price_web: null,
                    price: null,
                    description: null,
                    spec: null,
                    proSummary: null
                };
                mapProductToForm(initialForm, 'THIENDUC', true); // isNew = true
                setActiveTabId('temp');
            } else {
                // --- MODE: EDIT HOáº¶C Táº O Má»šI TINH ---
                if (currentMode === 'edit' && product.id && product.id !== 'temp') {
                    initializeTabs(product.id);
                } else {
                    mapProductToForm(product, product.site_code || 'QVC', true); // isNew = true
                    setActiveTabId('temp');
                }
            }
        }
    }, [isOpen, product, currentMode]);

    const initializeTabs = async (rootId) => {
        setIsLoading(true);
        try {
            const resMain = await productApi.getDetailV2(rootId);
            const mainProd = resMain.data.data || resMain.data;

            const resLinks = await axiosClient.get(`/api/v2/product-links/${rootId}`);
            const links = resLinks.data.data || [];

            const newTabs = [
                { id: mainProd.id, site_code: 'QVC', name: mainProd.proName, is_root: true, data: mainProd }
            ];

            links.forEach(link => {
                if (link.target_product) {
                    newTabs.push({
                        id: link.target_product_id,
                        site_code: link.site_code,
                        name: link.target_product.proName,
                        is_root: false,
                        data: null
                    });
                }
            });

            setTabs(newTabs);
            setActiveTabId(mainProd.id);
            mapProductToForm(mainProd, 'QVC', false); // isNew = false (Editing)
            setParentData(null);
        } catch (e) {
            toast.error("Lá»—i khá»Ÿi táº¡o tabs: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // [NEW] CTRL+V Image Upload Logic (Restricted to Media Zone)
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

            // Prevent browser default paste if we found images and are in the zone
            e.preventDefault();

            isProcessingPaste.current = true;
            try {
                for (const blob of filesToUpload) {
                    const currentForm = formDataRef.current;
                    const baseName = currentForm.proName || parentOriginRef.current?.proName || 'img-paste';
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
                // Short delay to prevent accidental double-paste
                setTimeout(() => { isProcessingPaste.current = false; }, 500);
            }
        };

        if (isOpen) {
            window.addEventListener('paste', handlePaste);
        }
        return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen]);

    const handleSwitchTab = async (tabId) => {
        if (tabId === activeTabId) return;
        setIsLoading(true);
        try {
            const tab = tabs.find(t => t.id === tabId);
            if (!tab) return;

            const res = await productApi.getDetailV2(tabId);
            const prodData = res.data.data || res.data;

            setActiveTabId(tabId);
            mapProductToForm(prodData, tab.site_code, false); // isNew = false (Switching to existing tab)

            if (!tab.is_root) {
                const rootTab = tabs.find(t => t.is_root);
                if (rootTab) {
                    if (!rootTab.data) {
                        const resRoot = await productApi.getDetailV2(rootTab.id);
                        const rootData = resRoot.data.data || resRoot.data;
                        rootTab.data = rootData; // Cache it
                        setParentData(rootData);
                        setParentOrigin(rootData);
                        setTabs(prev => prev.map(t => t.id === rootTab.id ? { ...t, data: rootData } : t));
                    } else {
                        setParentData(rootTab.data);
                        setParentOrigin(rootTab.data);
                    }
                }
            } else {
                setParentData(null);
                setParentOrigin(null);
            }
        } catch (e) {
            toast.error("Lá»—i chuyá»ƒn tab");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(INITIAL_FORM_STATE);
        setFullImages([]);
    };

    const mapProductToForm = (d, forceSiteCode = null, forceIsNew = false) => {
        // [V3] Normalize Media objects to use media_file_id as the primary ID
        const images = (d.media || d.full_images || []).map(m => ({
            ...m,
            // [FIXED] Source of truth: MasterFile ID (Patient Zero Fix)
            id: m.master_file?.id || m.media_file_id || m.id,
            usage_id: m.id // Keep original usage_id for reference
        }));

        setFullImages(images);

        // [V3.1] EXPLICIT MAPPING - Avoid "...d" to prevent sending server-only or garbage fields
        const dataToSave = {
            proName: d.proName === undefined ? null : d.proName, // RIM: NULL means inherit
            request_path: d.request_path || d.url || '',
            productModel: d.productModel || d.model_code || '',
            tags: d.tags || '',
            storeSKU: d.storeSKU || d.sku || '',
            weight: d.weight || 0,
            brandId: d.brandId ? String(d.brandId) : '',
            proSummary: d.proSummary || '',
            specialOffer: d.specialOffer || '',
            price: parseFloat(d.price_web || d.price || 0),
            market_price: parseFloat(d.market_price || 0),
            purchase_price_web: parseFloat(d.purchase_price_web || 0),
            hasVAT: d.hasVAT || 0,
            price_web: parseFloat(d.price_web || d.price || 0),
            quantity_web: parseInt(d.quantity_web || d.quantity || 0),
            warranty_web: d.warranty_web || d.warranty || '',
            condition: d.condition || 'New',
            isOn: d.isOn == 1 || d.is_on == 1,
            is_hot: !!(d.marketing_flags?.is_hot || d.is_hot),
            is_new: !!(d.marketing_flags?.is_new || d.is_new),
            is_best_sell: !!(d.marketing_flags?.is_best_sell || d.is_best_sell),
            is_sale_off: !!(d.marketing_flags?.is_sale_off || d.is_sale_off),
            is_student_support: !!(d.marketing_flags?.is_student_support || d.is_student_support),
            is_installment_0: !!(d.marketing_flags?.is_installment_0 || d.is_installment_0),
            ordering_web: d.ordering_web || d.ordering || 101,
            catId: d.product_cat_web ? String(d.product_cat_web).split(',').filter(Boolean) : (d.categories_list || []),
            description: d.description || d.details?.description || '',
            spec: d.spec || d.details?.spec || '',
            meta_title: d.meta_title || '',
            meta_keyword: d.meta_keyword || '',
            meta_description: d.meta_description || '',
            accessory: d.accessory || '',
            media_ids: d.media_ids || images.map(img => img.id),
            site_code: forceSiteCode || d.site_code || 'QVC',
            parent_id: d.parent_id || null
        };

        setFormData(dataToSave);
        if (forceIsNew) {
            setBaseData(JSON.parse(JSON.stringify(INITIAL_FORM_STATE)));
        } else {
            setBaseData(JSON.parse(JSON.stringify(dataToSave))); // Deep clone for clean comparison
        }
    };

    // --- SAVE & LINKING ---
    const handleSave = async (shouldClose = true) => {
        setIsSaving(true);
        const tid = toast.loading("Äang lÆ°u dá»¯ liá»‡u...");
        try {
            // [DIRTY CHECK BEFORE API CALL]
            const dirtyCount = getDirtyFieldsCount;
            const isEditing = activeTabId !== 'temp' && currentMode !== 'create_child';

            if (isEditing && dirtyCount === 0) {
                toast.success("Há»‡ thá»‘ng: KhÃ´ng cÃ³ thay Ä‘á»•i nÃ o cáº§n lÆ°u!");
                if (shouldClose) onClose();
                return;
            }

            // [LOGIC CHUáº¨N HÃ“A Dá»® LIá»†U Äáº¦U RA]
            const payload = preparePayloadForSubmit(formData, parentOrigin, currentMode);

            // [DEBUG - RAW LOGS REQUESTED]
            console.group("ðŸš€ [DEBUG] V3 Save Payload");
            console.log("Stats: Dirty Fields =", dirtyCount);
            console.log("Cleaned Payload (Only Modified):", payload);
            console.groupEnd();

            if (!isEditing) {
                const res = await productApi.createV2(payload);
                toast.success("Táº¡o má»›i thÃ nh cÃ´ng!", { id: tid });
                onRefresh && onRefresh();
                if (onSuccess) { onSuccess(res.data); return; }
                initializeTabs(res.data.id || res.data.data.id);
            } else {
                await productApi.updateV2(activeTabId, payload);
                toast.success(`ÄÃ£ cáº­p nháº­t ${dirtyCount} thay Ä‘á»•i!`, { id: tid });

                // [DIRTY TRACKING] Cáº­p nháº­t baseData Ä‘á»ƒ xÃ³a highlight
                setBaseData(JSON.parse(JSON.stringify(formData)));

                onRefresh && onRefresh();
                if (shouldClose) onClose();
            }
        } catch (e) {
            toast.error("Lá»—i: " + (e.response?.data?.message || e.message), { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const isFieldDirty = (fieldName) => {
        if (!baseData) return false;

        let current = formData[fieldName];
        let base = baseData[fieldName];

        // Equivalence check for null/empty string/undefined
        if (current === undefined || current === "" || current === null) current = null;
        if (base === undefined || base === "" || base === null) base = null;

        if (current === base) return false;

        // Special comparison for arrays
        if (Array.isArray(current)) {
            const curArr = [...(current || [])].map(String).sort();
            const baseArr = [...(base || [])].map(String).sort();
            return JSON.stringify(curArr) !== JSON.stringify(baseArr);
        }

        // Numbers
        if (typeof current === 'number' || typeof base === 'number') {
            return Number(current || 0) !== Number(base || 0);
        }

        // Booleans
        if (typeof current === 'boolean' || typeof base === 'boolean') {
            return !!current !== !!base;
        }

        // Strings/Other
        return String(current || '').trim() !== String(base || '').trim();
    };

    const getDirtyFieldsCount = useMemo(() => {
        if (!baseData) return 0;
        let count = 0;
        // Only count fields that are relevant for update
        const fieldsToTrack = Object.keys(formData).filter(f => f !== 'site_code' && f !== 'parent_id' && f !== 'media_ids');
        fieldsToTrack.forEach(f => {
            if (isFieldDirty(f)) count++;
        });

        // Media separate check
        const currentMedia = (formData.media_ids || []).filter(id => id).sort().join(',');
        const baseMedia = (baseData.media_ids || []).filter(id => id).sort().join(',');
        if (currentMedia !== baseMedia) count++;

        return count;
    }, [formData, baseData]);

    const preparePayloadForSubmit = (form, parent, mode) => {
        // [MODIFIED] Determine if we are updating or creating
        const isEditing = activeTabId !== 'temp' && mode !== 'create_child';
        const isChildSite = (mode === 'create_child') || (form.parent_id && form.site_code !== 'QVC') || (mode === 'create' && form.site_code !== 'QVC' && parent);

        // 1. [DIRTY CHECK] Chá»‰ láº¥y nhá»¯ng trÆ°á»ng Ä‘Ã£ thay Ä‘á»•i (náº¿u lÃ  Edit)
        const payload = {};
        Object.keys(form).forEach(f => {
            const currentVal = form[f];
            const baseVal = baseData ? baseData[f] : undefined;

            let isDirty = false;
            if (Array.isArray(currentVal)) {
                isDirty = JSON.stringify([...currentVal].sort()) !== JSON.stringify([...(baseVal || [])].sort());
            } else if (typeof currentVal === 'number' || typeof baseVal === 'number') {
                isDirty = Number(currentVal || 0) !== Number(baseVal || 0);
            } else {
                isDirty = String(currentVal || '').trim() !== String(baseVal || '').trim();
            }

            // [FIX] Náº¿u lÃ  Táº O Má»šI (isEditing = false) -> LuÃ´n gá»­i dá»¯ liá»‡u
            // Náº¿u lÃ  EDIT -> Chá»‰ gá»­i dá»¯ liá»‡u Ä‘Ã£ thay Ä‘á»•i
            if (!isEditing || isDirty || f === 'site_code' || f === 'parent_id') {
                payload[f] = currentVal;
            }
        });

        // 2. [RIM PRUNING] Náº¿u lÃ  Site con, náº¿u giÃ¡ trá»‹ giá»‘ng há»‡t Master -> Gá»­i NULL Ä‘á»ƒ káº¿ thá»«a
        if (isChildSite && parent) {
            console.log(`ðŸ§¹ [RIM_PRUNING] Comparing Child (${form.site_code}) vs Master (${parent.proName})`);
            const rimFields = ['proName', 'price_web', 'market_price', 'proSummary', 'description', 'spec', 'brandId', 'product_cat_web', 'warranty_web', 'storeSKU', 'specialOffer', 'promotion'];

            rimFields.forEach(field => {
                const fVal = form[field];
                const pVal = parent[field];

                let isSameAsParent = false;
                if (field === 'price_web' || field === 'market_price') {
                    isSameAsParent = Number(fVal || 0) === Number(pVal || 0);
                } else if (typeof fVal === 'string' || typeof pVal === 'string') {
                    isSameAsParent = String(fVal || '').trim() === String(pVal || '').trim();
                } else {
                    isSameAsParent = fVal == pVal;
                }

                if (isSameAsParent) {
                    payload[field] = null; // Backend sáº½ reset vá» null Ä‘á»ƒ káº¿ thá»«a
                }
            });

            // áº¢NH: Náº¿u bá»™ sÆ°u táº­p áº£nh giá»‘ng há»‡t cha -> Gá»­i rá»—ng Ä‘á»ƒ káº¿ thá»«a
            const currentMedia = (form.media_ids || []).filter(id => id).sort().join(',');
            const parentMediaIds = (parent.media || []).map(m => m.master_file?.id || m.media_file_id || m.id).filter(id => id).sort().join(',');
            if (currentMedia === parentMediaIds) {
                payload.media_ids = [];
            }
        }

        // 3. CHUáº¨N HÃ“A Ká»¸ THUáº¬T (Chá»‰ cháº¡y trÃªn nhá»¯ng trÆ°á»ng cÃ³ trong payload)

        // Category
        if (payload.catId !== undefined) {
            const catIdArray = Array.isArray(payload.catId) ? payload.catId : [];
            payload.product_cat_web = catIdArray.length > 0 ? `,${catIdArray.join(',')},` : '';
            delete payload.catId;
        }

        // [IMPORTANT] Ensure price_web and quantity_web are sent correctly
        // They were already renamed in formData, so payload[f] = currentVal already handled it.

        // Booleans -> Integers
        const boolFields = ['isOn', 'is_hot', 'is_new', 'is_best_sell', 'is_sale_off', 'is_student_support', 'is_installment_0'];
        boolFields.forEach(f => {
            if (payload[f] !== undefined) {
                payload[f] = payload[f] ? 1 : 0;
            }
        });

        // Media Clean
        if (payload.media_ids) {
            payload.media_ids = payload.media_ids.filter(id => id);
        }

        // Parent ID Safety
        if (isChildSite && !payload.parent_id && (parent?.id || form.parent_id)) {
            payload.parent_id = parent?.id || form.parent_id;
        }

        return payload;
    };

    const handleCreateForSite = async (targetSiteCode) => {
        if (!targetSiteCode) return;
        if (!activeTabId || activeTabId === 'temp') return;

        setIsLoading(true);
        const tid = toast.loading(`Äang khá»Ÿi táº¡o site ${targetSiteCode}...`);
        try {
            const rootTab = tabs.find(t => t.is_root);
            const resRoot = await productApi.getDetailV2(rootTab.id);
            const rootData = resRoot.data.data || resRoot.data;

            const payload = {
                parent_id: rootTab.id, // KÃ­ch hoáº¡t RIM (Remote Inheritance Model)
                site_code: targetSiteCode,
                isOn: 0, // Máº·c Ä‘á»‹nh táº¯t hiá»ƒn thá»‹ Ä‘á»ƒ ngÆ°á»i dÃ¹ng kiá»ƒm tra trÆ°á»›c khi publish
            };

            const createRes = await productApi.createV2(payload);
            const newId = createRes.data.id || createRes.data.data.id;

            await axiosClient.post(`/api/v2/product-links`, {
                source_product_id: rootTab.id,
                target_product_id: newId,
                link_type: 'VARIANT',
                site_code: targetSiteCode
            });

            toast.success(`ÄÃ£ táº¡o site ${targetSiteCode}`, { id: tid });
            setIsAddSiteOpen(false);
            initializeTabs(rootTab.id);
        } catch (e) {
            toast.error("Lá»—i: " + e.message, { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!activeTabId || activeTabId === 'temp') return;
        const isMaster = tabs.find(t => t.id === activeTabId)?.is_root;
        const msg = isMaster
            ? "Cáº¢NH BÃO: Báº¡n Ä‘ang xÃ³a Sáº¢N PHáº¨M MASTER. Viá»‡c nÃ y sáº½ xÃ³a toÃ n bá»™ cÃ¡c site liÃªn káº¿t liÃªn quan. Báº¡n cÃ³ cháº¯c cháº¯n?"
            : "XÃ³a phiÃªn báº£n sáº£n pháº©m nÃ y trÃªn site hiá»‡n táº¡i? (Dá»¯ liá»‡u Master sáº½ váº«n cÃ²n)";

        if (!window.confirm(msg)) return;

        setIsSaving(true);
        const tid = toast.loading("Äang xÃ³a sáº£n pháº©m...");
        try {
            await productApi.deleteV2(activeTabId);
            toast.success("ÄÃ£ xÃ³a thÃ nh cÃ´ng", { id: tid });

            if (isMaster) {
                onRefresh && onRefresh();
                onClose();
            } else {
                // Return to master tab
                const rootTab = tabs.find(t => t.is_root);
                initializeTabs(rootTab.id);
                onRefresh && onRefresh();
            }
        } catch (e) {
            toast.error("Lá»—i khi xÃ³a: " + e.message, { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    // --- MEDIA HANDLERS ---
    const smartUploadHandler = async (fileOrUrl) => {
        const tid = toast.loading("Äang xá»­ lÃ½ áº£nh...");
        try {
            const fd = new FormData();
            if (fileOrUrl instanceof File) fd.append('image', fileOrUrl);
            else fd.append('image_url', fileOrUrl);

            const contextName = formData.proName || parentOrigin?.proName || 'image-context';
            fd.append('temp_context', contextName.substring(0, 30));
            fd.append('source', 'mobile_v3_tabbed');

            const res = await productApi.smartUpload(fd);
            const newImg = res.data.data || res.data;
            const url = newImg.url || newImg.displayUrl || newImg.preview_url;
            const fileId = newImg.id || newImg.master_file_id || (newImg.data && newImg.data.id);

            if (!fileId) throw new Error("KhÃ´ng láº¥y Ä‘Æ°á»£c ID áº£nh tá»« server");

            setFullImages(prev => [...prev, { ...newImg, id: fileId, displayUrl: url, is_temp: true }]);
            setFormData(prev => ({
                ...prev,
                media_ids: [...new Set([...(prev.media_ids || []), fileId])] // Prevent duplicate IDs
            }));

            toast.success("ÄÃ£ táº£i lÃªn!", { id: tid });
            return { id: fileId, url };
        } catch (e) {
            toast.error("Lá»—i upload: " + e.message, { id: tid });
            return null;
        }
    };

    const handleDeleteImage = (img) => {
        if (!window.confirm("Gá»¡ bá» áº£nh nÃ y khá»i danh sÃ¡ch sáº£n pháº©m?")) return;

        // V3 Logic: Gá»¡ local trÆ°á»›c, sáº½ lÆ°u tháº­t khi báº¥m XÃ¡c Nháº­n
        const imgId = img.id; // ÄÃ¢y lÃ  file_id
        setFullImages(prev => prev.filter(i => i.id !== imgId));
        setFormData(prev => ({
            ...prev,
            media_ids: (prev.media_ids || []).filter(id => id !== imgId)
        }));

        toast.success("ÄÃ£ gá»¡ áº£nh (Báº¥m XÃ¡c Nháº­n Ä‘á»ƒ lÆ°u thay Ä‘á»•i)");
    };

    const handleSetMain = (targetId) => {
        // V3 Logic: ÄÆ°a lÃªn Ä‘áº§u danh sÃ¡ch (Sáº½ Ä‘Æ°á»£c syncMedia Ä‘áº·t lÃ m áº£nh chÃ­nh)
        setFullImages(prev => {
            const item = prev.find(img => img.id === targetId);
            if (!item) return prev;
            const others = prev.filter(img => img.id !== targetId);
            return [{ ...item, is_main: true }, ...others.map(o => ({ ...o, is_main: false }))];
        });

        setFormData(prev => {
            const others = (prev.media_ids || []).filter(id => id !== targetId);
            return { ...prev, media_ids: [targetId, ...others] };
        });

        toast.success("ÄÃ£ Ä‘áº·t lÃ m áº£nh chÃ­nh (Báº¥m XÃ¡c Nháº­n Ä‘á»ƒ lÆ°u)");
    };

    // --- SYNC STATUS ---
    const isSeparated = (field) => {
        if (!parentData) return false;
        return formData[field] !== parentData[field];
    };

    const renderSyncStatus = (field) => {
        if (!parentData) return null;
        const separated = isSeparated(field);
        return (
            <div className="absolute right-0 top-0 -mt-2 -mr-2 z-10">
                {separated ? (
                    <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1 py-0.5 rounded border border-orange-200 flex items-center gap-1 shadow-sm" title="KhÃ¡c QVC">
                        <Icon name="unlink" className="w-3 h-3" /> RIM
                    </span>
                ) : (
                    <span className="text-[8px] font-black bg-indigo-100 text-indigo-400 px-1 py-0.5 rounded flex items-center gap-1 opacity-50 hover:opacity-100 cursor-help" title="Tiáº¿p tá»¥c Ä‘á»“ng bá»™">
                        <Icon name="link" className="w-3 h-3" /> SYNC
                    </span>
                )}
            </div>
        );
    };

    // --- RENDER HELPERS ---
    const availableSites = useMemo(() => {
        const allSites = dictionary?.sites || [];
        return allSites.filter(s => !tabs.some(t => t.site_code === s.code));
    }, [dictionary, tabs]);

    const standardImages = useMemo(() => {
        const crmHost = window.location.origin.includes('maytinhquocviet.com') ? window.location.origin : 'https://crm.maytinhquocviet.com';
        return fullImages.map(img => {
            let url = img.full_url || img.url || img.image_url || img.displayUrl || img.preview_url;
            if (url && !url.startsWith('http')) {
                url = url.startsWith('/') ? crmHost + url : crmHost + '/' + url;
            }
            return { ...img, displayUrl: url || PLACEHOLDER_NO_IMAGE_SQUARE };
        });
    }, [fullImages]);

    const getPlatformUrl = (siteCode, slug, id) => {
        if (!slug && !id) return '#';

        // Loáº¡i bá» gáº¡ch chÃ©o á»Ÿ Ä‘áº§u slug náº¿u cÃ³ Ä‘á»ƒ trÃ¡nh lá»—i double slash (//)
        const cleanPath = (slug || String(id)).replace(/^\/+/, '');

        // 1. Link Web tháº­t (Chá»‰ dÃ¹ng cho QVC Master khi áº¥n nÃºt Public)
        if (siteCode === 'QVC') {
            let finalSlug = cleanPath;
            if (!finalSlug.endsWith('.html')) finalSlug += '.html';
            return `https://qvc.vn/${finalSlug}`;
        }

        // 2. Link Ná»™i bá»™ (DÃ¹ng cho táº¥t cáº£ cÃ¡c site con vÃ  xem ná»™i bá»™ QVC)
        const currentOrigin = window.location.origin;
        const targetSite = siteCode === 'QVC_INTERNAL' ? 'QVC' : siteCode;

        let finalPath = cleanPath;
        if (!finalPath.endsWith('.html')) finalPath += '.html';

        return `${currentOrigin}/products/${finalPath}?site=${targetSite}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50/50 backdrop-blur-md animate-fadeIn p-4 md:p-8">
            <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] flex flex-col w-full h-full overflow-hidden border border-white/50">
                {/* 1. TAB BAR (Premium Dashboard Style) */}
                <div className="bg-slate-50/80 border-b px-6 pt-6 flex items-end gap-4 shrink-0 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-4 mr-6 pb-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Icon name="package" className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 uppercase tracking-tighter leading-none">Cáº¥u hÃ¬nh Site</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Site Synchronization</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pb-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleSwitchTab(tab.id)}
                                className={`
                                    relative px-6 py-4 rounded-t-3xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-3 min-w-[160px] group
                                    ${activeTabId === tab.id
                                        ? 'bg-white text-indigo-600 shadow-[-10px_-10px_20px_rgba(0,0,0,0.02),10px_-10px_20px_rgba(0,0,0,0.02)] z-10'
                                        : 'bg-transparent text-slate-400 hover:text-slate-600'}
                                `}
                            >
                                <div className={`p-1.5 rounded-lg ${activeTabId === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-300 group-hover:bg-slate-200'}`}>
                                    <Icon name={tab.is_root ? "database" : "link"} className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{tab.site_code === 'QVC' ? 'QVC MASTER' : tab.site_code}</span>
                                {activeTabId === tab.id && <div className="absolute top-0 left-6 right-6 h-1 bg-indigo-600 rounded-b-full"></div>}
                            </button>
                        ))}

                        <button
                            onClick={() => setIsAddSiteOpen(!isAddSiteOpen)}
                            className="px-4 py-4 rounded-t-3xl text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center mb-0 group"
                        >
                            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                <Icon name="plus" className="w-4 h-4" />
                            </div>
                        </button>
                    </div>

                    <div className="flex-1 flex justify-center pb-6">
                        <button
                            onClick={() => setFormData({ ...formData, isOn: !formData.isOn })}
                            className={`
                                flex items-center gap-3 px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95 border-2
                                ${formData.isOn
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100/50'
                                    : 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100/50 animate-pulse'}
                            `}
                        >
                            <div className={`w-3 h-3 rounded-full ${formData.isOn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">
                                {formData.isOn ? 'ÄANG HIá»†N (ONLINE)' : 'ÄANG áº¨N (OFFLINE)'}
                            </span>
                            <Icon name={formData.isOn ? "eye" : "eye-off"} className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="pb-6 pr-2 flex items-center gap-2">

                        {/* VIEW BUTTONS */}
                        {activeTabId !== 'temp' && (
                            <div className="flex gap-2 mr-4">
                                {formData.site_code === 'QVC' && (
                                    <a
                                        href={getPlatformUrl('QVC', formData.request_path)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-200"
                                    >
                                        <Icon name="external-link" className="w-3.5 h-3.5" /> Xem trÃªn QVC.VN
                                    </a>
                                )}
                                <a
                                    href={getPlatformUrl(formData.site_code === 'QVC' ? 'QVC_INTERNAL' : formData.site_code, formData.request_path, activeTabId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100"
                                >
                                    <Icon name="eye" className="w-3.5 h-3.5" /> Xem Ná»™i Bá»™
                                </a>
                            </div>
                        )}

                        {typeof onSwitchVersion === 'function' && (
                            <button
                                onClick={() => {
                                    toast.success("Äang chuyá»ƒn...");
                                    onSwitchVersion();
                                }}
                                className="flex flex-col items-center justify-center p-3 bg-white text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all shadow-sm border border-emerald-100 active:scale-90"
                                title="Chuyá»ƒn sang báº£n Mobile Lite"
                            >
                                <Icon name="zap" className="w-5 h-5 mb-0.5" />
                                <span className="text-[8px] font-black uppercase">Lite</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-3 bg-white text-slate-400 rounded-2xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm border border-slate-100 active:scale-90"
                            title="ÄÃ³ng (ESC)"
                        >
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    </div>

                    {isAddSiteOpen && (
                        <div className="absolute top-[80px] left-[60%] mt-2 w-72 bg-white rounded-[2rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] border-2 border-emerald-50 p-3 z-[100] animate-slideUp origin-top">
                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 p-3 rounded-2xl uppercase mb-3 tracking-widest text-center">KÃ­ch hoáº¡t Site má»›i</div>
                            <div className="space-y-1">
                                {availableSites.map(s => (
                                    <button key={s.code} onClick={() => handleCreateForSite(s.code)} className="w-full text-left px-5 py-4 rounded-2xl hover:bg-emerald-50 text-xs font-black text-slate-700 flex justify-between items-center group transition-all active:scale-[0.98]">
                                        {s.label}
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                            <Icon name="plus" className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {availableSites.length === 0 && <div className="p-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">ÄÃ£ Ä‘á»§ táº¥t cáº£ site</div>}
                        </div>
                    )}
                </div>

                {/* 2. BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32 bg-slate-50/30">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Äang náº¡p dá»¯ liá»‡u site...</p>
                        </div>
                    ) : (
                        <div className="max-w-[1600px] mx-auto space-y-6">
                            {/* NAME HEADER */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
                                {renderSyncStatus('proName')}

                                {!formData.isOn && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-bounce z-20 border-2 border-white">
                                        Sáº£n pháº©m chÆ°a hiá»ƒn thá»‹ trÃªn APP/WEB
                                    </div>
                                )}

                                <div className="flex flex-col md:flex-row gap-8">

                                    <div className="flex-[3] relative group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                                            TÃªn sáº£n pháº©m ({formData.site_code})
                                            {(formData.parent_id && formData.proName === null) && <span className="ml-2 text-indigo-500">(Äang káº¿ thá»«a)</span>}
                                        </label>

                                        <input
                                            value={formData.proName ?? ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, proName: val === '' ? null : val });
                                            }}
                                            className={`w-full font-black text-2xl border-b-4 outline-none transition-all pb-2 px-1
                                                ${isFieldDirty('proName') ? 'border-orange-400 bg-orange-50/10' :
                                                    ((formData.parent_id && (formData.proName === null || formData.proName === parentOrigin?.proName))
                                                        ? 'bg-slate-50 text-slate-400 italic border-transparent placeholder:text-slate-400'
                                                        : 'bg-white text-slate-800 border-transparent hover:border-slate-50 focus:border-indigo-500')
                                                }
                                            `}
                                            placeholder={formData.parent_id ? `(Káº¿ thá»«a): ${parentOrigin?.proName}` : "Nháº­p tÃªn sáº£n pháº©m..."}
                                        />
                                        {isFieldDirty('proName') && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}

                                        {/* Undo Button */}
                                        {formData.parent_id && formData.proName && formData.proName !== parentOrigin?.proName && (
                                            <button
                                                onClick={() => setFormData({ ...formData, proName: null })} // Set null Ä‘á»ƒ dÃ¹ng láº¡i tÃªn cha
                                                className="absolute right-0 top-0 text-[10px] font-bold text-indigo-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm"
                                                title="Quay láº¡i dÃ¹ng tÃªn gá»‘c cá»§a cha"
                                            >
                                                HoÃ n tÃ¡c (DÃ¹ng tÃªn gá»‘c)
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Slug / ÄÆ°á»ng dáº«n</label>
                                        <input
                                            value={formData.request_path}
                                            readOnly={formData.site_code !== 'QVC'}
                                            onChange={e => setFormData({ ...formData, request_path: e.target.value })}
                                            className={`w-full font-mono text-base font-bold border-b-4 outline-none pb-2 px-1 ${formData.site_code !== 'QVC' ? 'opacity-50 grayscale border-transparent' : (isFieldDirty('request_path') ? 'text-orange-600 border-orange-400' : 'text-blue-600 border-transparent focus:border-blue-500')}`}
                                            placeholder="/slug-san-pham"
                                        />
                                        {isFieldDirty('request_path') && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                                    </div>
                                </div>
                            </div>

                            {/* MAIN GRID */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                {/* COL 1: SPECS (Improved UI) */}
                                <div className="xl:col-span-3 space-y-6">
                                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative group overflow-hidden">
                                        {renderSyncStatus('brandId')}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700 pointer-events-none"></div>

                                        <SectionHeader title="Danh má»¥c & ThÆ°Æ¡ng hiá»‡u" icon="hash" color="indigo" />

                                        <div className="space-y-6 mt-4 relative z-10">
                                            {/* Premium Brand Picker */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ThÆ°Æ¡ng hiá»‡u</label>
                                                    <button
                                                        onClick={() => setBrandManager({ open: true })}
                                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase"
                                                    >
                                                        TÃ¹y chá»‰nh
                                                    </button>
                                                </div>
                                                <div
                                                    onClick={() => setBrandManager({ open: true })}
                                                    className={`flex items-center gap-3 p-4 border-2 transition-all rounded-2xl cursor-pointer group/item shadow-sm ${isFieldDirty('brandId') ? 'border-orange-300 bg-orange-50/20' : 'bg-slate-50 border-transparent hover:border-indigo-500 hover:bg-white'}`}
                                                >
                                                    {(() => {
                                                        const dictBrand = dictionary?.brands?.find(b => String(b.id || b.code) === String(formData.brandId));
                                                        const displayBrand = dictBrand || (String(tempBrand?.id || tempBrand?.code) === String(formData.brandId) ? tempBrand : null);

                                                        const getImgUrl = (b) => {
                                                            if (!b) return null;
                                                            let src = b.image_url || b.image;
                                                            if (!src) return null;
                                                            if (src.startsWith('http')) return src;
                                                            return `https://qvc.vn/${src.replace(/^\//, '')}`;
                                                        };
                                                        const imgSrc = getImgUrl(displayBrand);

                                                        return (
                                                            <>
                                                                <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center overflow-hidden shadow-sm group-hover/item:scale-110 transition-transform">
                                                                    {imgSrc ? (
                                                                        <img src={imgSrc} className="w-full h-full object-contain p-1" alt="" />
                                                                    ) : <Icon name="award" className="w-5 h-5 text-slate-300" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-black text-slate-900 truncate">
                                                                        {displayBrand?.name || 'ChÆ°a chá»n thÆ°Æ¡ng hiá»‡u'}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Báº¥m Ä‘á»ƒ thay Ä‘á»•i</div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <Icon name="chevronRight" className="w-4 h-4 text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                                                </div>
                                            </div>

                                            {/* Premium Category Picker */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh má»¥c sáº£n pháº©m</label>
                                                    <button
                                                        onClick={() => setCatManager({ open: true })}
                                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase"
                                                    >
                                                        Quáº£n lÃ½
                                                    </button>
                                                </div>

                                                <div
                                                    onClick={() => setCatManager({ open: true })}
                                                    className={`min-h-[60px] p-4 border-2 transition-all rounded-2xl cursor-pointer shadow-sm flex flex-wrap gap-2 ${isFieldDirty('catId') ? 'border-orange-300 bg-orange-50/20' : 'bg-slate-50 border-transparent hover:border-indigo-500 hover:bg-white'}`}
                                                >
                                                    {(() => {
                                                        const catIds = Array.isArray(formData.catId) ? formData.catId : [];
                                                        if (catIds.length === 0) return (
                                                            <div className="flex items-center gap-2 text-slate-400">
                                                                <Icon name="plus" className="w-5 h-5" />
                                                                <span className="text-sm font-bold">Chá»n danh má»¥c</span>
                                                            </div>
                                                        );

                                                        return catIds.filter(id => String(id) !== '0' && String(id) !== '').map(id => {
                                                            const cat = dictionary?.categories?.find(c => String(c.id || c.code) === String(id));
                                                            return (
                                                                <div key={id} className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 animate-scaleIn">
                                                                    {cat?.image ? (
                                                                        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                                                                            <img src={cat.image} className="w-full h-full object-cover" alt="" />
                                                                        </div>
                                                                    ) : (
                                                                        <Icon name="folder" className="w-3 h-3" />
                                                                    )}
                                                                    <span>{cat?.name || id}</span>
                                                                    <Icon name="x" className="w-3 h-3 text-white/50 hover:text-white cursor-pointer" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const updatedIds = Array.isArray(formData.catId) ? formData.catId.filter(x => x !== id) : [];
                                                                        setFormData(p => ({ ...p, catId: updatedIds }));
                                                                    }} />
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
                                        {renderSyncStatus('storeSKU')}
                                        <SectionHeader title="Äá»‹nh danh" icon="tag" color="blue" />
                                        <div className="space-y-4 mt-6">
                                            <FormField label="MÃ£ SKU" value={formData.storeSKU} onChange={v => setFormData({ ...formData, storeSKU: v })} isDirty={isFieldDirty('storeSKU')} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Model / NSX" value={formData.productModel} onChange={v => setFormData({ ...formData, productModel: v })} isDirty={isFieldDirty('productModel')} />
                                                <FormField label="Báº£o hÃ nh" value={formData.warranty_web} onChange={v => setFormData({ ...formData, warranty_web: v })} isDirty={isFieldDirty('warranty_web')} placeholder="VD: 12 ThÃ¡ng" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField label="Trá»ng lÆ°á»£ng (g)" type="number" value={formData.weight} onChange={v => setFormData({ ...formData, weight: v })} isDirty={isFieldDirty('weight')} />
                                                <div className="flex items-end pb-1">
                                                    <ToggleField label="Hiá»‡n Web" checked={formData.isOn} onChange={v => setFormData({ ...formData, isOn: v })} isDirty={isFieldDirty('isOn')} color="indigo" />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Tráº¡ng thÃ¡i Marketing</label>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <ToggleField label="Sáº£n pháº©m HOT" checked={formData.is_hot} onChange={v => setFormData({ ...formData, is_hot: v })} isDirty={isFieldDirty('is_hot')} color="rose" />
                                                    <ToggleField label="Sáº£n pháº©m Má»šI" checked={formData.is_new} onChange={v => setFormData({ ...formData, is_new: v })} isDirty={isFieldDirty('is_new')} color="emerald" />
                                                    <ToggleField label="BÃN CHáº Y" checked={formData.is_best_sell} onChange={v => setFormData({ ...formData, is_best_sell: v })} isDirty={isFieldDirty('is_best_sell')} color="orange" />
                                                    <ToggleField label="GIáº¢M GIÃ" checked={formData.is_sale_off} onChange={v => setFormData({ ...formData, is_sale_off: v })} isDirty={isFieldDirty('is_sale_off')} color="blue" />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Thá»© tá»± hiá»ƒn thá»‹ (Order)</label>
                                                    <div className="flex gap-4 items-start">
                                                        <div className="w-24 shrink-0 relative">
                                                            <input
                                                                type="number"
                                                                value={formData.ordering_web}
                                                                onChange={e => setFormData({ ...formData, ordering_web: e.target.value })}
                                                                className={`w-full bg-slate-50 border-2 rounded-xl px-3 py-2 font-black outline-none transition-all text-center ${isFieldDirty('ordering_web') ? 'border-orange-400 text-orange-600 bg-orange-50' : 'border-slate-100 text-indigo-600 focus:border-indigo-500'}`}
                                                            />
                                                            {isFieldDirty('ordering_web') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>}
                                                        </div>
                                                        <div className="flex-1 text-[9px] font-bold text-slate-400 leading-tight bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                                                            <Icon name="info" className="w-3 h-3 inline mr-1 mb-0.5" />
                                                            Náº¿u Ä‘á»ƒ <span className="text-slate-600">0, 1, 99, 101</span>: Há»‡ thá»‘ng tá»± Ä‘á»™ng Ä‘áº©y lÃªn 101 khi cÃ²n hÃ ng, vá» 1 khi háº¿t hÃ ng.
                                                            Nháº­p sá»‘ khÃ¡c Ä‘á»ƒ cá»‘ Ä‘á»‹nh vá»‹ trÃ­.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* COL 2: IMAGES */}
                                <div className="xl:col-span-5 space-y-6 h-full">
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col relative min-h-[500px]">
                                        {renderSyncStatus('media_ids')}
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <SectionHeader title={`ThÆ° viá»‡n áº£nh (${standardImages.length})`} icon="image" color="orange" />
                                                {formData.is_media_inherited && (
                                                    <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1 animate-pulse">
                                                        <Icon name="link" className="w-2.5 h-2.5" /> Thá»«a káº¿ tá»« QVC
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsMediaManagerOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                                                    <Icon name="search" className="w-3.5 h-3.5" /> Kho áº£nh V3
                                                </button>
                                                <label className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all cursor-pointer shadow-sm">
                                                    Upload
                                                    <input
                                                        type="file"
                                                        multiple
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const files = Array.from(e.target.files);
                                                            if (files.length > 0) {
                                                                for (const f of files) {
                                                                    await smartUploadHandler(f);
                                                                }
                                                            }
                                                            e.target.value = null; // Reset to allow re-selecting same file
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div
                                            onMouseEnter={() => setIsMouseInMediaZone(true)}
                                            onMouseLeave={() => setIsMouseInMediaZone(false)}
                                            className={`flex-1 bg-slate-50/50 rounded-[2rem] p-6 border-2 border-dashed transition-all grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto ${isMouseInMediaZone ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-100'}`}
                                        >
                                            {standardImages.length > 0 ? standardImages.map((img, i) => (
                                                <div key={img.id || i} className={`relative aspect-square rounded-2xl border-2 overflow-hidden bg-white group hover:border-indigo-400 transition-all shadow-sm ${img.is_main ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
                                                    <img src={img.displayUrl} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" alt="" />
                                                    {img.is_main && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-bl-xl shadow-md">CHÃNH</div>}
                                                    <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-[2px]">
                                                        {!img.is_main && <button onClick={() => handleSetMain(img.id)} className="w-8 h-8 bg-white text-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Icon name="check" className="w-4 h-4" /></button>}
                                                        <button onClick={() => setPreviewImage(img.displayUrl)} className="w-8 h-8 bg-white text-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Icon name="eye" className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteImage(img)} className="w-8 h-8 bg-white text-rose-500 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Icon name="trash" className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-full h-full flex flex-col items-center justify-center opacity-30 gap-4">
                                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                                        <Icon name="image" className="w-10 h-10" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">ChÆ°a cÃ³ hÃ¬nh áº£nh nÃ o</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* COL 3: PRICE & CONTENT */}
                                <div className="xl:col-span-4 space-y-6">
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
                                        {renderSyncStatus('price_web')}
                                        <SectionHeader title="GiÃ¡ & Kho" icon="dollar-sign" color="red" />
                                        <div className="mt-8 grid grid-cols-2 gap-8">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">GiÃ¡ bÃ¡n láº»</label>
                                                <div className="relative group">
                                                    <input type="number" value={formData.price_web} onChange={e => setFormData({ ...formData, price_web: e.target.value })}
                                                        className={`w-full font-black text-3xl border-b-4 outline-none pb-2 px-1 transition-all bg-transparent ${isFieldDirty('price_web') ? 'text-orange-600 border-orange-400' : 'text-red-600 border-slate-100 focus:border-red-500'}`} />
                                                    <span className="absolute right-1 bottom-3 text-xs font-black text-red-400 group-focus-within:text-red-600 transition-colors">VNÄ</span>
                                                    {isFieldDirty('price_web') && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                                                </div>
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tá»“n kho</label>
                                                <div className="relative group">
                                                    <input type="number" value={formData.quantity_web} onChange={e => setFormData({ ...formData, quantity_web: e.target.value })}
                                                        className={`w-full font-black text-3xl border-b-4 outline-none pb-2 px-1 transition-all bg-transparent ${isFieldDirty('quantity_web') ? 'text-orange-600 border-orange-400' : 'text-slate-800 border-slate-100 focus:border-indigo-500'}`} />
                                                    <span className="absolute right-1 bottom-3 text-xs font-black text-slate-300 group-focus-within:text-indigo-600 transition-colors">PCS</span>
                                                    {isFieldDirty('quantity_web') && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
                                        {renderSyncStatus('proSummary')}
                                        <SectionHeader title="MÃ´ táº£ nhanh" icon="file-text" color="purple" />
                                        <div className="mt-6">
                                            <textarea
                                                value={formData.proSummary}
                                                onChange={e => setFormData({ ...formData, proSummary: e.target.value })}
                                                className={`w-full p-5 border-2 rounded-[2rem] text-sm font-bold text-slate-700 outline-none transition-all min-h-[160px] resize-none shadow-inner leading-relaxed
                                                    ${isFieldDirty('proSummary') ? 'border-orange-400 bg-orange-50/10' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-purple-500'}`}
                                                placeholder="Nháº­p mÃ´ táº£ tÃ³m táº¯t..."
                                            ></textarea>
                                            {isFieldDirty('proSummary') && <div className="absolute top-10 right-10 w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-md"></div>}
                                        </div>
                                        <div className="flex gap-4 mt-4">
                                            <button onClick={() => setFullEditor({ open: true, type: 'description' })} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                <Icon name="edit" className="w-3.5 h-3.5 inline mr-2" /> Soáº¡n bÃ i viáº¿t
                                            </button>
                                            <button onClick={() => setFullEditor({ open: true, type: 'spec' })} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">
                                                <Icon name="list" className="w-3.5 h-3.5 inline mr-2" /> ThÃ´ng sá»‘
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEO & CONTENT SECTION (Expanded) */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pt-8 border-t-2 border-dashed border-slate-200">
                                <div className="xl:col-span-8">
                                    <ProductContentSection
                                        formData={formData}
                                        onChange={setFormData}
                                        proName={formData.proName}
                                        productId={activeTabId}
                                        onMediaLibraryRequest={(callback) => {
                                            setMediaLibraryCallback(() => callback);
                                            setIsMediaManagerOpen(true);
                                        }}
                                    />
                                </div>
                                <div className="xl:col-span-4">
                                    <ProductSeoSection formData={formData} onChange={setFormData} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER (Floating Style) */}
                <div className="bg-white/80 backdrop-blur-xl p-6 border-t flex gap-6 items-center px-12 shrink-0">
                    <div className="hidden lg:block flex-1">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Äang chá»‰nh sá»­a cho:</p>
                        <p className="text-sm font-black text-indigo-600 uppercase tracking-tight truncate max-w-[400px]">
                            {formData.proName || 'Sáº£n pháº©m má»›i'}
                        </p>
                    </div>

                    {activeTabId && activeTabId !== 'temp' && (
                        <button
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 border border-rose-100"
                        >
                            <Icon name="trash" className="w-4 h-4" /> XÃ³a
                        </button>
                    )}

                    <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all active:scale-95">ÄÃ³ng</button>
                    <button onClick={() => handleSave(false)} className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-sm">
                        LÆ¯U & TIáº¾P Tá»¤C {getDirtyFieldsCount > 0 && <span className="ml-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[8px]">{getDirtyFieldsCount}</span>}
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className={`px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-2xl
                            ${(getDirtyFieldsCount > 0 || activeTabId === 'temp') ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-500 shadow-none hover:bg-slate-300'}`}
                    >
                        {isSaving ? 'ÄANG LÆ¯U Há»† THá»NG...' : (activeTabId === 'temp' ? `XÃC NHáº¬N Táº O Sáº¢N PHáº¨M (${getDirtyFieldsCount} TRÆ¯á»œNG Má»šI)` : (getDirtyFieldsCount > 0 ? `XÃC NHáº¬N LÆ¯U ${getDirtyFieldsCount} THAY Äá»”I` : 'XÃC NHáº¬N & ÄÃ“NG'))}
                    </button>
                </div>
            </div>

            {/* MODALS */}
            <BrandSelectionModal isOpen={brandManager.open} onClose={() => setBrandManager({ open: false })} onSelect={b => setFormData({ ...formData, brandId: b.id })} selectedId={formData.brandId} />
            <CategorySelectionModal
                isOpen={catManager.open}
                onClose={() => setCatManager({ open: false })}
                onSelect={id => {
                    const currentIds = Array.isArray(formData.catId) ? formData.catId : [];
                    const sid = String(id);
                    if (currentIds.includes(sid)) {
                        setFormData({ ...formData, catId: currentIds.filter(x => x !== sid) });
                    } else {
                        setFormData({ ...formData, catId: [...currentIds, sid] });
                    }
                }}
                selectedId={formData.catId}
                multiple={true}
            />

            <UnifiedMediaManagerModal
                isOpen={isMediaManagerOpen}
                onClose={() => setIsMediaManagerOpen(false)}
                onSelect={(items) => {
                    const newImages = items.map(m => ({ id: m.id, url: m.url || m.preview_url, displayUrl: m.url || m.preview_url }));
                    if (mediaLibraryCallback) {
                        mediaLibraryCallback(newImages);
                    } else {
                        setFullImages(prev => [...prev, ...newImages]);
                        setFormData(prev => ({ ...prev, media_ids: [...(prev.media_ids || []), ...items.map(m => m.id)] }));
                    }
                    setMediaLibraryCallback(null);
                }}
            />

            <Modal isOpen={fullEditor.open} onClose={() => setFullEditor({ ...fullEditor, open: false })} title="TrÃ¬nh soáº¡n tháº£o">
                <RichTextEditor
                    value={fullEditor.type === 'description' ? formData.description : formData.spec}
                    onChange={v => setFormData({ ...formData, [fullEditor.type]: v })}
                    proName={formData.proName}
                    productId={activeTabId}
                    className="h-[600px]"
                />
            </Modal>

            {previewImage && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-10" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
                </div>
            )}
        </div>
    );
};

export default ProductMobileDetailV3;

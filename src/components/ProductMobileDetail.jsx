import React, { useState, useEffect, useMemo, useRef } from 'react';
import { productApi } from '../api/admin/productApi';
import { Icon, Button, Modal } from './ui';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { metaApi } from '../api/admin/metaApi';
import BrandSelectionModal from './BrandSelectionModal.jsx';
import CategorySelectionModal from './CategorySelectionModal.jsx';
import MediaManagerModal from './MediaManagerModal.jsx';


// --- HIỆU ỨNG PHONG CÁCH TƯƠNG LAI ---
const SectionHeader = ({ title, icon, color = "blue" }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        green: "text-green-600 bg-green-50 border-green-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
        red: "text-red-600 bg-red-50 border-red-100"
    };
    return (
        <div className={`flex items-center gap-3 p-4 rounded-3xl border-2 mb-6 ${colors[color] || colors.blue}`}>
            <Icon name={icon} className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
        </div>
    );
};

const FormField = ({ label, name, value, onChange, type = "text", placeholder, options, multiple = false, isBrand = false, onManage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const out = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', out);
        return () => document.removeEventListener('mousedown', out);
    }, []);

    const filtered = useMemo(() => {
        if (!options) return [];
        return options.filter(o => {
            const searchStr = (o.name || o.proName || '').toLowerCase();
            return searchStr.includes(search.toLowerCase()) || String(o.code || o.id).includes(search);
        });
    }, [options, search]);

    const selectedItems = useMemo(() => {
        if (!options || !value) return [];
        const vals = Array.isArray(value) ? value.map(String) : String(value).split(',').filter(Boolean);
        return options.filter(o => vals.includes(String(o.code || o.id)));
    }, [value, options]);

    return (
        <div className="space-y-2 w-full group relative" ref={ref}>
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] group-focus-within:text-indigo-600 transition-colors">{label}</label>
                {type === 'select' && onManage && (
                    <button type="button" onClick={onManage} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-all uppercase">Quản lý</button>
                )}
            </div>

            {type === 'select' ? (
                <div className="relative">
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-full min-h-[64px] px-5 py-3 bg-gray-50/50 border-2 rounded-[1.75rem] flex items-center justify-between transition-all cursor-pointer ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-50 bg-white' : 'border-gray-100 hover:bg-white hover:border-indigo-100 shadow-sm'}`}
                    >
                        <div className="flex flex-wrap gap-2 overflow-hidden flex-1 mr-2">
                            {multiple ? (
                                selectedItems.length > 0 ? (
                                    selectedItems.map(item => (
                                        <div key={item.code || item.id} className="flex items-center gap-1.5 pl-2 pr-1 py-1.5 bg-indigo-600 text-white rounded-xl shadow-md animate-scaleIn">
                                            <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{item.name || item.proName}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const oCode = String(item.code || item.id);
                                                    const vals = (Array.isArray(value) ? value : String(value).split(',').filter(Boolean))
                                                        .filter(v => String(v) !== oCode);
                                                    onChange(vals);
                                                }}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                            >
                                                <Icon name="plus" className="w-3 h-3 rotate-45" />
                                            </button>
                                        </div>
                                    ))
                                ) : <span className="text-sm font-black text-gray-300">{placeholder}</span>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {value && (
                                        <div className="w-8 h-8 rounded-xl bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
                                            {selectedItems[0]?.image ? (
                                                <img src={selectedItems[0].image} className="w-full h-full object-contain" alt="" />
                                            ) : <Icon name={isBrand ? "award" : "folder"} className="w-4 h-4 text-indigo-300" />}
                                        </div>
                                    )}
                                    <span className={`text-sm font-black truncate ${!value ? 'text-gray-300' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                                        {selectedItems[0]?.name || selectedItems[0]?.proName || placeholder}
                                    </span>
                                </div>
                            )}
                        </div>
                        <Icon name={isOpen ? "chevronUp" : "chevronDown"} className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>

                    {isOpen && (
                        <div className="absolute z-[1000] bottom-full lg:bottom-auto lg:top-[110%] mb-2 lg:mb-0 left-0 right-0 min-w-[320px] lg:min-w-[450px] bg-white border-2 border-indigo-50 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
                            <div className="p-5 border-b bg-gray-50/50 backdrop-blur-xl flex gap-4">
                                <div className="relative flex-1">
                                    <input
                                        autoFocus
                                        className="w-full p-4 pl-12 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-black outline-none transition-all shadow-sm placeholder:text-gray-300"
                                        placeholder="Tìm nhanh..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-white">
                                {filtered.length > 0 ? filtered.map(o => {
                                    const oCode = String(o.code || o.id);
                                    const isSel = multiple
                                        ? (Array.isArray(value) ? value.map(String).includes(oCode) : (value ? String(value).split(',').filter(Boolean).includes(oCode) : false))
                                        : String(value) === oCode;

                                    return (
                                        <div
                                            key={oCode}
                                            onClick={() => {
                                                if (multiple) {
                                                    let vals = Array.isArray(value) ? [...value].map(String) : (value ? String(value).split(',').filter(Boolean) : []);
                                                    if (vals.includes(oCode)) {
                                                        vals = vals.filter(v => v !== oCode);
                                                    } else {
                                                        vals.push(oCode);
                                                    }
                                                    onChange(vals);
                                                } else {
                                                    onChange(oCode);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 rounded-2xl cursor-pointer flex items-center gap-5 transition-all group/item ${isSel ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[0.98]' : 'hover:bg-indigo-50 border border-transparent hover:border-indigo-100'}`}
                                        >
                                            <div className="w-12 h-12 bg-white border rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2 shadow-sm group-hover/item:scale-110 transition-transform">
                                                {o.image ? (
                                                    <img src={o.image} className="w-full h-full object-contain" alt="" />
                                                ) : <Icon name={isBrand ? "award" : "folder"} className={`w-6 h-6 ${isSel ? 'text-indigo-400' : 'text-gray-200'}`} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-black truncate group-hover/item:translate-x-1 transition-transform">{o.name || o.proName}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isSel ? 'text-white/60' : 'text-gray-400'}`}>ID: #{oCode}</div>
                                            </div>
                                            {isSel && (
                                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                                    <Icon name="check" className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 flex flex-col items-center justify-center gap-5 opacity-40">
                                        <Icon name="search" className="w-16 h-16 text-indigo-300" />
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Không tìm thấy</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 bg-gray-50/80 backdrop-blur-md border-t flex justify-between items-center px-8">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filtered.length} kết quả</span>
                                <button type="button" onClick={() => { setIsOpen(false); onManage?.(); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100">
                                    <Icon name="plus" className="w-3 h-3" /> QUẢN LÝ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : type === 'textarea' ? (
                <textarea
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none min-h-[160px] resize-y shadow-sm"
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                />
            ) : (
                <input
                    type={type}
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none shadow-sm"
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                />
            )}
        </div>
    );
};

const ToggleField = ({ label, checked, onChange, color = "indigo" }) => {
    const colors = {
        indigo: "peer-checked:bg-indigo-600",
        green: "peer-checked:bg-green-600",
        orange: "peer-checked:bg-orange-600",
        red: "peer-checked:bg-red-600",
        blue: "peer-checked:bg-blue-600",
        purple: "peer-checked:bg-purple-600"
    };
    return (
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-white border-2 border-transparent hover:border-gray-100 transition-all">
            <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{label}</span>
            <div className="relative inline-flex items-center">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-12 h-6 bg-gray-300 rounded-full peer ${colors[color] || colors.indigo} peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-sm`}></div>
            </div>
        </label>
    );
};

// --- HELPER RÚT GỌN TÊN SẢN PHẨM ---
const getShortProName = (name) => {
    if (!name) return "Product";
    return name.split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9- ]/g, '');
};

const RichTextEditor = ({ value, onChange, placeholder, proName, className }) => {
    const quillRef = useRef(null);

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const tid = toast.loading("Đang tải ảnh lên nội dung...");
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('temp_context', getShortProName(proName));
                formData.append('source', 'rich_text_editor');

                const res = await productApi.smartUpload(formData);
                const url = res.data.url || res.data.image_url || res.data.displayUrl;

                const quill = quillRef.current.getEditor();
                const range = quill.getSelection();
                quill.insertEmbed(range ? range.index : 0, 'image', url);
                toast.success("Đã chèn ảnh!", { id: tid });
            } catch (e) {
                toast.error("Lỗi upload: " + (e.response?.data?.message || e.message), { id: tid });
            }
        };
    };

    const handleYoutubeEmbed = () => {
        const url = prompt("Dán link YouTube (VD: https://www.youtube.com/watch?v=...):");
        if (!url) return;

        let videoId = '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);

        if (match && match[2].length === 11) {
            videoId = match[2];
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();
            quill.insertEmbed(range ? range.index : 0, 'video', embedUrl);
        } else {
            toast.error("Link YouTube không hợp lệ!");
        }
    };

    // Xử lý PASTE ảnh trực tiếp vào Editor
    useEffect(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();

        const handlePaste = async (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            let hasImage = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    hasImage = true;
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        e.stopPropagation(); // Ngăn chặn sự kiện nổi lên document global
                        const tid = toast.loading("Đang xử lý ảnh dán...");
                        try {
                            const formData = new FormData();
                            formData.append('image', file);
                            formData.append('temp_context', getShortProName(proName));
                            formData.append('source', 'rich_text_paste');

                            const res = await productApi.smartUpload(formData);
                            const url = res.data.url || res.data.image_url || res.data.displayUrl;

                            const range = quill.getSelection();
                            quill.insertEmbed(range ? range.index : 0, 'image', url);
                            toast.success("Đã dán và tải ảnh thành công!", { id: tid });
                        } catch (err) {
                            toast.error("Lỗi dán ảnh: " + err.message, { id: tid });
                        }
                    }
                }
            }
            // Nếu là dán link/text bình thường trong editor cũng nên stop để tránh global bắt
            if (!hasImage && e.target.isContentEditable) {
                // e.stopPropagation(); // Cân nhắc có nên stop text không, thường là có để focus đúng chỗ
            }
        };

        quill.root.addEventListener('paste', handlePaste);
        return () => quill.root.removeEventListener('paste', handlePaste);
    }, [proName]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: handleImageUpload,
                video: handleYoutubeEmbed
            }
        }
    }), [proName]);

    return (
        <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            modules={modules}
            className={className}
        />
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const ProductMobileDetail = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('standard');
    const [currentMode, setCurrentMode] = useState(mode);
    const [currentId, setCurrentId] = useState(product?.id);

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
    const [fullImages, setFullImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mediaFilter, setMediaFilter] = useState('all'); // 'all' hoặc 'legacy'
    const [seoOpen, setSeoOpen] = useState(false); // Cho giao diện Standard
    const [showAllStandardImages, setShowAllStandardImages] = useState(false);
    const [tempBrand, setTempBrand] = useState(null); // Fallback for brand display if not in dictionary
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [tempUploadedIds, setTempUploadedIds] = useState([]);
    const [standardContentSubTab, setStandardContentSubTab] = useState('summary');
    const [fullEditor, setFullEditor] = useState({ open: false, type: 'description' });
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false); // Placeholder cho Media Manager

    // Ensure Brand is Displayed Logic: If brandId exists but not in dictionary, fetch it
    useEffect(() => {
        const bId = formData.brandId;
        if (!bId) return;

        const strId = String(bId);
        const inDict = dictionary?.brands?.some(b => String(b.id || b.code) === strId);
        const inTemp = String(tempBrand?.id || tempBrand?.code) === strId;

        if (!inDict && !inTemp) {
            // Fetch single brand detail
            metaApi.getBrandDetail(bId)
                .then(res => {
                    const bData = res.data.data || res.data;
                    if (bData) setTempBrand(bData);
                })
                .catch(err => console.error("Could not fetch missing brand detail:", err));
        }
    }, [formData.brandId, dictionary, tempBrand]);

    const escapeHtml = (str) => {
        if (!str) return str;
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const getBrandName = (p) => {
        if (p.brand_name) return p.brand_name;
        if (!p.brandId) return 'N/A';
        const brand = (Array.isArray(dictionary?.brands) ? dictionary.brands : []).find(b => String(b.id || b.code) === String(p.brandId));
        return brand ? brand.name : 'N/A';
    };

    const getCategoryName = (p) => {
        if (p.category_name) return p.category_name;
        const catIds = p.product_cat_web || p.product_cat || '';
        const idList = String(catIds).split(',').filter(Boolean);
        if (idList.length === 0) return 'N/A';
        const cat = (Array.isArray(dictionary?.categories) ? dictionary.categories : []).find(c => String(c.id || c.code) === String(idList[0]));
        return cat ? cat.name : 'N/A';
    };

    useEffect(() => {
        if (currentMode === 'edit' && currentId) {
            fetchDetail(currentId);
        } else if (currentMode === 'create') {
            setFormData(prev => ({
                ...prev,
                isOn: true,
                is_new: true,
                condition: 'New',
                proName: '', storeSKU: '', price: 0, quantity: 0,
                ...product
            }));
            setFullImages([]);
        }
    }, [product, currentMode, currentId]);

    // 1. [UPDATE] Mở rộng sự kiện Paste cho cả tab 'standard'
    useEffect(() => {
        // Thêm 'standard' vào điều kiện check
        if (!isOpen || (activeTab !== 'media' && activeTab !== 'common' && activeTab !== 'standard')) return;

        const handlePaste = async (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            // A. Xử lý File (Screenshot, Copy Image)
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    console.log("[DEBUG] Paste Image File:", file.name, file.type, file.size);
                    smartUploadHandler(file); // Chuyển sang dùng smartUploadHandler
                }
            }
            // B. Xử lý URL (Copy Image Address)
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    console.log("[DEBUG] Paste Image URL detected:", text);
                    if (window.confirm(`Bạn muốn tải ảnh từ liên kết này?\n${text}`)) {
                        uploadUrlHandler(text);
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isOpen, activeTab, product?.id]);

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
                brand_name: getBrandName(d),
                category_name: getCategoryName(d),
                created_at: d.created_at,
                updated_at: d.updated_at
            });
        } catch (e) {
            toast.error("Không nạp được dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        smartUploadHandler(file);
        e.target.value = null;
    };

    const smartUploadHandler = async (fileOrUrl) => {
        if (!fileOrUrl) return;
        const tid = toast.loading("Đang xử lý ảnh...");

        try {
            let fileToUpload = fileOrUrl;
            const isUrl = typeof fileOrUrl === 'string';

            // Nếu là URL, tải về trước để biến thành File
            if (isUrl) {
                try {
                    const response = await fetch(fileOrUrl);
                    if (!response.ok) throw new Error("Không thể tải ảnh từ URL");
                    const blob = await response.blob();

                    // Lấy filename từ URL hoặc đặt tên mặc định
                    const urlPath = new URL(fileOrUrl).pathname;
                    const fileName = urlPath.split('/').pop() || 'remote_image.jpg';
                    const fileType = blob.type || 'image/jpeg';

                    fileToUpload = new File([blob], fileName, { type: fileType });
                    console.log("[DEBUG] Downloaded remote image as File:", fileName, fileType);
                } catch (err) {
                    console.error("[DEBUG] Download URL failed:", err);
                    throw new Error("Lỗi tải ảnh từ URL (có thể do chặn CORS). Thử Save ảnh về máy rồi kéo thả.");
                }
            }

            const formDataUpload = new FormData();
            formDataUpload.append('image', fileToUpload);

            // Gửi context tên SP để backend đặt tên file SEO
            formDataUpload.append('temp_context', getShortProName(formData.proName));
            formDataUpload.append('source', 'mobile_form_unified');

            const res = await productApi.smartUpload(formDataUpload);
            const newImage = res.data;
            const finalUrl = newImage.url || newImage.image_url || newImage.displayUrl;

            // Lưu ID để tí nữa bấm "Lưu sản phẩm" thì gửi lên gán
            setTempUploadedIds(prev => [...prev, newImage.id]);

            // Hiển thị ảnh giả (preview) vào giao diện ngay lập tức
            setFullImages(prev => [...prev, {
                id: newImage.id,
                url: finalUrl,
                displayUrl: finalUrl,
                is_temp: true // Đánh dấu để hiển thị visual "Chờ gán"
            }]);

            toast.success("Xong! Bấm lưu để hoàn tất", { id: tid });
            if (isUrl) setShowUrlInput(false);
        } catch (e) {
            console.error("[DEBUG] Unified Smart Upload Error:", e);
            toast.error("Lỗi: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const uploadFileHandler = async (file) => {
        if (!file || !product?.id) return;
        const form = new FormData();
        form.append('image', file);
        const tid = toast.loading("Đang tải ảnh...");
        try {
            await productApi.uploadImage(product.id, form);
            toast.success("Đã thêm ảnh!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lỗi upload: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const uploadUrlHandler = (url) => {
        smartUploadHandler(url);
    };

    const handleSetMain = async (idOrName) => {
        if (!idOrName) return toast.error("Không có thông tin ảnh");
        const tid = toast.loading("Đang thiết lập ảnh chính...");
        try {
            await productApi.setMainImage(product.id, idOrName);
            toast.success("Đã đổi ảnh chính đồng bộ sang Web QVC!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lỗi thiết lập ảnh chính: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleDeleteImage = async (img) => {
        if (!window.confirm("Xóa ảnh này viễn vĩnh khỏi hệ thống?")) return;
        try {
            if (img.id) await productApi.deleteImage(product.id, img.id);
            else await productApi.deleteOldImageByName(product.id, img.name);
            toast.success("Đã xóa");
            fetchDetail(product.id);
        } catch (e) { toast.error("Lỗi xóa"); }
    };

    const handlePushToQvc = async (mediaId) => {
        const tid = toast.loading("Đang đẩy ảnh lên QVC...");
        try {
            // Sử dụng syncOne để đồng bộ dữ liệu sản phẩm (bao gồm Media) lên QVC
            await productApi.syncOne(product.id);
            toast.success("Đã hoàn tất đồng bộ!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lỗi đồng bộ: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleLocalizeImages = async () => {
        const tid = toast.loading("Đang Localize ảnh về server...");
        try {
            await axios.post(`/api/v1/products/${product.id}/localize-images`);
            toast.success("Đã Localize thành công!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lỗi localize: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleSave = async (shouldClose = true) => {
        setIsSaving(true);
        console.log("[DEBUG] Saving Product. Mode:", currentMode, "Payload IDs:", tempUploadedIds);
        try {
            const catIdArray = Array.isArray(formData.catId) ? formData.catId : [];
            const catIdString = catIdArray.length > 0 ? `,${catIdArray.join(',')},` : '';

            const payload = {
                ...formData,
                proSummary: escapeHtml(formData.proSummary || ''),
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
                toast.success("Tạo mới thành công!");
                setTempUploadedIds([]);
                onRefresh && onRefresh();

                if (onSuccess) {
                    onSuccess(res.data);
                    onClose();
                    return;
                }

                if (res.data?.id) {
                    setCurrentId(res.data.id);
                    setCurrentMode('edit');
                    if (!shouldClose) {
                        fetchDetail(res.data.id);
                    } else {
                        onClose();
                    }
                    return;
                }
            } else {
                await productApi.update(currentId || product?.id, payload);
                toast.success("Cập nhật thành công!");
                setTempUploadedIds([]);
                onRefresh && onRefresh();

                if (!shouldClose) {
                    fetchDetail(currentId || product?.id);
                }
            }

            if (shouldClose) onClose();
        } catch (e) {
            console.error("[DEBUG] Save Error:", e);
            toast.error("Lỗi: " + (e.response?.data?.message || e.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (currentMode === 'create') {
            setFormData(p => ({ ...p, isOn: !p.isOn }));
            return;
        }

        const tid = toast.loading("Đang cập nhật trạng thái...");
        try {
            const res = await productApi.toggleStatus(currentId || product.id);
            if (res.data.success) {
                setFormData(prev => ({ ...prev, isOn: res.data.isOn }));
                toast.success(res.data.message, { id: tid });
                if (onRefresh) onRefresh();
            } else {
                toast.error(res.data.message || "Lỗi cập nhật", { id: tid });
            }
        } catch (e) {
            toast.error("Lỗi: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleDeleteProduct = async () => {
        if (!currentId && !product?.id) return;

        const confirmMsg = "BẠN CÓ CHẮC CHẮN MUỐN XÓA SẢN PHẨM NÀY?\n\n- Hệ thống sẽ gọi lệnh xóa trên Web QVC.\n- Nếu chưa có LIÊN KẾT KHO, dữ liệu CRM sẽ bị xóa sạch.\n- Nếu đã có LIÊN KẾT KHO, chỉ xóa trên Web và ẩn bài ở CRM.";

        if (window.confirm(confirmMsg)) {
            setIsSaving(true);
            try {
                const res = await productApi.delete(currentId || product.id);
                toast.success(res.data.message || "Đã xử lý xóa thành công");
                onRefresh();
                onClose();
            } catch (e) {
                toast.error("Lỗi xóa: " + (e.response?.data?.message || e.message));
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Logic gộp ảnh thông minh để tránh hiện 2-4 cái giống nhau
    const unifiedImages = useMemo(() => {
        const map = new Map();
        const mediaMeta = Array.isArray(formData.media) ? formData.media : [];

        fullImages.forEach(img => {
            // Lấy metadata từ mảng media gốc nếu có để biết trạng thái sync QVC
            const meta = mediaMeta.find(m => m.id === img.id || m.media_file_id === img.id);

            // Sử dụng name/image_name làm key chính
            const key = img.name || img.image_name || `temp_${img.id || img.url}`;

            if (!map.has(key)) {
                map.set(key, {
                    ...img,
                    onCRM: !!img.id,
                    // Ưu tiên path nội bộ từ backend mới
                    internalPath: meta?.master_file?.paths?.original || img.master_file?.paths?.original,
                    // Nếu là ảnh CRM (có ID), ưu tiên lấy sync status từ meta, nếu không có meta thì coi như là true nếu không phải temp
                    onQVC: img.id ? (meta ? meta.qvc_sync_status === 'synced' : true) : (img.is_temp ? false : true),
                    onThienDuc: false,
                    qvc_sync_status: meta?.qvc_sync_status || img.qvc_sync_status
                });
            } else {
                const existing = map.get(key);
                if (!existing.internalPath) {
                    existing.internalPath = meta?.master_file?.paths?.original || img.master_file?.paths?.original;
                }
                if (img.id) {
                    existing.id = img.id;
                    existing.onCRM = true;
                    const syncStatus = meta?.qvc_sync_status || img.qvc_sync_status;
                    if (syncStatus === 'synced') existing.onQVC = true;
                    if (img.is_main) existing.is_main = true;
                }
            }
        });

        let list = Array.from(map.values());

        // Derive is_main from proThum if not explicitly set
        const hasExplicitMain = list.some(img => img.is_main);
        if (!hasExplicitMain && formData.proThum) {
            const proThumBase = String(formData.proThum).split('/').pop();
            list = list.map(img => {
                const imgName = img.name || img.image_name || '';
                const isMainFallback = (imgName === String(formData.proThum) || imgName === proThumBase);
                return isMainFallback ? { ...img, is_main: true } : img;
            });
        }

        if (mediaFilter === 'legacy') {
            list = list.filter(img => !img.id);
        }

        // CHUẨN HÓA URL (Hỗ trợ đa định dạng: đầy đủ domain, relative, storage, media...)
        const result = list.map(img => {
            let src = img.internalPath || img.url || img.relative_path || img.displayUrl || '';
            let displayUrl = src;
            let resolveMethod = "Original Source";

            if (src) {
                // 1. Nếu đã có http/https -> Giữ nguyên
                if (src.startsWith('http')) {
                    displayUrl = src;
                    resolveMethod = "Full URL (Preserved)";
                }
                // 2. Nếu bắt đầu bằng // -> Thêm https:
                else if (src.startsWith('//')) {
                    displayUrl = `https:${src}`;
                    resolveMethod = "Protocol-less (Added https:)";
                }
                // 3. Nếu là đường dẫn storage Local
                else if (src.startsWith('/storage')) {
                    displayUrl = window.location.origin + src;
                    resolveMethod = "Local Storage Path";
                }
                // 4. Nếu là đường dẫn media của QVC (thường không có ID CRM) HOẶC là internalPath upload
                else if (src.startsWith('/media') || src.startsWith('uploads/') || (!img.id && !src.startsWith('/'))) {
                    const cleanPath = src.startsWith('/') ? src : `/${src}`;
                    displayUrl = window.location.origin + cleanPath;
                    resolveMethod = "Internal Media/Upload Path";
                }
                // 5. Trường hợp khác nếu là relative path mà có ID (thường là uploads/...)
                else if (!src.startsWith('/') && img.id) {
                    displayUrl = `${window.location.origin}/storage/${src}`;
                    resolveMethod = "CRM Relative Path (Storage)";
                }
                // 6. Fix lỗi URL bị double slash hoặc thoát ký tự
                displayUrl = displayUrl.replace(/\\/g, '/').replace(/\/+/g, '/');
                // Khôi phục http:// hoặc https:// nếu bị replace mất slash
                if (displayUrl.startsWith('http:/') && !displayUrl.startsWith('http://')) displayUrl = displayUrl.replace('http:/', 'http://');
                if (displayUrl.startsWith('https:/') && !displayUrl.startsWith('https://')) displayUrl = displayUrl.replace('https:/', 'https://');
            }

            return { ...img, displayUrl, resolveMethod };
        });

        console.log("[DEBUG_DETAIL] Unified Image Processing:", result.map(i => ({
            isMain: i.is_main,
            method: i.resolveMethod,
            final: i.displayUrl
        })));
        return result;
    }, [fullImages, mediaFilter, formData.media, formData.proThum]);

    const standardImages = useMemo(() => {
        let list = [];
        if (showAllStandardImages) {
            list = unifiedImages;
        } else {
            // Hiển thị ảnh đã sync QVC HOẶC ảnh vừa mới upload (is_temp)
            list = unifiedImages.filter(img => img.onQVC || img.is_temp);
        }
        console.log("[DEBUG] Standard Tab Images Count:", list.length, "showAll:", showAllStandardImages);
        return list;
    }, [unifiedImages, showAllStandardImages]);

    const tabs = [
        { id: 'common', label: '📊 Tổng quan', icon: 'info' },
        { id: 'content', label: '📝 Nội dung', icon: 'file-text' },
        { id: 'media', label: '🖼️ Hình ảnh', icon: 'image' },
        { id: 'seo', label: '🔍 SEO & Ads', icon: 'search' },
        { id: 'stats', label: '📈 Hệ thống', icon: 'bar-chart' },
        { id: 'standard', label: '💎 Giao diện Chuẩn', icon: 'layout' },
    ];

    const [brandManager, setBrandManager] = useState({ open: false, mode: 'list', selected: null });
    const [catManager, setCatManager] = useState({ open: false, mode: 'list', selected: null });

    if (isLoading) return (
        <Modal isOpen={isOpen} onClose={onClose} isFullScreen={true} title="Đang tải...">
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Vui lòng chờ...</p>
            </div>
        </Modal>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isFullScreen={true}
            title={
                <div className="flex items-center justify-between w-full pr-8">
                    <div className="flex-1 max-w-4xl">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                            <span>Sản phẩm</span>
                            <Icon name="chevronRight" className="w-2.5 h-2.5" />
                            <span className="text-indigo-600">#{product?.id || 'NEW'}</span>
                            {formData.storeSKU && (
                                <>
                                    <span className="mx-1 text-gray-200">|</span>
                                    <span className="font-mono">{formData.storeSKU}</span>
                                </>
                            )}
                        </div>
                        <input
                            type="text"
                            value={formData.proName}
                            onChange={(e) => setFormData(p => ({ ...p, proName: e.target.value }))}
                            className="text-lg md:text-xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-gray-300"
                            placeholder="Nhập tên sản phẩm..."
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {formData.request_path && (
                            <a
                                href={`https://qvc.vn${formData.request_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-12 px-6 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center gap-2 shadow-sm border border-blue-100 transition-all active:scale-90"
                            >
                                <Icon name="external-link" className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">XEM TRÊN QVC</span>
                            </a>
                        )}
                        {mode === 'edit' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteProduct(); }}
                                disabled={isSaving}
                                className="h-12 px-6 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center gap-2 shadow-sm border border-rose-100 transition-all active:scale-90"
                                title="Xóa sản phẩm"
                            >
                                <Icon name="trash" className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">XÓA SẢN PHẨM</span>
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="h-full flex flex-col bg-[#fcfdfe]">
                {/* Fixed Tabs Navigation */}
                <div className="flex overflow-x-auto no-scrollbar bg-white/90 backdrop-blur-md border-b sticky top-0 z-[60] px-4 pt-2">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-shrink-0 px-6 py-4 text-xs font-black transition-all border-b-4 uppercase tracking-widest ${activeTab === t.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-2xl' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 max-w-7xl mx-auto w-full">
                    {activeTab === 'common' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">

                            {/* LEFT: MAIN FORM */}
                            <div className="lg:col-span-8 space-y-8 pb-[400px]">

                                {/* Card 1: Identities */}
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm p-8 space-y-8">
                                    <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Icon name="tag" className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Định danh & Phân loại</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField
                                            label="URL Index (Đường dẫn tĩnh)"
                                            value={formData.request_path}
                                            onChange={v => setFormData(p => ({ ...p, request_path: v }))}
                                            placeholder="/ten-san-pham.html"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                label="Thương hiệu"
                                                type="select"
                                                isBrand={true}
                                                options={dictionary?.brands}
                                                value={formData.brandId}
                                                onChange={v => setFormData(p => ({ ...p, brandId: v }))}
                                                onManage={() => window.open('/admin/brands', '_blank')}
                                            />
                                            <FormField
                                                label="Mã kho (SKU)"
                                                value={formData.storeSKU}
                                                onChange={v => setFormData(p => ({ ...p, storeSKU: v }))}
                                                placeholder="VD: SKU-123"
                                            />
                                        </div>

                                        <FormField
                                            label="Danh mục sản phẩm"
                                            type="select"
                                            multiple={true}
                                            options={dictionary?.categories}
                                            value={formData.catId}
                                            onChange={v => setFormData(p => ({ ...p, catId: v }))}
                                            onManage={() => window.open('/admin/categories', '_blank')}
                                        />

                                        <FormField
                                            label="Tóm tắt đặc tính (Spec Summary)"
                                            type="textarea"
                                            value={formData.proSummary}
                                            onChange={v => setFormData(p => ({ ...p, proSummary: v }))}
                                            placeholder="- Chipset hiệu năng cao...&#10;- Màn hình sắc nét...&#10;- Bảo hành tin cậy..."
                                        />
                                    </div>
                                </div>

                                {/* Card 2: Sales Info */}
                                <div className="bg-white rounded-[2.5rem] border-2 border-green-100/50 shadow-sm p-8 relative overflow-hidden space-y-8">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                                    <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                                        <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                                            <Icon name="tag" className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Thông tin bán hàng</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div>
                                            <div className="flex items-center justify-between mb-2 px-2">
                                                <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Giá bán Website (Niêm yết)</label>
                                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">Đang hiển thị</span>
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                                    className="w-full bg-white border-4 border-gray-100 rounded-[1.75rem] py-5 px-6 text-3xl font-black text-gray-900 focus:border-green-500 focus:ring-8 focus:ring-green-50 transition-all outline-none pr-20"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl">VNĐ</span>
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-6 px-4">
                                                {[
                                                    { v: 0, l: 'Không hiển thị VAT' },
                                                    { v: 1, l: 'Đã có VAT' },
                                                    { v: 2, l: 'Chưa bao gồm VAT' }
                                                ].map(opt => (
                                                    <label key={opt.v} className="flex items-center gap-3 cursor-pointer group">
                                                        <input
                                                            type="radio"
                                                            name="vat"
                                                            checked={formData.hasVAT === opt.v}
                                                            onChange={() => setFormData(p => ({ ...p, hasVAT: opt.v }))}
                                                            className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                                                        />
                                                        <span className={`text-xs font-bold transition-colors ${formData.hasVAT === opt.v ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{opt.l}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                            <FormField
                                                label="Giá thị trường (Gạch ngang)"
                                                type="number"
                                                value={formData.market_price}
                                                onChange={v => setFormData(p => ({ ...p, market_price: v }))}
                                            />
                                            <FormField
                                                label="Giá nhập hàng (Vốn)"
                                                type="number"
                                                value={formData.purchase_price_web}
                                                onChange={v => setFormData(p => ({ ...p, purchase_price_web: v }))}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-2">Inventory (Tồn kho Web)</label>
                                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border-2 border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all">
                                                    <input
                                                        type="number"
                                                        value={formData.quantity}
                                                        onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                                                        className="w-24 bg-transparent text-xl font-black text-indigo-600 outline-none"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400 uppercase">Sản phẩm có sẵn</span>
                                                </div>
                                            </div>
                                            <FormField
                                                label="Chế độ bảo hành"
                                                value={formData.warranty}
                                                onChange={v => setFormData(p => ({ ...p, warranty: v }))}
                                                placeholder="VD: 24 tháng chính hãng"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: SIDEBAR */}
                            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-4">

                                {/* Status Card */}
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm p-6 space-y-5">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4">Trạng thái vận hành</h3>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[1.75rem]">
                                        <span className="text-xs font-black text-gray-600">HIỂN THỊ WEB</span>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${formData.isOn ? 'bg-green-500 shadow-lg shadow-green-100' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${formData.isOn ? 'translate-x-7' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ToggleField label="NEW" checked={formData.is_new} onChange={v => setFormData(p => ({ ...p, is_new: v }))} color="blue" />
                                        <ToggleField label="HOT" checked={formData.is_hot} onChange={v => setFormData(p => ({ ...p, is_hot: v }))} color="orange" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ToggleField label="BEST" checked={formData.is_best_sell} onChange={v => setFormData(p => ({ ...p, is_best_sell: v }))} color="purple" />
                                        <ToggleField label="SALE" checked={formData.is_sale_off} onChange={v => setFormData(p => ({ ...p, is_sale_off: v }))} color="red" />
                                    </div>
                                    {formData.request_path && (
                                        <a
                                            href={`https://qvc.vn${formData.request_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between p-4 bg-indigo-50 text-indigo-600 rounded-[1.75rem] border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">Xem thực tế</span>
                                            <Icon name="external-link" className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                        </a>
                                    )}
                                </div>

                                {/* Main Image Preview */}
                                <div className="bg-white rounded-[3rem] border-2 border-gray-100 shadow-sm p-6 space-y-5 overflow-hidden">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4 px-2">Ảnh đại diện chính</h3>
                                    <div className="aspect-square bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex items-center justify-center p-8 relative group cursor-pointer overflow-hidden" onClick={() => setActiveTab('media')}>
                                        {unifiedImages.length > 0 ? (
                                            <img
                                                src={unifiedImages.find(i => i.is_main)?.displayUrl || unifiedImages[0]?.displayUrl}
                                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                alt=""
                                            />
                                        ) : <Icon name="image" className="w-16 h-16 text-gray-200" />}
                                        <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <Icon name="image" className="w-8 h-8 text-white mb-2" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Gallery</span>
                                        </div>
                                    </div>
                                </div>

                                {/* System Info Card */}
                                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl relative overflow-hidden">
                                    <Icon name="bar-chart" className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 rotate-12" />
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Lượt xem</span>
                                            <span className="text-sm font-black text-indigo-400">{formData.view_count || 0}</span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cập nhật lần cuối</span>
                                            <span className="text-xs font-black text-white/90">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</span>
                                        </div>

                                        {formData.last_modified_info?.editor_name && (
                                            <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Người sửa cuối</span>
                                                <span className="text-[11px] font-bold text-indigo-300">{formData.last_modified_info.editor_name}</span>
                                                {formData.last_modified_info.ip_address && (
                                                    <span className="text-[8px] text-white/20 font-mono">IP: {formData.last_modified_info.ip_address}</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ngày tạo hệ thống</span>
                                            <span className="text-xs font-black text-white/90">{formData.created_at ? new Date(formData.created_at).toLocaleString('vi-VN') : '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'content' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SectionHeader title="Nội dung chi tiết" icon="file-text" color="purple" />
                            <div className="space-y-12">
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                                    <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mô tả sản phẩm (Description)</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setFullEditor({ open: true, type: 'description' })} className="p-1.5 text-indigo-500 hover:bg-white rounded-lg transition-colors">
                                                <Icon name="maximize" className="w-4 h-4" />
                                            </button>
                                            <span className="text-[8px] font-bold text-indigo-400 uppercase">Hỗ trợ Paste & Youtube</span>
                                        </div>
                                    </div>
                                    <RichTextEditor
                                        value={formData.description}
                                        onChange={v => setFormData(p => ({ ...p, description: v }))}
                                        proName={formData.proName}
                                        className="bg-white quill-mobile"
                                    />
                                </div>
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                                    <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông số kỹ thuật chi tiết (SPEC)</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setFullEditor({ open: true, type: 'spec' })} className="p-1.5 text-gray-400 hover:bg-white rounded-lg transition-colors">
                                                <Icon name="maximize" className="w-4 h-4" />
                                            </button>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Bảng biểu, Youtube</span>
                                        </div>
                                    </div>
                                    <RichTextEditor
                                        value={formData.spec}
                                        onChange={v => setFormData(p => ({ ...p, spec: v }))}
                                        proName={formData.proName}
                                        className="bg-white quill-mobile"
                                    />
                                </div>
                            </div>
                            <style>{`
                                .quill-mobile .ql-toolbar { border:none; border-bottom:1px solid #f3f4f6; background:#fafafa; padding:12px !important; }
                                .quill-mobile .ql-container { border:none; min-height: 350px; font-size: 16px; }
                                .quill-mobile .ql-editor { padding: 25px; line-height: 1.6; }
                            `}</style>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-8 animate-fadeIn">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <SectionHeader title="Thư viện Media Hybrid" icon="image" color="purple" />

                                {/* THANH ĐIỀU KHIỂN BẬT TẮT CHẾ ĐỘ XEM */}
                                <div className="bg-gray-100 p-1.5 rounded-[1.8rem] flex items-center shadow-inner border border-gray-50">
                                    <button
                                        onClick={() => setMediaFilter('all')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mediaFilter === 'all' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Tất cả ({fullImages.length})
                                    </button>
                                    <button
                                        onClick={() => setMediaFilter('legacy')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mediaFilter === 'legacy' ? 'bg-orange-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Chỉ ảnh Web ({fullImages.filter(i => !i.id).length})
                                    </button>
                                    <button
                                        onClick={handleLocalizeImages}
                                        className="px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all border border-emerald-200 ml-2"
                                        title="Tải tất cả ảnh từ Web QVC về Server CRM"
                                    >
                                        <Icon name="cloud-download" className="w-4 h-4 inline mr-2" />
                                        Localize
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Chỉ hiện nút Upload khi xem "Tất cả" */}
                                {mediaFilter === 'all' && (
                                    <label className="border-4 border-dashed border-gray-100 rounded-[3rem] aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group bg-gray-50/50 shadow-inner">
                                        <input type="file" className="hidden" onChange={handleUpload} />
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-all border border-gray-100 shadow-xl">
                                            <Icon name="plus" className="w-8 h-8 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tải lên ảnh mới</span>
                                    </label>
                                )}

                                {unifiedImages.map((img, idx) => (
                                    <div key={idx} className={`relative aspect-square bg-white rounded-[3rem] border-4 overflow-hidden shadow-xl group hover:scale-[1.02] transition-all ${img.is_main ? 'border-indigo-600 ring-8 ring-indigo-50' : 'border-white'}`}>
                                        {/* Dùng displayUrl đã được fix domain */}
                                        <img src={img.displayUrl} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" alt="" />

                                        {/* BỘ HUY HIỆU TRẠNG THÁI (Domain Badges) */}
                                        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                                            {img.is_main && (
                                                <div className="bg-indigo-600 text-white text-[7px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1 animate-bounce-subtle">
                                                    <Icon name="check" className="w-2.5 h-2.5" />
                                                    <span>ẢNH ĐẠI DIỆN</span>
                                                </div>
                                            )}
                                            <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase shadow-sm ${img.onCRM ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                CRM
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase shadow-sm transition-all ${img.onQVC ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-300 border border-dashed border-gray-300'}`}>
                                                QVC.VN
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-[7px] font-black uppercase bg-gray-100 text-gray-300 shadow-sm">
                                                THIENDUC.VN
                                            </span>
                                        </div>

                                        <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-4 transition-all duration-300 px-6">
                                            {!img.is_main && (
                                                <button
                                                    onClick={() => handleSetMain(img.id || img.name || img.image_name)}
                                                    className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-2xl active:scale-90 transition-all"
                                                    title="Đặt làm ảnh bìa (Đồng bộ QVC)"
                                                >
                                                    <Icon name="heart" className="w-6 h-6" />
                                                </button>
                                            )}

                                            {!img.onQVC && img.onCRM && (
                                                <button
                                                    onClick={() => handlePushToQvc(img.id)}
                                                    className="w-full py-3 bg-orange-500 text-white text-[9px] font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                                                >
                                                    Đẩy lên QVC.VN
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteImage(img)}
                                                className="w-full py-3 bg-white/10 hover:bg-red-500 text-white text-[9px] font-black rounded-xl transition-all border border-white/20 uppercase tracking-widest"
                                            >
                                                Xóa ảnh này
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Trạng thái trống khi lọc */}
                            {unifiedImages.length === 0 && (
                                <div className="py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4">
                                    <Icon name="image" className="w-16 h-16 text-gray-200" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Không có ảnh nào trong mục này</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-10 animate-fadeIn">
                            <SectionHeader title="Phân tích & Thống kê" icon="bar-chart" color="indigo" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Tổng số lượt xem', value: formData.view_count, icon: 'eye', color: 'blue' },
                                    { label: 'Số lượng đã bán', value: formData.sold_count, icon: 'shopping-bag', color: 'green' },
                                    { label: 'Số lượt yêu thích', value: formData.like_count, icon: 'heart', color: 'red' }
                                ].map((s, idx) => (
                                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-sm flex flex-col items-center justify-center gap-3 group hover:border-indigo-100 transition-colors">
                                        <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                                            <Icon name={s.icon} className="w-6 h-6" />
                                        </div>
                                        <div className="text-3xl font-black text-gray-900">{new Intl.NumberFormat('vi-VN').format(s.value)}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                                <Icon name="activity" className="absolute -right-10 -bottom-10 w-60 h-60 text-white/5 opacity-10" />
                                <div className="space-y-2 relative z-10 text-center md:text-left">
                                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Thời gian đồng bộ cuối cùng</span>
                                    <h3 className="text-2xl font-black text-white">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</h3>
                                    <p className="text-[11px] text-gray-500 font-bold italic">Dữ liệu được làm mới mỗi khi bạn thực hiện Đồng bộ (Sync) lên Web QVC.</p>
                                </div>
                                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl relative z-10 transition-all active:scale-95">Xem log lịch sử</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SectionHeader title="Tối ưu hóa SEO" icon="search" color="blue" />
                            <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 mb-8 flex items-start gap-4">
                                <Icon name="globe" className="w-6 h-6 text-blue-500 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Google Search Preview</p>
                                    <p className="text-sm font-bold text-blue-700 leading-snug line-clamp-1">{formData.meta_title || formData.proName}</p>
                                    <p className="text-xs text-green-600 font-bold truncate">https://qvc.vn{formData.request_path}</p>
                                    <p className="text-[11px] text-gray-500 font-medium line-clamp-2 leading-relaxed">{formData.meta_description || 'Chưa nội dung mô tả SEO...'}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <FormField label="Tiêu đề trang (Meta Title)" value={formData.meta_title} onChange={v => setFormData(p => ({ ...p, meta_title: v }))} placeholder="Mặc định lấy tên sản phẩm..." />
                                <FormField label="Từ khóa (Meta Keywords)" type="textarea" value={formData.meta_keyword} onChange={v => setFormData(p => ({ ...p, meta_keyword: v }))} placeholder="Ngăn cách các cụm từ bởi dấu phẩy..." />
                                <FormField label="Mô tả tìm kiếm (Meta Description)" type="textarea" value={formData.meta_description} onChange={v => setFormData(p => ({ ...p, meta_description: v }))} placeholder="Nội dung hiển thị trên kết quả tìm kiếm..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'standard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn text-slate-800 pb-40 px-2 lg:px-4">
                            {/* LEFT COLUMN (2/3) */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* 1. THÔNG TIN CHUNG */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="info" className="text-slate-400 w-5 h-5" />
                                            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Thông tin chung</h2>
                                        </div>
                                        {formData.request_path && (
                                            <a
                                                href={`https://qvc.vn${formData.request_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-black text-blue-600 hover:text-white bg-blue-50 px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-blue-600 border border-blue-100 shadow-sm"
                                            >
                                                <Icon name="external-link" className="w-3.5 h-3.5" />
                                                Xem Web QVC
                                            </a>
                                        )}
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tên sản phẩm *</label>
                                            <input
                                                type="text"
                                                value={formData.proName}
                                                onChange={e => setFormData(p => ({ ...p, proName: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition outline-none font-bold text-slate-900"
                                                placeholder="Nhập tên sản phẩm..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Mã SKU (Store SKU)</label>
                                                <div className="relative">
                                                    <Icon name="tag" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        value={formData.storeSKU}
                                                        onChange={e => setFormData(p => ({ ...p, storeSKU: e.target.value }))}
                                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 transition outline-none font-mono font-bold text-blue-600"
                                                        placeholder="Mã quản lý kho"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Model / Mã NSX</label>
                                                <input
                                                    type="text"
                                                    value={formData.productModel}
                                                    onChange={e => setFormData(p => ({ ...p, productModel: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 transition outline-none font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Request Path (Slug)</label>
                                                <div className="flex">
                                                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-400 font-bold text-sm">/</span>
                                                    <input
                                                        type="text"
                                                        value={formData.request_path}
                                                        onChange={e => setFormData(p => ({ ...p, request_path: e.target.value }))}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-r-xl transition outline-none focus:border-blue-500 font-bold text-sm text-slate-600"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Trọng lượng (gram)</label>
                                                <input
                                                    type="number"
                                                    value={formData.weight}
                                                    onChange={e => setFormData(p => ({ ...p, weight: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 transition outline-none font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. THƯ VIỆN HÌNH ẢNH (ĐÃ NÂNG CẤP UPLOAD) */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group/card">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Icon name="image" className="text-slate-400 w-5 h-5" />
                                            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Thư viện ảnh ({standardImages.length})</h2>

                                            {/* Toggle xem tất cả/chỉ QVC */}
                                            <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setShowAllStandardImages(!showAllStandardImages)}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${showAllStandardImages ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                                                <span className="text-[10px] font-black uppercase text-slate-500">
                                                    {showAllStandardImages ? 'All' : 'Web Only'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* CỤM NÚT UPLOAD COMPACT */}
                                        <div className="flex items-center gap-3">
                                            {/* Nút Dán Link - Cải thiện rõ ràng hơn */}
                                            <button
                                                onClick={() => setShowUrlInput(!showUrlInput)}
                                                className={`h-11 px-4 rounded-xl border-2 flex items-center gap-2 transition-all shadow-sm ${showUrlInput ? 'bg-pink-600 text-white border-pink-600' : 'bg-white border-slate-100 text-slate-500 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50/30'}`}
                                                title="Dán đường dẫn ảnh (URL)"
                                            >
                                                <Icon name="link" className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{showUrlInput ? 'Đóng' : 'Dán URL'}</span>
                                            </button>

                                            {/* Nút Upload File */}
                                            <label className="h-11 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-100 active:scale-95 border-2 border-blue-600">
                                                <Icon name="cloud-upload" className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Tải lên</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) smartUploadHandler(e.target.files[0]);
                                                        e.target.value = null; // Reset để chọn lại file cũ được
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Drop Zone Visual (Hiển thị khi kéo thả file vào - Optional hoặc ẩn hiện) */}
                                    <div className="p-6 min-h-[160px]">
                                        {/* Popup nhập URL nhanh */}
                                        {showUrlInput && (
                                            <div className="mb-6 animate-slideDown">
                                                <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-4 focus-within:ring-pink-50 focus-within:border-pink-200 transition-all">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="Dán link ảnh (https://...jpg, png...)"
                                                        className="flex-1 bg-transparent px-4 py-2.5 outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                uploadUrlHandler(e.target.value);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => uploadUrlHandler(e.currentTarget.previousSibling.value)}
                                                        className="px-6 bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-pink-600 transition shadow-lg shadow-pink-100"
                                                    >
                                                        Tải ảnh
                                                    </button>
                                                </div>
                                                <p className="mt-2 text-[9px] text-slate-400 font-bold px-2">Hỗ trợ các định dạng: JPG, PNG, WEBP, GIF...</p>
                                            </div>
                                        )}

                                        {/* Thông báo Paste Hint */}
                                        {standardImages.length === 0 && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                                <Icon name="copy" className="w-12 h-12 text-slate-200 mb-2" />
                                                <p className="text-xs font-black text-slate-300 uppercase">Ctrl+V để dán ảnh</p>
                                            </div>
                                        )}

                                        {/* Lưới ảnh */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
                                            {standardImages.map((img, idx) => (
                                                <div key={idx} className={`group relative aspect-square rounded-[1.5rem] overflow-hidden bg-white border-2 transition-all duration-300 shadow-sm hover:shadow-md ${img.is_main ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}>
                                                    <img src={img.displayUrl} alt="" className="w-full h-full object-contain p-3 transition-transform group-hover:scale-105" />

                                                    {/* Badge Ảnh đại diện */}
                                                    {img.is_main && (
                                                        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                                                            <Icon name="check" className="w-2.5 h-2.5" /> MAIN
                                                        </div>
                                                    )}

                                                    {/* Hover Actions (Clearer & More Descriptive) */}
                                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
                                                        {!img.is_main && (
                                                            <button
                                                                type="button"
                                                                className="mx-4 w-[80%] py-2 bg-white text-indigo-600 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-xl font-black text-[9px] uppercase tracking-widest active:scale-95"
                                                                onClick={() => handleSetMain(img.id || img.name)}
                                                            >
                                                                <Icon name="heart" className="w-4 h-4" />
                                                                <span>Đặt làm chính</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="mx-4 w-[80%] py-2 bg-white/10 text-white border border-white/30 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 hover:border-red-600 transition-all font-black text-[9px] uppercase tracking-widest active:scale-95"
                                                            onClick={() => handleDeleteImage(img)}
                                                        >
                                                            <Icon name="trash" className="w-4 h-4" />
                                                            <span>Xóa ảnh</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer nhỏ nhắc tính năng */}
                                    <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex justify-end">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Icon name="command" className="w-3 h-3" /> Hỗ trợ Paste & Kéo thả
                                        </span>
                                    </div>
                                </div>

                                {/* 3. NỘI DUNG CHI TIẾT */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
                                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                        <Icon name="file-text" className="text-slate-400 w-5 h-5" />
                                        <h2 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Nội dung sản phẩm</h2>
                                        <div className="ml-auto flex items-center gap-2">
                                            <button
                                                onClick={() => setIsMediaManagerOpen(true)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                            >
                                                <Icon name="image" className="w-3.5 h-3.5 inline mr-1" /> Media Manager
                                            </button>
                                            {standardContentSubTab !== 'summary' && (
                                                <button
                                                    onClick={() => setFullEditor({ open: true, type: standardContentSubTab })}
                                                    className="p-1.5 text-slate-400 hover:bg-white rounded-lg transition-colors border border-slate-200"
                                                    title="Mở rộng trình soạn thảo"
                                                >
                                                    <Icon name="maximize" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="flex gap-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
                                            {[
                                                { id: 'summary', label: 'Mô tả ngắn', icon: 'file-text' },
                                                { id: 'description', label: 'Chi tiết sản phẩm', icon: 'align-left' },
                                                { id: 'spec', label: 'Thông số kỹ thuật', icon: 'list' }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setStandardContentSubTab(tab.id)}
                                                    className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2 transition-all border-b-4 ${standardContentSubTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <Icon name={tab.icon} className="w-3.5 h-3.5" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="rounded-lg border border-slate-100 overflow-hidden bg-white shadow-inner">
                                            {standardContentSubTab === 'summary' ? (
                                                <textarea
                                                    value={formData.proSummary}
                                                    onChange={e => setFormData(p => ({ ...p, proSummary: e.target.value }))}
                                                    rows="12"
                                                    className="w-full px-6 py-5 outline-none text-sm font-medium leading-relaxed bg-slate-50/30 focus:bg-white transition-colors min-h-[350px]"
                                                    placeholder="Nhập tóm tắt đặc điểm nổi bật của sản phẩm..."
                                                ></textarea>
                                            ) : (
                                                <RichTextEditor
                                                    value={standardContentSubTab === 'description' ? formData.description : formData.spec}
                                                    onChange={v => setFormData(p => ({ ...p, [standardContentSubTab]: v }))}
                                                    proName={formData.proName}
                                                    className="bg-white standard-quill-editor"
                                                />
                                            )}
                                        </div>
                                        <style>{`
                                            .standard-quill-editor .ql-toolbar { border:none; border-bottom:1px solid #f1f5f9; background:#f8fafc; padding:12px !important; }
                                            .standard-quill-editor .ql-container { border:none; min-height: 400px; font-size: 15px; }
                                            .standard-quill-editor .ql-editor { padding: 30px; line-height: 1.8; color: #334155; }
                                        `}</style>
                                    </div>
                                </div>

                                {/* 4. SEO SETTINGS */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 cursor-pointer group" onClick={() => setSeoOpen(!seoOpen)}>
                                        <Icon name="search" className="text-slate-400 w-5 h-5" />
                                        <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Cấu hình SEO Search</h2>
                                        <Icon name={seoOpen ? "chevronUp" : "chevronDown"} className="ml-auto text-slate-300 group-hover:text-blue-500 transition-colors w-4 h-4" />
                                    </div>
                                    {seoOpen && (
                                        <div className="p-8 space-y-6 animate-slideDown">
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Meta Title</label>
                                                <input
                                                    type="text"
                                                    value={formData.meta_title}
                                                    onChange={e => setFormData(p => ({ ...p, meta_title: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                                                    placeholder="Tiêu đề hiển thị trên Google..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Meta Description</label>
                                                <textarea
                                                    value={formData.meta_description}
                                                    onChange={e => setFormData(p => ({ ...p, meta_description: e.target.value }))}
                                                    rows="3"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium"
                                                    placeholder="Mô tả nội dung khi tìm kiếm..."
                                                ></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Keywords</label>
                                                <input
                                                    type="text"
                                                    value={formData.meta_keyword}
                                                    onChange={e => setFormData(p => ({ ...p, meta_keyword: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                                                    placeholder="Từ khóa 1, từ khóa 2..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* RIGHT COLUMN (1/3) */}
                            <div className="lg:col-span-1 space-y-6 pb-32">

                                {/* 1. PHÂN LOẠI */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2 relative z-10">
                                        <Icon name="folder" className="w-4 h-4 text-blue-500" /> Danh mục & Thương hiệu
                                    </h3>

                                    <div className="space-y-6 relative z-10">
                                        {/* Premium Brand Picker */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thương hiệu</label>
                                                <button
                                                    onClick={() => setBrandManager({ open: true, mode: 'list' })}
                                                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                                                >
                                                    Tùy chỉnh
                                                </button>
                                            </div>
                                            <div
                                                onClick={() => setBrandManager({ open: true, mode: 'list' })}
                                                className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all rounded-2xl cursor-pointer group/item shadow-sm"
                                            >
                                                {/* Logic xác định hiển thị Brand: Priority Dictionary -> TempBrand -> Placeholder */}
                                                {(() => {
                                                    const dictBrand = dictionary?.brands?.find(b => String(b.id || b.code) === String(formData.brandId));
                                                    const displayBrand = dictBrand || (String(tempBrand?.id || tempBrand?.code) === String(formData.brandId) ? tempBrand : null);

                                                    // Helper xử lý ảnh: Ưu tiên image_url (API full) -> image -> prepend domain nếu cần
                                                    const getImgUrl = (b) => {
                                                        if (!b) return null;
                                                        let src = b.image_url || b.image;
                                                        if (!src) return null;
                                                        if (src.startsWith('http')) return src;
                                                        // Fallback domain nếu API trả về relative path (như trường hợp ID 156)
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
                                                                    {displayBrand?.name || 'Chưa chọn thương hiệu'}
                                                                </div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Bấm để thay đổi</div>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục sản phẩm</label>
                                                <button
                                                    onClick={() => setCatManager({ open: true, mode: 'list' })}
                                                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                                                >
                                                    Quản lý
                                                </button>
                                            </div>

                                            <div
                                                onClick={() => setCatManager({ open: true, mode: 'list' })}
                                                className="min-h-[60px] p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all rounded-2xl cursor-pointer shadow-sm flex flex-wrap gap-2"
                                            >
                                                {formData.catId.length > 0 ? (
                                                    formData.catId.filter(id => String(id) !== '0' && String(id) !== '').map(id => {
                                                        const cat = dictionary?.categories?.find(c => String(c.id || c.code) === String(id));
                                                        return (
                                                            <div key={id} className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-100 animate-scaleIn">
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
                                                                    setFormData(p => ({ ...p, catId: p.catId.filter(x => x !== id) }));
                                                                }} />
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Icon name="plus" className="w-5 h-5" />
                                                        <span className="text-sm font-bold">Chọn danh mục</span>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                                {/* 2. STATUS & PUBLISH */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Trạng thái</h3>
                                        <span className="text-[10px] font-mono font-black text-slate-300">ID: #{product?.id || 'NEW'}</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-blue-100 hover:bg-blue-50/10 transition-all">
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Hiển thị Web</span>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.isOn ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Ngày tạo</span>
                                            <span className="text-[10px] font-bold text-slate-600">{formData.created_at ? new Date(formData.created_at).toLocaleDateString('vi-VN') : '---'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Cập nhật</span>
                                            <span className="text-[10px] font-bold text-blue-600">{formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('vi-VN') : 'Vừa xong'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. PRICE & STOCK */}
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                                        <Icon name="tag" className="w-4 h-4 text-blue-500" /> Giá bán & Kho
                                    </h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giá bán lẻ (Web)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                                    className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl font-black text-slate-900 focus:border-blue-500 outline-none text-right text-lg"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">đ</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giá vốn</label>
                                                <input
                                                    type="number"
                                                    value={formData.purchase_price_web}
                                                    onChange={e => setFormData(p => ({ ...p, purchase_price_web: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-right font-bold text-slate-600"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bảo hành</label>
                                                <input
                                                    type="text"
                                                    value={formData.warranty}
                                                    onChange={e => setFormData(p => ({ ...p, warranty: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                                                    placeholder="12 tháng"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-dashed border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số lượng tồn web</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    value={formData.quantity}
                                                    onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-black focus:border-blue-500 outline-none"
                                                />
                                                <div className={`w-3 h-3 rounded-full shadow-sm ${formData.quantity > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. MARKETING FLAGS */}
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-4">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2 mb-2">
                                        <Icon name="tag" className="w-4 h-4 text-orange-500" /> Nhãn Marketing
                                    </h3>
                                    {[
                                        { label: 'Sản phẩm HOT 🔥', key: 'is_hot', color: 'red' },
                                        { label: 'Sản phẩm Mới (New)', key: 'is_new', color: 'blue' },
                                        { label: 'Bán chạy (Best)', key: 'is_best_sell', color: 'purple' },
                                        { label: 'Giảm giá (Sale)', key: 'is_sale_off', color: 'orange' },
                                    ].map(flag => (
                                        <label key={flag.key} className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 cursor-pointer transition group">
                                            <input
                                                type="checkbox"
                                                checked={formData[flag.key]}
                                                onChange={e => setFormData(p => ({ ...p, [flag.key]: e.target.checked }))}
                                                className={`w-5 h-5 rounded-lg border-slate-200 text-${flag.color}-500 focus:ring-${flag.color}-500`}
                                            />
                                            <span className="flex-1 text-xs font-black text-slate-600 uppercase tracking-widest">{flag.label}</span>
                                        </label>
                                    ))}
                                    <hr className="border-slate-50 my-2" />
                                    <label className="flex items-center gap-3 px-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_installment_0}
                                            onChange={e => setFormData(p => ({ ...p, is_installment_0: e.target.checked }))}
                                            className="w-4 h-4 text-slate-600 rounded border-slate-300"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hỗ trợ trả góp 0%</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-2xl border-t-2 border-slate-100 z-[70] flex flex-col md:flex-row gap-4 md:px-20 lg:px-40">
                    <div className="flex-1 flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all outline-none">Đóng</button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-xl bg-white border-2 border-indigo-600 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 outline-none"
                        >
                            Lưu Ngay
                        </button>
                    </div>

                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="flex-[2] py-4 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 outline-none"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>ĐANG XỬ LÝ...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="save" className="w-4 h-4" />
                                <span>{mode === 'create' ? 'TẠO MỚI & ĐẨY WEB' : 'LƯU & ĐÓNG'}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* MODALS QUẢN LÝ NÂNG CAO */}
                {/* MODALS QUẢN LÝ NÂNG CAO */}
                <BrandSelectionModal
                    isOpen={brandManager.open}
                    onClose={() => setBrandManager(p => ({ ...p, open: false }))}
                    onSelect={(brand) => {
                        setFormData(p => ({ ...p, brandId: brand.id }));
                        setTempBrand(brand);
                    }}
                    selectedId={formData.brandId}
                />
                <CategorySelectionModal
                    isOpen={catManager.open}
                    onClose={() => setCatManager(p => ({ ...p, open: false }))}
                    onSelect={(id) => setFormData(p => {
                        const current = Array.isArray(p.catId) ? p.catId : [];
                        const strId = String(id);
                        return {
                            ...p,
                            catId: current.includes(strId) ? current.filter(x => x !== strId) : [...current, strId]
                        };
                    })}
                    selectedId={formData.catId}
                    multiple={true}
                />

                {/* MODAL TRÌNH SOẠN THẢO RỘNG */}
                <Modal
                    isOpen={fullEditor.open}
                    onClose={() => setFullEditor(p => ({ ...p, open: false }))}
                    isFullScreen={true}
                    title={
                        <div className="flex items-center gap-3">
                            <Icon name="file-text" className="w-5 h-5 text-indigo-500" />
                            <span className="uppercase tracking-widest font-black text-sm">
                                CHỈNH SỬA {fullEditor.type === 'description' ? 'MÔ TẢ CHI TIẾT' : 'THÔNG SỐ KỸ THUẬT'}
                            </span>
                        </div>
                    }
                >
                    <div className="h-full flex flex-col p-4 md:p-10 bg-gray-50">
                        <div className="bg-white rounded-3xl shadow-2xl border flex-1 overflow-hidden flex flex-col">
                            <RichTextEditor
                                value={formData[fullEditor.type]}
                                onChange={v => setFormData(p => ({ ...p, [fullEditor.type]: v }))}
                                proName={formData.proName}
                                className="flex-1 full-screen-quill"
                            />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setFullEditor(p => ({ ...p, open: false }))}
                                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
                            >
                                XONG & QUAY LẠI
                            </button>
                        </div>
                        <style>{`
                            .full-screen-quill { display: flex; flex-direction: column; height: 100%; border: none !important; }
                            .full-screen-quill .ql-toolbar { border:none !important; border-bottom:1px solid #f1f5f9 !important; background:#f8fafc; padding:15px !important; }
                            .full-screen-quill .ql-container { border:none !important; flex: 1; overflow-y: auto; font-size: 16px; }
                            .full-screen-quill .ql-editor { padding: 40px; line-height: 1.8; min-height: 100%; }
                        `}</style>
                    </div>
                </Modal>

                {/* MODAL MEDIA MANAGER CHÍNH THỨC */}
                <MediaManagerModal
                    isOpen={isMediaManagerOpen}
                    onClose={() => setIsMediaManagerOpen(false)}
                    multiple={true}
                    onSelect={(items) => {
                        const newFiles = Array.isArray(items) ? items : [items];

                        // 1. Thêm ID vào danh sách chờ gán (để backend sync khi bấm SAVE)
                        setTempUploadedIds(prev => [...prev, ...newFiles.map(f => f.id)]);

                        // 2. Cập nhật UI list ảnh ngay lập tức
                        setFullImages(prev => {
                            // Tránh trùng lặp nếu user chọn đi chọn lại 1 ảnh
                            const existingIds = prev.map(img => img.id);
                            const filteredNew = newFiles
                                .filter(f => !existingIds.includes(f.id))
                                .map(f => ({
                                    id: f.id,
                                    url: f.url || f.displayUrl || f.preview_url,
                                    displayUrl: f.url || f.displayUrl || f.preview_url,
                                    is_temp: true, // Mark to show save is needed
                                    name: f.original_name
                                }));
                            return [...prev, ...filteredNew];
                        });

                        toast.success(`Đã lấy ${newFiles.length} file từ kho!`);
                    }}
                />
            </div>
        </Modal >
    );
};

export default ProductMobileDetail;

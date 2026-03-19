import React, { useState, useEffect, useMemo, useRef } from 'react';
import { productApi } from '../../api/admin/productApi';
import { Icon, Button, Modal } from '../../components/ui';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { metaApi } from '../../api/admin/metaApi';
import BrandSelectionModal from '../../components/modals/BrandSelectionModal.jsx';
import CategorySelectionModal from '../../components/modals/CategorySelectionModal.jsx';
import MediaManagerModal from '../../components/modals/MediaManagerModal.jsx';
import { PLACEHOLDER_UPLOAD_ERROR, PLACEHOLDER_WORD_ERROR } from '../../constants/placeholders';


// --- HIá»†U á»¨NG PHONG CÃCH TÆ¯Æ NG LAI ---
const SectionHeader = ({ title, icon, color = "blue" }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        green: "text-green-600 bg-green-50 border-green-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
        red: "text-red-600 bg-red-50 border-red-100"
    };
    return (
        <div className={`flex items-center gap-2 p-2 px-4 rounded-2xl border mb-4 ${colors[color] || colors.blue}`}>
            <Icon name={icon} className="w-4 h-4" />
            <h3 className="text-[11px] font-black uppercase tracking-widest">{title}</h3>
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
        <div className="space-y-1.5 w-full group relative" ref={ref}>
            <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] group-focus-within:text-indigo-600 transition-colors">{label}</label>
                {type === 'select' && onManage && (
                    <button type="button" onClick={onManage} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-all uppercase">Quáº£n lÃ½</button>
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
                                        placeholder="TÃ¬m nhanh..."
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
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-900">KhÃ´ng tÃ¬m tháº¥y</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 bg-gray-50/80 backdrop-blur-md border-t flex justify-between items-center px-8">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filtered.length} káº¿t quáº£</span>
                                <button type="button" onClick={() => { setIsOpen(false); onManage?.(); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100">
                                    <Icon name="plus" className="w-3 h-3" /> QUáº¢N LÃ
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

// --- HELPER RÃšT Gá»ŒN TÃŠN Sáº¢N PHáº¨M ---
const getShortProName = (name) => {
    if (!name) return "Product";
    return name.split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9- ]/g, '');
};

const WORD_IMAGE_ERROR_PLACEHOLDER = PLACEHOLDER_WORD_ERROR;

// --- HELPER Dá»ŒN Dáº¸P HTML Tá»’N Táº I SAU KHI PASTE (WORD, WEBSITE, ETC) ---
const cleanHtmlForEditor = (html) => {
    if (!html) return '';

    // Sá»­ dá»¥ng DOMParser Ä‘á»ƒ dá»n dáº¹p cáº¥u trÃºc thá»±c táº¿
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Loáº¡i bá» cÃ¡c tháº» rÃ¡c cá»§a Office/Word/Meta vÃ  cÃ¡c thÃ nh pháº§n web khÃ´ng cáº§n thiáº¿t
    const junkSelectors = [
        'meta', 'link', 'style', 'script', 'noscript', 'xml', 'o\\:p', 'v\\:*',
        '.MsoNormal', '[style*="mso-"]', '[class^="Mso"]',
        'footer', 'header', 'nav', 'aside', // Tháº» cáº¥u trÃºc web rÃ¡c
        '.social-share', '.share-buttons', '.author-info', '.tags-list', '.related-posts',
        '[class*="share"]', '[class*="author"]', '[id*="social"]'
    ];
    junkSelectors.forEach(sel => {
        try {
            doc.querySelectorAll(sel).forEach(el => el.remove());
        } catch (e) { }
    });

    // 2. LÃ m sáº¡ch STYLE: Loáº¡i bá» background-color vÃ  font-family ngoáº¡i lai
    doc.querySelectorAll('*').forEach(el => {
        if (el.style) {
            el.style.backgroundColor = '';
            el.style.fontFamily = '';
            // XÃ³a attribute style náº¿u sau khi xÃ³a cÃ¡c prop trÃªn nÃ³ trá»Ÿ nÃªn rá»—ng
            if (!el.getAttribute('style') || el.style.length === 0) el.removeAttribute('style');
        }

        // 3. Xá»­ lÃ½ link: Loáº¡i bá» link rÃ¡c (share, author)
        if (el.tagName === 'A') {
            const href = (el.getAttribute('href') || '').toLowerCase();
            const text = el.textContent.toLowerCase();
            const junkPatterns = ['share', 'facebook', 'twitter', 'zalo', 'author', 'admin', 'chÃ­nh sÃ¡ch', 'quy Ä‘á»‹nh', 'pinterest'];
            if (junkPatterns.some(p => href.includes(p) || text.includes(p))) {
                if (el.textContent.trim()) {
                    el.replaceWith(doc.createTextNode(el.textContent));
                } else {
                    el.remove();
                }
            }
        }

        // 4. XÃ³a cÃ¡c Ä‘oáº¡n text rÃ¡c (Copyright)
        if (el.textContent && el.children.length === 0) {
            const txt = el.textContent.toLowerCase();
            const copyrightPatterns = ['copyright Â©', 'táº¥t cáº£ quyá»n Ä‘Æ°á»£c báº£o lÆ°u', 'báº£n quyá»n thuá»™c vá»', 'nguá»“n:', 'source:'];
            if (copyrightPatterns.some(p => txt.includes(p)) && el.textContent.length < 200) {
                el.remove();
            }
        }
    });

    // 5. LÃ m sáº¡ch cÃ¡c tháº» span lá»“ng nhau vÃ´ nghÄ©a
    doc.querySelectorAll('span').forEach(span => {
        if (!span.attributes.length || (span.attributes.length === 1 && span.style.length === 0)) {
            span.replaceWith(...span.childNodes);
        }
    });

    return doc.body.innerHTML.trim();
};

// --- TRÃŒNH Xá»¬ LÃ PASTE Dá»® LIá»†U Tá»ª WORD/HTML ---
let lastProcessedHtml = null;
let lastProcessedTime = 0;

// [DEBUG_HELPER] Stylized Console Logs
const logTrace = (type, message, data = null) => {
    const colors = {
        'UPLOAD': 'background: #4F46E5; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'PASTE': 'background: #EF4444; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'SUCCESS': 'background: #10B981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'ERROR': 'background: #B91C1C; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'INFO': 'background: #3B82F6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;'
    };
    const style = colors[type] || 'color: grey';
    console.log(`%c${type}%c ${message}`, style, '', data || '');
};

const processHtmlImages = async (htmlContent, proName) => {
    const now = Date.now();
    // Guard chá»‘ng xá»­ lÃ½ trÃ¹ng láº·p HTML giá»‘ng há»‡t nhau trong 1 giÃ¢y
    if (htmlContent === lastProcessedHtml && (now - lastProcessedTime) < 1000) {
        console.warn("ðŸ›‘ [PASTE_DEBUG] Bá» qua vÃ¬ phÃ¡t hiá»‡n ná»™i dung HTML trÃ¹ng láº·p vá»«a Ä‘Æ°á»£c xá»­ lÃ½!");
        return htmlContent;
    }
    lastProcessedHtml = htmlContent;
    lastProcessedTime = now;

    console.group(`ðŸ“‹ [PASTE_DEBUG] Start Processing Content (Len: ${htmlContent.length})`);

    const cleanedHtml = cleanHtmlForEditor(htmlContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, 'text/html');
    const images = doc.querySelectorAll('img');

    console.log(`[PASTE_DEBUG] Found ${images.length} images after cleaning.`);

    let index = 0;
    for (const img of images) {
        index++;
        const src = img.getAttribute('src');
        if (!src) continue;

        // Bá» qua náº¿u lÃ  áº£nh ná»™i bá»™ hoáº·c blob
        if ((src.includes('qvc.vn') || src.includes('std.rocks')) && !src.includes('blob:')) continue;

        let fileToUpload = null;
        let isUrlObj = false;

        // Tá»± Ä‘á»™ng nháº­n diá»‡n loáº¡i áº£nh:
        // Case A: Base64 Data URI
        if (src.startsWith('data:image')) {
            try {
                const res = await fetch(src);
                const blob = await res.blob();
                const ext = blob.type.split('/')[1] || 'jpg';
                fileToUpload = new File([blob], `pasted_${Date.now()}_${index}.${ext}`, { type: blob.type });
            } catch (e) {
                console.warn(`[PASTE_DEBUG] Img #${index}: Failed to convert base64`, e);
            }
        }
        // Case B: External URL (báº¥t ká»³ link nÃ o khÃ´ng pháº£i ná»™i bá»™)
        else if (src.startsWith('http') || src.startsWith('//')) {
            isUrlObj = true;
            fileToUpload = src.startsWith('//') ? `https:${src}` : src;
        }
        // Case C: file:// (Word local path)
        else if (src.startsWith('file://')) {
            img.setAttribute('src', WORD_IMAGE_ERROR_PLACEHOLDER);
            img.setAttribute('alt', '[Lá»–I: TrÃ¬nh duyá»‡t cháº·n áº£nh tá»« file ná»™i bá»™ Word]');
            img.style.border = '2px dashed #f87171';
            img.style.display = 'block';
            img.style.margin = '10px auto';

            if (!window._wordPasteWarningShown) {
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-red-600">âš ï¸ ChÃº Ã½: CÃ³ áº£nh khÃ´ng thá»ƒ dÃ¡n!</span>
                        <button onClick={() => toast.dismiss(t.id)} className="text-left text-xs text-slate-600 hover:text-red-500">
                            TrÃ¬nh duyá»‡t cháº·n Ä‘á»c áº£nh tá»« file Word (giao thá»©c file://).<br />
                            <span className="font-bold">ðŸ‘‰ HÃ£y click chuá»™t pháº£i vÃ o áº£nh â†’ Copy, rá»“i Paste riÃªng.</span>
                        </button>
                    </div>
                ), { duration: 10000, icon: 'ðŸ›‘' });
                window._wordPasteWarningShown = true;
                setTimeout(() => window._wordPasteWarningShown = false, 5000);
            }
            continue;
        }

        if (fileToUpload) {
            try {
                const formDataUpload = new FormData();
                if (isUrlObj) formDataUpload.append('image_url', fileToUpload);
                else formDataUpload.append('image', fileToUpload);

                const randomId = Math.random().toString(36).substring(2, 7);
                const shortName = getShortProName(proName);
                formDataUpload.append('temp_context', `${shortName}-${randomId}`);
                formDataUpload.append('source', 'paste_auto_recognize_sequential');

                const res = await productApi.smartUpload(formDataUpload);
                const newUrl = res.data.url || res.data.image_url || res.data.displayUrl;
                img.setAttribute('src', newUrl);
                img.setAttribute('alt', `${proName} - ${randomId}`);
                img.removeAttribute('width');
                img.removeAttribute('height');
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '10px auto';
                logTrace('SUCCESS', `Auto Localized sequentially: ${newUrl}`);
            } catch (err) {
                console.error(`[PASTE_DEBUG] Img #${index} Failed:`, err);
                img.setAttribute('src', PLACEHOLDER_UPLOAD_ERROR);
            }
        }
    }
    console.groupEnd();
    return doc.body.innerHTML;
};

const RichTextEditor = ({ value, onChange, placeholder, proName, className, onTaskCountChange, onLibraryRequest }) => {
    const quillRef = useRef(null);
    const isProcessingPaste = useRef(false);
    const instanceId = useRef(Math.random().toString(36).substring(2, 7));
    const [showSource, setShowSource] = useState(false);
    const [localTaskCount, setLocalTaskCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // --- [UTILITY] TÃNH TOÃN ÄIá»‚M SEO & STATS ---
    const stats = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = value || '';
        const text = div.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const imgs = div.querySelectorAll('img');
        const imgCount = imgs.length;
        const hTags = div.querySelectorAll('h1, h2, h3');
        const links = div.querySelectorAll('a');

        // --- [NEW] CONTENT AUDIT (PHÃT HIá»†N LINK NGOÃ€I, Sá» ÄT) ---
        const audit = { externalLinks: [], phones: [] };

        // Scan Links
        links.forEach(a => {
            const href = a.getAttribute('href') || '';
            const linkText = a.textContent || '';
            const junkDomains = ['facebook.com', 'zalo.me', 'shopee.vn', 'lazada.vn', 'tiki.vn', 'messenger.com', 'tiktok.com'];
            if (junkDomains.some(d => href.toLowerCase().includes(d) || linkText.toLowerCase().includes(d))) {
                audit.externalLinks.push(href || linkText);
            }
        });

        // Scan Phone Numbers (VN format simple)
        const phoneRegex = /(0[35789][0-9]{8})\b/g;
        const matches = text.match(phoneRegex);
        if (matches) audit.phones = [...new Set(matches)]; // Unique numbers

        // TÃ­nh Ä‘iá»ƒm SEO cÆ¡ báº£n (0-100) & Insights
        let score = 0;
        const insights = [];

        if (words > 300) { score += 30; }
        else { insights.push("BÃ i viáº¿t nÃªn > 300 tá»«"); score += 10; }

        if (imgCount >= 3) { score += 20; }
        else { insights.push("Cáº§n thÃªm Ã­t nháº¥t 3 áº£nh"); score += 5; }

        if (hTags.length >= 2) { score += 20; }
        else { insights.push("Cáº§n thÃªm tháº» H2, H3"); }

        if (links >= 1) score += 10;
        else insights.push("NÃªn cÃ³ link liÃªn káº¿t");

        if (text.toLowerCase().includes(proName?.toLowerCase())) score += 20;
        else insights.push("ChÆ°a cÃ³ tá»« khÃ³a tÃªn SP");

        // Kiá»ƒm tra Alt áº£nh
        const missingAlt = Array.from(imgs).filter(img => !img.getAttribute('alt')).length;
        if (missingAlt > 0) insights.push(`${missingAlt} áº£nh thiáº¿u Alt tag`);

        // Cáº£nh bÃ¡o Audit vÃ o insights
        if (audit.externalLinks.length > 0) insights.push(`âš ï¸ CÃ³ ${audit.externalLinks.length} link rÃ¡c (FB/Zalo...)`);
        if (audit.phones.length > 0) insights.push(`ðŸ“ž CÃ³ ${audit.phones.length} sá»‘ ÄT trong bÃ i`);

        return { words, chars, imgCount, hTags: hTags.length, links: links.length, score: Math.min(100, score), insights, audit };
    }, [value, proName]);

    logTrace('INFO', `Editor Instance ${instanceId.current} Rendered | Stats: ${stats.words} words`);

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            setLocalTaskCount(prev => prev + 1);
            const tid = toast.loading("Äang táº£i áº£nh lÃªn ná»™i dung...");
            logTrace('UPLOAD', `Direct Image Upload Started: ${file.name}`);

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
                toast.success("ÄÃ£ chÃ¨n áº£nh!", { id: tid });
                logTrace('SUCCESS', `Direct Upload Complete: ${url}`);
            } catch (e) {
                logTrace('ERROR', `Direct Upload Failed`, e);
                toast.error("Lá»—i upload: " + (e.response?.data?.message || e.message), { id: tid });
            } finally {
                setLocalTaskCount(prev => Math.max(0, prev - 1));
            }
        };
    };

    const handleYoutubeEmbed = () => {
        const url = prompt("DÃ¡n link YouTube (VD: https://www.youtube.com/watch?v=...):");
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
            logTrace('INFO', `YouTube Embedded: ${embedUrl}`);
        } else {
            toast.error("Link YouTube khÃ´ng há»£p lá»‡!");
        }
    };

    // [NEW] Manuel Scan & Localize
    const scanAndLocalizeImages = async () => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const htmlContent = quill.root.innerHTML;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const images = doc.querySelectorAll('img');

        const uploadQueue = [];
        images.forEach((img, idx) => {
            const src = img.getAttribute('src');
            // Check if external
            if (src && !src.includes('qvc.vn') && !src.includes('std.rocks') && !src.startsWith('blob:')) {
                const uploadId = `up-manual-${Date.now()}-${idx}`;
                img.setAttribute('data-upload-id', uploadId);
                img.style.opacity = '0.5';
                img.style.transition = 'all 0.5s ease';
                uploadQueue.push({ id: uploadId, src: src });
            }
        });

        if (uploadQueue.length === 0) {
            toast.success("Táº¥t cáº£ áº£nh Ä‘Ã£ lÃ  ná»™i bá»™!");
            return;
        }

        quill.root.innerHTML = doc.body.innerHTML;
        const tid = toast.loading(`Äang xá»­ lÃ½ ${uploadQueue.length} áº£nh ngoáº¡i lai...`);
        logTrace('INFO', `Manual Scan Started. Found ${uploadQueue.length} external images.`);
        setLocalTaskCount(prev => prev + uploadQueue.length);

        let successCount = 0;
        for (const job of uploadQueue) {
            try {
                const formDataUpload = new FormData();
                if (job.src.startsWith('data:image')) {
                    const resData = await fetch(job.src);
                    const blob = await resData.blob();
                    formDataUpload.append('image', new File([blob], `pasted_${Date.now()}.jpg`, { type: blob.type }));
                } else {
                    formDataUpload.append('image_url', job.src);
                }
                formDataUpload.append('temp_context', getShortProName(proName));
                formDataUpload.append('source', 'rich_text_manual_localize');

                const res = await productApi.smartUpload(formDataUpload);
                const newUrl = res.data.url || res.data.image_url || res.data.displayUrl;

                const targetImg = quill.root.querySelector(`img[data-upload-id="${job.id}"]`);
                if (targetImg) {
                    targetImg.setAttribute('src', newUrl);
                    targetImg.style.opacity = '1';
                    targetImg.removeAttribute('data-upload-id');
                    successCount++;

                    // [FIX] Cáº­p nháº­t ngay láº­p tá»©c giÃºp ngÆ°á»i dÃ¹ng tháº¥y tiáº¿n Ä‘á»™ nháº£y trÃªn mÃ n hÃ¬nh
                    onChange(quill.root.innerHTML);
                    logTrace('SUCCESS', `Image Localized: ${newUrl}`);
                }
            } catch (err) {
                logTrace('ERROR', `Localize Failed for ${job.src}`, err);
            } finally {
                setLocalTaskCount(prev => Math.max(0, prev - 1));
            }
        }

        toast.success(`ÄÃ£ chuyá»ƒn Ä‘á»•i thÃ nh cÃ´ng ${successCount}/${uploadQueue.length} áº£nh!`, { id: tid });
    };

    // [UTILITY] Dá»ŒN Dáº¸P SÃ‚U (Deep Clean) ná»™i dung hiá»‡n táº¡i
    const handleDeepClean = () => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const raw = quill.root.innerHTML;
        const tid = toast.loading("Äang dá»n dáº¹p Ä‘á»‹nh dáº¡ng rÃ¡c...");

        // Cháº¡y qua bá»™ dá»n dáº¹p Ä‘Ã£ tá»‘i Æ°u
        const cleaned = cleanHtmlForEditor(raw);

        quill.root.innerHTML = cleaned;
        onChange(cleaned);
        toast.success("ÄÃ£ lÃ m sáº¡ch ná»™i dung!", { id: tid });
        logTrace('INFO', 'Manual Deep Clean executed');
    };

    // [UTILITY] CHUáº¨N HÃ“A Cáº¤U TRÃšC VÄ‚N Báº¢N (Typography Fixer)
    const handleFixTypography = () => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        let html = quill.root.innerHTML;

        // 1. Sá»­a khoáº£ng cÃ¡ch trÆ°á»›c dáº¥u cÃ¢u (chÃ o , báº¡n -> chÃ o, báº¡n)
        html = html.replace(/\s+([,.!?;:])/g, '$1');
        // 2. Äáº£m báº£o cÃ³ khoáº£ng cÃ¡ch sau dáº¥u cÃ¢u (chÃ o,báº¡n -> chÃ o, báº¡n)
        html = html.replace(/([,.!?;:])([^\s\d])/g, '$1 $2');
        // 3. XÃ³a dáº¥u cÃ¡ch thá»«a liÃªn tiáº¿p
        html = html.replace(/[ ]{2,}/g, ' ');

        quill.root.innerHTML = html;
        onChange(html);
        toast.success("ÄÃ£ tá»‘i Æ°u Typograph & Dáº¥u cÃ¢u!", { icon: 'âœï¸' });
    };

    // [POWER-PASTE] Quáº£n lÃ½ sá»± kiá»‡n Paste cho Editor
    useEffect(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();

        const handlePaste = async (e) => {
            const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
            if (!clipboardData) return;

            const html = clipboardData.getData('text/html');
            const text = clipboardData.getData('text/plain');
            const items = clipboardData.items;

            const isWord = html && (html.includes('urn:schemas-microsoft-com:office:word') || html.includes('mso-') || html.includes('Microsoft-Word'));
            const hasImageFile = Array.from(items).some(item => item.type.startsWith('image/'));
            // TÄƒng cÆ°á»ng nháº­n diá»‡n: Náº¿u HTML cÃ³ chá»©a IMG hoáº·c A hoáº·c Table/Span style (HTML phá»©c táº¡p tá»« web)
            const hasComplexHtml = html && (html.includes('<img') || html.includes('<a') || html.includes('<table') || html.includes('style='));

            logTrace('PASTE', `Paste Event Detected. hasImage=${hasImageFile}, isWord=${isWord}, hasHtml=${!!html}, hasComplex=${hasComplexHtml}`);

            // CHÃNH SÃCH CHáº¶N: Náº¿u lÃ  Word, cÃ³ áº¢nh, hoáº·c HTML phá»©c táº¡p cáº§n dá»n dáº¹p bá»›t rÃ¡c
            if (hasImageFile || isWord || hasComplexHtml) {
                if (isProcessingPaste.current) {
                    logTrace('INFO', 'Paste Blocked: Busy processing previous paste');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                isProcessingPaste.current = true;
                e.preventDefault();
                e.stopPropagation();
            } else {
                return;
            }

            // 1. Xá»¬ LÃ FILE áº¢NH (Screenshot / Copy Image File)
            if (hasImageFile && !html) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image/') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                            setLocalTaskCount(prev => prev + 1);
                            const tid = toast.loading("Äang dÃ¡n áº£nh screenshot...");
                            logTrace('UPLOAD', `Direct Paste Upload Started: ${file.name}`);

                            try {
                                const formDataUpload = new FormData();
                                formDataUpload.append('image', file);
                                formDataUpload.append('temp_context', getShortProName(proName));
                                formDataUpload.append('source', 'rich_text_paste_file');

                                const res = await productApi.smartUpload(formDataUpload);
                                const url = res.data.url || res.data.image_url || res.data.displayUrl;

                                const quill = quillRef.current.getEditor();
                                const range = quill.getSelection(true);
                                quill.insertEmbed(range.index, 'image', url);
                                toast.success("ÄÃ£ dÃ¡n áº£nh thÃ nh cÃ´ng!", { id: tid });
                                logTrace('SUCCESS', `Paste Upload Complete: ${url}`);
                            } catch (err) {
                                logTrace('ERROR', 'Paste Upload Failed', err);
                                toast.error("Lá»—i: " + err.message, { id: tid });
                            } finally {
                                setLocalTaskCount(prev => Math.max(0, prev - 1));
                                setTimeout(() => { isProcessingPaste.current = false; }, 500);
                            }
                            return;
                        }
                    }
                }
            }

            // 2. Xá»¬ LÃ HTML (Word, Excel, Website...) -> CHIáº¾N THUáº¬T OPTIMISTIC (Báº¥t Ä‘á»“ng bá»™)
            if (html || isWord) {
                const tid = toast.loading(isWord ? "Äang xá»­ lÃ½ ná»™i dung Word..." : "Äang dÃ¡n ná»™i dung...");
                try {
                    const quill = quillRef.current.getEditor();
                    let cleaned = cleanHtmlForEditor(html || text);

                    // ThÃªm class container náº¿u dÃ¡n tá»« Word Ä‘á»ƒ dá»… style
                    if (isWord) {
                        cleaned = `<div class="word-content">${cleaned}</div>`;
                    }

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(cleaned, 'text/html');
                    const imgs = doc.querySelectorAll('img');
                    const uploadQueue = [];

                    imgs.forEach((img, idx) => {
                        const src = img.getAttribute('src') || '';
                        if (src.startsWith('file://')) {
                            img.setAttribute('src', WORD_IMAGE_ERROR_PLACEHOLDER);
                            img.setAttribute('data-error', 'word-blocked');
                        }
                        else if (src && !src.includes('qvc.vn') && !src.includes('std.rocks') && !src.startsWith('blob:')) {
                            // Tá»± Ä‘á»™ng nháº­n diá»‡n áº£nh ngoáº¡i lai (bao gá»“m data:image, http...)
                            const uploadId = `up-bg-${Date.now()}-${idx}`;
                            img.setAttribute('data-upload-id', uploadId);
                            img.style.opacity = '0.5';
                            img.style.filter = 'grayscale(1) blur(1px)';
                            img.classList.add('animate-pulse');
                            uploadQueue.push({ id: uploadId, src: src });
                        }
                    });

                    // PASTE NGAY Láº¬P Tá»¨C (Optimistic)
                    const range = quill.getSelection(true);
                    quill.clipboard.dangerouslyPasteHTML(range.index, doc.body.innerHTML);
                    toast.success("ÄÃ£ dÃ¡n! Äang tá»‘i Æ°u áº£nh ngáº§m...", { id: tid });
                    logTrace('INFO', `HTML Pasted. Found ${uploadQueue.length} images for localization.`);

                    // Reset lock sá»›m Ä‘á»ƒ user cÃ³ thá»ƒ lÃ m viá»‡c khÃ¡c
                    setTimeout(() => { isProcessingPaste.current = false; }, 500);

                    // Xá»­ lÃ½ upload ngáº§m sau khi Ä‘Ã£ dÃ¡n (Parallel Processing - Max 3 at a time)
                    if (uploadQueue.length > 0) {
                        setLocalTaskCount(prev => prev + uploadQueue.length);

                        (async () => {
                            const concurrency = 3;
                            let completed = 0;
                            const total = uploadQueue.length;

                            const processJob = async (job) => {
                                try {
                                    const formDataUpload = new FormData();
                                    if (job.src.startsWith('data:image')) {
                                        const resData = await fetch(job.src);
                                        const blob = await resData.blob();
                                        formDataUpload.append('image', new File([blob], `pasted_${Date.now()}.jpg`, { type: blob.type }));
                                    } else {
                                        formDataUpload.append('image_url', job.src);
                                    }
                                    formDataUpload.append('temp_context', getShortProName(proName));
                                    formDataUpload.append('source', 'rich_text_auto_localize_bg');

                                    const res = await productApi.smartUpload(formDataUpload);
                                    const newUrl = res.data.url || res.data.image_url || res.data.displayUrl;

                                    // Sá»­ dá»¥ng selector linh hoáº¡t hÆ¡n náº¿u data-upload-id bá»‹ Quill lÃ m má»
                                    const targetImg = quill.root.querySelector(`img[data-upload-id="${job.id}"]`) ||
                                        quill.root.querySelector(`img[src="${job.src}"]`);

                                    if (targetImg) {
                                        targetImg.setAttribute('src', newUrl);
                                        targetImg.style.opacity = '1';
                                        targetImg.style.filter = 'none';
                                        targetImg.classList.remove('animate-pulse');
                                        targetImg.removeAttribute('data-upload-id');

                                        // Cáº­p nháº­t state ngay láº­p tá»©c
                                        onChange(quill.root.innerHTML);
                                        logTrace('SUCCESS', `BG Image Localized (${++completed}/${total}): ${newUrl}`);
                                    }
                                } catch (err) {
                                    logTrace('ERROR', `BG Localize Failed: ${job.src}`, err);
                                } finally {
                                    setLocalTaskCount(prev => Math.max(0, prev - 1));
                                }
                            };

                            // Cháº¡y song song giá»›i háº¡n
                            for (let i = 0; i < uploadQueue.length; i += concurrency) {
                                const chunk = uploadQueue.slice(i, i + concurrency);
                                await Promise.all(chunk.map(processJob));
                            }

                            toast.success(`ÄÃ£ tá»‘i Æ°u xong toÃ n bá»™ ${total} áº£nh bÃ i viáº¿t!`);
                        })();
                    }
                } catch (err) {
                    logTrace('ERROR', 'Paste HTML Failed', err);
                    toast.error("Lá»—i paste: " + err.message, { id: tid });
                    isProcessingPaste.current = false;
                }
            }
            console.groupEnd();
        };

        // DÃ¹ng 'true' Ä‘á»ƒ láº¯ng nghe á»Ÿ capture phase, cháº·n cÃ¡c listener máº·c Ä‘á»‹nh cá»§a Quill hiá»‡u quáº£ hÆ¡n
        quill.root.addEventListener('paste', handlePaste, true);
        return () => quill.root.removeEventListener('paste', handlePaste, true);
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
        <div className={`relative group/editor border-2 transition-all duration-500 ease-in-out bg-white ${isFullScreen ? 'fixed inset-0 z-[3000] rounded-0' : 'rounded-3xl border-gray-100 shadow-sm hover:border-indigo-100 transition-all'}`}>
            {/* TOOLBAR HEADER CUSTOM */}
            <div className={`bg-gray-50/80 backdrop-blur-md border-b px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar ${isFullScreen ? 'sticky top-0 z-[10]' : ''}`}>
                <div className="flex items-center gap-2">
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all cursor-help relative group/seo ${stats.score > 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : (stats.score > 40 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600')}`}
                    >
                        <div className="relative w-3 h-3">
                            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${stats.score > 70 ? 'bg-emerald-500' : (stats.score > 40 ? 'bg-amber-500' : 'bg-rose-500')}`} />
                            <div className={`w-3 h-3 rounded-full ${stats.score > 70 ? 'bg-emerald-500' : (stats.score > 40 ? 'bg-amber-500' : 'bg-rose-500')}`} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">SEO: {stats.score}/100</span>

                        {/* SEO TOOLTIP INSIGHTS */}
                        <div className="absolute top-full mt-2 left-0 w-80 p-5 bg-white shadow-2xl rounded-2xl border-2 border-gray-100 opacity-0 invisible group-hover/seo:opacity-100 group-hover/seo:visible transition-all z-[200]">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase mb-3 border-b pb-2 flex items-center justify-between">
                                ðŸ’¡ Gá»£i Ã½ tá»‘i Æ°u SEO
                                <span className="text-indigo-600">Stats: {stats.words} tá»«</span>
                            </h4>

                            {/* AUDIT ALERTS */}
                            {(stats.audit.externalLinks.length > 0 || stats.audit.phones.length > 0) && (
                                <div className="mb-4 space-y-2">
                                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                                        <p className="text-[9px] font-black text-rose-600 uppercase mb-1">Cáº£nh bÃ¡o nháº¡y cáº£m:</p>
                                        {stats.audit.externalLinks.map((l, i) => (
                                            <div key={i} className="text-[8px] text-rose-500 truncate mb-0.5">ðŸ”— Link ngoÃ i: {l}</div>
                                        ))}
                                        {stats.audit.phones.map((p, i) => (
                                            <div key={i} className="text-[8px] text-rose-500 font-bold">ðŸ“ž Sá»‘ ÄT: {p}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {stats.insights.length > 0 ? stats.insights.map((ins, i) => (
                                    <div key={i} className="flex gap-2 text-[9px] text-slate-500 leading-tight">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${ins.includes('âš ï¸') || ins.includes('ðŸ“ž') ? 'bg-rose-500 animate-pulse' : 'bg-indigo-400'}`} />
                                        {ins}
                                    </div>
                                )) : <div className="text-[9px] text-emerald-500 font-bold flex items-center gap-2">
                                    <Icon name="check" className="w-3 h-3" />
                                    <span>ðŸŽ‰ Ná»™i dung Ä‘Ã£ chuáº©n SEO!</span>
                                </div>}
                            </div>
                        </div>
                    </div>

                    <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 hidden lg:flex">
                        <span className="flex items-center gap-1.5"><Icon name="file-text" className="w-3 h-3" /> {stats.words} tá»«</span>
                        <span className="flex items-center gap-1.5"><Icon name="image" className="w-3 h-3" /> {stats.imgCount} áº£nh</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* LIB PICKER */}
                    <button
                        onClick={() => onLibraryRequest?.((items) => {
                            const quill = quillRef.current.getEditor();
                            const range = quill.getSelection(true);
                            let index = range ? range.index : quill.getLength();

                            items.forEach(file => {
                                const url = file.url || file.displayUrl || file.preview_url;
                                quill.insertEmbed(index, 'image', url);
                                quill.insertText(index + 1, '\n');
                                index += 2;
                            });
                        })}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                        title="Chá»n áº£nh tá»« ThÆ° viá»‡n há»‡ thá»‘ng"
                    >
                        <Icon name="image" className="w-3 h-3" />
                        ThÆ° viá»‡n
                    </button>

                    <div className="h-4 w-[1px] bg-gray-200" />

                    {/* TYPOGRAPHY FIX */}
                    <button
                        onClick={handleFixTypography}
                        className="p-2 transition-all hover:bg-gray-100 text-slate-500 rounded-xl"
                        title="Tá»± Ä‘á»™ng sá»­a lá»—i dáº¥u cÃ¢u vÃ  khoáº£ng cÃ¡ch"
                    >
                        <Icon name="type" className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-[1px] bg-gray-200" />

                    {/* NÃšT Há»– TRá»¢ PASTE CHUYÃŠN Dá»¤NG (QUAY Láº I THEO YÃŠU Cáº¦U) */}
                    <button
                        onClick={() => {
                            const input = prompt("DÃ¡n URL áº£nh hoáº·c MÃ£ HTML vÃ o Ä‘Ã¢y Ä‘á»ƒ xá»­ lÃ½ cÆ°á»¡ng bá»©c:");
                            if (input) {
                                if (input.trim().startsWith('<')) {
                                    // Xá»­ lÃ½ nhÆ° HTML paste
                                    processHtmlImages(input.trim(), proName).then(finalHtml => {
                                        const quill = quillRef.current.getEditor();
                                        const range = quill.getSelection(true);
                                        quill.clipboard.dangerouslyPasteHTML(range.index || 0, finalHtml);
                                        onChange(quill.root.innerHTML);
                                    });
                                } else {
                                    // Xá»­ lÃ½ nhÆ° URL Ä‘Æ¡n láº»
                                    smartUploadHandler(input.trim(), 'editor');
                                }
                            }
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        title="DÃ¡n cÆ°á»¡ng bá»©c HTML hoáº·c Link áº£nh"
                    >
                        <Icon name="plus" className="w-3 h-3" />
                        Há»— Trá»£ DÃ¡n
                    </button>
                    <button
                        onClick={handleDeepClean}
                        className="px-3 py-1.5 bg-white text-rose-600 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                        title="XÃ³a má»i background color, font rÃ¡c, link social..."
                    >
                        <Icon name="trash" className="w-3 h-3 inline mr-1.5" />
                        Dá»n RÃ¡c
                    </button>

                    <button
                        onClick={scanAndLocalizeImages}
                        className="px-3 py-1.5 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                        title="Tá»± Ä‘á»™ng Ä‘Æ°a toÃ n bá»™ áº£nh ngoáº¡i lai vá» website"
                    >
                        <Icon name="refresh" className="w-3 h-3 inline mr-1.5" />
                        Link áº¢nh
                    </button>

                    <button
                        onClick={() => setShowSource(!showSource)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${showSource ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-indigo-50 border border-gray-200'}`}
                    >
                        <Icon name="code" className="w-3 h-3" />
                        {showSource ? 'Editor' : 'Code'}
                    </button>

                    <div className="h-4 w-[1px] bg-gray-200" />

                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`p-2 transition-all hover:bg-gray-100 rounded-xl ${isFullScreen ? 'text-indigo-600' : 'text-slate-400'}`}
                        title={isFullScreen ? "Thu nhá»" : "ToÃ n mÃ n hÃ¬nh (Zen Mode)"}
                    >
                        <Icon name={isFullScreen ? 'minimize' : 'maximize'} className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {localTaskCount > 0 && (
                <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 pointer-events-none transition-all">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-100 rounded-full" />
                        <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-xl" />
                    </div>
                    <div className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-pulse flex items-center gap-3">
                        Äang tá»‘i Æ°u {localTaskCount} áº£nh ngáº§m...
                    </div>
                </div>
            )}

            <div className={`overflow-hidden transition-all duration-500 ${showSource ? 'bg-slate-900 border-2 border-slate-800' : 'bg-white'}`}>
                {showSource ? (
                    <div className="relative group/source">
                        <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none opacity-20">
                            {[...Array(20)].map((_, i) => <div key={i} className="text-[10px] font-mono text-slate-400">{i + 1}</div>)}
                        </div>
                        <textarea
                            autoFocus
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className={`w-full p-8 pl-12 font-mono text-xs leading-[2] outline-none border-none bg-transparent text-indigo-300 min-h-[500px] selection:bg-indigo-500 selection:text-white custom-scrollbar ${className}`}
                            spellCheck={false}
                            placeholder="<!-- DÃ¡n mÃ£ HTML hoáº·c chá»‰nh sá»­a trá»±c tiáº¿p táº¡i Ä‘Ã¢y -->"
                        />
                        <div className="absolute bottom-4 right-4 bg-slate-800/80 px-4 py-2 rounded-xl text-[10px] font-mono text-slate-500">
                            MODE: HTML_UTF8_STRICT
                        </div>
                    </div>
                ) : (
                    <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        modules={modules}
                        className={className}
                    />
                )}
            </div>

            {/* STATUS BAR BOTTOM */}
            {!showSource && (
                <div className="px-6 py-2.5 bg-gray-50/50 border-t flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> READY</span>
                        <span className="flex items-center gap-1.5 text-indigo-400"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> RICHTEXT_V2_AUTO_CLEAN</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <span>{stats.chars} KÃ½ tá»±</span>
                        <div className="h-3 w-[1px] bg-gray-200" />
                        <span className="text-slate-300">UTILITY: WORD_CLEAN_ENABLED</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const ProductMobileDetail = ({ isOpen, onClose, product, mode, onRefresh, dictionary, onSuccess, onSwitchVersion }) => {
    const [activeTab, setActiveTab] = useState('standard');
    const [currentMode, setCurrentMode] = useState(mode);
    const [currentId, setCurrentId] = useState(product?.id);
    const isProcessingPaste = useRef(false);
    const [globalTaskCount, setGlobalTaskCount] = useState(0);

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
    const [mediaFilter, setMediaFilter] = useState('all'); // 'all' hoáº·c 'legacy'
    const [seoOpen, setSeoOpen] = useState(false); // Cho giao diá»‡n Standard
    const [showAllStandardImages, setShowAllStandardImages] = useState(false);
    const [tempBrand, setTempBrand] = useState(null); // Fallback for brand display if not in dictionary
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [tempUploadedIds, setTempUploadedIds] = useState([]);
    const [standardContentSubTab, setStandardContentSubTab] = useState('summary');
    const [fullEditor, setFullEditor] = useState({ open: false, type: 'description' });
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [mediaManagerMode, setMediaManagerMode] = useState('gallery'); // 'gallery' | 'editor'
    const [mediaLibraryCallback, setMediaLibraryCallback] = useState(null);

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

    // 1. [UPDATE] Má»Ÿ rá»™ng sá»± kiá»‡n Paste cho cáº£ tab 'standard'
    useEffect(() => {
        // ThÃªm 'standard' vÃ o Ä‘iá»u kiá»‡n check
        if (!isOpen || (activeTab !== 'media' && activeTab !== 'common' && activeTab !== 'standard')) return;

        const handlePaste = async (e) => {
            console.group("[GLOBAL_PASTE_LOG]");
            const isInput = e.target.closest('input, textarea, [contenteditable]');
            console.log("-> Target is Input/Editor:", !!isInput);

            if (isProcessingPaste.current) {
                console.warn("ðŸ›‘ [GLOBAL_PASTE_LOG] BLOCKED: System is busy processing another paste.");
                console.groupEnd();
                return;
            }
            if (isInput) {
                console.log("-> Skipping Global Handler: Let Field/Editor Handler take care of it.");
                console.groupEnd();
                return;
            }

            // A. Xá»­ lÃ½ File (Screenshot, Copy Image)
            if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    console.log("[DEBUG] Paste Image File:", file.name, file.type, file.size);
                    smartUploadHandler(file); // Chuyá»ƒn sang dÃ¹ng smartUploadHandler
                }
            }
            // B. Xá»­ lÃ½ URL (Copy Image Address)
            else {
                const text = e.clipboardData.getData('text');
                if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.startsWith('http'))) {
                    console.log("[DEBUG] Paste Image URL detected:", text);
                    if (window.confirm(`Báº¡n muá»‘n táº£i áº£nh tá»« liÃªn káº¿t nÃ y?\n${text}`)) {
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
            toast.error("KhÃ´ng náº¡p Ä‘Æ°á»£c dá»¯ liá»‡u");
        } finally {
            setIsLoading(false);
        }
    };

    const uploadFileHandler = async (file) => {
        if (!file || !product?.id) return;
        const form = new FormData();
        form.append('image', file);
        const tid = toast.loading("Äang táº£i áº£nh...");
        try {
            await productApi.uploadImage(product.id, form);
            toast.success("ÄÃ£ thÃªm áº£nh!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lá»—i upload: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const uploadUrlHandler = (url) => {
        smartUploadHandler(url, 'gallery');
    };

    const smartUploadHandler = async (fileOrUrl, targetMode = 'gallery', targetField = null) => {
        if (!fileOrUrl) return;

        setGlobalTaskCount(prev => prev + 1);
        const tid = toast.loading("Äang xá»­ lÃ½ áº£nh...");
        const isUrl = typeof fileOrUrl === 'string';
        logTrace('UPLOAD', `SmartUpload Start. targetMode=${targetMode}, isUrl=${isUrl}`, fileOrUrl);

        try {
            let fileToUpload = fileOrUrl;

            // Náº¿u lÃ  URL, táº£i vá» trÆ°á»›c Ä‘á»ƒ biáº¿n thÃ nh File
            if (isUrl) {
                try {
                    const response = await fetch(fileOrUrl);
                    if (!response.ok) throw new Error("KhÃ´ng thá»ƒ táº£i áº£nh tá»« URL");
                    const blob = await response.blob();

                    const urlPath = new URL(fileOrUrl).pathname;
                    const fileName = urlPath.split('/').pop() || 'remote_image.jpg';
                    const fileType = blob.type || 'image/jpeg';

                    fileToUpload = new File([blob], fileName, { type: fileType });
                    logTrace('INFO', `Downloaded remote image: ${fileName}`);
                } catch (err) {
                    logTrace('INFO', 'CORS Fetch failed, falling back to background download');
                    fileToUpload = null;
                }
            }

            const formDataUpload = new FormData();

            if (fileToUpload instanceof File) {
                formDataUpload.append('image', fileToUpload);
            } else if (isUrl) {
                // TrÆ°á»ng há»£p URL nhÆ°ng client khÃ´ng táº£i Ä‘Æ°á»£c -> Gá»­i URL lÃªn
                formDataUpload.append('image_url', fileOrUrl);
            }

            // Gá»­i context tÃªn SP Ä‘á»ƒ backend Ä‘áº·t tÃªn file SEO
            formDataUpload.append('temp_context', getShortProName(formData.proName));
            formDataUpload.append('source', 'mobile_form_unified');

            const res = await productApi.smartUpload(formDataUpload);
            const newImage = res.data;
            const finalUrl = newImage.url || newImage.image_url || newImage.displayUrl;

            // console.log("[DEBUG] Upload Success:", newImage);

            if (targetMode === 'editor') {
                // Mode EDITOR: ChÃ¨n HTML vÃ o ná»™i dung
                const field = targetField || standardContentSubTab; // 'description', 'spec', 'specialOffer'
                if (field === 'summary') {
                    toast.error("MÃ´ táº£ ngáº¯n chá»‰ há»— trá»£ vÄƒn báº£n.", { id: tid });
                    return;
                }
                const html = `<p><img src="${finalUrl}" alt="${newImage.original_name}" /></p>`;

                // [MOD] Insert at cursor for textarea if possible
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
                    const start = activeEl.selectionStart;
                    const end = activeEl.selectionEnd;
                    const val = formData[field] || '';
                    const newVal = val.substring(0, start) + html + val.substring(end);
                    setFormData(prev => ({ ...prev, [field]: newVal }));
                } else {
                    setFormData(prev => ({ ...prev, [field]: (prev[field] || '') + html }));
                }

                toast.success("ÄÃ£ chÃ¨n áº£nh vÃ o ná»™i dung!", { id: tid });
            } else {
                // Mode GALLERY: ThÃªm vÃ o danh sÃ¡ch áº£nh sáº£n pháº©m
                // LÆ°u ID Ä‘á»ƒ tÃ­ ná»¯a báº¥m "LÆ°u sáº£n pháº©m" thÃ¬ gá»­i lÃªn gÃ¡n
                setTempUploadedIds(prev => [...prev, newImage.id]);

                // Hiá»ƒn thá»‹ áº£nh giáº£ (preview) vÃ o giao diá»‡n ngay láº­p tá»©c
                setFullImages(prev => [...prev, {
                    id: newImage.id,
                    url: finalUrl,
                    displayUrl: finalUrl,
                    is_temp: true // ÄÃ¡nh dáº¥u Ä‘á»ƒ hiá»ƒn thá»‹ visual "Chá» gÃ¡n"
                }]);
                toast.success("Xong! Báº¥m lÆ°u Ä‘á»ƒ hoÃ n táº¥t", { id: tid });
                logTrace('SUCCESS', `SmartUpload Complete: ${finalUrl}`);
                if (isUrl) setShowUrlInput(false);
            }
        } catch (e) {
            logTrace('ERROR', 'SmartUpload Failed', e);
            toast.error("Lá»—i: " + (e.response?.data?.message || e.message), { id: tid });
        } finally {
            setGlobalTaskCount(prev => Math.max(0, prev - 1));
        }
    };

    // [POWER-PASTE] Xá»­ lÃ½ paste thÃ´ng minh: Word, Excel, Mixed HTML, Images cho Textarea
    const handlePasteForField = async (e, fieldName) => {
        const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
        if (!clipboardData) return;

        const htmlData = clipboardData.getData('text/html');
        const textPlain = clipboardData.getData('text/plain');
        const itemsList = clipboardData.items;

        const isWord = htmlData && (htmlData.includes('urn:schemas-microsoft-com:office:word') || htmlData.includes('mso-'));
        const hasImageFile = Array.from(itemsList).some(item => item.type.startsWith('image/'));
        const hasHtmlImages = htmlData && htmlData.includes('<img');
        const hasComplexHtml = htmlData && (htmlData.includes('<a') || htmlData.includes('<table') || htmlData.includes('style='));

        // console.group(`[FIELD_PASTE_LOG] Target Field: ${fieldName}`);
        logTrace('PASTE', `Field Paste Detected: ${fieldName}. isWord=${!!isWord}, hasImg=${hasHtmlImages}, hasComplex=${!!hasComplexHtml}`);
        // console.log("-> HTML Length:", htmlData?.length || 0);
        // console.log("-> Text Length:", textPlain?.length || 0);
        // console.log("-> Has Images/Complex:", hasHtmlImages || hasImageFile || hasComplexHtml);

        // Náº¾U LÃ€ WORD HOáº¶C CÃ“ áº¢NH HOáº¶C HTML PHá»¨C Táº P -> TA CHáº¶N VÃ€ Xá»¬ LÃ RIÃŠNG Äá»‚ Dá»ŒN RÃC
        if (isWord || hasImageFile || hasHtmlImages || hasComplexHtml) {
            if (isProcessingPaste.current) {
                // console.warn(`ðŸ›‘ [FIELD_PASTE_LOG] BLOCKED: Lock active for ${fieldName}`);
                e.preventDefault();
                e.stopPropagation();
                // console.groupEnd();
                return;
            }

            // console.log("ðŸ”“ [FIELD_PASTE_LOG] TAKING CONTROL...");
            isProcessingPaste.current = true;
            e.preventDefault();
            e.stopPropagation();
        } else {
            // console.log("-> Passing to Default Browser Handler");
            // console.groupEnd();
            return;
        }

        const tid = toast.loading("Äang dÃ¡n ná»™i dung...");
        try {
            // CHIáº¾N THUáº¬T: PASTE TRÆ¯á»šC (Cleaned), Sau Ä‘Ã³ xá»­ lÃ½ áº£nh sau (náº¿u cÃ³)
            let contentToPaste = "";

            if (isWord || htmlData) {
                // Náº¿u lÃ  Word/HTML, dá»n dáº¹p junk trÆ°á»›c khi Ä‘Æ°a vÃ o textarea
                contentToPaste = cleanHtmlForEditor(htmlData || textPlain);

                // Náº¿u lÃ  textarea vÃ  Word, cÃ³ thá»ƒ user chá»‰ muá»‘n text?
                // NhÆ°ng ta Ä‘Ã£ há»©a há»— trá»£ HTML cÆ¡ báº£n, nÃªn ta giá»¯ HTML Ä‘Ã£ dá»n dáº¹p.
                if (isWord && !hasHtmlImages && !htmlData.includes('<b>') && !htmlData.includes('<i>')) {
                    // Náº¿u lÃ  Word nhÆ°ng ko cÃ³ format gÃ¬ Ä‘áº·c biá»‡t, láº¥y text plain cho sáº¡ch
                    contentToPaste = textPlain;
                }
            } else {
                contentToPaste = textPlain;
            }

            // Paste Optimistic vÃ o field
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                const val = formData[fieldName] || '';
                const newVal = val.substring(0, start) + contentToPaste + val.substring(end);
                setFormData(prev => ({ ...prev, [fieldName]: newVal }));
            } else {
                setFormData(prev => ({ ...prev, [fieldName]: (prev[fieldName] || '') + contentToPaste }));
            }

            toast.success("ÄÃ£ dÃ¡n!", { id: tid });
            setTimeout(() => { isProcessingPaste.current = false; }, 500);

            // Xá»­ lÃ½ áº£nh ngáº§m náº¿u cÃ³ HTML Images
            if (hasHtmlImages) {
                console.log("[FIELD_PASTE] Processing images in background...");
                // Note: Vá»›i textarea, viá»‡c replace URL sau khi user Ä‘Ã£ paste lÃ  khÃ¡ khÃ³ vÃ¬ ko cÃ³ DOM ID.
                // NÃªn vá»›i textarea, ta cÃ³ thá»ƒ cháº¥p nháº­n Ä‘á»ƒ processHtmlImages cháº¡y xong rá»“i má»›i cáº­p nháº­t state.
                // HOáº¶C dÃ¹ng regex replace.
                (async () => {
                    const finalHtml = await processHtmlImages(htmlData, formData.proName);
                    // Cáº­p nháº­t láº¡i state vá»›i áº£nh Ä‘Ã£ upload
                    setFormData(prev => {
                        const currentVal = prev[fieldName] || '';
                        // Replace ná»™i dung cÅ© báº±ng ná»™i dung Ä‘Ã£ cÃ³ áº£nh upload (náº¿u ná»™i dung chÆ°a bá»‹ sá»­a quÃ¡ nhiá»u)
                        // ÄÃ¢y lÃ  má»™t tradeoff.
                        return { ...prev, [fieldName]: currentVal.replace(contentToPaste, finalHtml) };
                    });
                })();
            }

            // Xá»­ lÃ½ Image File (Screenshot)
            if (hasImageFile && !htmlData) {
                for (let i = 0; i < itemsList.length; i++) {
                    const item = itemsList[i];
                    if (item.kind === 'file' && item.type.includes('image/')) {
                        const file = item.getAsFile();
                        smartUploadHandler(file, 'editor', fieldName);
                    }
                }
            }

        } catch (err) {
            console.error(err);
            toast.error("Lá»—i: " + err.message, { id: tid });
            isProcessingPaste.current = false;
        }
        console.groupEnd();
    };






    const handleSetMain = async (idOrName) => {
        if (!idOrName) return toast.error("KhÃ´ng cÃ³ thÃ´ng tin áº£nh");
        const tid = toast.loading("Äang thiáº¿t láº­p áº£nh chÃ­nh...");
        try {
            // [V1 FIX] Backend mong Ä‘á»£i MediaUsage ID (usage_id)
            await productApi.setMainImage(product.id, idOrName);
            toast.success("ÄÃ£ Ä‘á»•i áº£nh chÃ­nh Ä‘á»“ng bá»™ sang Web QVC!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lá»—i thiáº¿t láº­p áº£nh chÃ­nh: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleDeleteImage = async (img) => {
        if (!window.confirm("XÃ³a áº£nh nÃ y viá»…n vÄ©nh khá»i há»‡ thá»‘ng?")) return;

        console.log(`ðŸ—‘ï¸ [V1 DEBUG] Báº¥m xÃ³a áº£nh ID: ${img.id}, UsageID: ${img.usage_id}, Name: ${img.name || img.image_name}`);

        try {
            // Æ¯u tiÃªn xÃ³a báº±ng usage_id (vÃ¬ backend mong Ä‘á»£i usage_id)
            if (img.usage_id) {
                await productApi.deleteImage(product.id, img.usage_id);
            } else if (img.id && !img.is_temp) {
                // Fallback náº¿u chá»‰ cÃ³ id (file id)
                await productApi.deleteImage(product.id, img.id);
            } else if (img.name || img.image_name) {
                const nameToDelete = img.name || img.image_name;
                await productApi.deleteOldImageByName(product.id, nameToDelete);
            }

            toast.success("ÄÃ£ xÃ³a khá»i há»‡ thá»‘ng");

            // XÃ³a local trong state
            setFullImages(prev => prev.filter(f => {
                if (img.usage_id && f.usage_id) return f.usage_id !== img.usage_id;
                if (img.id) return f.id !== img.id;
                return (f.name || f.image_name) !== (img.name || img.image_name);
            }));

            // Fetch láº¡i Ä‘á»ƒ Ä‘á»“ng bá»™
            fetchDetail(product.id);
        } catch (e) {
            console.error("Delete Error:", e);
            toast.error("Lá»—i xÃ³a: " + (e.response?.data?.message || e.message));
        }
    };

    const handlePushToQvc = async (mediaId) => {
        const tid = toast.loading("Äang Ä‘áº©y áº£nh lÃªn QVC...");
        try {
            // Sá»­ dá»¥ng syncOne Ä‘á»ƒ Ä‘á»“ng bá»™ dá»¯ liá»‡u sáº£n pháº©m (bao gá»“m Media) lÃªn QVC
            await productApi.syncOne(product.id);
            toast.success("ÄÃ£ hoÃ n táº¥t Ä‘á»“ng bá»™!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lá»—i Ä‘á»“ng bá»™: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleLocalizeImages = async () => {
        const tid = toast.loading("Äang Localize áº£nh vá» server...");
        try {
            await axios.post(`/api/v1/products/${product.id}/localize-images`);
            toast.success("ÄÃ£ Localize thÃ nh cÃ´ng!", { id: tid });
            fetchDetail(product.id);
        } catch (e) {
            toast.error("Lá»—i localize: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleSave = async (shouldClose = true) => {
        // --- [Báº®T Äáº¦U CODE DEBUG V1] ---
        console.group("ðŸ› ï¸ [V1 VIEW] Báº¤M NÃšT LÆ¯U");

        // 1. Kiá»ƒm tra danh sÃ¡ch áº£nh Ä‘ang hiá»ƒn thá»‹ trÃªn mÃ n hÃ¬nh (Visual)
        console.log("ðŸ‘€ áº¢nh Ä‘ang tháº¥y (fullImages):", fullImages);

        // 2. Kiá»ƒm tra xem code cÃ³ láº¥y Ä‘Æ°á»£c ID ra khÃ´ng?
        // (ÄÃ¢y lÃ  logic quan trá»ng nháº¥t: Map tá»« Object áº£nh sang máº£ng ID)
        const debugMediaIds = fullImages?.map(img => img.id).filter(id => id);
        console.log("ðŸ”¢ ID áº¢nh trÃ­ch xuáº¥t Ä‘Æ°á»£c (media_ids):", debugMediaIds);

        // 3. Kiá»ƒm tra danh má»¥c
        console.log("ðŸ“‚ Danh má»¥c (catId):", formData.catId);

        console.groupEnd();
        // --- [Káº¾T THÃšC CODE DEBUG V1] ---

        const currentMediaIds = (fullImages || []).map(img => img.id).filter(id => id);

        const catIdArray = Array.isArray(formData.catId) ? formData.catId : [];
        const catIdString = catIdArray.length > 0 ? `,${catIdArray.join(',')},` : '';

        // Táº¡o payload má»›i nháº¥t
        const finalData = {
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
            media_ids: currentMediaIds, // <--- QUAN TRá»ŒNG: Gá»­i cÃ¡i nÃ y thÃ¬ Backend má»›i link áº£nh dc
            catId: catIdArray.length > 0 ? catIdArray[0] : formData.catId, // Gá»­i item Ä‘áº§u tiÃªn lÃ m Ä‘áº¡i diá»‡n náº¿u backend cáº§n sá»‘
            marketing_flags: [
                formData.is_hot ? 'hot' : null,
                formData.is_new ? 'new' : null,
                formData.is_best_sell ? 'best' : null,
                formData.is_sale_off ? 'sale' : null
            ].filter(Boolean)
        };

        console.log("ðŸ“¸ Danh sÃ¡ch áº£nh (Visual):", fullImages);
        console.log("ðŸ”¢ Danh sÃ¡ch ID gá»­i Ä‘i (media_ids):", finalData.media_ids);
        console.log("ðŸ“¦ Full Payload:", finalData);
        console.groupEnd();
        // --- [DEBUG V1] Káº¾T THÃšC ---

        setIsSaving(true);
        const tid = toast.loading("Äang lÆ°u dá»¯ liá»‡u...");

        try {
            if (currentMode === 'create') {
                const res = await productApi.create(finalData);
                toast.success("Táº¡o má»›i thÃ nh cÃ´ng!", { id: tid });
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
                const res = await productApi.update(currentId || product?.id, finalData);
                console.log("[DEBUG] Update Response:", res.data);
                toast.success("Cáº­p nháº­t thÃ nh cÃ´ng!", { id: tid });
                setTempUploadedIds([]);
                onRefresh && onRefresh();

                if (!shouldClose) {
                    fetchDetail(currentId || product?.id);
                }
            }

            if (shouldClose) onClose();
        } catch (e) {
            console.error("Save Error:", e);
            toast.error("Lá»—i lÆ°u dá»¯ liá»‡u: " + (e.response?.data?.message || e.message), { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (currentMode === 'create') {
            setFormData(p => ({ ...p, isOn: !p.isOn }));
            return;
        }

        const tid = toast.loading("Äang cáº­p nháº­t tráº¡ng thÃ¡i...");
        try {
            const res = await productApi.toggleStatus(currentId || product.id);
            if (res.data.success) {
                setFormData(prev => ({ ...prev, isOn: res.data.isOn }));
                toast.success(res.data.message, { id: tid });
                if (onRefresh) onRefresh();
            } else {
                toast.error(res.data.message || "Lá»—i cáº­p nháº­t", { id: tid });
            }
        } catch (e) {
            toast.error("Lá»—i: " + (e.response?.data?.message || e.message), { id: tid });
        }
    };

    const handleDeleteProduct = async () => {
        if (!currentId && !product?.id) return;

        const confirmMsg = "Báº N CÃ“ CHáº®C CHáº®N MUá»N XÃ“A Sáº¢N PHáº¨M NÃ€Y?\n\n- Há»‡ thá»‘ng sáº½ gá»i lá»‡nh xÃ³a trÃªn Web QVC.\n- Náº¿u chÆ°a cÃ³ LIÃŠN Káº¾T KHO, dá»¯ liá»‡u CRM sáº½ bá»‹ xÃ³a sáº¡ch.\n- Náº¿u Ä‘Ã£ cÃ³ LIÃŠN Káº¾T KHO, chá»‰ xÃ³a trÃªn Web vÃ  áº©n bÃ i á»Ÿ CRM.";

        if (window.confirm(confirmMsg)) {
            setIsSaving(true);
            try {
                const res = await productApi.delete(currentId || product.id);
                toast.success(res.data.message || "ÄÃ£ xá»­ lÃ½ xÃ³a thÃ nh cÃ´ng");
                onRefresh();
                onClose();
            } catch (e) {
                toast.error("Lá»—i xÃ³a: " + (e.response?.data?.message || e.message));
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Logic gá»™p áº£nh thÃ´ng minh Ä‘á»ƒ trÃ¡nh hiá»‡n 2-4 cÃ¡i giá»‘ng nhau
    const unifiedImages = useMemo(() => {
        const map = new Map();
        const mediaMeta = Array.isArray(formData.media) ? formData.media : [];

        fullImages.forEach(img => {
            // Láº¥y metadata tá»« máº£ng media gá»‘c náº¿u cÃ³ Ä‘á»ƒ biáº¿t tráº¡ng thÃ¡i sync QVC
            const meta = mediaMeta.find(m => m.id === img.id || m.media_file_id === img.id);

            // [FIX DUPLICATE] Normalize Key generation
            // Loáº¡i bá» cÃ¡c tiá»n tá»‘ ID láº·p láº¡i vÃ  chuáº©n hÃ³a dáº¥u phÃ¢n cÃ¡ch
            const rawName = img.name || img.image_name || '';
            let normName = rawName.toLowerCase().replace(/[-_ ]/g, ''); // XÃ³a háº¿t dáº¥u

            // XÃ³a prefix ID náº¿u cÃ³ (láº·p láº¡i)
            if (currentId) {
                const pid = String(currentId);
                while (normName.startsWith(pid)) {
                    normName = normName.substring(pid.length);
                }
            }

            // Náº¿u khÃ´ng cÃ³ tÃªn, dÃ¹ng URL lÃ m fallback unique
            const key = normName || `temp_${img.id || img.url}`;

            // Logic cÅ©: Æ¯u tiÃªn áº£nh cÃ³ ID (CRM) hÆ¡n áº£nh legacy (khÃ´ng ID)
            const isCRMReference = !!img.id;

            if (!map.has(key)) {
                map.set(key, {
                    ...img,
                    onCRM: isCRMReference,
                    // Æ¯u tiÃªn path ná»™i bá»™ tá»« backend má»›i
                    internalPath: meta?.master_file?.paths?.original || img.master_file?.paths?.original,
                    // Náº¿u lÃ  áº£nh CRM (cÃ³ ID), Æ°u tiÃªn láº¥y sync status tá»« meta, náº¿u khÃ´ng cÃ³ meta thÃ¬ coi nhÆ° lÃ  true náº¿u khÃ´ng pháº£i temp
                    onQVC: img.id ? (meta ? meta.qvc_sync_status === 'synced' : true) : (img.is_temp ? false : true),
                    onThienDuc: false,
                    qvc_sync_status: meta?.qvc_sync_status || img.qvc_sync_status
                });
            } else {
                const existing = map.get(key);

                // Merge logic: Náº¿u áº£nh má»›i xá»‹n hÆ¡n (cÃ³ ID) thÃ¬ override
                // Hoáº·c náº¿u áº£nh má»›i cÃ³ internalPath chuáº©n hÆ¡n
                const newInternalPath = meta?.master_file?.paths?.original || img.master_file?.paths?.original;

                if (isCRMReference && !existing.onCRM) {
                    // Thay tháº¿ hoÃ n toÃ n legacy báº±ng CRM image
                    map.set(key, {
                        ...img,
                        onCRM: true,
                        internalPath: newInternalPath || existing.internalPath,
                        onQVC: (meta ? meta.qvc_sync_status === 'synced' : true), // Assume synced if existing on legacy
                        is_main: img.is_main || existing.is_main
                    });
                    return;
                }

                if (!existing.internalPath && newInternalPath) {
                    existing.internalPath = newInternalPath;
                }
                if (img.id && !existing.id) {
                    existing.id = img.id;
                    existing.onCRM = true;
                    const syncStatus = meta?.qvc_sync_status || img.qvc_sync_status;
                    if (syncStatus === 'synced') existing.onQVC = true;
                }
                if (img.is_main) existing.is_main = true;
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

        // CHUáº¨N HÃ“A URL (Há»— trá»£ Ä‘a Ä‘á»‹nh dáº¡ng: Ä‘áº§y Ä‘á»§ domain, relative, storage, media...)
        const result = list.map(img => {
            // [FIX] Æ¯u tiÃªn láº¥y URL Ä‘áº§y Ä‘á»§ tá»« API trÆ°á»›c Ä‘á»ƒ trÃ¡nh resolve sai á»Ÿ client
            let src = img.url || img.internalPath || img.relative_path || img.displayUrl || '';
            let displayUrl = src;
            let resolveMethod = "Original Source";

            if (src) {
                // 1. Náº¿u Ä‘Ã£ cÃ³ http/https -> Giá»¯ nguyÃªn
                if (src.startsWith('http')) {
                    displayUrl = src;
                    resolveMethod = "Full URL (Preserved)";
                }
                // 2. Náº¿u báº¯t Ä‘áº§u báº±ng // -> ThÃªm https:
                else if (src.startsWith('//')) {
                    displayUrl = `https:${src}`;
                    resolveMethod = "Protocol-less (Added https:)";
                }
                // 3. Náº¿u lÃ  Ä‘Æ°á»ng dáº«n storage Local (Relative /storage/...)
                else if (src.startsWith('/storage')) {
                    const crmHost = window.location.origin.includes('maytinhquocviet.com') ? window.location.origin : 'https://crm.maytinhquocviet.com';
                    displayUrl = crmHost + src;
                    resolveMethod = "Local Storage Path";
                }
                // 4. Náº¿u lÃ  Ä‘Æ°á»ng dáº«n media/upload mÃ  thiáº¿u /storage/ (Legacy hoáº·c internalPath)
                else if (src.startsWith('uploads/') || src.startsWith('media/')) {
                    const crmHost = window.location.origin.includes('maytinhquocviet.com') ? window.location.origin : 'https://crm.maytinhquocviet.com';
                    displayUrl = `${crmHost}/storage/${src}`;
                    resolveMethod = "Fix Missing Storage Prefix";
                }
                // 5. Náº¿u lÃ  Ä‘Æ°á»ng dáº«n media cá»§a QVC (thÆ°á»ng khÃ´ng cÃ³ ID CRM)
                else if (src.startsWith('/media')) {
                    displayUrl = `https://qvc.vn${src}`;
                    resolveMethod = "Legacy QVC Path";
                }

                // 6. Fix lá»—i URL bá»‹ double slash hoáº·c thoÃ¡t kÃ½ tá»± (trá»« protocol)
                const protocol = displayUrl.startsWith('https://') ? 'https://' : (displayUrl.startsWith('http://') ? 'http://' : '');
                if (protocol) {
                    const rest = displayUrl.substring(protocol.length).replace(/\\/g, '/').replace(/\/+/g, '/');
                    displayUrl = protocol + rest;
                }
            }

            return { ...img, displayUrl, resolveMethod };
        });

        return result;
    }, [fullImages, mediaFilter, formData.media, formData.proThum]);

    const standardImages = useMemo(() => {
        let list = [];
        if (showAllStandardImages) {
            list = unifiedImages;
        } else {
            // [FIX] V1 trÆ°á»›c Ä‘Ã¢y lá»c gáº¯t (chá»‰ hiá»‡n onQVC), khiáº¿n user tÆ°á»Ÿng máº¥t áº£nh khi vá»«a upload
            // Giá» ta cho hiá»‡n háº¿t giá»‘ng V2 Ä‘á»ƒ trÃ¡nh gÃ¢y hiá»ƒu láº§m, onQVC sáº½ chá»‰ dÃ¹ng Ä‘á»ƒ hiá»‡n Badge tráº¡ng thÃ¡i
            list = unifiedImages;
        }
        // console.log("[DEBUG] Standard Tab Images Count:", list.length, "showAll:", showAllStandardImages);
        return list;
    }, [unifiedImages, showAllStandardImages]);

    const tabs = [
        { id: 'common', label: 'ðŸ“Š Tá»•ng quan', icon: 'info' },
        { id: 'content', label: 'ðŸ“ Ná»™i dung', icon: 'file-text' },
        { id: 'media', label: 'ðŸ–¼ï¸ HÃ¬nh áº£nh', icon: 'image' },
        { id: 'seo', label: 'ðŸ” SEO & Ads', icon: 'search' },
        { id: 'stats', label: 'ðŸ“ˆ Há»‡ thá»‘ng', icon: 'bar-chart' },
        { id: 'standard', label: 'ðŸ’Ž Giao diá»‡n Chuáº©n', icon: 'layout' },
    ];

    const [brandManager, setBrandManager] = useState({ open: false, mode: 'list', selected: null });
    const [catManager, setCatManager] = useState({ open: false, mode: 'list', selected: null });
    const [previewImage, setPreviewImage] = useState(null); // State for Image Lightbox Preview

    const downloadImage = async (url) => {
        if (!url) return;
        const tid = toast.loading("Äang chuáº©n bá»‹ táº£i...");
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
            toast.success("ÄÃ£ táº£i xuá»‘ng!", { id: tid });
        } catch (e) {
            window.open(url, '_blank');
            toast.dismiss(tid);
        }
    };

    if (isLoading) return (
        <Modal isOpen={isOpen} onClose={onClose} isFullScreen={true} title="Äang táº£i...">
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Vui lÃ²ng chá»...</p>
            </div>
        </Modal>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isFullScreen={true}
            title={
                <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex-1 max-w-4xl py-1">
                        <div className="flex items-center gap-2 text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">
                            <span>Sáº£n pháº©m</span>
                            <Icon name="chevronRight" className="w-2 h-2" />
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
                            className="text-base md:text-lg font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-gray-300"
                            placeholder="Nháº­p tÃªn sáº£n pháº©m..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {onSwitchVersion && (
                            <button onClick={onSwitchVersion} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100">
                                <Icon name="refresh" className="w-3 h-3" /> THá»¬ NGHIá»†M V2
                            </button>
                        )}
                        {formData.request_path && (
                            <a href={`https://qvc.vn${formData.request_path}`} target="_blank" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                                <Icon name="external-link" className="w-3 h-3" /> XEM TRÃŠN QVC
                            </a>
                        )}
                        {mode === 'edit' && (
                            <button onClick={handleDeleteProduct} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">
                                <Icon name="trash" className="w-3 h-3" /> XÃ“A Sáº¢N PHáº¨M
                            </button>
                        )}
                    </div>
                </div>
            }
            footer={
                <div className="flex items-center gap-2 w-full">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest">ÄÃ³ng</Button>
                    <Button variant="secondary" onClick={() => handleSave(false)} disabled={isSaving} className="flex-1 h-10 text-[10px] font-black border-indigo-600 text-indigo-600 uppercase tracking-widest bg-white">LÆ°u ngay</Button>
                    <Button variant="primary" onClick={() => handleSave(true)} disabled={isSaving} className="flex-[2] h-10 text-[10px] font-black bg-indigo-600 uppercase tracking-widest">
                        <Icon name="check" className="w-3.5 h-3.5 mr-2" /> LÆ°u & ÄÃ³ng
                    </Button>
                </div>
            }
        >
            <div className="h-full flex flex-col -m-2">
                {/* Fixed Top Tab Bar */}
                <div className="sticky top-0 z-[50] bg-white border-b px-2 shadow-sm overflow-x-auto no-scrollbar flex items-center justify-around md:justify-start gap-1 py-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ').pop()}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {activeTab === 'common' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">

                            {/* LEFT: MAIN FORM */}
                            <div className="lg:col-span-8 space-y-6">

                                {/* Card 1: Identities */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Icon name="tag" className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Äá»‹nh danh & PhÃ¢n loáº¡i</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField
                                            label="URL Index (ÄÆ°á»ng dáº«n tÄ©nh)"
                                            value={formData.request_path}
                                            onChange={v => setFormData(p => ({ ...p, request_path: v }))}
                                            placeholder="/ten-san-pham.html"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                label="ThÆ°Æ¡ng hiá»‡u"
                                                type="select"
                                                isBrand={true}
                                                options={dictionary?.brands}
                                                value={formData.brandId}
                                                onChange={v => setFormData(p => ({ ...p, brandId: v }))}
                                                onManage={() => window.open('/admin/brands', '_blank')}
                                            />
                                            <FormField
                                                label="MÃ£ kho (SKU)"
                                                value={formData.storeSKU}
                                                onChange={v => setFormData(p => ({ ...p, storeSKU: v }))}
                                                placeholder="VD: SKU-123"
                                            />
                                        </div>

                                        <FormField
                                            label="Danh má»¥c sáº£n pháº©m"
                                            type="select"
                                            multiple={true}
                                            options={dictionary?.categories}
                                            value={formData.catId}
                                            onChange={v => setFormData(p => ({ ...p, catId: v }))}
                                            onManage={() => window.open('/admin/categories', '_blank')}
                                        />

                                        <FormField
                                            label="TÃ³m táº¯t Ä‘áº·c tÃ­nh (Spec Summary)"
                                            type="textarea"
                                            value={formData.proSummary}
                                            onChange={v => setFormData(p => ({ ...p, proSummary: v }))}
                                            placeholder="- Chipset hiá»‡u nÄƒng cao...&#10;- MÃ n hÃ¬nh sáº¯c nÃ©t...&#10;- Báº£o hÃ nh tin cáº­y..."
                                        />
                                    </div>
                                </div>

                                {/* Card 2: Sales Info */}
                                <div className="bg-white rounded-2xl border border-green-100/50 shadow-sm p-5 relative overflow-hidden space-y-6">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                                    <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                            <Icon name="tag" className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">ThÃ´ng tin bÃ¡n hÃ ng</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div>
                                            <div>
                                                <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-black text-green-800 uppercase tracking-widest">GiÃ¡ bÃ¡n Website</label>
                                                        <div className="text-right">
                                                            <span className="text-2xl font-black text-green-600 block leading-none">
                                                                {new Intl.NumberFormat('vi-VN').format(formData.price || 0)}
                                                                <span className="text-xs text-green-400 ml-1">â‚«</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={formData.price}
                                                        onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                                        className="w-full bg-white border border-green-200 rounded-xl py-3 px-4 text-lg font-bold font-mono text-gray-900 focus:border-green-500 focus:ring-4 focus:ring-green-50 transition-all outline-none placeholder:text-gray-300"
                                                        placeholder="Nháº­p giÃ¡ bÃ¡n..."
                                                    />
                                                    <div className="flex justify-end">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Náº¿u báº±ng 0 sáº½ hiá»‡n "LiÃªn há»‡"</span>
                                                    </div>
                                                </div>
                                                {[
                                                    { v: 0, l: 'KhÃ´ng hiá»ƒn thá»‹ VAT' },
                                                    { v: 1, l: 'ÄÃ£ cÃ³ VAT' },
                                                    { v: 2, l: 'ChÆ°a bao gá»“m VAT' }
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
                                            {/* GiÃ¡ thá»‹ trÆ°á»ng */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-end px-1">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">GiÃ¡ thá»‹ trÆ°á»ng (Gáº¡ch ngang)</label>
                                                    <span className="text-xs font-black text-gray-400 font-mono">
                                                        {new Intl.NumberFormat('vi-VN').format(formData.market_price || 0)} â‚«
                                                    </span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={formData.market_price}
                                                    onChange={e => setFormData(p => ({ ...p, market_price: e.target.value }))}
                                                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold font-mono text-gray-900 focus:border-indigo-500 transition-all outline-none"
                                                    placeholder="0"
                                                />
                                            </div>

                                            {/* GiÃ¡ nháº­p */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-end px-1">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">GiÃ¡ nháº­p hÃ ng (Vá»‘n)</label>
                                                    <span className="text-xs font-black text-gray-400 font-mono">
                                                        {new Intl.NumberFormat('vi-VN').format(formData.purchase_price_web || 0)} â‚«
                                                    </span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={formData.purchase_price_web}
                                                    onChange={e => setFormData(p => ({ ...p, purchase_price_web: e.target.value }))}
                                                    className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold font-mono text-gray-900 focus:border-indigo-500 transition-all outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-1">Inventory (Tá»“n kho Web)</label>
                                                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border focus-within:border-indigo-100 focus-within:bg-white transition-all">
                                                    <input
                                                        type="number"
                                                        value={formData.quantity}
                                                        onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                                                        className="w-20 bg-transparent text-lg font-black text-indigo-600 outline-none"
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Sáº£n pháº©m cÃ³ sáºµn</span>
                                                </div>
                                            </div>
                                            <FormField
                                                label="Cháº¿ Ä‘á»™ báº£o hÃ nh"
                                                value={formData.warranty}
                                                onChange={v => setFormData(p => ({ ...p, warranty: v }))}
                                                placeholder="VD: 24 thÃ¡ng chÃ­nh hÃ£ng"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: SIDEBAR */}
                            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[50px]">

                                {/* Status Card */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">Tráº¡ng thÃ¡i váº­n hÃ nh</h3>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-[10px] font-black text-gray-600">HIá»‚N THá»Š WEB</span>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.isOn ? 'bg-green-500' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${formData.isOn ? 'translate-x-6' : 'translate-x-0'}`} />
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
                                            <span className="text-xs font-black uppercase tracking-widest">Xem thá»±c táº¿</span>
                                            <Icon name="external-link" className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                        </a>
                                    )}
                                </div>

                                {/* Main Image Preview */}
                                <div className="bg-white rounded-[3rem] border-2 border-gray-100 shadow-sm p-6 space-y-5 overflow-hidden">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4 px-2">áº¢nh Ä‘áº¡i diá»‡n chÃ­nh</h3>
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
                                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">LÆ°á»£t xem</span>
                                            <span className="text-sm font-black text-indigo-400">{formData.view_count || 0}</span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cáº­p nháº­t láº§n cuá»‘i</span>
                                            <span className="text-xs font-black text-white/90">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</span>
                                        </div>

                                        {formData.last_modified_info?.editor_name && (
                                            <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">NgÆ°á»i sá»­a cuá»‘i</span>
                                                <span className="text-[11px] font-bold text-indigo-300">{formData.last_modified_info.editor_name}</span>
                                                {formData.last_modified_info.ip_address && (
                                                    <span className="text-[8px] text-white/20 font-mono">IP: {formData.last_modified_info.ip_address}</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">NgÃ y táº¡o há»‡ thá»‘ng</span>
                                            <span className="text-xs font-black text-white/90">{formData.created_at ? new Date(formData.created_at).toLocaleString('vi-VN') : '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'content' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SectionHeader title="Ná»™i dung chi tiáº¿t" icon="file-text" color="purple" />
                            <div className="space-y-12">
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                                    <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MÃ´ táº£ sáº£n pháº©m (Description)</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setFullEditor({ open: true, type: 'description' })} className="p-1.5 text-indigo-500 hover:bg-white rounded-lg transition-colors">
                                                <Icon name="maximize" className="w-4 h-4" />
                                            </button>
                                            <span className="text-[8px] font-bold text-indigo-400 uppercase">Há»— trá»£ Paste & Youtube</span>
                                        </div>
                                    </div>
                                    <RichTextEditor
                                        value={formData.description}
                                        onChange={v => setFormData(p => ({ ...p, description: v }))}
                                        proName={formData.proName}
                                        onLibraryRequest={(callback) => {
                                            setMediaManagerMode('editor');
                                            setMediaLibraryCallback(() => callback);
                                            setIsMediaManagerOpen(true);
                                        }}
                                        className="bg-white quill-mobile"
                                    />
                                </div>
                                <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                                    <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ThÃ´ng sá»‘ ká»¹ thuáº­t chi tiáº¿t (SPEC)</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setFullEditor({ open: true, type: 'spec' })} className="p-1.5 text-gray-400 hover:bg-white rounded-lg transition-colors">
                                                <Icon name="maximize" className="w-4 h-4" />
                                            </button>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Báº£ng biá»ƒu, Youtube</span>
                                        </div>
                                    </div>
                                    <RichTextEditor
                                        value={formData.spec}
                                        onChange={v => setFormData(p => ({ ...p, spec: v }))}
                                        proName={formData.proName}
                                        onLibraryRequest={(callback) => {
                                            setMediaManagerMode('editor');
                                            setMediaLibraryCallback(() => callback);
                                            setIsMediaManagerOpen(true);
                                        }}
                                        className="bg-white quill-mobile"
                                    />
                                </div>
                            </div>
                            {/* NEW: Special Offer Block */}
                            <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm mt-8">
                                <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ChÆ°Æ¡ng trÃ¬nh khuyáº¿n máº¡i (Special Offer)</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setFullEditor({ open: true, type: 'specialOffer' })} className="p-1.5 text-rose-500 hover:bg-white rounded-lg transition-colors">
                                            <Icon name="maximize" className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <RichTextEditor
                                    value={formData.specialOffer}
                                    onChange={v => setFormData(p => ({ ...p, specialOffer: v }))}
                                    proName={formData.proName}
                                    onLibraryRequest={(callback) => {
                                        setMediaManagerMode('editor');
                                        setMediaLibraryCallback(() => callback);
                                        setIsMediaManagerOpen(true);
                                    }}
                                    className="bg-white quill-mobile"
                                    placeholder="Nháº­p khuyáº¿n mÃ£i..."
                                />
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
                                <SectionHeader title="ThÆ° viá»‡n Media Hybrid" icon="image" color="purple" />

                                {/* THANH ÄIá»€U KHIá»‚N Báº¬T Táº®T CHáº¾ Äá»˜ XEM */}
                                <div className="bg-gray-100 p-1.5 rounded-[1.8rem] flex items-center shadow-inner border border-gray-50">
                                    <button
                                        onClick={() => setMediaFilter('all')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mediaFilter === 'all' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Táº¥t cáº£ ({fullImages.length})
                                    </button>
                                    <button
                                        onClick={() => setMediaFilter('legacy')}
                                        className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mediaFilter === 'legacy' ? 'bg-orange-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Chá»‰ áº£nh Web ({fullImages.filter(i => !i.id).length})
                                    </button>
                                    <button
                                        onClick={handleLocalizeImages}
                                        className="px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all border border-emerald-200 ml-2"
                                        title="Táº£i táº¥t cáº£ áº£nh tá»« Web QVC vá» Server CRM"
                                    >
                                        <Icon name="cloud-download" className="w-4 h-4 inline mr-2" />
                                        Localize
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Chá»‰ hiá»‡n nÃºt Upload khi xem "Táº¥t cáº£" */}
                                {mediaFilter === 'all' && (
                                    <label className="border-4 border-dashed border-gray-100 rounded-[3rem] aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group bg-gray-50/50 shadow-inner">
                                        <input type="file" className="hidden" onChange={(e) => {
                                            if (e.target.files[0]) uploadFileHandler(e.target.files[0]);
                                            e.target.value = null;
                                        }} />
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-all border border-gray-100 shadow-xl">
                                            <Icon name="plus" className="w-8 h-8 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Táº£i lÃªn áº£nh má»›i</span>
                                    </label>
                                )}

                                {unifiedImages.map((img, idx) => (
                                    <div key={img.id || img.image_name || img.name || idx} className={`relative aspect-square bg-white rounded-[3rem] border-4 overflow-hidden shadow-xl group hover:scale-[1.02] transition-all ${img.is_main ? 'border-indigo-600 ring-8 ring-indigo-50' : 'border-white'}`}>
                                        {/* DÃ¹ng displayUrl Ä‘Ã£ Ä‘Æ°á»£c fix domain */}
                                        <img src={img.displayUrl} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" alt="" />

                                        {/* Bá»˜ HUY HIá»†U TRáº NG THÃI (Domain Badges) */}
                                        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                                            {img.is_main && (
                                                <div className="bg-indigo-600 text-white text-[7px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1 animate-bounce-subtle">
                                                    <Icon name="check" className="w-2.5 h-2.5" />
                                                    <span>áº¢NH Äáº I DIá»†N</span>
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
                                                    onClick={() => handleSetMain(img.usage_id || img.id || img.name || img.image_name)}
                                                    className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-2xl active:scale-90 transition-all"
                                                    title="Äáº·t lÃ m áº£nh bÃ¬a (Äá»“ng bá»™ QVC)"
                                                >
                                                    <Icon name="heart" className="w-6 h-6" />
                                                </button>
                                            )}

                                            {!img.onQVC && img.onCRM && (
                                                <button
                                                    onClick={() => handlePushToQvc(img.id)}
                                                    className="w-full py-3 bg-orange-500 text-white text-[9px] font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                                                >
                                                    Äáº©y lÃªn QVC.VN
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteImage(img)}
                                                className="w-full py-3 bg-white/10 hover:bg-red-500 text-white text-[9px] font-black rounded-xl transition-all border border-white/20 uppercase tracking-widest"
                                            >
                                                XÃ³a áº£nh nÃ y
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tráº¡ng thÃ¡i trá»‘ng khi lá»c */}
                            {unifiedImages.length === 0 && (
                                <div className="py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4">
                                    <Icon name="image" className="w-16 h-16 text-gray-200" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">KhÃ´ng cÃ³ áº£nh nÃ o trong má»¥c nÃ y</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-10 animate-fadeIn">
                            <SectionHeader title="PhÃ¢n tÃ­ch & Thá»‘ng kÃª" icon="bar-chart" color="indigo" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Tá»•ng sá»‘ lÆ°á»£t xem', value: formData.view_count, icon: 'eye', color: 'blue' },
                                    { label: 'Sá»‘ lÆ°á»£ng Ä‘Ã£ bÃ¡n', value: formData.sold_count, icon: 'shopping-bag', color: 'green' },
                                    { label: 'Sá»‘ lÆ°á»£t yÃªu thÃ­ch', value: formData.like_count, icon: 'heart', color: 'red' }
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
                                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Thá»i gian Ä‘á»“ng bá»™ cuá»‘i cÃ¹ng</span>
                                    <h3 className="text-2xl font-black text-white">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('vi-VN') : '---'}</h3>
                                    <p className="text-[11px] text-gray-500 font-bold italic">Dá»¯ liá»‡u Ä‘Æ°á»£c lÃ m má»›i má»—i khi báº¡n thá»±c hiá»‡n Äá»“ng bá»™ (Sync) lÃªn Web QVC.</p>
                                </div>
                                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl relative z-10 transition-all active:scale-95">Xem log lá»‹ch sá»­</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SectionHeader title="Tá»‘i Æ°u hÃ³a SEO" icon="search" color="blue" />
                            <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 mb-8 flex items-start gap-4">
                                <Icon name="globe" className="w-6 h-6 text-blue-500 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Google Search Preview</p>
                                    <p className="text-sm font-bold text-blue-700 leading-snug line-clamp-1">{formData.meta_title || formData.proName}</p>
                                    <p className="text-xs text-green-600 font-bold truncate">https://qvc.vn{formData.request_path}</p>
                                    <p className="text-[11px] text-gray-500 font-medium line-clamp-2 leading-relaxed">{formData.meta_description || 'ChÆ°a ná»™i dung mÃ´ táº£ SEO...'}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <FormField label="TiÃªu Ä‘á» trang (Meta Title)" value={formData.meta_title} onChange={v => setFormData(p => ({ ...p, meta_title: v }))} placeholder="Máº·c Ä‘á»‹nh láº¥y tÃªn sáº£n pháº©m..." />
                                <FormField label="Tá»« khÃ³a (Meta Keywords)" type="textarea" value={formData.meta_keyword} onChange={v => setFormData(p => ({ ...p, meta_keyword: v }))} placeholder="NgÄƒn cÃ¡ch cÃ¡c cá»¥m tá»« bá»Ÿi dáº¥u pháº©y..." />
                                <FormField label="MÃ´ táº£ tÃ¬m kiáº¿m (Meta Description)" type="textarea" value={formData.meta_description} onChange={v => setFormData(p => ({ ...p, meta_description: v }))} placeholder="Ná»™i dung hiá»ƒn thá»‹ trÃªn káº¿t quáº£ tÃ¬m kiáº¿m..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'standard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn text-slate-800 pb-40 px-2 lg:px-4">
                            {/* LEFT COLUMN (2/3) */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* 1. THÃ”NG TIN CHUNG */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="info" className="text-slate-400 w-5 h-5" />
                                            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">ThÃ´ng tin chung</h2>
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
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">TÃªn sáº£n pháº©m *</label>
                                            <input
                                                type="text"
                                                value={formData.proName}
                                                onChange={e => setFormData(p => ({ ...p, proName: e.target.value }))}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition outline-none font-bold text-slate-900"
                                                placeholder="Nháº­p tÃªn sáº£n pháº©m..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">MÃ£ SKU (Store SKU)</label>
                                                <div className="relative">
                                                    <Icon name="tag" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                    <input
                                                        type="text"
                                                        value={formData.storeSKU}
                                                        onChange={e => setFormData(p => ({ ...p, storeSKU: e.target.value }))}
                                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 transition outline-none font-mono font-bold text-blue-600"
                                                        placeholder="MÃ£ quáº£n lÃ½ kho"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Model / MÃ£ NSX</label>
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
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Trá»ng lÆ°á»£ng (gram)</label>
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

                                {/* 2. Ná»˜I DUNG CHI TIáº¾T */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm scroll-target-content">
                                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                        <Icon name="file-text" className="text-slate-400 w-4 h-4" />
                                        <h2 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Ná»™i dung sáº£n pháº©m</h2>
                                        <div className="ml-auto flex items-center gap-2">
                                            {/* --- EDITOR TOOLS (COPY FROM GALLERY STYLE) --- */}
                                            {standardContentSubTab !== 'summary' && (
                                                <div className="flex items-center gap-2">
                                                    {/* 1. Chá»n tá»« kho */}
                                                    <button
                                                        onClick={() => {
                                                            setMediaManagerMode('editor');
                                                            setIsMediaManagerOpen(true);
                                                        }}
                                                        className="h-8 px-3 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                                                        title="ChÃ¨n tá»« kho áº£nh"
                                                    >
                                                        <Icon name="image" className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Kho áº£nh</span>
                                                    </button>

                                                    {/* 2. Upload nhanh */}
                                                    <label className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5" title="Táº£i áº£nh má»›i lÃªn vÃ  chÃ¨n ngay">
                                                        <Icon name="cloud-upload" className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Táº£i lÃªn</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files[0]) smartUploadHandler(e.target.files[0], 'editor');
                                                                e.target.value = null;
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            )}

                                            {standardContentSubTab !== 'summary' && (
                                                <button
                                                    onClick={() => setFullEditor({ open: true, type: standardContentSubTab })}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center gap-1 ml-2"
                                                >
                                                    <Icon name="maximize" className="w-3 h-3" /> Má»Ÿ rá»™ng
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex gap-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
                                            {[
                                                { id: 'summary', label: 'MÃ´ táº£ ngáº¯n', icon: 'file-text' },
                                                { id: 'description', label: 'Chi tiáº¿t sáº£n pháº©m', icon: 'align-left' },
                                                { id: 'spec', label: 'ThÃ´ng sá»‘ ká»¹ thuáº­t', icon: 'list' }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setStandardContentSubTab(tab.id)}
                                                    className={`pb-2 px-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2 transition-all border-b-2 ${standardContentSubTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <Icon name={tab.icon} className="w-3 h-3" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div
                                            className="rounded-lg border border-slate-100 overflow-hidden bg-white shadow-inner"
                                        >
                                            {standardContentSubTab === 'summary' ? (
                                                <textarea
                                                    value={formData.proSummary}
                                                    onChange={e => setFormData(p => ({ ...p, proSummary: e.target.value }))}
                                                    onPasteCapture={(e) => {
                                                        logTrace('PASTE', 'Summary Textarea Paste');
                                                        handlePasteForField(e, 'proSummary');
                                                    }}
                                                    rows="10"
                                                    className="w-full px-5 py-4 outline-none text-sm font-medium leading-relaxed bg-slate-50/10 focus:bg-white transition-colors min-h-[300px]"
                                                    placeholder="Nháº­p tÃ³m táº¯t Ä‘áº·c Ä‘iá»ƒm ná»•i báº­t cá»§a sáº£n pháº©m..."
                                                ></textarea>
                                            ) : (
                                                <RichTextEditor
                                                    value={standardContentSubTab === 'description' ? formData.description : formData.spec}
                                                    onChange={v => setFormData(p => ({ ...p, [standardContentSubTab]: v }))}
                                                    proName={formData.proName}
                                                    onTaskCountChange={setGlobalTaskCount}
                                                    onLibraryRequest={(callback) => {
                                                        setMediaManagerMode('editor');
                                                        setMediaLibraryCallback(() => callback);
                                                        setIsMediaManagerOpen(true);
                                                    }}
                                                    className="bg-white standard-quill-editor"
                                                />
                                            )}
                                        </div>
                                        <style>{`
                                            .standard-quill-editor .ql-toolbar { border:none; border-bottom:1px solid #f1f5f9; background:#f8fafc; padding:8px 12px !important; }
                                            .standard-quill-editor .ql-container { border:none; min-height: 300px; font-size: 15px; }
                                            .standard-quill-editor .ql-editor { padding: 20px; line-height: 1.8; color: #334155; }
                                        `}</style>
                                    </div>
                                </div>

                                {/* 3. THÆ¯ VIá»†N HÃŒNH áº¢NH (ÄÃƒ NÃ‚NG Cáº¤P UPLOAD) */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group/card">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Icon name="image" className="text-slate-400 w-5 h-5" />
                                            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">ThÆ° viá»‡n áº£nh ({standardImages.length})</h2>

                                            {/* Toggle xem táº¥t cáº£/chá»‰ QVC */}
                                            <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setShowAllStandardImages(!showAllStandardImages)}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${showAllStandardImages ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                                                <span className="text-[10px] font-black uppercase text-slate-500">
                                                    {showAllStandardImages ? 'All' : 'Web Only'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cá»¤M NÃšT UPLOAD COMPACT */}
                                        <div className="flex items-center gap-3">
                                            {/* NÃºt Chá»n tá»« Kho (Má»›i) */}
                                            <button
                                                onClick={() => {
                                                    setMediaManagerMode('gallery');
                                                    setIsMediaManagerOpen(true);
                                                }}
                                                className="h-11 px-4 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-600 flex items-center gap-2 transition-all shadow-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                                                title="Chá»n áº£nh cÃ³ sáºµn tá»« kho Media"
                                            >
                                                <Icon name="image" className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Chá»n tá»« kho</span>
                                            </button>

                                            {/* NÃºt DÃ¡n Link - Cáº£i thiá»‡n rÃµ rÃ ng hÆ¡n */}
                                            <button
                                                onClick={() => setShowUrlInput(!showUrlInput)}
                                                className={`h-11 px-4 rounded-xl border-2 flex items-center gap-2 transition-all shadow-sm ${showUrlInput ? 'bg-pink-600 text-white border-pink-600' : 'bg-white border-slate-100 text-slate-500 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50/30'}`}
                                                title="DÃ¡n Ä‘Æ°á»ng dáº«n áº£nh (URL)"
                                            >
                                                <Icon name="link" className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{showUrlInput ? 'ÄÃ³ng' : 'URL'}</span>
                                            </button>

                                            {/* NÃºt Upload File */}
                                            <label className="h-11 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-100 active:scale-95 border-2 border-blue-600">
                                                <Icon name="cloud-upload" className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Táº£i lÃªn</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) smartUploadHandler(e.target.files[0], 'gallery');
                                                        e.target.value = null;
                                                    }}
                                                />
                                            </label>

                                            {/* NÃºt Scroll xuá»‘ng Content */}
                                            <button
                                                onClick={() => {
                                                    document.querySelector('.scroll-target-content')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                title="Viáº¿t ná»™i dung"
                                            >
                                                <Icon name="arrow-down" className="w-4 h-4" />
                                            </button>
                                        </div>

                                    </div>

                                    {/* Drop Zone Visual (Hiá»ƒn thá»‹ khi kÃ©o tháº£ file vÃ o - Optional hoáº·c áº©n hiá»‡n) */}
                                    <div className="p-6 min-h-[160px]">
                                        {/* Popup nháº­p URL nhanh */}
                                        {showUrlInput && (
                                            <div className="mb-6 animate-slideDown">
                                                <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-4 focus-within:ring-pink-50 focus-within:border-pink-200 transition-all">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="DÃ¡n link áº£nh (https://...jpg, png...)"
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
                                                        Táº£i áº£nh
                                                    </button>
                                                </div>
                                                <p className="mt-2 text-[9px] text-slate-400 font-bold px-2">Há»— trá»£ cÃ¡c Ä‘á»‹nh dáº¡ng: JPG, PNG, WEBP, GIF...</p>
                                            </div>
                                        )}

                                        {/* ThÃ´ng bÃ¡o Paste Hint */}
                                        {standardImages.length === 0 && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                                <Icon name="copy" className="w-12 h-12 text-slate-200 mb-2" />
                                                <p className="text-xs font-black text-slate-300 uppercase">Ctrl+V Ä‘á»ƒ dÃ¡n áº£nh</p>
                                            </div>
                                        )}

                                        {/* LÆ°á»›i áº£nh */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
                                            {standardImages.map((img, idx) => (
                                                <div key={img.id || img.image_name || img.name || idx} className={`group relative aspect-square rounded-[1.5rem] overflow-hidden bg-white border-2 transition-all duration-300 shadow-sm hover:shadow-md ${img.is_main ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}>
                                                    <img src={img.displayUrl} alt="" className="w-full h-full object-contain p-3 transition-transform group-hover:scale-105" />

                                                    {/* Badge áº¢nh Ä‘áº¡i diá»‡n */}
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
                                                                onClick={() => handleSetMain(img.usage_id || img.id || img.name)}
                                                            >
                                                                <Icon name="heart" className="w-4 h-4" />
                                                                <span>Äáº·t lÃ m chÃ­nh</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="mx-4 w-[80%] py-2 bg-white text-indigo-600 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-xl font-black text-[9px] uppercase tracking-widest active:scale-95"
                                                            onClick={() => setPreviewImage(img.displayUrl)}
                                                        >
                                                            <Icon name="eye" className="w-4 h-4" />
                                                            <span>Xem áº£nh lá»›n</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="mx-4 w-[80%] py-2 bg-white/10 text-white border border-white/30 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 hover:border-red-600 transition-all font-black text-[9px] uppercase tracking-widest active:scale-95"
                                                            onClick={() => handleDeleteImage(img)}
                                                        >
                                                            <Icon name="trash" className="w-4 h-4" />
                                                            <span>XÃ³a áº£nh</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer nhá» nháº¯c tÃ­nh nÄƒng */}
                                    <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex justify-end">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Icon name="command" className="w-3 h-3" /> Há»— trá»£ Paste & KÃ©o tháº£
                                        </span>
                                    </div>
                                </div>

                                {/* 4. SPECIAL OFFER (Khuyáº¿n mÃ£i) */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="gift" className="text-rose-500 w-5 h-5" />
                                            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Khuyáº¿n mÃ£i Ä‘áº·c biá»‡t</h2>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <textarea
                                            value={formData.specialOffer}
                                            onChange={e => setFormData(p => ({ ...p, specialOffer: e.target.value }))}
                                            onPasteCapture={(e) => {
                                                console.log("[PASTE_DEBUG] SpecialOffer Textarea Capture");
                                                handlePasteForField(e, 'specialOffer');
                                            }}
                                            rows="5"
                                            className="w-full px-6 py-4 outline-none text-sm font-medium leading-relaxed bg-rose-50/10 border border-rose-100 rounded-xl focus:bg-white focus:border-rose-500 transition-all placeholder:text-rose-200 text-slate-700"
                                            placeholder="Nháº­p ná»™i dung khuyáº¿n mÃ£i Ä‘áº·c biá»‡t (Há»— trá»£ HTML cÆ¡ báº£n)..."
                                        ></textarea>
                                        <div className="mt-3 flex items-center justify-between">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Hiá»ƒn thá»‹ ná»•i báº­t dÆ°á»›i pháº§n giÃ¡ bÃ¡n</p>
                                            <button
                                                onClick={() => setFullEditor({ open: true, type: 'specialOffer' })}
                                                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                            >
                                                Soáº¡n tháº£o nÃ¢ng cao
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. SEO SETTINGS */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 cursor-pointer group" onClick={() => setSeoOpen(!seoOpen)}>
                                        <Icon name="search" className="text-slate-400 w-5 h-5" />
                                        <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Cáº¥u hÃ¬nh SEO Search</h2>
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
                                                    placeholder="TiÃªu Ä‘á» hiá»ƒn thá»‹ trÃªn Google..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Meta Description</label>
                                                <textarea
                                                    value={formData.meta_description}
                                                    onChange={e => setFormData(p => ({ ...p, meta_description: e.target.value }))}
                                                    rows="3"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium"
                                                    placeholder="MÃ´ táº£ ná»™i dung khi tÃ¬m kiáº¿m..."
                                                ></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Keywords</label>
                                                <input
                                                    type="text"
                                                    value={formData.meta_keyword}
                                                    onChange={e => setFormData(p => ({ ...p, meta_keyword: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                                                    placeholder="Tá»« khÃ³a 1, tá»« khÃ³a 2..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* RIGHT COLUMN (1/3) */}
                            <div className="lg:col-span-1 space-y-6 pb-32">

                                {/* 1. PHÃ‚N LOáº I */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2 relative z-10">
                                        <Icon name="folder" className="w-4 h-4 text-blue-500" /> Danh má»¥c & ThÆ°Æ¡ng hiá»‡u
                                    </h3>

                                    <div className="space-y-6 relative z-10">
                                        {/* Premium Brand Picker */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ThÆ°Æ¡ng hiá»‡u</label>
                                                <button
                                                    onClick={() => setBrandManager({ open: true, mode: 'list' })}
                                                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                                                >
                                                    TÃ¹y chá»‰nh
                                                </button>
                                            </div>
                                            <div
                                                onClick={() => setBrandManager({ open: true, mode: 'list' })}
                                                className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all rounded-2xl cursor-pointer group/item shadow-sm"
                                            >
                                                {/* Logic xÃ¡c Ä‘á»‹nh hiá»ƒn thá»‹ Brand: Priority Dictionary -> TempBrand -> Placeholder */}
                                                {(() => {
                                                    const dictBrand = dictionary?.brands?.find(b => String(b.id || b.code) === String(formData.brandId));
                                                    const displayBrand = dictBrand || (String(tempBrand?.id || tempBrand?.code) === String(formData.brandId) ? tempBrand : null);

                                                    // Helper xá»­ lÃ½ áº£nh: Æ¯u tiÃªn image_url (API full) -> image -> prepend domain náº¿u cáº§n
                                                    const getImgUrl = (b) => {
                                                        if (!b) return null;
                                                        let src = b.image_url || b.image;
                                                        if (!src) return null;
                                                        if (src.startsWith('http')) return src;
                                                        // Fallback domain náº¿u API tráº£ vá» relative path (nhÆ° trÆ°á»ng há»£p ID 156)
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
                                                    onClick={() => setCatManager({ open: true, mode: 'list' })}
                                                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                                                >
                                                    Quáº£n lÃ½
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
                                                        <span className="text-sm font-bold">Chá»n danh má»¥c</span>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                                {/* 2. STATUS & PUBLISH */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Tráº¡ng thÃ¡i</h3>
                                        <span className="text-[10px] font-mono font-black text-slate-300">ID: #{product?.id || 'NEW'}</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-blue-100 hover:bg-blue-50/10 transition-all">
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Hiá»ƒn thá»‹ Web</span>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.isOn ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">NgÃ y táº¡o</span>
                                            <span className="text-[10px] font-bold text-slate-600">{formData.created_at ? new Date(formData.created_at).toLocaleDateString('vi-VN') : '---'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Cáº­p nháº­t</span>
                                            <span className="text-[10px] font-bold text-blue-600">{formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('vi-VN') : 'Vá»«a xong'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. PRICE & STOCK */}
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                                        <Icon name="tag" className="w-4 h-4 text-blue-500" /> GiÃ¡ bÃ¡n & Kho
                                    </h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GiÃ¡ bÃ¡n láº» (Web)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                                    className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl font-black text-slate-900 focus:border-blue-500 outline-none text-right text-lg"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">Ä‘</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GiÃ¡ vá»‘n</label>
                                                <input
                                                    type="number"
                                                    value={formData.purchase_price_web}
                                                    onChange={e => setFormData(p => ({ ...p, purchase_price_web: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-right font-bold text-slate-600"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Báº£o hÃ nh</label>
                                                <input
                                                    type="text"
                                                    value={formData.warranty}
                                                    onChange={e => setFormData(p => ({ ...p, warranty: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                                                    placeholder="12 thÃ¡ng"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-dashed border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sá»‘ lÆ°á»£ng tá»“n web</label>
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
                                        <Icon name="tag" className="w-4 h-4 text-orange-500" /> NhÃ£n Marketing
                                    </h3>
                                    {[
                                        { label: 'Sáº£n pháº©m HOT ðŸ”¥', key: 'is_hot', color: 'red' },
                                        { label: 'Sáº£n pháº©m Má»›i (New)', key: 'is_new', color: 'blue' },
                                        { label: 'BÃ¡n cháº¡y (Best)', key: 'is_best_sell', color: 'purple' },
                                        { label: 'Giáº£m giÃ¡ (Sale)', key: 'is_sale_off', color: 'orange' },
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
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Há»— trá»£ tráº£ gÃ³p 0%</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-2xl border-t-2 border-slate-100 z-[70] flex flex-col md:flex-row gap-4 md:px-20 lg:px-40">
                    <div className="flex-1 flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all outline-none">ÄÃ³ng</button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-xl bg-white border-2 border-indigo-600 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 outline-none"
                        >
                            LÆ°u Ngay
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
                                <span>ÄANG Xá»¬ LÃ...</span>
                            </>
                        ) : (
                            <>
                                <Icon name="save" className="w-4 h-4" />
                                <span>{mode === 'create' ? 'Táº O Má»šI & Äáº¨Y WEB' : 'LÆ¯U & ÄÃ“NG'}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* MODALS QUáº¢N LÃ NÃ‚NG CAO */}
                {/* MODALS QUáº¢N LÃ NÃ‚NG CAO */}
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

                {/* MODAL TRÃŒNH SOáº N THáº¢O Rá»˜NG */}
                <Modal
                    isOpen={fullEditor.open}
                    onClose={() => setFullEditor(p => ({ ...p, open: false }))}
                    isFullScreen={true}
                    title={
                        <div className="flex items-center gap-3">
                            <Icon name="file-text" className="w-5 h-5 text-indigo-500" />
                            <span className="uppercase tracking-widest font-black text-sm">
                                CHá»ˆNH Sá»¬A {fullEditor.type === 'description' ? 'MÃ” Táº¢ CHI TIáº¾T' : (fullEditor.type === 'spec' ? 'THÃ”NG Sá» Ká»¸ THUáº¬T' : 'KHUYáº¾N MÃƒI')}
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
                                onTaskCountChange={setGlobalTaskCount}
                                onLibraryRequest={(callback) => {
                                    setMediaManagerMode('editor');
                                    setMediaLibraryCallback(() => callback);
                                    setIsMediaManagerOpen(true);
                                }}
                                className="flex-1 full-screen-quill"
                            />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setFullEditor(p => ({ ...p, open: false }))}
                                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
                            >
                                XONG & QUAY Láº I
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

                {/* MODAL MEDIA MANAGER CHÃNH THá»¨C */}
                <MediaManagerModal
                    key={mediaManagerMode} // [FIX] Force Log láº¡i component Ä‘á»ƒ trÃ¡nh Closure cÅ©
                    isOpen={isMediaManagerOpen}
                    title={mediaManagerMode === 'editor' ? "CHÃˆN áº¢NH VÃ€O BÃ€I VIáº¾T" : "QUáº¢N LÃ THÆ¯ VIá»†N áº¢NH"}
                    onClose={() => setIsMediaManagerOpen(false)}
                    multiple={true}
                    onSelect={(selectedItems) => {
                        const items = Array.isArray(selectedItems) ? selectedItems : [selectedItems];
                        console.log("ðŸ“¸ [V1 DEBUG] ÄÃ£ chá»n áº£nh tá»« thÆ° viá»‡n:", items);

                        if (mediaManagerMode === 'editor') {
                            if (mediaLibraryCallback) {
                                mediaLibraryCallback(items);
                                setMediaLibraryCallback(null);
                                setIsMediaManagerOpen(false);
                                return;
                            }

                            const htmlToInsert = items.map(f => {
                                const url = f.url || f.displayUrl || f.preview_url;
                                return `<p><img src="${url}" /></p>`;
                            }).join('');

                            const field = standardContentSubTab;
                            if (field === 'summary') {
                                toast.error("KhÃ´ng thá»ƒ chÃ¨n áº£nh vÃ o MÃ´t táº£ ngáº¯n (Chá»‰ vÄƒn báº£n)");
                                return;
                            }

                            setFormData(p => ({
                                ...p,
                                [field]: (p[field] || '') + htmlToInsert
                            }));
                            toast.success(`ÄÃ£ chÃ¨n ${items.length} áº£nh vÃ o ná»™i dung!`);
                            setIsMediaManagerOpen(false);
                            return;
                        }

                        // LOGIC THÃŠM VÃ€O THÆ¯ VIá»†N áº¢NH (GALLERY)
                        const newImages = items.map(i => ({
                            id: i.id,
                            url: i.path ? i.path : (i.url || i.displayUrl || i.preview_url),
                            displayUrl: i.path ? i.path : (i.url || i.displayUrl || i.preview_url),
                            is_main: false,
                            is_temp: true,
                            name: i.original_name
                        }));

                        setFullImages(prev => {
                            const existingIds = prev.map(img => img.id);
                            const filteredNew = newImages.filter(img => !existingIds.includes(img.id));
                            return [...prev, ...filteredNew];
                        });

                        // Cáº­p nháº­t luÃ´n vÃ o formData Ä‘á»ƒ cháº¯c Äƒn
                        const newIds = items.map(i => i.id);
                        setFormData(prev => ({
                            ...prev,
                            media_ids: [...new Set([...(prev.media_ids || []), ...newIds])]
                        }));

                        toast.success(`ÄÃ£ láº¥y ${items.length} file tá»« kho!`);
                        setIsMediaManagerOpen(false);
                    }}
                />

                {/* [GLOBAL_TASK_INDICATOR] BÃ“NG Ná»”I NHÃY KHI ÄANG Xá»¬ LÃ BACKGROUND */}
                {globalTaskCount > 0 && (
                    <div className="fixed top-10 right-10 z-[2000] animate-bounce">
                        <div className="bg-indigo-600 text-white rounded-full p-6 shadow-[0_0_50px_rgba(79,70,229,0.4)] flex items-center gap-4 border-2 border-white/20 backdrop-blur-md">
                            <div className="relative">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <div className="absolute inset-0 w-5 h-5 bg-white/20 rounded-full animate-ping"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-indigo-100">Äang xá»­ lÃ½ ngáº§m</span>
                                <span className="text-sm font-black tracking-tighter">{globalTaskCount} tÃ¡c vá»¥ hÃ¬nh áº£nh...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* [IMAGE_LIGHTBOX] Xem áº£nh lá»›n */}
                {previewImage && (
                    <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-fadeIn" onClick={() => setPreviewImage(null)}>
                        <div className="absolute top-6 right-6 flex gap-3">
                            <button
                                className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white backdrop-blur-md"
                                onClick={(e) => { e.stopPropagation(); downloadImage(previewImage); }}
                                title="Táº£i áº£nh"
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
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scaleIn"
                            onClick={(e) => e.stopPropagation()} // Click áº£nh khÃ´ng Ä‘Ã³ng modal
                        />
                    </div>
                )}
            </div>
        </Modal >
    );
};

export default ProductMobileDetail;

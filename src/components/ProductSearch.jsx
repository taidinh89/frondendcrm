import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Search, Loader2, Settings, ChevronDown, ChevronRight, 
    MapPin, DollarSign, CornerDownLeft, ListFilter, FileJson, X, Zap, Eye, EyeOff, Filter 
} from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const PRICE_TYPES = [
    { key: 'out_price', label: 'Giá Lẻ', short: 'Lẻ' },
    { key: 'out_price1', label: 'Giá Sỉ 1', short: 'Sỉ 1' },
    { key: 'out_price2', label: 'Giá Sỉ 2', short: 'Sỉ 2' },
    { key: 'in_price', label: 'Giá Vốn', short: 'Vốn' }
];

// --- MODAL RAW JSON ---
const RawDataModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-gray-900 w-full max-w-3xl max-h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-800">
                    <h3 className="text-green-400 font-mono text-sm font-bold flex items-center gap-2"><FileJson size={16}/> RAW DATA DEBUGGER</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#1e1e1e]">
                    <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">{JSON.stringify(data.debug_data || data, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};

export const ProductSearch = ({ onAddProduct, selectedWarehouseCode }) => {
    // --- 1. LOCAL STORAGE INIT ---
    const getStored = (key, def) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : def;
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [metaStats, setMetaStats] = useState({ total_found: 0, total_in_stock: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Settings
    const [defaultPriceType, setDefaultPriceType] = useState(() => localStorage.getItem('qvc_price_type') || 'out_price');
    const [isAutoExpand, setIsAutoExpand] = useState(() => getStored('qvc_auto_expand', false));
    const [filterSource, setFilterSource] = useState(() => localStorage.getItem('qvc_filter_source') || 'all'); 
    const [stockMode, setStockMode] = useState(() => localStorage.getItem('qvc_stock_mode') || 'all');
    const [showFilters, setShowFilters] = useState(false);

    // UX
    const [activeIndex, setActiveIndex] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [isListFocused, setIsListFocused] = useState(false);
    const [rawItem, setRawItem] = useState(null);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => { localStorage.setItem('qvc_price_type', defaultPriceType); }, [defaultPriceType]);
    useEffect(() => { localStorage.setItem('qvc_auto_expand', JSON.stringify(isAutoExpand)); }, [isAutoExpand]);
    useEffect(() => { localStorage.setItem('qvc_filter_source', filterSource); }, [filterSource]);
    useEffect(() => { localStorage.setItem('qvc_stock_mode', stockMode); }, [stockMode]);

    // --- SEARCH API & DEBUG LOGIC ---
    const fetchProducts = async (term) => {
        const startTime = performance.now(); // Bắt đầu đo giờ
        console.group(`🔍 START SEARCH: "${term}"`);
        
        setLoading(true);
        if (!isOpen) setIsOpen(true);

        try {
            console.log("📡 Calling API: /api/v2/quotations/products/search");
            const res = await axios.get('/api/v2/quotations/products/search', { 
                params: { search: term, limit: 100 } 
            });

            const rawData = res.data.data || [];
            console.log(`📥 API Response: ${rawData.length} items`, rawData);

            let filteredData = rawData;

            // Debug Filter: Stock
            if (stockMode === 'has_stock') {
                const before = filteredData.length;
                filteredData = filteredData.filter(p => (p.inventory?.total || 0) > 0);
                console.log(`🧹 Filter Stock: ${before} -> ${filteredData.length} (Removed ${before - filteredData.length})`);
            }

            // Debug Filter: Source
            if (filterSource === 'ecount') {
                const before = filteredData.length;
                filteredData = filteredData.filter(p => p.ecount_code && !p.misa_code);
                console.log(`🧹 Filter Source (Ecount Only): ${before} -> ${filteredData.length}`);
            } else if (filterSource === 'misa') {
                const before = filteredData.length;
                filteredData = filteredData.filter(p => p.misa_code);
                console.log(`🧹 Filter Source (Misa Only): ${before} -> ${filteredData.length}`);
            }

            // Stats
            setMetaStats({ 
                total_found: filteredData.length, 
                total_in_stock: filteredData.filter(p => (p.inventory?.total || 0) > 0).length 
            });

            // Mapping Data
            const mappedProducts = filteredData.map(item => ({
                id: item.id,
                product_code: item.product_code,
                ecount_code: item.ecount_code,
                misa_code: item.misa_code,
                display_name: item.display_name,
                
                // Debug Image
                image: item.image || item.image_url || item.proThum || null, 
                
                unit: item.unit,
                is_hot: item.is_hot,
                hot_score: item.hot_score,
                vat_rate: item.vat_rate,
                debug_data: item.debug_data, // Dữ liệu thô để soi F2
                inventorySummary: {
                    total_ecount_quantity: item.inventory?.total || 0,
                    locations: item.inventory?.locations || []
                },
                dataSources: {
                    ecount: {
                        name: item.display_name,
                        prices: {
                            out_price: item.prices?.retail || 0,
                            out_price1: item.prices?.wholesale1 || 0,
                            out_price2: item.prices?.wholesale2 || 0,
                            in_price: item.prices?.cost || 0
                        }
                    }
                }
            }));

            setProducts(mappedProducts);
            setActiveIndex(0);
            if (listRef.current) listRef.current.scrollTop = 0;

            const endTime = performance.now();
            console.log(`⏱️ Total Time: ${(endTime - startTime).toFixed(2)}ms`);

        } catch (error) {
            console.error("❌ SEARCH ERROR:", error);
            setProducts([]);
        } finally {
            setLoading(false);
            console.groupEnd();
        }
    };

    const handleSearchInput = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        
        // Debug Debounce
        console.log(`⌨️ Typing: "${term}" - Waiting debounce...`);
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (term.trim()) {
                console.log(`🚀 Debounce trigger for: "${term}"`);
                fetchProducts(term);
            } else {
                setProducts([]);
                setIsOpen(false);
            }
        }, 300); // 300ms debounce
    };

    // --- KEYBOARD HANDLING ---
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (products.length > 0) handleAdd(products[activeIndex]);
            else fetchProducts(searchTerm); // Force search nếu chưa có kết quả
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (products.length > 0) {
                setIsOpen(true);
                setIsListFocused(true);
                setActiveIndex(0);
                setTimeout(() => listRef.current?.focus(), 10);
            } else fetchProducts(searchTerm);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleListKeyDown = (e) => {
        if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
        const currentProduct = products[activeIndex];

        switch (e.key) {
            case 'ArrowDown':
                setActiveIndex(prev => {
                    const next = Math.min(prev + 1, products.length - 1);
                    scrollToItem(next);
                    return next;
                });
                break;
            case 'ArrowUp':
                setActiveIndex(prev => {
                    if (prev === 0) { setIsListFocused(false); inputRef.current?.focus(); return 0; }
                    const next = Math.max(prev - 1, 0);
                    scrollToItem(next);
                    return next;
                });
                break;
            case 'ArrowRight': if (currentProduct) setExpandedId(currentProduct.id); break;
            case 'ArrowLeft': if (currentProduct) setExpandedId(null); break;
            case 'Enter': if (currentProduct) handleAdd(currentProduct); break;
            case 'F2': if (currentProduct) setRawItem(currentProduct); break; // Soi Raw Data
            case 'Escape': setIsOpen(false); setIsListFocused(false); inputRef.current?.focus(); break;
            default: if (e.key.length === 1 || e.key === 'Backspace') { setIsListFocused(false); inputRef.current?.focus(); } break;
        }
    };

    const scrollToItem = (index) => {
        const row = listRef.current?.querySelector(`[data-index="${index}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    };

    const handleAdd = (product, priceType = null) => {
        onAddProduct(product, priceType || defaultPriceType);
        setSearchTerm('');
        setIsOpen(false);
        setIsListFocused(false);
        setProducts([]);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsListFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-full max-w-4xl font-sans text-sm">
            <RawDataModal data={rawItem} onClose={() => setRawItem(null)} />

            <div className={`relative flex gap-2 p-1 rounded-lg transition-all ${isListFocused ? 'ring-2 ring-blue-100 bg-blue-50/50' : ''}`}>
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {loading ? <Loader2 size={18} className="animate-spin text-blue-600"/> : <Search size={18}/>}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="block w-full pl-10 pr-24 py-2.5 border border-blue-300 rounded-lg bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-600 shadow-sm font-medium transition-all outline-none text-gray-800"
                        placeholder={`Tìm kiếm (${PRICE_TYPES.find(p=>p.key===defaultPriceType)?.short})...`}
                        value={searchTerm}
                        onChange={handleSearchInput}
                        onKeyDown={handleInputKeyDown}
                        onFocus={() => { 
                            if(products.length > 0) setIsOpen(true);
                            setIsListFocused(false); 
                        }}
                        autoComplete="off"
                    />
                    
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none gap-2">
                        {isListFocused && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded animate-pulse font-bold">NAV</span>}
                        {stockMode === 'has_stock' && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded border border-green-200">Có hàng</span>}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            {PRICE_TYPES.find(p=>p.key===defaultPriceType)?.short}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={() => { setIsAutoExpand(!isAutoExpand); inputRef.current?.focus(); }}
                    className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${isAutoExpand ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                    title={isAutoExpand ? "Đang bật: Tự động mở chi tiết" : "Bật tự động mở chi tiết"}
                >
                    {isAutoExpand ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                <button 
                    onClick={() => { setShowFilters(!showFilters); inputRef.current?.focus(); }}
                    className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Panel cấu hình */}
            {showFilters && (
                <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl absolute w-full z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Chế độ giá (Enter):</p>
                            <div className="grid grid-cols-4 gap-1">
                                {PRICE_TYPES.map(type => (
                                    <button key={type.key} onClick={() => {setDefaultPriceType(type.key); inputRef.current?.focus();}} className={`py-1.5 text-xs border rounded font-bold transition-all ${defaultPriceType === type.key ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'hover:bg-gray-50 bg-white text-gray-700'}`}>
                                        {type.short}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nguồn dữ liệu:</p>
                                <div className="flex bg-gray-100 rounded p-0.5 text-xs">
                                    {[{id:'all',l:'Tất cả'}, {id:'ecount',l:'Ecount'}, {id:'misa',l:'Misa'}].map(opt => (
                                        <button key={opt.id} onClick={() => {setFilterSource(opt.id); inputRef.current?.focus();}} className={`flex-1 py-1 rounded ${filterSource === opt.id ? 'bg-white text-blue-600 shadow font-bold' : 'text-gray-500 hover:text-gray-700'}`}>{opt.l}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Lọc tồn kho:</span>
                                <div className="flex gap-2 text-xs">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={stockMode === 'all'} onChange={() => {setStockMode('all'); inputRef.current?.focus();}} className="text-blue-600"/><span>Tất cả</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={stockMode === 'has_stock'} onChange={() => {setStockMode('has_stock'); inputRef.current?.focus();}} className="text-blue-600"/><span className="font-bold text-green-700">Chỉ có hàng</span></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Results */}
            {isOpen && products.length > 0 && (
                <div className="absolute z-40 mt-1 w-full bg-white shadow-xl rounded-lg ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-100">
                    <div className="bg-gray-50 border-b border-gray-200">
                        <div className="px-4 py-1.5 bg-blue-50/50 text-blue-700 text-xs flex justify-between items-center border-b border-blue-100">
                            <span className="font-semibold flex items-center gap-1">
                                <ListFilter size={12}/> Kết quả: <span className="font-bold text-sm">{metaStats.total_found}</span> mã
                            </span>
                            <span className={`px-2 py-0.5 rounded border font-bold ${metaStats.total_in_stock > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                Sẵn hàng: {metaStats.total_in_stock}
                            </span>
                        </div>
                        <div className="flex text-[10px] font-bold text-gray-500 uppercase py-2 px-4">
                            <div className="flex-1">Sản phẩm / Mã</div>
                            <div className="w-28 text-right">Giá bán</div>
                            <div className="w-24 text-right">Tồn kho</div>
                            <div className="w-8"></div>
                        </div>
                    </div>

                    <div 
                        ref={listRef}
                        tabIndex={0} 
                        onKeyDown={handleListKeyDown}
                        className="max-h-[60vh] overflow-y-auto custom-scrollbar outline-none bg-white"
                    >
                        {products.map((product, index) => {
                            const isActive = index === activeIndex;
                            const isExpanded = isAutoExpand || expandedId === product.id;
                            
                            const prices = product.dataSources?.ecount?.prices || {};
                            const currentPrice = prices[defaultPriceType] || 0;
                            const totalStock = product.inventorySummary?.total_ecount_quantity || 0;
                            
                            let specificStock = null;
                            if (selectedWarehouseCode && product.inventorySummary?.locations) {
                                const loc = product.inventorySummary.locations.find(l => l.warehouse_code === selectedWarehouseCode);
                                if(loc) specificStock = loc.quantity;
                            }

                            return (
                                <div 
                                    key={`${product.id}-${index}`} 
                                    data-index={index} 
                                    className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => handleAdd(product)}
                                    onMouseEnter={() => !isListFocused && setActiveIndex(index)}
                                >
                                    <div className="flex items-center py-2 px-4">
                                        <div className="w-1 mr-2 flex justify-center">{isActive && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm"></div>}</div>

                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>{product.display_name}</span>
                                                {product.is_hot && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold border border-red-200">HOT</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">{product.product_code}</span>
                                                {!isAutoExpand && (
                                                    <div className={`ml-auto p-0.5 rounded hover:bg-gray-200 transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-gray-300'}`} onClick={(e) => { e.stopPropagation(); setExpandedId(prev => prev === product.id ? null : product.id); }}>
                                                        {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-28 text-right font-bold text-sm text-blue-700">{formatCurrency(currentPrice)}</div>

                                        <div className="w-24 text-right text-xs">
                                            {selectedWarehouseCode ? (
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-bold ${(specificStock||0) > 0 ? 'text-green-600' : 'text-orange-400'}`}>{new Intl.NumberFormat('vi-VN').format(specificStock ?? 0)}</span>
                                                    <span className="text-[9px] text-gray-400">tại kho</span>
                                                </div>
                                            ) : (
                                                <span className={`font-bold ${totalStock > 0 ? 'text-gray-700' : 'text-red-500'}`}>{new Intl.NumberFormat('vi-VN').format(totalStock)}</span>
                                            )}
                                        </div>
                                        <div className="w-6 flex justify-end">{isActive && <CornerDownLeft size={14} className="text-blue-400" />}</div>
                                    </div>

                                    {/* Expanded */}
                                    {isExpanded && (
                                        <div className={`bg-gray-50 border-t border-gray-200 p-3 pl-8 grid grid-cols-2 gap-4 text-xs animate-in slide-in-from-top-1 shadow-inner cursor-default ${isAutoExpand ? 'bg-blue-50/30' : ''}`} onClick={e => e.stopPropagation()}>
                                            <div>
                                                <p className="flex items-center gap-1 font-bold text-gray-500 uppercase mb-2"><DollarSign size={12}/> Chọn giá khác</p>
                                                <div className="space-y-1">
                                                    {PRICE_TYPES.map(pt => (
                                                        <button key={pt.key} onClick={() => handleAdd(product, pt.key)} className="w-full flex justify-between px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-400 hover:text-blue-700 hover:shadow-sm transition-all">
                                                            <span>{pt.label}</span><span className="font-bold">{formatCurrency(prices[pt.key] || 0)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-col h-full">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="flex items-center gap-1 font-bold text-gray-500 uppercase"><MapPin size={12}/> Tồn kho</p>
                                                    <button onClick={() => setRawItem(product)} className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 hover:bg-gray-800 hover:text-white rounded text-[9px] font-bold transition-colors"><FileJson size={10}/> RAW</button>
                                                </div>
                                                <div className="flex-1 max-h-32 overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded">
                                                    {product.inventorySummary?.locations?.length > 0 ? (
                                                        product.inventorySummary.locations.map((loc, idx) => (
                                                            <div key={idx} className={`flex justify-between px-3 py-1.5 border-b border-gray-100 last:border-0 ${loc.warehouse_code === selectedWarehouseCode ? 'bg-blue-50' : ''}`}>
                                                                <span className="truncate w-2/3" title={loc.warehouse_name}>{loc.warehouse_name}</span>
                                                                <span className={`font-bold ${loc.quantity > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{new Intl.NumberFormat('vi-VN').format(loc.quantity)}</span>
                                                            </div>
                                                        ))
                                                    ) : <div className="p-4 text-center text-gray-400 italic">Chưa có thông tin kho</div>}
                                                </div>
                                                <div className="mt-2 text-[10px] text-gray-500 text-right">VAT: <span className="font-bold text-gray-700">{product.vat_rate}%</span></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
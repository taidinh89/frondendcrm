import React from 'react';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData.jsx';
import * as UI from '../../components/ui.jsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import { exportToExcel } from '../../utils/exportUtils.js';
import { ProductDetailModal } from '../../components/modals/ProductDetailModal.jsx';

// ==========================================================================
// == CONFIGURATION (Cấu hình)                                           ==
// ==========================================================================

const API_ENDPOINT = '/api/v2/inventory';
const WAREHOUSES_ENDPOINT = '/api/v1/warehouses';

const SYNC_STATUS_ENDPOINT = '/api/v1/status';
const SYNC_TRIGGER_ENDPOINT = '/api/v1/trigger';

const API_PER_PAGE = 50;
const VAT_WAREHOUSE_NAME = "Hàng hóa"; // Tên kho VAT (Misa)

const DEFAULT_WAREHOUSE_NAMES = [
    "Kho Tổng 21", 
    "Kho chi nhánh 204", 
    "Kho bán lẻ 21", 
    "Kho dự án"
];
const EXCLUDED_WAREHOUSE_NAMES = ["Vật tư", "Công cụ dụng cụ", "Thành phẩm"];

const LOCALSTORAGE_KEYS = {
    SOURCES: 'inventoryFilters_sources',
    WAREHOUSES: 'inventoryFilters_warehouses',
    VISIBLE_COLUMNS: 'inventoryFilters_visibleColumns',
    HAS_ECOUNT_STOCK: 'inventoryFilters_hasEcountStock',
    COLUMN_ORDER: 'inventoryFilters_columnOrder',
};

// --- Định nghĩa ID cột ---
const COL_ID = {
    SOURCE: 'source',
    SKU: 'sku',
    PRODUCT_ECOUNT: 'productEcount',
    PRODUCT_MISA: 'productMisa',
    STATUS: 'status',
    ECOUNT_TOTAL: 'ecountTotal',
    
    // [THÊM MỚI] ID cho cột VAT
    VAT: 'vat',
    // [THÊM MỚI] ID cho cột Chênh lệch
    ECOUNT_MISA_DIFF: 'ecount_misa_diff',

    TAX_RATE: 'taxRate',
    BRAND: 'brand',
    CATEGORY: 'category',
    OUT_PRICE_MAIN: 'outPriceMain',
    OUT_PRICE_1: 'outPrice1',
    OUT_PRICE_2: 'outPrice2',
    OUT_PRICE_3: 'outPrice3',
    IN_PRICE: 'inPrice',
    LINK: 'link',
    WARRANTY: 'warranty',
    BARCODE: 'barcode',
};

// --- Định nghĩa Khóa Sắp xếp ---
const SORT_KEY = {
    [COL_ID.SOURCE]: 'source_system',
    [COL_ID.SKU]: 'product_code',
    [COL_ID.PRODUCT_ECOUNT]: 'product_name',
    [COL_ID.PRODUCT_MISA]: 'product_name',
    [COL_ID.STATUS]: null,
    [COL_ID.ECOUNT_TOTAL]: 'total_ecount_quantity',
    
    // Sắp xếp cột VAT theo số lượng tồn kho Misa
    [COL_ID.VAT]: 'total_misa_quantity',
    // Sắp xếp cột Chênh lệch
    [COL_ID.ECOUNT_MISA_DIFF]: 'ecount_misa_diff',

    [COL_ID.TAX_RATE]: null,
    [COL_ID.BRAND]: 'brand_code',
    [COL_ID.CATEGORY]: 'category_code',
    [COL_ID.OUT_PRICE_MAIN]: 'out_price',
    [COL_ID.OUT_PRICE_1]: 'out_price1',
    [COL_ID.OUT_PRICE_2]: 'out_price2',
    [COL_ID.OUT_PRICE_3]: 'out_price3',
    [COL_ID.IN_PRICE]: 'in_price',
    [COL_ID.LINK]: null,
    [COL_ID.WARRANTY]: null,
    [COL_ID.BARCODE]: 'barcode',
    WAREHOUSE_PREFIX: 'wh_',
};

// --- Cấu hình Cột & THỨ TỰ MẶC ĐỊNH ---
const WAREHOUSE_COL_MIN_WIDTH = 150;

// [QUAN TRỌNG] Thứ tự các object trong mảng này quyết định thứ tự cột mặc định
const ALL_COLUMN_DEFS_CONFIG = [
    // 1. Thông tin cơ bản
    { id: COL_ID.SOURCE,       title: 'Nguồn',         minWidth: 100, sortKey: SORT_KEY[COL_ID.SOURCE], cellClassName: 'items-center justify-center', alwaysVisible: true },
    { id: COL_ID.SKU,          title: 'Mã SP',        minWidth: 150, sortKey: SORT_KEY[COL_ID.SKU],    cellClassName: 'justify-center font-mono text-xs px-2', isSku: true, alwaysVisible: true },
    { id: COL_ID.PRODUCT_ECOUNT, title: 'Tên SP Ecount', minWidth: 300, sortKey: SORT_KEY[COL_ID.PRODUCT_ECOUNT], cellClassName: 'items-center', alwaysVisible: true },
    
    // [ĐÃ SỬA] defaultVisible: true để luôn hiện tên Misa
    { id: COL_ID.PRODUCT_MISA,   title: 'Tên SP Misa',   minWidth: 300, sortKey: SORT_KEY[COL_ID.PRODUCT_MISA], cellClassName: 'items-center text-gray-600', defaultVisible: true }, 
    
    // 2. Tồn kho & Trạng thái
    { id: COL_ID.STATUS,       title: 'Tình Trạng',   minWidth: 120, sortKey: SORT_KEY[COL_ID.STATUS], cellClassName: 'items-center', alwaysVisible: true },
    { id: COL_ID.ECOUNT_TOTAL, title: 'Tổng Ecount',  minWidth: 110, sortKey: SORT_KEY[COL_ID.ECOUNT_TOTAL], headerClassName: 'justify-end text-blue-600', cellClassName: 'justify-end font-medium text-blue-600', alwaysVisible: true },
    
    // [CHÈN VÀO ĐÚNG VỊ TRÍ] Cột Kho VAT (Hàng hóa)
    { 
        id: COL_ID.VAT, 
        title: 'Kho VAT', 
        minWidth: 110, 
        sortKey: SORT_KEY[COL_ID.VAT], 
        headerClassName: 'justify-end text-red-600 font-bold', 
        cellClassName: 'justify-end font-medium text-red-600', 
        alwaysVisible: true 
    },

    // [CHÈN VÀO ĐÚNG VỊ TRÍ] Cột Chênh lệch E-M
    {
        id: COL_ID.ECOUNT_MISA_DIFF,
        title: 'Chênh E-M',
        minWidth: 120,
        sortKey: SORT_KEY[COL_ID.ECOUNT_MISA_DIFF],
        headerClassName: 'justify-end text-purple-600 font-semibold',
        cellClassName: 'justify-end font-medium',
        alwaysVisible: true,
    },
    
    // Các kho Ecount khác (động) sẽ được code chèn vào sau các cột này...

    // 3. Giá & Thuế
    { id: COL_ID.OUT_PRICE_MAIN, title: 'Giá Lẻ',     minWidth: 110, sortKey: SORT_KEY[COL_ID.OUT_PRICE_MAIN], headerClassName: 'justify-end', cellClassName: 'justify-end font-medium', isPrice: true, defaultVisible: true },
    { id: COL_ID.OUT_PRICE_1,    title: 'Giá Sỉ 1',    minWidth: 110, sortKey: SORT_KEY[COL_ID.OUT_PRICE_1], headerClassName: 'justify-end', cellClassName: 'justify-end font-medium', isPrice: true, defaultVisible: true },
    { id: COL_ID.OUT_PRICE_2,    title: 'Giá Sỉ 2',    minWidth: 110, sortKey: SORT_KEY[COL_ID.OUT_PRICE_2], headerClassName: 'justify-end', cellClassName: 'justify-end font-medium', isPrice: true, defaultVisible: false },
    { id: COL_ID.IN_PRICE,     title: 'Giá Nhập',     minWidth: 100, sortKey: SORT_KEY[COL_ID.IN_PRICE],  headerClassName: 'justify-end', cellClassName: 'justify-end font-medium text-sm text-gray-500', isPrice: true, defaultVisible: false },
    { id: COL_ID.TAX_RATE,     title: 'Thuế Suất VAT',       minWidth: 120,  sortKey: SORT_KEY[COL_ID.TAX_RATE], cellClassName: 'items-center justify-center font-medium', defaultVisible: false, isExtraInfo: true },
    
    // 4. Thông tin bổ sung
    { id: COL_ID.BRAND,        title: 'Hãng',         minWidth: 120, sortKey: SORT_KEY[COL_ID.BRAND],    cellClassName: 'items-center text-gray-600 text-xs', defaultVisible: false, isExtraInfo: true },
    { id: COL_ID.CATEGORY,     title: 'Nhóm hàng',    minWidth: 120, sortKey: SORT_KEY[COL_ID.CATEGORY], cellClassName: 'items-center text-gray-600 text-xs', defaultVisible: false, isExtraInfo: true },
    { id: COL_ID.LINK,         title: 'Link SP',      minWidth: 150, sortKey: SORT_KEY[COL_ID.LINK],    cellClassName: 'items-center', defaultVisible: false, isExtraInfo: true },
    { id: COL_ID.WARRANTY,     title: 'BH',           minWidth: 80,  sortKey: SORT_KEY[COL_ID.WARRANTY], cellClassName: 'items-center justify-center text-xs', defaultVisible: false, isExtraInfo: true },
    { id: COL_ID.BARCODE,      title: 'Barcode',      minWidth: 130, sortKey: SORT_KEY[COL_ID.BARCODE], cellClassName: 'items-center justify-center font-mono text-xs', defaultVisible: false, isExtraInfo: true },
];

const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMN_DEFS_CONFIG
    .filter(c => c.alwaysVisible || c.defaultVisible)
    .map(c => c.id);

const ESTIMATED_ROW_HEIGHT = 85;
const SOURCE_FILTER_OPTIONS = [
    { value: 'ecount', label: 'Chỉ Ecount' },
    { value: 'misa', label: 'Chỉ Misa' },
    { value: 'both', label: 'Có cả Ecount & Misa' },
];

// ==========================================================================
// == COMPONENTS                                                         ==
// ==========================================================================

const SortIcon = ({ direction }) => {
    if (!direction) return null;
    const path = direction === 'asc' ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5";
    return <UI.Icon path={path} className="w-3 h-3 ml-1 text-gray-500" />;
};

const formatPrice = (price) => {
    if (price === null || price === undefined || price <= 0) return <span className="text-gray-300">-</span>;
    return new Intl.NumberFormat('vi-VN').format(price);
};

// ==========================================================================
// == SYNC WIDGET COMPONENT
// ==========================================================================
const SyncWidget = ({ label, data, onSync, isTriggering }) => {
    if (!data) return null;

    const isSyncing = data.is_syncing || isTriggering;
    const isError = data.status_text === 'Lỗi' || (data.message && data.message.toLowerCase().includes('lỗi'));
    
    const lastSync = data.last_sync_at 
        ? new Date(data.last_sync_at).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) 
        : 'Chưa chạy';

    return (
        <div className="flex items-center bg-white border border-gray-200 rounded-md px-3 py-1.5 shadow-sm space-x-3">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</span>
                <span className="text-[10px] text-gray-500">{lastSync}</span>
            </div>
            <div className="flex items-center space-x-2">
                {isError ? (
                     <div className="flex items-center text-red-600 text-xs font-medium" title={data.message}>
                        <UI.Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="w-4 h-4 mr-1" />
                        Lỗi
                     </div>
                ) : isSyncing ? (
                    <div className="flex items-center text-blue-600 text-xs font-medium">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang chạy...
                    </div>
                ) : (
                    <div className="flex items-center text-green-600 text-xs font-medium">
                        <UI.Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 mr-1" />
                        OK
                    </div>
                )}
            </div>
            <button 
                onClick={onSync} 
                disabled={isSyncing}
                className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'text-gray-600'}`}
                title="Đồng bộ ngay"
            >
                <UI.Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-4 h-4" />
            </button>
        </div>
    );
};

// ==========================================================================
// == MAIN COMPONENT                                                     ==
// ==========================================================================

export const InventoriesContent = () => {
    // --- State ---
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedWarehouses, setSelectedWarehouses] = React.useState(() => { return []; });
    const [selectedSources, setSelectedSources] = React.useState(() => {
        const s = localStorage.getItem(LOCALSTORAGE_KEYS.SOURCES);
        try { return s ? JSON.parse(s) : []; } catch (e) { return []; }
    });
    const [visibleColumns, setVisibleColumns] = React.useState(() => {
        const saved = localStorage.getItem(LOCALSTORAGE_KEYS.VISIBLE_COLUMNS);
        try {
            const parsed = saved ? JSON.parse(saved) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                const validCols = parsed.filter(id => ALL_COLUMN_DEFS_CONFIG.some(c => c.id === id));
                const alwaysVisibleIds = ALL_COLUMN_DEFS_CONFIG.filter(c => c.alwaysVisible).map(c => c.id);
                return [...new Set([...alwaysVisibleIds, ...validCols])];
            }
        } catch (e) { /* Fall through */ }
        return DEFAULT_VISIBLE_COLUMNS;
    });
    const [hasEcountStock, setHasEcountStock] = React.useState(() => {
        const s = localStorage.getItem(LOCALSTORAGE_KEYS.HAS_ECOUNT_STOCK);
        return s === 'true';
    });
    
    // State lưu thứ tự cột
    const [columnOrder, setColumnOrder] = React.useState(() => {
        const s = localStorage.getItem(LOCALSTORAGE_KEYS.COLUMN_ORDER);
        try { 
            const parsed = s ? JSON.parse(s) : null;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch(e) {}
        return ALL_COLUMN_DEFS_CONFIG.map(c => c.id);
    });

    const [modalColumnOrder, setModalColumnOrder] = React.useState([]);
    const [columnWidths, setColumnWidths] = React.useState({});
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalWarehouses, setModalWarehouses] = React.useState([]);
    const [modalHasEcountStock, setModalHasEcountStock] = React.useState(false);
    const [modalSources, setModalSources] = React.useState([]);
    const [modalVisibleColumns, setModalVisibleColumns] = React.useState([]);
    const [inventory, setInventory] = React.useState([]);
    const [paginationInfo, setPaginationInfo] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFetchingMore, setIsFetchingMore] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [isInitialSetupDone, setIsInitialSetupDone] = React.useState(false);
    const [sortBy, setSortBy] = React.useState(SORT_KEY[COL_ID.ECOUNT_TOTAL]);
    const [sortDirection, setSortDirection] = React.useState('desc');
    const [isExporting, setIsExporting] = React.useState(false);

    // === STATE CHO SYNC ===
    const [syncStatus, setSyncStatus] = React.useState({ ecount: null, misa: null });
    const [triggeringTypes, setTriggeringTypes] = React.useState([]); 
    
    const [historyProductId, setHistoryProductId] = React.useState(null);
    
    const parentRef = React.useRef(null);

    const openHistory = (product) => {
        setHistoryProductId(product.ecount_code || product.misa_code);
    };

    // --- Data Fetching ---
    const { data: allWarehouses, isLoading: warehousesLoading } = useApiData(WAREHOUSES_ENDPOINT, { per_page: -1 });
    const selectedWarehouseCodes = React.useMemo(() => selectedWarehouses.join(','), [selectedWarehouses]);

    // --- Column Definitions ---
    const columnDefs = React.useMemo(() => {
        // 1. Tạo danh sách tất cả cột (để sort)
        // 2. Xử lý kho động trước (Chỉ các kho Ecount, loại bỏ kho VAT nếu nó lọt vào đây)
        let dynamicWarehouses = [];
        if (!allWarehouses || allWarehouses.length === 0) {
            if(selectedWarehouses.length > 0) dynamicWarehouses = selectedWarehouses.map(code => ({ code, name: code, displayName: code }));
        } else {
            if (selectedWarehouses.length > 0) dynamicWarehouses = selectedWarehouses.map(code => allWarehouses.find(aw => aw.code === code)).filter(Boolean);
            else dynamicWarehouses = allWarehouses.filter(wh => !EXCLUDED_WAREHOUSE_NAMES.includes(wh.name));
        }

        // Lọc bỏ kho VAT khỏi danh sách kho động
        const otherWarehouseDefs = dynamicWarehouses
            .filter(wh => wh.name !== VAT_WAREHOUSE_NAME) 
            .map(wh => {
                const id = SORT_KEY.WAREHOUSE_PREFIX + wh.code;
                return { id: id, warehouseCode: wh.code, title: wh.name, minWidth: WAREHOUSE_COL_MIN_WIDTH, sortKey: id, width: columnWidths[wh.code] || WAREHOUSE_COL_MIN_WIDTH, headerClassName: 'justify-end', cellClassName: 'justify-end font-medium text-gray-800', isWarehouse: true };
            });

        // 3. Gom tất cả definition lại
        // Tạo một map ID -> Def để dễ lookup
        const defMap = new Map();
        ALL_COLUMN_DEFS_CONFIG.forEach(d => defMap.set(d.id, { ...d, width: columnWidths[d.id] || d.minWidth }));
        otherWarehouseDefs.forEach(d => defMap.set(d.id, d));
        
        // 4. Xây dựng danh sách cuối cùng
        let finalDefs = [];
        
        // Duyệt theo columnOrder hiện tại (được lưu trong localStorage hoặc mặc định)
        const currentOrder = [...columnOrder];
        
        // Logic chèn kho động: Tìm cột Chênh lệch để chèn kho Ecount vào SAU nó (hoặc trước tùy bạn)
        // Mặc định: Chèn kho động vào SAU cột Chênh lệch E-M để giữ cấu trúc "Tổng E -> VAT -> Chênh -> Kho E 1, Kho E 2..."
        // Hoặc: Chèn sau Tổng Ecount nếu bạn muốn "Tổng E -> Kho E 1 -> Kho E 2... -> VAT -> Chênh"
        // Dựa vào ảnh: Tổng E -> Kho VAT -> Chênh. Vậy kho Ecount động nên nằm sau cùng.
        const diffIdx = currentOrder.indexOf(COL_ID.ECOUNT_MISA_DIFF);
        const insertPos = diffIdx !== -1 ? diffIdx + 1 : currentOrder.length; 

        // Bổ sung các cột kho động mới nếu chưa có trong order
        otherWarehouseDefs.forEach(wh => {
            if (!currentOrder.includes(wh.id)) currentOrder.splice(insertPos, 0, wh.id);
        });

        // Filter visible
        currentOrder.forEach(colId => {
            const isWarehouse = colId.startsWith(SORT_KEY.WAREHOUSE_PREFIX);
            const config = defMap.get(colId);
            
            if (config && (visibleColumns.includes(colId) || isWarehouse || config.alwaysVisible)) {
                finalDefs.push(config);
            }
        });

        return finalDefs;
    }, [columnWidths, selectedWarehouses, allWarehouses, visibleColumns, columnOrder]);

    // --- LOGIC SYNC ---
    const fetchSyncStatus = React.useCallback(async () => {
        try {
            const res = await axios.get(SYNC_STATUS_ENDPOINT);
            setSyncStatus(res.data);
        } catch (e) {
            console.error("Lỗi lấy trạng thái sync:", e);
        }
    }, []);

    React.useEffect(() => {
        fetchSyncStatus(); 
        const interval = setInterval(fetchSyncStatus, 5000); 
        return () => clearInterval(interval);
    }, [fetchSyncStatus]);

    const handleTriggerSync = async (type) => {
        if (triggeringTypes.includes(type)) return;
        setTriggeringTypes(prev => [...prev, type]);
        try {
            await axios.post(SYNC_TRIGGER_ENDPOINT, { type });
            fetchSyncStatus(); 
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            alert(`Không thể kích hoạt đồng bộ ${type}: ${msg}`);
        } finally {
            setTimeout(() => {
                setTriggeringTypes(prev => prev.filter(t => t !== type));
            }, 1000);
        }
    };

    // --- Render Cell ---
    const renderCellContent = (colDef, product) => {
        const ecountData = product.dataSources?.ecount || {}; 
        const misaData = product.dataSources?.misa || {}; 
        const hasEcount = !!product.ecount_code; 
        const hasMisa = !!product.misa_code;
        const isMapped = hasEcount && hasMisa;

        switch (colDef.id) {
            case COL_ID.SOURCE: if (hasEcount && hasMisa) return <span className="text-purple-700 font-medium text-xs">Ecount & Misa</span>; if (hasEcount) return <span className="text-blue-600 font-medium text-xs">Ecount</span>; if (hasMisa) return <span className="text-green-600 font-medium text-xs">Misa</span>; return '-';
            case COL_ID.SKU: 
                return (
                    <div className="flex flex-col items-start justify-center h-full leading-tight text-left px-1"> 
                        {product.misa_code && (
                            <span 
                                onClick={() => openHistory(product)}
                                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all font-bold"
                            >
                                MISA: {product.misa_code}
                            </span>
                        )} 
                        {product.ecount_code && (
                            <span 
                                onClick={() => openHistory(product)}
                                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all font-bold"
                            >
                                ECOUNT: {product.ecount_code}
                            </span>
                        )} 
                        {!product.misa_code && !product.ecount_code && '-'} 
                    </div>
                );
            
            case COL_ID.PRODUCT_ECOUNT: return ecountData.name || <span className="text-gray-300">-</span>;
            case COL_ID.PRODUCT_MISA: return misaData.name || <span className="text-gray-300">-</span>;
            
            case COL_ID.TAX_RATE:
                let rate = product.general_tax_rate;
                if (rate === undefined || rate === null) { rate = misaData.taxRate ?? ecountData.vat_rate; }
                if (rate === null || rate === undefined) return '-';
                if (rate === 0) return <span className="text-gray-400">0%</span>;
                return <span className="text-blue-600 font-bold">{rate}%</span>;
            
            case COL_ID.BRAND: return product.brand_code || <span className="text-gray-300">-</span>;
            case COL_ID.CATEGORY: return product.category_code || <span className="text-gray-300">-</span>;
            case COL_ID.BARCODE: return ecountData.barcode || '-';
            case COL_ID.LINK: const link = ecountData.cont1 || ''; return link ? (<a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs break-all">{link}</a>) : '-';
            case COL_ID.IN_PRICE: return formatPrice(ecountData.prices?.in_price);
            case COL_ID.OUT_PRICE_MAIN: return formatPrice(ecountData.prices?.out_price);
            case COL_ID.OUT_PRICE_1: return formatPrice(ecountData.prices?.out_price1);
            case COL_ID.OUT_PRICE_2: return formatPrice(ecountData.prices?.out_price2);
            case COL_ID.OUT_PRICE_3: return formatPrice(ecountData.prices?.out_price3);
            case COL_ID.WARRANTY: return ecountData.warrantyPeriod || '-';
            case COL_ID.ECOUNT_TOTAL: const ecountTotal = product.inventorySummary?.total_ecount_quantity || 0; return new Intl.NumberFormat('vi-VN').format(ecountTotal);
            
            // Render Cột Kho VAT
            case COL_ID.VAT:
                const vatLoc = product.inventorySummary?.locations?.find(l => l.warehouse_name === VAT_WAREHOUSE_NAME);
                const vatQty = vatLoc ? vatLoc.quantity : (product.inventorySummary?.total_misa_quantity || 0);
                return vatQty > 0 || hasMisa
                    ? new Intl.NumberFormat('vi-VN').format(vatQty) 
                    : <span className="text-gray-300">-</span>;

            // Render Cột Chênh lệch
            case COL_ID.ECOUNT_MISA_DIFF:
                if (!isMapped) return <span className="text-gray-300 text-xs">-</span>;
                let diff = product.inventorySummary?.ecount_misa_diff;
                if (diff === undefined || diff === null) {
                    const eTotal = product.inventorySummary?.total_ecount_quantity || 0;
                    const vLoc = product.inventorySummary?.locations?.find(l => l.warehouse_name === VAT_WAREHOUSE_NAME);
                    const vQty = vLoc ? vLoc.quantity : (product.inventorySummary?.total_misa_quantity || 0);
                    diff = vQty - eTotal;
                }
                const formattedDiff = new Intl.NumberFormat('vi-VN').format(diff);
                let colorClass = 'text-gray-600';
                if (diff > 0) colorClass = 'text-green-600 font-semibold';
                else if (diff < 0) colorClass = 'text-red-600 font-semibold';
                return <span className={colorClass}>{formattedDiff}</span>;

            case COL_ID.STATUS: 
                const total = product.inventorySummary?.total_ecount_quantity || 0; 
                let sT = '', sC = '', sDC = ''; 
                if (total > 10) { sT = 'Còn'; sC = 'text-green-600'; sDC = 'bg-green-500'; } 
                else if (total > 0) { sT = 'Sắp hết'; sC = 'text-yellow-600'; sDC = 'bg-yellow-500'; } 
                else { sT = 'Hết'; sC = 'text-gray-400'; } 
                return (<div className="flex items-center"> {sDC && <span className={`w-2 h-2 rounded-full mr-2 ${sDC}`}></span>} <span className={`font-medium ${sC}`}>{sT}</span> </div>);
            
            default: 
                if (colDef.isWarehouse && colDef.warehouseCode) { 
                    const loc = product.inventorySummary?.locations?.find(l => l.warehouse_code === colDef.warehouseCode); 
                    return loc ? new Intl.NumberFormat('vi-VN').format(loc.quantity) : <span className="text-gray-300">-</span>; 
                } 
                return '-';
        }
    };

    // --- API Call ---
    const fetchInventory = async (page = 1, isAppending = false) => {
        if (page === 1 && !isAppending) setIsLoading(true); else setIsFetchingMore(true);
        setError(null);
        let apiSortBy = sortBy;
        if (sortBy?.startsWith(SORT_KEY.WAREHOUSE_PREFIX)) { apiSortBy = sortBy.substring(SORT_KEY.WAREHOUSE_PREFIX.length); }
        
        const params = {
            search: searchTerm,
            per_page: API_PER_PAGE,
            warehouse_codes: selectedWarehouseCodes,
            page: page,
            has_ecount_stock: hasEcountStock ? 1 : 0,
            sort_by: apiSortBy,
            sort_direction: sortDirection,
            source_filter: selectedSources.length > 0 ? selectedSources.join(',') : null,
        };
        Object.keys(params).forEach(key => params[key] == null && delete params[key]);
        
        console.log("🚀 Fetching:", params);
        try {
            const response = await axios.get(API_ENDPOINT, { params });
            const { data, ...pagination } = response.data;
            if (!Array.isArray(data)) {
                console.error("API error", response.data);
                setError("API data error.");
                if (page === 1) setInventory([]);
                setPaginationInfo(null);
            } else {
                setInventory(prev => isAppending ? [...prev, ...data] : data);
                setPaginationInfo(pagination);
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error(`❌ Error:`, err.response || err);
                const msg = err.response?.data?.message || err.message || "Error.";
                setError(`Lỗi: ${msg}`);
                if (page === 1) { setInventory([]); setPaginationInfo(null); }
            }
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    // --- Effects ---
    React.useEffect(() => {
        if (allWarehouses && allWarehouses.length > 0 && !isInitialSetupDone) {
            const savedWarehousesJson = localStorage.getItem(LOCALSTORAGE_KEYS.WAREHOUSES);
            let initialWarehouseCodes = [];
            if (savedWarehousesJson) {
                try {
                    const parsed = JSON.parse(savedWarehousesJson);
                    if (Array.isArray(parsed) && parsed.every(c => typeof c === 'string' && allWarehouses.some(wh => wh.code === c))) {
                        initialWarehouseCodes = parsed;
                    }
                } catch (e) { console.error("Failed parsing saved warehouses", e); }
            }
            if (initialWarehouseCodes.length === 0) {
                initialWarehouseCodes = allWarehouses.filter(wh => DEFAULT_WAREHOUSE_NAMES.includes(wh.name) && !EXCLUDED_WAREHOUSE_NAMES.includes(wh.name)).map(wh => wh.code);
            }
            if (JSON.stringify(initialWarehouseCodes) !== JSON.stringify(selectedWarehouses)) { setSelectedWarehouses(initialWarehouseCodes); }
            setIsInitialSetupDone(true);
        }
    }, [allWarehouses, isInitialSetupDone, selectedWarehouses]);

    React.useEffect(() => {
        if (isInitialSetupDone) {
            localStorage.setItem(LOCALSTORAGE_KEYS.SOURCES, JSON.stringify(selectedSources));
            localStorage.setItem(LOCALSTORAGE_KEYS.WAREHOUSES, JSON.stringify(selectedWarehouses));
            localStorage.setItem(LOCALSTORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(visibleColumns));
            localStorage.setItem(LOCALSTORAGE_KEYS.HAS_ECOUNT_STOCK, hasEcountStock.toString());
            localStorage.setItem(LOCALSTORAGE_KEYS.COLUMN_ORDER, JSON.stringify(columnOrder));
        }
    }, [selectedSources, selectedWarehouses, visibleColumns, hasEcountStock, isInitialSetupDone, columnOrder]);

    React.useEffect(() => {
        if (isInitialSetupDone && !warehousesLoading) { 
            fetchInventory(1, false);
        }
    }, [sortBy, sortDirection, selectedWarehouseCodes, hasEcountStock, selectedSources, warehousesLoading]);

    const rowVirtualizer = useVirtualizer({
        count: inventory.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: 10
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    
    React.useEffect(() => {
        if (virtualItems.length === 0 || !paginationInfo || !paginationInfo.last_page || isFetchingMore || isLoading || error) return;
        const lastItem = virtualItems[virtualItems.length - 1];
        if (lastItem.index >= inventory.length - 5 && paginationInfo.current_page < paginationInfo.last_page) {
            fetchInventory(paginationInfo.current_page + 1, true);
        }
    }, [virtualItems, inventory.length, isFetchingMore, paginationInfo, isLoading, error]);

    // --- Handlers ---
    const createResizeHandler = (columnId, minWidth) => (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || minWidth;
        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(startWidth + (moveEvent.clientX - startX), minWidth);
            setColumnWidths(p => ({ ...p, [columnId]: newWidth }));
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };
    
    const handleSort = (sortKey) => {
        if (!sortKey) return;
        if (sortBy === sortKey) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }
        else { setSortBy(sortKey); setSortDirection('desc'); }
    };

    // Header DnD
    const handleDragStart = (e, colId) => { e.dataTransfer.setData("colId", colId); e.dataTransfer.effectAllowed = "move"; };
    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDrop = (e, targetColId) => {
        e.preventDefault();
        const sourceColId = e.dataTransfer.getData("colId");
        if (sourceColId === targetColId) return;
        
        const currentOrder = columnDefs.map(c => c.id);
        const sourceIndex = currentOrder.indexOf(sourceColId);
        const targetIndex = currentOrder.indexOf(targetColId);

        if (sourceIndex > -1 && targetIndex > -1) {
            const newOrder = [...currentOrder];
            newOrder.splice(sourceIndex, 1);
            newOrder.splice(targetIndex, 0, sourceColId);
            setColumnOrder(newOrder); 
        }
    };

    // Modal DnD Handlers
    const handleModalDragStart = (e, index) => {
        e.dataTransfer.setData("itemIndex", index);
    };
    const handleModalDrop = (e, targetIndex) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("itemIndex"));
        if (sourceIndex === targetIndex) return;

        const newOrder = [...modalColumnOrder];
        const item = newOrder.splice(sourceIndex, 1)[0];
        newOrder.splice(targetIndex, 0, item);
        setModalColumnOrder(newOrder);
    };

    // Modal Handlers
    const openFilterModal = () => {
        setModalWarehouses([...selectedWarehouses]);
        setModalHasEcountStock(hasEcountStock);
        setModalSources([...selectedSources]);
        setModalVisibleColumns([...visibleColumns]);
        
        const allIds = ALL_COLUMN_DEFS_CONFIG.map(c => c.id);
        const combinedOrder = [...columnOrder];
        allIds.forEach(id => { if(!combinedOrder.includes(id)) combinedOrder.push(id); });
        setModalColumnOrder(combinedOrder);
        setIsModalOpen(true);
    };
    const handleApplyFilters = () => {
        setSelectedWarehouses([...modalWarehouses]);
        setHasEcountStock(modalHasEcountStock);
        setSelectedSources([...modalSources]);
        setVisibleColumns([...modalVisibleColumns]);
        setColumnOrder([...modalColumnOrder]); // Save new order from modal
        setIsModalOpen(false);
    };
    const handleClearFilters = () => {
        setModalWarehouses([]);
        setModalHasEcountStock(false);
        setModalSources([]);
        setModalVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        setSearchTerm('');
        setSelectedWarehouses([]);
        setHasEcountStock(false);
        setSelectedSources([]);
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        const defaultOrder = ALL_COLUMN_DEFS_CONFIG.map(c => c.id);
        setColumnOrder(defaultOrder);
        setModalColumnOrder(defaultOrder);
        Object.values(LOCALSTORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setIsModalOpen(false);
    };
    const handleWarehouseCheckboxChange = (code) => {
        setModalWarehouses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };
    const handleSelectDefaultWarehouses = () => {
        const defaultCodes = (allWarehouses || []).filter(wh => DEFAULT_WAREHOUSE_NAMES.includes(wh.name) && !EXCLUDED_WAREHOUSE_NAMES.includes(wh.name)).map(wh => wh.code);
        setModalWarehouses(defaultCodes);
    };
    const handleDeselectAllWarehouses = () => setModalWarehouses([]);
    const handleSourceCheckboxChange = (value) => {
        setModalSources(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };
    const handleColumnCheckboxChange = (id) => {
        setModalVisibleColumns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectDefaultColumns = () => setModalVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    const handleSelectAllColumns = () => setModalVisibleColumns(ALL_COLUMN_DEFS_CONFIG.map(c => c.id));
    const handleSearch = () => { fetchInventory(1, false); };

    const handleExportExcel = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            let apiSortBy = sortBy;
            if (sortBy?.startsWith(SORT_KEY.WAREHOUSE_PREFIX)) { apiSortBy = sortBy.substring(SORT_KEY.WAREHOUSE_PREFIX.length); }
            
            const params = {
                search: searchTerm,
                per_page: -1,
                warehouse_codes: selectedWarehouseCodes,
                has_ecount_stock: hasEcountStock ? 1 : 0,
                sort_by: apiSortBy,
                sort_direction: sortDirection,
                source_filter: selectedSources.length > 0 ? selectedSources.join(',') : null,
            };
            Object.keys(params).forEach(key => params[key] == null && delete params[key]);
            
            console.log("🚀 Fetching all for export:", params);
            const response = await axios.get(API_ENDPOINT, { params });
            const allInventory = response.data; 
            
            if (!allInventory || allInventory.length === 0) {
                alert("Không có dữ liệu để xuất.");
                setIsExporting(false);
                return;
            }
            
            const dataToExport = allInventory.map(product => {
                const ecount = product.dataSources?.ecount || {};
                const misa = product.dataSources?.misa || {};
                const summary = product.inventorySummary || {};
                
                // Logic Xuất Excel
                const vatWarehouse = summary.locations?.find(l => l.warehouse_name === VAT_WAREHOUSE_NAME);
                const vatQty = vatWarehouse ? vatWarehouse.quantity : (summary.total_misa_quantity || 0);
                
                let diffValue = summary.ecount_misa_diff;
                if (diffValue === undefined || diffValue === null) {
                    diffValue = vatQty - (summary.total_ecount_quantity || 0);
                }

                let rate = product.general_tax_rate;
                if (rate === undefined || rate === null) { rate = misa.taxRate ?? ecount.vat_rate; }
                
                return {
                    "Nguồn": (product.misa_code && product.ecount_code) ? "Ecount & Misa" : (product.ecount_code ? "Ecount" : "Misa"),
                    "Mã SP (Misa)": product.misa_code,
                    "Mã SP (Ecount)": product.ecount_code,
                    "Tên SP Ecount": ecount.name,
                    "Tên SP Misa": misa.name,
                    "% Thuế": rate ?? 0,
                    "Hãng": product.brand_code,
                    "Nhóm hàng": product.category_code,
                    "Tổng Ecount": summary.total_ecount_quantity,
                    
                    [`Kho VAT (${VAT_WAREHOUSE_NAME})`]: vatQty,
                    
                    "Chênh lệch E-M": diffValue,
                    
                    "Giá Lẻ": ecount.prices?.out_price,
                    "Giá Sỉ 1": ecount.prices?.out_price1,
                    "Giá Sỉ 2": ecount.prices?.out_price2,
                    "Giá Nhập": ecount.prices?.in_price,
                    "Barcode": ecount.barcode,
                    "Link SP": ecount.cont1,
                };
            });
            await exportToExcel(dataToExport, "TonKho_QuocViet");
        } catch (err) {
            console.error("Lỗi khi xuất Excel:", err);
            alert("Có lỗi xảy ra khi chuẩn bị file Excel: " + (err.response?.data?.message || err.message));
        } finally {
            setIsExporting(false);
        }
    };

    const totalWidth = React.useMemo(() => {
        return (columnDefs || []).reduce((acc, colDef) => acc + (columnWidths[colDef.id] || colDef.minWidth), 0);
    }, [columnDefs, columnWidths]);
    
    const pageLoading = isLoading && !isFetchingMore;

    // --- Render ---
    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
             {/* Toolbar */}
             <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Tìm theo SKU, tên sản phẩm..."
                    className="w-full md:w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
                />
                
                <UI.Button variant='secondary' onClick={handleSearch} disabled={isLoading && !isFetchingMore}>
                    {isLoading && !isFetchingMore ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <UI.Icon path='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' className="w-4 h-4 mr-2" />
                    )}
                    Tìm kiếm
                </UI.Button>
                
                <UI.Button variant='secondary' onClick={openFilterModal}>
                    <UI.Icon path="M10.5 6h9.75M10.5 12h9.75m-9.75 6h9.75M3.75 6h1.5m-1.5 6h1.5m-1.5 6h1.5" className="w-4 h-4 mr-2" />
                    Bộ lọc
                </UI.Button>
                
                <UI.Button variant='secondary' onClick={handleExportExcel} disabled={isExporting}>
                    {isExporting ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <UI.Icon path='M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' className="w-4 h-4 mr-2" />
                    )}
                    {isExporting ? 'Đang xuất...' : 'Excel'}
                </UI.Button>

                {/* SYNC WIDGET */}
                <div className="flex items-center gap-3 ml-auto"> 
                    <SyncWidget 
                        label="Ecount" 
                        data={syncStatus.ecount} 
                        isTriggering={triggeringTypes.includes('ecount')}
                        onSync={() => handleTriggerSync('ecount')} 
                    />
                    <SyncWidget 
                        label="Misa" 
                        data={syncStatus.misa} 
                        isTriggering={triggeringTypes.includes('misa')}
                        onSync={() => handleTriggerSync('misa')} 
                    />
                </div>
             </div>

             {/* Modal */}
             <UI.Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Bộ lọc & Tùy chỉnh hiển thị">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lọc theo nguồn</label>
                            <div className="space-y-1">
                                {SOURCE_FILTER_OPTIONS.map(opt => (
                                    <div key={opt.value} className="flex items-center">
                                        <UI.Checkbox id={`source-${opt.value}`} checked={modalSources.includes(opt.value)} onChange={() => handleSourceCheckboxChange(opt.value)}/>
                                        <label htmlFor={`source-${opt.value}`} className="ml-2 text-sm text-gray-700">{opt.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">Chọn kho hiển thị</label>
                                <div className="space-x-2">
                                    <button onClick={handleSelectDefaultWarehouses} className="text-xs text-blue-600 hover:underline">Mặc định</button>
                                    <button onClick={handleDeselectAllWarehouses} className="text-xs text-red-600 hover:underline">Bỏ chọn</button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50">
                                {warehousesLoading ? (
                                    <p>Đang tải...</p>
                                ) : (
                                    (allWarehouses || []).map(wh => (
                                        <div key={wh.code} className="flex items-center">
                                            <UI.Checkbox id={`wh-${wh.code}`} checked={modalWarehouses.includes(wh.code)} onChange={() => handleWarehouseCheckboxChange(wh.code)}/>
                                            <label htmlFor={`wh-${wh.code}`} className="ml-2 text-sm text-gray-700">{wh.name}</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex items-center pt-2">
                            <UI.Checkbox id="ecount-stock" checked={modalHasEcountStock} onChange={(e) => setModalHasEcountStock(e.target.checked)}/>
                            <label htmlFor="ecount-stock" className="ml-2 text-sm text-gray-700">Chỉ hiển thị SP có tồn kho Ecount {'>'} 0</label>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Ẩn/Hiện cột (Kéo thả để sắp xếp)</label>
                            <div className="space-x-2">
                                <button onClick={handleSelectDefaultColumns} className="text-xs text-blue-600 hover:underline">Mặc định</button>
                                <button onClick={handleSelectAllColumns} className="text-xs text-green-600 hover:underline">Hiện tất cả</button>
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50">
                            {modalColumnOrder.map((colId, index) => {
                                const colConfig = ALL_COLUMN_DEFS_CONFIG.find(c => c.id === colId);
                                if (!colConfig) return null;
                                
                                return (
                                    <div 
                                        key={colId} 
                                        className="flex items-center p-1 hover:bg-gray-100 rounded cursor-move"
                                        draggable="true"
                                        onDragStart={(e) => handleModalDragStart(e, index)}
                                        onDragOver={handleDragOver} 
                                        onDrop={(e) => handleModalDrop(e, index)}
                                    >
                                        <div className="text-gray-400 mr-2 cursor-grab">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                            </svg>
                                        </div>
                                        
                                        <UI.Checkbox 
                                            id={`col-${colId}`} 
                                            checked={modalVisibleColumns.includes(colId)} 
                                            onChange={() => handleColumnCheckboxChange(colId)} 
                                            disabled={colConfig.alwaysVisible}
                                        />
                                        <label htmlFor={`col-${colId}`} className={`ml-2 text-sm select-none ${colConfig.alwaysVisible ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}>
                                            {colConfig.title}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                    <UI.Button variant="secondary" onClick={handleClearFilters}> Xóa bộ lọc & Đặt lại cột </UI.Button>
                    <UI.Button variant="primary" onClick={handleApplyFilters}> Áp dụng </UI.Button>
                </div>
             </UI.Modal>

            {/* === TABLE CONTAINER (STICKY HEADER) === */}
            <div 
                ref={parentRef} 
                className="border rounded-lg bg-white shadow-sm flex-1 flex flex-col overflow-auto w-full relative"
            >
                {/* 0. Pagination Info */}
                <div className="sticky top-0 z-30 bg-white p-2 border-b text-sm text-gray-600 shadow-sm flex justify-between items-center">
                    {paginationInfo && paginationInfo.total > 0 && !error ? (
                        <span>
                            Tìm thấy <strong>{paginationInfo.total.toLocaleString('vi-VN')}</strong> sản phẩm. 
                            Đang hiển thị <strong>{inventory.length}</strong> dòng.
                        </span>
                    ) : (
                        <span>
                            {pageLoading && !error ? 'Đang tải...' : (error ? '' : 'Tìm thấy 0 sản phẩm.')}
                        </span>
                    )}
                    {error && <span className="ml-4 text-red-600 font-medium">{error}</span>}
                </div>

                {/* 1. HEADER */}
                <div 
                    className="sticky top-[37px] z-20 flex bg-gray-100 font-semibold text-gray-700 text-sm select-none border-b shadow-sm"
                    style={{ width: `${totalWidth}px`, minWidth: '100%' }}
                >
                    {(columnDefs || []).map(colDef => (
                        <div 
                            key={colDef.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, colDef.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, colDef.id)}
                            onClick={() => handleSort(colDef.sortKey)} 
                            className={`relative flex items-center py-2 px-3 border-r border-gray-200 cursor-move hover:bg-gray-200 ${colDef.headerClassName || ''}`} 
                            style={{ width: `${columnWidths[colDef.id] || colDef.minWidth}px`, flexShrink: 0 }}
                            title="Kéo thả để sắp xếp, Click để sort"
                        > 
                            <span className="pr-2">{colDef.title}</span> 
                            {sortBy === colDef.sortKey && <SortIcon direction={sortDirection} />} 
                            
                            {/* Resizer Handle */}
                            <div 
                                onMouseDown={createResizeHandler(colDef.id, colDef.minWidth)} 
                                onClick={(e) => e.stopPropagation()} 
                                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300" 
                            /> 
                        </div>
                    ))}
                </div>

                {/* 2. BODY */}
                <div 
                    className="relative w-full"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: `${totalWidth}px`, minWidth: '100%' }}
                >
                    {/* Loading/Empty States */}
                    {pageLoading && !error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 h-[300px] sticky top-20 left-0">
                            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                                <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang tải dữ liệu...</span>
                            </div>
                        </div>
                    )}
                    
                    {!pageLoading && !error && inventory.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center h-[200px] sticky top-20 left-0">
                            <div className="p-10 text-center text-gray-500">
                                {searchTerm ? 'Không tìm thấy sản phẩm nào.' : 'Chưa có dữ liệu.'}
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center text-red-600 h-[200px] sticky top-20 left-0">
                            {error}
                        </div>
                    )}

                    {/* Virtual Rows */}
                    {!error && inventory.length > 0 && rowVirtualizer.getVirtualItems().map(virtualRow => {
                        const product = inventory[virtualRow.index];
                        if (!product) return null;
                        const rowBgClass = virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                style={{ 
                                    transform: `translateY(${virtualRow.start}px)`, 
                                    height: `${virtualRow.size}px` 
                                }}
                                className="absolute top-0 left-0 flex items-stretch w-full hover:bg-blue-50 transition-colors"
                            >
                                {(columnDefs || []).map(colDef => (
                                    <div
                                        key={colDef.id}
                                        className={`py-2 px-3 border-b border-r border-gray-200 flex ${colDef.cellClassName || 'items-center'} ${rowBgClass} whitespace-normal break-words overflow-hidden text-sm`}
                                        style={{ width: `${columnWidths[colDef.id] || colDef.minWidth}px`, flexShrink: 0 }}
                                    >
                                        {renderCellContent(colDef, product)}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
                
                {isFetchingMore && !error && (
                    <div className="text-center p-3 text-xs text-gray-500 italic bg-gray-50 border-t">Đang tải thêm dữ liệu...</div>
                )}
            </div>

            {/* Product Detail/History Modal */}
            {historyProductId && (
                <ProductDetailModal
                    productIdentifier={historyProductId}
                    onClose={() => setHistoryProductId(null)}
                />
            )}
        </div>
    );
};
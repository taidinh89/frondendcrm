// --- CONFIGURATION OBJECT ---
const CONFIG = {
  // API and Storage Settings
  API_ENDPOINTS: {
      INVENTORY_SUMMARY: '/api/v1/products/inventory-summary',
      WAREHOUSES: '/api/v1/warehouses',
  },
  LOCAL_STORAGE_KEY: 'inventoryFilters',
  API_PARAMS: {
      PER_PAGE: -1, // -1 means all
  },

  // Search and Filter Settings
  DEBOUNCE_DELAY: 1000,
  DEFAULT_WAREHOUSE_NAMES: ["Hàng hóa", "Kho Tổng 21", "Kho chi nhánh 204", "Kho di động xe tải"],
  AVAILABLE_SOURCES: [
      { value: 'misa', label: 'MISA' },
      { value: 'ecount', label: 'ECOUNT' },
      // { value: 'tool', label: 'Tool' } // 'tool' source seems to be gone from the new API logic
  ],

  // Table Display Settings
  ROW_MIN_HEIGHT: 52, // Increased height slightly for two-line SKU
  VIRTUALIZER_OVERSCAN: 10,
  FIXED_COLUMNS: [
      { id: 'source', label: 'Nguồn', defaultWidth: 100 },
      { id: 'sku', label: 'Mã MISA / Ecount', defaultWidth: 160 },
      { id: 'product', label: 'Sản phẩm', defaultWidth: 280 },

  ],
  DYNAMIC_COLUMN_DEFAULT_WIDTH: 120,

  // CẬP NHẬT: Column Aliases for the new API structure
  COLUMN_ALIASES: {
      'selectedSalePrice': 'Giá bán chọn',
      // 'allPrices' object keys (e.g., ecount_out_price) will be dynamically labeled
      'ecountDetails.unit': 'ĐVT',
      'ecountDetails.warrantyPeriod': 'BH (tháng)',
      'ecountDetails.hasVat': 'Có VAT',
      'ecountDetails.classCodes': 'Lớp SP (Ecount)',
      'cont1': 'Link website',
      'cont2': 'Bảo Hành',
      // Add other ecountDetails fields here if needed
  },
  
  // UI Text
  SEARCH_PLACEHOLDER: 'Tìm Mã hoặc Tên SP...',
};

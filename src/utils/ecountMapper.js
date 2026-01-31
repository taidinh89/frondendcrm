/**
 * ecountMapper.js
 * Utility to map Ecount Product Data to QVC Web Product Format
 */

// Bảng ánh xạ mã Ecount sang ID hệ thống QVC (Dữ liệu Master QVC)
export const ECOUNT_TO_QVC_MAP = {
    brands: {
        'MT': '13',    // Quốc Việt
        'QV': '13',    // Quốc Việt
        'DE': '4',     // Dell
        'AS': '3',     // Asus
        'HP': '5',     // HP
        'LE': '8',     // Lenovo
        'AC': '10',    // Acer
        'APP': '11',   // Apple
        'LG': '12',    // LG
        'MS': '2',     // MSI
        'SAM': '9',    // Samsung
        'GI': '44',    // Gigabyte
        'CMR': '29',   // Hikvision (Camera)
        'TBM': '8',    // Thiết bị mạng
        'GD': '369'    // Gia dụng
    },
    categories: {
        'MOR': '71',   // Màn hình máy tính
        'LT': '1',     // Laptop
        'MB': '60',    // Bo mạch chủ
        'CPU': '62',   // Bộ vi xử lý
        'VGA': '61',   // Card màn hình
        'RAM': '65',   // Bộ nhớ trong
        'SSD': '70',   // Ổ cứng SSD
        'HDD': '69',   // Ổ cứng HDD
        'KB': '75',    // Bàn phím
        'MS': '76',    // Chuột máy tính
        'LOA': '158',  // Loa máy tính
        'HP': '159',   // Tai nghe
        'PW': '66',    // Nguồn (PSU)
        'CS': '63',    // Vỏ máy tính
        'MI': '178',   // Máy in
        'DGH': '238',  // Đầu ghi camera
        'CMR': '9',    // Camera quan sát
        'DH': '305',   // Điều hòa
        'TV': '407',   // Tivi
        'BG': '99',    // Bàn ghế
        'SW': '218',   // Bộ chia mạng
    }
};

/**
 * Maps Ecount product data to QVC web product format.
 * 
 * @param {Object} ecountData - The full product data object from Ecount API (includes .product)
 * @param {Object} webDictionary - Dictionary containing brands and categories arrays from QVC Web
 * @returns {Object} mappedData - The object ready to be fed into ProductMobileDetail form
 */
export const mapEcountToQvc = (ecountData, webDictionary = { brands: [], categories: [] }) => {
    if (!ecountData || !ecountData.product) return null;

    const product = ecountData.product;

    // --- SMART MAPPING LOGIC (Ecount Code -> CRM ID) ---
    const ecBrand = String(product.class_cd || '').toUpperCase();
    const ecCat = String(product.class_cd2 || '').toUpperCase();

    // 1. Phân giải Brand
    let finalBrandId = ECOUNT_TO_QVC_MAP.brands[ecBrand] || '';
    if (!finalBrandId && Array.isArray(webDictionary.brands)) {
        // Fallback: Tìm theo mã hoặc tên trong dictionary
        const matchedBrand = webDictionary.brands.find(b =>
            String(b.code).toLowerCase() === ecBrand.toLowerCase() ||
            String(b.name).toLowerCase() === ecBrand.toLowerCase()
        );
        if (matchedBrand) finalBrandId = String(matchedBrand.id || matchedBrand.code);
    }

    // 2. Phân giải Category
    let finalCatId = ECOUNT_TO_QVC_MAP.categories[ecCat] || '';
    if (!finalCatId && Array.isArray(webDictionary.categories)) {
        // Fallback: Tìm theo tên category (Ecount class_cd2 -> Web Name?) 
        // Note: Mapping name is risky, ideally use explicit map. 
        // Here assuming Ecount Code might match Web Name relative, or just fallback to empty.
        const matchedCat = webDictionary.categories.find(c =>
            String(c.name).toLowerCase() === ecCat.toLowerCase()
        );
        if (matchedCat) finalCatId = String(matchedCat.id);
    }

    // Construct the Mapped Data Object
    // Matches the structure expected by ProductMobileDetail formData
    const mappedData = {
        id: null, // New product on web
        proName: product.prod_des,
        storeSKU: product.prod_cd,
        brandId: finalBrandId,
        catId: finalCatId ? [finalCatId] : [],

        // Pricing
        price: product.out_price5 || product.out_price || 0,
        market_price: product.out_price || 0,
        purchase_price_web: product.in_price || 0, // Giá nhập

        // Stock
        quantity: ecountData.total_stock || 0,

        // Status & Marketing (Defaults for new from Ecount)
        isOn: 0, // Starts offline
        condition: 'New',
        is_new: 1, // Flag as New Arrival
        ordering: 100,

        // Meta / Extra
        unit: product.unit,
        ecount_sync_status: 'draft'
    };

    return mappedData;
};

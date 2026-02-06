import axios from '../../axiosGlobal';

export const metaApi = {
    // === [MODULE V2] INTERNATIONAL STANDARD (Parallel Run) ===
    // Categories V2
    getCategoriesV2: (params) => axios.get('/api/v2/categories', { params: { mode: 'tree', ...params } }),
    getCategoriesMinimalV2: () => axios.get('/api/v2/categories', { params: { mode: 'simple', per_page: 500 } }),
    getCategoryDetailV2: (id) => axios.get(`/api/v2/categories/${id}`),
    updateCategoryV2: (id, data) => axios.put(`/api/v2/categories/${id}`, data),
    createCategoryV2: (data) => axios.post('/api/v2/categories', data),
    deleteCategoryV2: (id) => axios.delete(`/api/v2/categories/${id}`),

    // Brands V2
    getBrandsV2: (params) => axios.get('/api/v2/brands', { params: { mode: 'simple', ...params } }),
    getBrandDetailV2: (id) => axios.get(`/api/v2/brands/${id}`),
    updateBrandV2: (id, data) => axios.put(`/api/v2/brands/${id}`, data),
    createBrandV2: (data) => axios.post('/api/v2/brands', data),
    deleteBrandV2: (id) => axios.delete(`/api/v2/brands/${id}`),

    // === [LEGACY V1] DÀNH CHO CÁC TRANG CŨ (PROTECTED) ===
    // Categories
    getCategories: (params) => axios.get('/api/v1/categories-manager', { params }),
    getCategoriesMinimal: () => axios.get('/api/v1/categories', { params: { format: 'minimal' } }),
    getCategoryDetail: (id) => axios.get(`/api/v1/categories-manager/${id}`),
    updateCategory: (id, data) => axios.put(`/api/v1/categories-manager/${id}`, data),
    createCategory: (data) => axios.post('/api/v1/categories-manager', data),
    deleteCategory: (id) => axios.delete(`/api/v1/categories-manager/${id}`),

    // Brands
    getBrands: (params) => axios.get('/api/v1/brands-manager', { params }),
    getBrandDetail: (id) => axios.get(`/api/v1/brands-manager/${id}`),
    updateBrand: (id, data) => axios.put(`/api/v1/brands-manager/${id}`, data),
    createBrand: (data) => axios.post('/api/v1/brands-manager', data),
    deleteBrand: (id) => axios.delete(`/api/v1/brands-manager/${id}`),
};

// --- [DEBUG HELPER] MÁY QUAY GIÁM SÁT FRONTEND ---

export const updateProduct = async (id, data) => {
    console.group(`🚀 [FE_DEBUG] UPDATE PRODUCT ID: ${id}`);
    console.log('1. Payload Raw (Data from Form):', data);
    console.log('2. Media IDs:', data.media_ids);
    console.log('3. CatId Type:', Array.isArray(data.catId) ? 'Array' : typeof data.catId, data.catId);
    console.groupEnd();

    const response = await axios.post(`/api/v1/products/${id}?_method=PUT`, data);
    console.log(`✅ [FE_DEBUG] RESPONSE ID: ${id}`, response.data);
    return response.data;
};

export const createProduct = async (data) => {
    console.group(`🚀 [FE_DEBUG] CREATE PRODUCT`);
    console.log('1. Payload Raw:', data);
    console.log('2. Media IDs:', data.media_ids);
    console.groupEnd();

    const response = await axios.post('/api/v1/products', data);
    return response.data;
};

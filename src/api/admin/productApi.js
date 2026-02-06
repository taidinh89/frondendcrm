// src/api/admin/productApi.js
import axios from '../../axiosGlobal';

const BASE_URL = '/api/v1/products';
const V2_URL = '/api/v2/products-new';

export const productApi = {
    // 1. Lấy chi tiết (Legacy V1)
    getDetail: (id) => axios.get(`${BASE_URL}/${id}`),

    // [NEW V2] Standardized Detail (Envelope)
    getDetailV2: (id) => axios.get(`${V2_URL}/${id}`),

    // 2. Cập nhật thông tin (Tên, Giá, Mô tả, Tags...)
    update: (id, data) => {
        console.group(`🚀 [API DEBUG] UPDATE ID: ${id}`);
        console.log("📦 Payload Gốc:", data);
        console.groupEnd();
        return axios.put(`${BASE_URL}/${id}`, data);
    },

    // 3. --- NHÓM MEDIA ---
    uploadImage: (id, formData) => axios.post(`${BASE_URL}/${id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    setMainImage: (prodId, mediaId) => axios.post(`${BASE_URL}/${prodId}/media/${mediaId}/set-main`),
    deleteImage: (prodId, mediaId) => axios.delete(`${BASE_URL}/${prodId}/media/${mediaId}`),
    deleteOldImageByName: (prodId, imageName) => axios.post(`${BASE_URL}/${prodId}/media/remove-old`, {
        image_name: imageName
    }),

    // 4. Các chức năng khác
    syncOne: (id) => axios.post(`${BASE_URL}/${id}/sync`),
    createV2: (data) => axios.post(`${V2_URL}`, data),
    updateV2: (id, data) => axios.put(`${V2_URL}/${id}`, data),
    getLibrary: (params) => axios.get(`${V2_URL}`, { params }),
    deleteV2: (id) => axios.delete(`${V2_URL}/${id}`),
    toggleStatus: (id) => axios.post(`${BASE_URL}/${id}/toggle-status`),

    // 5. Media Studio & Smart Features
    smartUpload: (formData) => axios.post('/api/v1/media/smart-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    processWordContent: (prodId, data) => axios.post(`${BASE_URL}/${prodId}/media/word-process`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    importDocx: (prodId, formData) => axios.post(`${BASE_URL}/${prodId}/media/import-docx`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // 6. === [MODULE V2] INTERNATIONAL STANDARD ===
    getCategoriesV2: (params) => axios.get('/api/v2/categories', { params }),
    getBrandsV2: (params) => axios.get('/api/v2/brands', { params }),
    getSites: () => axios.get('/api/v2/security/sites'),

    // 7. === [LEGACY V1] DÀNH CHO CÁC TRANG CŨ ===
    getCategories: (params) => axios.get(`${BASE_URL}/categories`, { params }),
    getBrands: (params) => axios.get(`${BASE_URL}/brands`, { params }),
};

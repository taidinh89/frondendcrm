// src/api/admin/productApi.js
import axios from '../../axiosGlobal';

const BASE_URL = '/api/v1/products';

export const productApi = {
    // 1. Lấy chi tiết (Backend đã trả về full_images từ MediaUsage)
    getDetail: (id) => axios.get(`${BASE_URL}/${id}`),

    // 2. Cập nhật thông tin (Tên, Giá, Mô tả, Tags...)
    update: (id, data) => axios.put(`${BASE_URL}/${id}`, data),

    // 3. --- NHÓM MEDIA (QUẢN LÝ ẢNH CHUYÊN NGHIỆP) ---
    uploadImage: (id, formData) => axios.post(`${BASE_URL}/${id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    setMainImage: (prodId, mediaId) => axios.post(`${BASE_URL}/${prodId}/media/${mediaId}/set-main`),

    deleteImage: (prodId, mediaId) => axios.delete(`${BASE_URL}/${prodId}/media/${mediaId}`),

    // [THÊM MỚI]
    deleteOldImageByName: (prodId, imageName) => axios.post(`${BASE_URL}/${prodId}/media/remove-old`, {
        image_name: imageName
    }),

    // 4. Sync thủ công 1 sản phẩm
    syncOne: (id) => axios.post(`${BASE_URL}/${id}/sync`),

    // 5. Thêm mới sản phẩm
    create: (data) => axios.post(`${BASE_URL}`, data),

    // 6. Lấy danh sách (Library)
    getLibrary: (params) => axios.get(`${BASE_URL}`, { params })
};
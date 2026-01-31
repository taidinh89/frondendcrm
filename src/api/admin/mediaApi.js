import axios from '../../axiosGlobal';

const BASE_URL = '/api/v1/admin/media-library';
const COLL_URL = '/api/v1/media-collections';

export const mediaApi = {
    // 1. Lấy danh sách kho media (có lọc, phân trang)
    getLibrary: (params) => {
        return axios.get(BASE_URL, { params });
    },

    // 2. Xóa media (chặn nếu đang được sử dụng)
    deleteMedia: (id) => {
        return axios.delete(`${BASE_URL}/${id}`);
    },

    // 3. Cập nhật metadata (SEO Title, Alt)
    updateMeta: (id, data) => {
        return axios.put(`${BASE_URL}/${id}/meta`, data);
    },

    // 4. Lấy danh sách bộ sưu tập
    getCollections: () => {
        return axios.get(COLL_URL);
    },

    // 5. Tạo bộ sưu tập mới
    createCollection: (name) => {
        return axios.post(COLL_URL, { name });
    },

    // 6. Thêm các file vào bộ sưu tập
    addToCollection: (collectionId, mediaIds) => {
        return axios.post(`${COLL_URL}/${collectionId}/add`, { media_ids: mediaIds });
    },

    // 7. Xóa bộ sưu tập
    deleteCollection: (id) => {
        return axios.delete(`${COLL_URL}/${id}`);
    },

    // 8. Kích hoạt đồng bộ từ nguồn QVC
    syncFromSource: () => {
        return axios.post(`${BASE_URL}/sync-source`);
    },

    // 9. Media Studio (Áp hiệu ứng, khung, watermark)
    applyEffect: (data) => {
        return axios.post(`${BASE_URL}/apply-effect`, data);
    }
};
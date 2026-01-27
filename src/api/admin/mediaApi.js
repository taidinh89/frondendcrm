import axios from '../../axiosGlobal'; // Sử dụng instance axios đã cấu hình của bạn

const BASE_URL = '/api/v1/admin/media-library';

export const mediaApi = {
    // 1. Lấy danh sách (có tìm kiếm, phân trang)
    getLibrary: (params) => {
        return axios.get(BASE_URL, { params });
    },

    // 2. Xóa ảnh (Hệ thống sẽ chặn nếu đang dùng)
    deleteMedia: (id) => {
        return axios.delete(`${BASE_URL}/${id}`);
    },

    // 3. [MỚI] Kích hoạt đồng bộ ảnh từ QVC về (Trigger ProductSyncService)
    syncFromSource: () => {
        return axios.post(`${BASE_URL}/sync-source`);
    }
};
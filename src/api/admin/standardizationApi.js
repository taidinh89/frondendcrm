// src/api/admin/standardizationApi.js
import axios from '../../axiosGlobal';

const BASE_URL = '/api/v2/v1/admin/standardization';

export const standardizationApi = {
    // 1. Lấy danh sách đối soát tổng quát (Hỗ trợ Management Hub)
    getList: (params) => axios.get(`${BASE_URL}`, { params }),

    // 2. Tra cứu chi tiết một SKU duy nhất trên tất cả các kênh
    lookupBySku: (sku) => axios.get(`${BASE_URL}/lookup/${sku}`),

    // 3. Lấy dữ liệu thô từ hệ thống kênh (Ecount/Misa)
    getChannelData: (channel, code) => axios.get(`${BASE_URL}/channel/${channel}/${code}`),

    // 4. Tạo sản phẩm Web từ Ecount
    createFromEcount: (ecountCode) => axios.post(`${BASE_URL}/create-from-ecount`, { ecount_code: ecountCode }),

    // 5. CẬP NHẬT MAPPING TOÀN DIỆN (Bảng product_mappings)
    showMapping: (id) => axios.get(`${BASE_URL}/mappings/${id}`),
    updateFullMapping: (data) => axios.post(`${BASE_URL}/mappings`, data),
    deleteMapping: (id) => axios.delete(`${BASE_URL}/mappings/${id}`),

    // 6. QUY TẮC DANH MỤC (Bảng category_mappings)
    getCategoryRules: () => axios.get(`${BASE_URL}/category-rules`),
    updateCategoryRule: (data) => axios.post(`${BASE_URL}/category-rules`, data),
    deleteCategoryRule: (id) => axios.delete(`${BASE_URL}/category-rules/${id}`)
};

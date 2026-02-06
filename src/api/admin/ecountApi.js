// src/api/admin/ecountApi.js
import axios from '../../axiosGlobal';

const BASE_URL = '/api/v1/ecount-manager';

export const ecountApi = {
    // 1. Danh sách sản phẩm Ecount (Search & Filter)
    getProducts: (params) => axios.get(`${BASE_URL}/products`, { params }),

    // 2. Chi tiết sản phẩm (Dùng query param ?id= để server đọc chuẩn hơn, tránh lỗi 404 khi SKU có ký tự /)
    showProduct: (identifier) => axios.get(`${BASE_URL}/products/detail`, { params: { id: identifier } }),

    // 3. Lấy tùy chọn bộ lọc (Brands, Cats, Suppliers)
    getFilterOptions: () => axios.get(`${BASE_URL}/filter-options`),

    // 4. Tạo sản phẩm Web từ Ecount (Sử dụng service standardization đã có hoặc mở rộng)
    // Theo logic người dùng yêu cầu, ta có thể dùng lại endpoint từ standardizationApi
};

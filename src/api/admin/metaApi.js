import axios from '../../axiosGlobal';

export const metaApi = {
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

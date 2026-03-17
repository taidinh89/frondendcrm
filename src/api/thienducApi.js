import axios from 'axios';

const BASE_URL = '/api/admin/td';

export const thienducApi = {
    getProducts: ({ page = 1, search = '', limit = 50, sync_status = '' }, cancelToken) => {
        return axios.get(`${BASE_URL}/products`, {
            params: {
                page,
                per_page: limit,
                search,
                sync_status
            },
            cancelToken
        });
    },

    getProductDetail: (id) => {
        return axios.get(`${BASE_URL}/products/${id}`);
    },

    pushToVps: (productId) => {
        return axios.post(`${BASE_URL}/products/${productId}/sync`);
    },

    updateProduct: (productId, data) => {
        return axios.put(`${BASE_URL}/products/${productId}`, data);
    },

    toggleOverride: (productId, field, isOverridden) => {
        return axios.patch(`${BASE_URL}/products/${productId}/override`, {
            field,
            overridden: isOverridden
        });
    },

    getSyncStats: () => {
        return axios.get(`${BASE_URL}/sync-stats`);
    },

    deltaSync: () => {
        return axios.post(`${BASE_URL}/products/bulk-sync-delta`);
    },

    fullSync: () => {
        return axios.post(`${BASE_URL}/products/sync-all`);
    }
};

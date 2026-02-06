import axios from '../axiosGlobal';

const PREFIX = '/api/v2/media';

const UnifiedMediaService = {
    /**
     * Get Media List with Advanced Filters
     * @param {Object} params { page, keyword, collection_id, brand_id, folder }
     */
    list: async (params = {}) => {
        return axios.get(PREFIX, { params });
    },

    /**
     * Get usage details of a media file
     * @param {Number} id Media File ID
     */
    getUsage: async (id) => {
        return axios.get(`${PREFIX}/${id}/usage`);
    },

    /**
     * Smart Upload (File or URL)
     * @param {File|String} fileOrUrl 
     * @param {String} source Optional source context
     */
    upload: async (fileOrUrl, source = 'unified_manager') => {
        const formData = new FormData();
        if (typeof fileOrUrl === 'string') {
            formData.append('image_url', fileOrUrl);
        } else {
            formData.append('image', fileOrUrl);
        }
        formData.append('source', source);

        return axios.post(`${PREFIX}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    /**
     * Attach media to a model (Product, Post...)
     */
    attach: async (modelType, modelId, mediaIds) => {
        return axios.post(`${PREFIX}/attach`, {
            model_type: modelType,
            model_id: modelId,
            media_ids: mediaIds
        });
    },

    /**
     * Detach media
     */
    detach: async (usageIds) => {
        return axios.post(`${PREFIX}/detach`, { usage_ids: usageIds });
    },

    /**
     * Create new collection
     */
    createCollection: async (name) => {
        return axios.post(`${PREFIX}/collections`, { name });
    },

    /**
     * List all collections
     */
    getCollections: async () => {
        return axios.get(`${PREFIX}/collections`);
    },

    /**
     * Add items to collection
     */
    addToCollection: async (collectionId, mediaIds) => {
        return axios.post(`${PREFIX}/collections/${collectionId}/add`, { media_ids: mediaIds });
    },

    /**
     * Delete collection
     */
    deleteCollection: async (id) => {
        return axios.delete(`${PREFIX}/collections/${id}`);
    }
};

export default UnifiedMediaService;

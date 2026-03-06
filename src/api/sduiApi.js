import axios from 'axios';

const sduiApi = {
    // Blocks
    getBlocks: () => axios.get('/api/v3/admin/sdui/blocks'),

    // Screens
    getScreens: () => axios.get('/api/v3/admin/sdui/screens'),
    getScreen: (slug) => axios.get(`/api/v3/admin/sdui/screens/${slug}`),
    saveScreen: (slug, data) => axios.put(`/api/v3/admin/sdui/screens/${slug}`, data),
    createScreen: (data) => axios.post('/api/v3/admin/sdui/screens', data),

    // Targeting
    getTargets: () => axios.get('/api/v3/admin/sdui/targets'),
    saveTarget: (data) => axios.post('/api/v3/admin/sdui/targets', data),

    // Versioning
    getSnapshots: () => axios.get('/api/v3/admin/sdui/snapshots'),
    createSnapshot: (data) => axios.post('/api/v3/admin/sdui/snapshots', data),

    // Navigation
    getNavigation: () => axios.get('/api/v3/admin/sdui/navigation'),
    saveNavigation: (data) => axios.put('/api/v3/admin/sdui/navigation', data),

    // Audit
    getAuditReport: () => axios.get('/api/v3/admin/sdui/audit'),
};

export default sduiApi;

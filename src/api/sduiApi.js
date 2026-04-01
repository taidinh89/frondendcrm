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
    getFullAuditScan: () => axios.get('/api/v3/admin/sdui/audit/full-scan'),

    // [V8.4 ELITE]: Device Monitoring
    getDevices: () => axios.get('/api/v3/admin/targeting/devices'),
    updateDevice: (id, data) => axios.put(`/api/v3/admin/targeting/devices/${id}`, data),

    // App Configuration & Versioning
    getAppConfigs: () => axios.get('/api/v3/admin/app-versions'),
    updateAppConfigs: (data) => axios.post('/api/v3/admin/app-versions', data),
    forcePushAppUpdate: () => axios.post('/api/v3/admin/app-versions/force-push'),
    // [V9.0]: Remote Log Management
    getAppLogs: (params) => axios.get('/api/v3/admin/app-logs', { params }),
    clearAppLogs: () => axios.delete('/api/v3/admin/app-logs/clear'),
    bulkDeleteAppLogs: (ids) => axios.delete('/api/v3/admin/app-logs/bulk', { data: { ids } }),
    getAppDebugConfigs: (deviceId) => axios.get('/api/v3/admin/app-logs/debug-config', { params: { device_id: deviceId } }),
    toggleAppDebugConfig: (deviceId, module, enabled) => axios.post('/api/v3/admin/app-logs/debug-config', { device_id: deviceId, module, enabled }),
};

export default sduiApi;

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Icon, Modal } from '../../components/ui';

const ThemeManagerV2 = () => {
    const [sites, setSites] = useState([]);
    const [themes, setThemes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configJson, setConfigJson] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Assuming we have these endpoints or using a generic one
            const [sitesRes, themesRes] = await Promise.all([
                axios.get('/api/v2/security/sites'),
                axios.get('/api/v2/security/themes')
            ]);
            setSites(sitesRes.data.data);
            setThemes(themesRes.data.data);
        } catch (e) {
            toast.error("Không nạp được dữ liệu quản trị");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateVersion = async (siteId, versionId) => {
        try {
            await axios.post(`/api/v2/security/sites/${siteId}/switch-version`, { version_id: versionId });
            toast.success("Đã cập nhật phiên bản theme");
            fetchData();
        } catch (e) {
            toast.error("Lỗi cập nhật");
        }
    };

    const handleSaveConfig = async () => {
        try {
            const parsed = JSON.parse(configJson);
            await axios.post(`/api/v2/security/theme-versions/update-config`, {
                id: selectedSite.active_theme_version_id,
                config: parsed
            });
            toast.success("Đã lưu cấu hình JSON");
            setIsConfigModalOpen(false);
            fetchData();
        } catch (e) {
            toast.error("JSON không hợp lệ hoặc lỗi server");
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-400">LOADING MULTI-SITE ENGINE...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">THEME & MULTI-SITE MANAGER</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Core V2 - Multi-Domain System</p>
                </div>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase">
                    Thêm Site Mới
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {sites.map(site => (
                    <div key={site.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-all">
                            <Icon name="globe" className="w-12 h-12 text-indigo-200" />
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-indigo-600">
                                <span className="font-black text-xs uppercase">{site.code}</span>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{site.name}</h3>
                                <p className="text-blue-600 font-mono text-xs">{site.domain}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Theme hiện tại</label>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-indigo-600 text-xs">{site.theme?.name || 'Chưa chọn'}</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase">Active</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">Phiên bản: {site.active_version?.version_tag || 'Default'}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setSelectedSite(site);
                                        setConfigJson(JSON.stringify(site.active_version?.config_json || {}, null, 2));
                                        setIsConfigModalOpen(true);
                                    }}
                                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                >
                                    Cấu hình JSON
                                </button>
                                <button className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                    Đổi Theme
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CONFIG MODAL */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title={`CẤU HÌNH THEME: ${selectedSite?.name}`}
                maxWidth="max-w-4xl"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <Icon name="info" className="inline w-3 h-3 mr-2" />
                        Chỉnh sửa cấu hình layout, màu sắc và tính năng trực tiếp qua định dạng JSON. Cẩn thận: Dữ liệu này ảnh hưởng trực tiếp đến UI Frontend.
                    </p>
                    <textarea
                        value={configJson}
                        onChange={e => setConfigJson(e.target.value)}
                        className="w-full h-[500px] bg-slate-900 text-indigo-300 p-6 rounded-2xl font-mono text-sm outline-none focus:ring-2 ring-indigo-500 transition-all border-none shadow-inner"
                        spellCheck="false"
                    />
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Hủy</button>
                        <button onClick={handleSaveConfig} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Lưu Cấu Hình</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ThemeManagerV2;

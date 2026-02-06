import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Icon, Modal } from '../../components/ui';

const ThemeVersionManager = () => {
    const [themes, setThemes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [configJson, setConfigJson] = useState('');
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    useEffect(() => {
        fetchThemes();
    }, []);

    const fetchThemes = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/v2/security/themes');
            setThemes(res.data.data);
        } catch (e) {
            toast.error("Không nạp được dữ liệu themes");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClone = async (versionId) => {
        try {
            await axios.post(`/api/v2/security/themes/versions/${versionId}/clone`);
            toast.success("Đã nhân bản bản nháp mới");
            fetchThemes();
        } catch (e) {
            toast.error("Lỗi nhân bản");
        }
    };

    const handleSaveConfig = async () => {
        try {
            const parsed = JSON.parse(configJson);
            await axios.post(`/api/v2/security/theme-versions/update-config`, {
                id: selectedVersion.id,
                config: parsed
            });
            toast.success("Đã cập nhật cấu hình");
            setIsConfigModalOpen(false);
            fetchThemes();
        } catch (e) {
            toast.error("JSON không hợp lệ");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xác nhận xóa phiên bản này?")) return;
        try {
            await axios.delete(`/api/v2/security/themes/versions/${id}`);
            toast.success("Đã xóa");
            fetchThemes();
        } catch (e) {
            toast.error(e.response?.data?.message || "Lỗi khi xóa");
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">LOADING ENGINE...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">QUẢN LÝ PHIÊN BẢN (VERSIONS)</h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Xây dựng, nhân bản và xem trước các bản nháp giao diện</p>
            </div>

            {themes.map(theme => (
                <div key={theme.id} className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Theme: {theme.name}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {theme.versions.map(v => (
                            <div key={v.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="font-black text-slate-800 text-lg tracking-tight uppercase">v.{v.version_tag}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cập nhật: {new Date(v.updated_at).toLocaleDateString('vi-VN')}</div>
                                        </div>
                                        {v.is_published && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase tracking-tighter">Published</span>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] space-y-2">
                                        <div className="flex justify-between font-bold">
                                            <span className="text-slate-400">Primary Color:</span>
                                            <span className="text-indigo-600">{v.config_json?.primary_color || '#4f46e5'}</span>
                                        </div>
                                        <div className="flex justify-between font-bold">
                                            <span className="text-slate-400">Tính năng:</span>
                                            <span className="text-slate-700">{Object.keys(v.config_json || {}).length} keys</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-6">
                                    <button
                                        onClick={() => {
                                            setSelectedVersion(v);
                                            setConfigJson(JSON.stringify(v.config_json || {}, null, 2));
                                            setIsConfigModalOpen(true);
                                        }}
                                        className="py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase border border-slate-100 hover:bg-white hover:border-indigo-600 transition-all"
                                    >
                                        Edit Config
                                    </button>
                                    <button
                                        onClick={() => handleClone(v.id)}
                                        className="py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all outline-none"
                                    >
                                        Clone V
                                    </button>
                                    <a
                                        href={`/web?v_id=${v.id}`}
                                        target="_blank"
                                        className="py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase text-center flex items-center justify-center gap-1"
                                    >
                                        <Icon name="play" className="w-3 h-3" /> Preview
                                    </a>
                                    <button
                                        onClick={() => handleDelete(v.id)}
                                        className="py-3 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* CONFIG MODAL */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title={`CẤU HÌNH PHIÊN BẢN: v.${selectedVersion?.version_tag}`}
                maxWidth="max-w-4xl"
            >
                <div className="space-y-4">
                    <textarea
                        value={configJson}
                        onChange={e => setConfigJson(e.target.value)}
                        className="w-full h-[500px] bg-slate-900 text-indigo-300 p-8 rounded-3xl font-mono text-sm outline-none focus:ring-2 ring-indigo-500 transition-all border-none"
                        spellCheck="false"
                    />
                    <div className="flex gap-4 pt-4">
                        <button onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Đóng</button>
                        <button onClick={handleSaveConfig} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100">Lưu Config</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ThemeVersionManager;

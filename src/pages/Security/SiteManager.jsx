import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Icon, Modal } from '../../components/ui';

const SiteManager = () => {
    const [sites, setSites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/v2/security/sites');
            setSites(res.data.data);
        } catch (e) {
            toast.error("Không nạp được danh sách site");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSite = async () => {
        try {
            await axios.put(`/api/v2/security/sites/${selectedSite.id}`, editData);
            toast.success("Cập nhật site thành công");
            setIsEditModalOpen(false);
            fetchSites();
        } catch (e) {
            toast.error("Lỗi cập nhật site");
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">LOADING SITES...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">CẤU HÌNH ĐA KÊNH (SITES)</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Quản lý tên miền và định danh website</p>
                </div>
                <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase">
                    Thêm Site Mới
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sites.map(site => (
                    <div key={site.id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                    {site.logo_url ? (
                                        <img src={site.logo_url} className="w-10 h-10 object-contain" />
                                    ) : (
                                        <span className="font-black text-xl text-indigo-600 uppercase">{site.code.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-800 text-xl tracking-tight">{site.name}</h3>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-tighter">Code: {site.code}</span>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                {site.is_active ? 'Online' : 'Offline'}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Domain chính</label>
                                    <p className="text-sm font-bold text-blue-600 truncate">{site.domain}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aliases</label>
                                    <p className="text-xs font-bold text-slate-600 truncate">{site.aliases?.join(', ') || 'None'}</p>
                                </div>
                            </div>

                            <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-100/50">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Theme & Version Active</label>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase transition-all hover:underline cursor-pointer">Chi tiết Theme</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-slate-700 text-sm italic">"{site.theme?.name || 'Default'}"</span>
                                    <span className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[10px] font-black text-indigo-600 uppercase">
                                        v.{site.active_version?.version_tag || '1.0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setSelectedSite(site);
                                    setEditData(site);
                                    setIsEditModalOpen(true);
                                }}
                                className="py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 hover:bg-white hover:border-indigo-600 hover:text-indigo-600 transition-all"
                            >
                                Sửa Site
                            </button>
                            <a
                                href={`https://${site.domain}/web`}
                                target="_blank"
                                className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all text-center"
                            >
                                Truy cập
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* EDIT SITE MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="CHỈNH SỬA SITE"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tên Site</label>
                            <input
                                type="text"
                                value={editData.name || ''}
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-indigo-500 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Domain</label>
                            <input
                                type="text"
                                value={editData.domain || ''}
                                onChange={e => setEditData({ ...editData, domain: e.target.value })}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-indigo-500 font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Logo URL</label>
                        <input
                            type="text"
                            value={editData.logo_url || ''}
                            onChange={e => setEditData({ ...editData, logo_url: e.target.value })}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-indigo-500 font-bold"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="flex gap-4 pt-6 text-center">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">Hủy</button>
                        <button onClick={handleUpdateSite} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100">Lưu thay đổi</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SiteManager;

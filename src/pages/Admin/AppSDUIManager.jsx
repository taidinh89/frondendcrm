import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useApiData } from '../../hooks/useApiData';
import MobilePreviewFrame from '../../components/SDUI/MobilePreviewFrame';

const GoogleFont = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif !important; }
        .admin-dashboard { background: #f1f5f9; min-height: 100vh; color: #1e293b; }
        .sidebar-item-active { background: #e0e7ff; color: #4338ca; border-right: 4px solid #4338ca; }
        .card-pro { background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .input-pro { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 500; outline: none; transition: all 0.2s; }
        .input-pro:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .btn-primary { background: #4338ca; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.2s; }
        .btn-primary:hover { background: #3730a3; transform: translateY(-1px); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    `}</style>
);

export default function AppSDUIManager() {
    const { data: screensResp, refetch: refetchScreens } = useApiData('/api/v3/admin/app-screens');
    const [activeScreenSlug, setActiveScreenSlug] = useState('goto_feed');
    const { data: uiResponse, isLoading, refetch } = useApiData(`/api/v3/admin/app-ui?screen_slug=${activeScreenSlug}`);
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState('builder');
    const [deviceConfig, setDeviceConfig] = useState({ type: 'iphone_15_pro', orientation: 'portrait' });
    const [realFeedData, setRealFeedData] = useState([]);

    // FULL RAW CONFIG STATE
    const [fullRawJson, setFullRawJson] = useState('{}');
    const [isSavingFull, setIsSavingFull] = useState(false);

    useEffect(() => {
        axios.get('/api/v3/app/news-feed').then(res => {
            setRealFeedData(res.data?.data?.posts || []);
        });
    }, []);

    // FORM STATE
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        block_type: 'GridMenuBlock',
        screen_slug: activeScreenSlug,
        label: '',
        icon: 'ATTENDANCE',
        action: 'NONE',
        bg_color: '#3b82f6',
        metadata: {},
        position: 0,
        is_active: true
    });
    const [metadataText, setMetadataText] = useState('{}');

    const screens = screensResp?.data || (Array.isArray(screensResp) ? screensResp : []);

    useEffect(() => {
        if (uiResponse) {
            const finalData = uiResponse.data || (Array.isArray(uiResponse) ? uiResponse : []);
            setItems(finalData);
        }
    }, [uiResponse]);

    useEffect(() => {
        if (activeTab === 'raw_full') {
            axios.get('/api/v3/admin/app-full-config').then(res => {
                const finalData = res.data?.data || res.data;
                setFullRawJson(JSON.stringify(finalData, null, 4));
            });
        }
    }, [activeTab]);

    const handleReset = () => {
        setEditingItem(null);
        setFormData({
            block_type: 'GridMenuBlock',
            screen_slug: activeScreenSlug,
            label: '',
            icon: 'ATTENDANCE',
            action: 'NONE',
            bg_color: '#3b82f6',
            metadata: {},
            position: items.length + 1,
            is_active: true
        });
        setMetadataText('{}');
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ ...item });
        setMetadataText(JSON.stringify(item.metadata || {}, null, 2));
    };

    const handleSave = async () => {
        try {
            let parsedMetadata = {};
            try { parsedMetadata = JSON.parse(metadataText); } catch (e) { toast.error('Metadata lỗi JSON'); return; }
            const payload = { ...formData, screen_slug: activeScreenSlug, metadata: parsedMetadata };
            if (editingItem) await axios.put(`/api/v3/admin/app-ui/${editingItem.id}`, payload);
            else await axios.post('/api/v3/admin/app-ui', payload);
            toast.success('Cập nhật thành công! ✅');
            handleReset();
            refetch();
        } catch (err) { toast.error('Lỗi API'); }
    };

    const handleSaveFullRaw = async () => {
        setIsSavingFull(true);
        try {
            const parsed = JSON.parse(fullRawJson);
            await axios.post('/api/v3/admin/app-full-config', parsed);
            toast.success('Ghi đè Toàn App thành công! 🚀');
            refetch();
        } catch (e) { toast.error('JSON không hợp lệ'); } finally { setIsSavingFull(false); }
    };

    const previewItems = useMemo(() => {
        let currentItems = [...items];
        let currentMetadata = {};
        try { currentMetadata = JSON.parse(metadataText); } catch (e) { }
        if (editingItem) {
            currentItems = currentItems.map(i => i.id === editingItem.id ? { ...i, ...formData, metadata: currentMetadata } : i);
        } else if (formData.label) {
            currentItems.push({ id: 'temp', ...formData, metadata: currentMetadata });
        }
        return currentItems;
    }, [items, formData, editingItem, metadataText]);

    if (isLoading) return <div className="p-10 font-bold text-indigo-600 animate-pulse">SYNCHRONIZING SDUI...</div>;

    return (
        <div className="admin-dashboard flex h-screen overflow-hidden">
            <GoogleFont />

            {/* SIDEBAR */}
            <div className="w-60 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-black text-indigo-600 tracking-tighter italic">SDUI CONTROL</h1>
                </div>
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    {screens.map(s => (
                        <div
                            key={s.slug}
                            onClick={() => { setActiveScreenSlug(s.slug); handleReset(); }}
                            className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all ${activeScreenSlug === s.slug ? 'sidebar-item-active' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className="text-lg">{s.icon}</span>
                            <span className="text-[13px] font-bold">{s.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* TOOLBAR */}
                <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
                    <div className="flex gap-2">
                        {['builder', 'raw_full'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        {activeScreenSlug === 'goto_feed' && (
                            <button
                                onClick={() => {
                                    const content = window.prompt("Nhập nội dung bài viết mới cho nền tảng di động:");
                                    if (content) {
                                        axios.post('/api/v3/app/news-feed', { content }).then(() => {
                                            toast.success('Đã đăng bài lên Bảng tin thực tế! 🎉');
                                            axios.get('/api/v3/app/news-feed').then(res => setRealFeedData(res.data?.data?.posts || []));
                                        }).catch(() => toast.error('Lỗi khi đăng bài!'));
                                    }
                                }}
                                className="px-4 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-[900] hover:bg-amber-200 transition-all flex items-center gap-2 uppercase tracking-wide"
                            >
                                📝 TẠO BÀI (NEW)
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(fullRawJson);
                                const downloadAnchorNode = document.createElement('a');
                                downloadAnchorNode.setAttribute("href", dataStr);
                                downloadAnchorNode.setAttribute("download", `sdui_config_${activeScreenSlug}.json`);
                                document.body.appendChild(downloadAnchorNode);
                                downloadAnchorNode.click();
                                downloadAnchorNode.remove();
                                toast.success('Đã xuất file cấu hình! 📂');
                            }}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
                        >
                            XUẤT CONFIG (.json) 📥
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
                        <select className="bg-slate-100 border-none rounded-lg p-2 text-[11px] font-bold outline-none" value={deviceConfig.type} onChange={e => setDeviceConfig({ ...deviceConfig, type: e.target.value })}>
                            <option value="iphone_15_pro">iPhone 15 Pro</option>
                            <option value="iphone_14_island">iPhone 14 Island</option>
                            <option value="s24_ultra">S24 Ultra</option>
                        </select>
                        <button onClick={() => setDeviceConfig({ ...deviceConfig, orientation: deviceConfig.orientation === 'portrait' ? 'landscape' : 'portrait' })} className="p-2 bg-slate-100 rounded-lg text-lg hover:bg-slate-200">
                            {deviceConfig.orientation === 'portrait' ? '📱' : '📲'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-12 gap-10 items-start">

                        {/* LEFT: CONFIG OR RAW */}
                        <div className="col-span-12 lg:col-span-7 space-y-6">
                            {activeTab === 'builder' ? (
                                <>
                                    <div className="card-pro p-6 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Kinh kiện (Block)</label>
                                                <select className="input-pro w-full" value={formData.block_type} onChange={e => setFormData({ ...formData, block_type: e.target.value })}>
                                                    <option value="GridMenuBlock">Lưới Icon (Grid)</option>
                                                    <option value="ProfileHeaderBlock">Thẻ Profile</option>
                                                    <option value="PostComposerBlock">Trình đăng bài</option>
                                                    <option value="SocialFeedBlock">Bảng tin</option>
                                                    <option value="SummaryCardBlock">Thẻ tóm tắt</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Hành động</label>
                                                <select className="input-pro w-full" value={formData.action} onChange={e => setFormData({ ...formData, action: e.target.value })}>
                                                    <option value="NONE">Không có</option>
                                                    <option value="OPEN_APP_ATTENDANCE">📍 Chấm công</option>
                                                    <option value="OPEN_FEATURE_CHAT">💬 Chat Realtime</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Nhãn hiển thị</label>
                                            <input className="input-pro w-full" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} placeholder="Tên chức năng..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Icon Hệ thống</label>
                                                <select className="input-pro w-full font-black text-xs" value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })}>
                                                    <option value="ATTENDANCE">📍 Chấm công</option>
                                                    <option value="REPORT">📊 Báo cáo</option>
                                                    <option value="CHAT">💬 Trò chuyện</option>
                                                    <option value="CONTACT">👤 Danh bạ</option>
                                                    <option value="TASKS">✔️ Nhiệm vụ</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Màu sắc</label>
                                                <div className="flex items-center gap-3">
                                                    <input type="color" className="w-10 h-10 cursor-pointer" value={formData.bg_color} onChange={e => setFormData({ ...formData, bg_color: e.target.value })} />
                                                    <span className="text-[11px] font-mono text-slate-400">{formData.bg_color}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                                            <button onClick={handleReset} className="px-6 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200">Hủy</button>
                                            <button onClick={handleSave} className="btn-primary">CHỐT THIẾT KẾ 🚀</button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Linh kiện hiện có</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {items.map((item) => (
                                                <div key={item.id} onClick={() => handleEdit(item)} className="card-pro p-3 flex justify-between items-center group cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: item.bg_color }}>{item.icon === 'ATTENDANCE' ? '📍' : '📱'}</div>
                                                        <div>
                                                            <p className="text-[13px] font-bold text-slate-800 leading-none mb-1">{item.label}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.block_type}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={async (e) => { e.stopPropagation(); if (window.confirm('Xóa?')) { await axios.delete(`/api/v3/admin/app-ui/${item.id}`); refetch(); } }} className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all">🗑️</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="card-pro p-6 flex flex-col gap-6 h-[80vh]">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-black text-indigo-600">FULL SYSTEM JSON</h3>
                                        <button onClick={handleSaveFullRaw} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-emerald-700">GHI ĐÈ TẤT CẢ ⚠️</button>
                                    </div>
                                    <textarea className="flex-1 bg-slate-900 text-emerald-400 p-6 font-mono text-[13px] rounded-xl outline-none border-none custom-scrollbar" value={fullRawJson} onChange={e => setFullRawJson(e.target.value)} />
                                </div>
                            )}
                        </div>

                        {/* RIGHT: SIMULATOR */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col items-center">
                            <div className="sticky top-0 pt-4">
                                <MobilePreviewFrame
                                    items={previewItems}
                                    activeScreen={activeScreenSlug}
                                    deviceType={deviceConfig.type}
                                    orientation={deviceConfig.orientation}
                                    onItemClick={(item) => handleEdit(item)}
                                    onTabChange={(slug) => {
                                        setActiveScreenSlug(slug);
                                        handleReset();
                                    }}
                                    realFeedData={realFeedData}
                                />
                                <div className="mt-8 text-center space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REALITY ENGINE V4.0</p>
                                    <p className="text-[12px] font-bold text-slate-600">Syncing Live 100% with App Configuration</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

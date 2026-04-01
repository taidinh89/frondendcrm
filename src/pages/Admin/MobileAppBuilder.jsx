import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useApiData } from '../../hooks/useApiData';
import MobileScreenManager from './MobileScreenManager';
import MobileThemeManager from './MobileThemeManager';

// ─── CHUẨN VÀNG: Danh sách 8 Block được phép (đồng bộ với backkhoa.md Ch.8)
// NGHIÊM CẤM thêm block ngoài danh sách này vào App Builder!
const ALLOWED_BLOCKS = [
    { type: 'BannerBlock', label: 'Banner Tiêu Đề', color: 'blue', icon: '🖼️' },
    { type: 'GridMenuBlock', label: 'Menu Lưới (Grid)', color: 'purple', icon: '⊞' },
    { type: 'SummaryCardBlock', label: 'Thẻ Tóm Tắt (KPI)', color: 'green', icon: '📊' },
    { type: 'ProfileHeaderBlock', label: 'Header Hồ Sơ', color: 'orange', icon: '👤' },
    { type: 'SocialFeedBlock', label: 'Mạng Xã Hội', color: 'pink', icon: '💬' },
    { type: 'TaskBoardBlock', label: 'Bảng Công Việc', color: 'indigo', icon: '📋' },
    { type: 'GpsBlock', label: 'Check-in GPS', color: 'red', icon: '📍' },
    { type: 'ListGroupBlock', label: 'Danh Sách Nhóm', color: 'teal', icon: '☰' },
];

const BLOCK_COLOR_MAP = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
};

// --- 1. COMPONENT THANH DEBUG PHIÊN BẢN (MỚI) ---
const VersionDebugBar = ({ timestamp, itemCount }) => {
    const [flash, setFlash] = useState(false);

    // Hiệu ứng nháy xanh khi timestamp thay đổi (Có bản update)
    useEffect(() => {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 2000);
        return () => clearTimeout(timer);
    }, [timestamp]);

    // Format thời gian từ timestamp (UNIX)
    const timeStr = timestamp
        ? new Date(timestamp * 1000).toLocaleTimeString('vi-VN')
        : 'N/A';

    const dateStr = timestamp
        ? new Date(timestamp * 1000).toLocaleDateString('vi-VN')
        : '';

    return (
        <div className={`absolute bottom-4 left-4 right-4 p-2 rounded-lg backdrop-blur-md border shadow-lg transition-all duration-500 z-50 flex items-center justify-between
            ${flash ? 'bg-green-500/90 border-green-400 scale-105' : 'bg-black/80 border-gray-700 scale-100'}
        `}>
            <div>
                <div className={`text-[10px] font-bold uppercase mb-0.5 ${flash ? 'text-white' : 'text-gray-400'}`}>
                    {flash ? '🚀 JUST UPDATED' : 'CLIENT VERSION'}
                </div>
                <div className={`text-xs font-mono font-bold ${flash ? 'text-white' : 'text-green-400'}`}>
                    v.{timestamp}
                </div>
            </div>
            <div className="text-right">
                <div className={`text-[10px] ${flash ? 'text-white' : 'text-gray-300'}`}>{timeStr}</div>
                <div className={`text-[9px] ${flash ? 'text-green-100' : 'text-gray-500'}`}>{itemCount} Blocks</div>
            </div>
        </div>
    );
};

// --- 2. COMPONENT MÔ PHỎNG ĐIỆN THOẠI (SIMULATOR) ---
const AppSimulator = ({ layoutJson, screensMap, forceKey, versionMeta }) => {

    // Helper render
    const renderBlock = (block, index) => {
        const type = block.type || (block.screen_key ? (screensMap[block.screen_key]?.type) : null);
        const screen = block.screen_key ? screensMap[block.screen_key] : null;

        // 1. Grid Menu Rendering
        if (type === 'GridMenuBlock' || type === 'GRID_MENU') {
            const items = block.data?.items_keys || [];
            return (
                <div className="grid grid-cols-2 gap-2 p-2">
                    {items.map(key => {
                        const btn = screensMap[key];
                        if (!btn) return <div key={key} className="bg-gray-100 p-2 text-[10px] rounded border-dashed border">? {key}</div>;
                        return (
                            <div key={key} className="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center aspect-[4/3] border border-gray-100">
                                {btn.icon_url ? <img src={btn.icon_url} className="w-8 h-8 mb-2 object-contain" alt="" /> : <div className="w-8 h-8 bg-blue-50 rounded-full mb-2 flex items-center justify-center text-xs text-blue-600">Icon</div>}
                                <span className="text-[10px] text-center font-bold text-gray-700">{btn.label}</span>
                            </div>
                        )
                    })}
                </div>
            );
        }

        // 2. Banner Block Rendering
        if (type === 'BannerBlock' || type === 'HEADER_BANNER') {
            return (
                <div className="p-4 text-white rounded-b-xl mb-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: screen?.ui_config?.bg_color || '#007AFF' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">⦿</div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs backdrop-blur-sm border border-white/30">IMG</div>
                        <div>
                            <div className="font-bold text-sm tracking-tight">{block.label || screen?.label || 'Banner'}</div>
                            <div className="text-[10px] opacity-80">Thông tin chi tiết...</div>
                        </div>
                    </div>
                </div>
            );
        }

        // 3. Summary Card Rendering
        if (type === 'SummaryCardBlock' || type === 'STATS_CARD') {
            return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2 mx-2 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-1 h-full bg-blue-500"></div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{block.label || screen?.label || 'Sơ lược'}</div>
                        <div className="text-base font-bold text-gray-800">{screen?.ui_config?.value || '15.000.000'}</div>
                    </div>
                    <div className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600">▲ 12%</div>
                </div>
            );
        }

        // 4. Profile Header Rendering
        if (type === 'ProfileHeaderBlock') {
            return (
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded mb-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">👤</div>
                    <div>
                        <div className="font-bold text-sm">Xin chào, Nhân viên QVC</div>
                        <div className="text-[10px] opacity-80">QVC Technology Co., Ltd</div>
                    </div>
                </div>
            );
        }

        // 5. Social Feed Rendering
        if (type === 'SocialFeedBlock') {
            return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2 mx-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center text-xs">💬</div>
                        <div className="text-xs font-bold text-gray-700">Bảng tin nội bộ</div>
                    </div>
                    <div className="h-12 bg-gray-50 rounded flex items-center justify-center text-[10px] text-gray-400">Loading posts...</div>
                </div>
            );
        }

        // 6. Task Board Rendering
        if (type === 'TaskBoardBlock') {
            return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 mb-2 mx-2">
                    <div className="text-[10px] font-bold text-indigo-600 mb-2">📋 BẢNG CÔNG VIỆC (KANBAN)</div>
                    <div className="grid grid-cols-2 gap-1">
                        {['Mới tạo', 'Đang làm'].map(col => (
                            <div key={col} className="bg-indigo-50 rounded p-2">
                                <div className="text-[9px] font-bold text-indigo-500 mb-1">{col}</div>
                                <div className="bg-white rounded text-[9px] p-1 shadow-sm">Task ví dụ...</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // 7. GPS Block Rendering
        if (type === 'GpsBlock') {
            return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-red-100 mb-2 mx-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm">📍</div>
                        <div>
                            <div className="text-xs font-bold text-gray-800">Check-in Sinh Trắc (GPS)</div>
                            <div className="text-[10px] text-gray-500">Bấm để chấm công ngay bây giờ</div>
                        </div>
                    </div>
                </div>
            );
        }

        // 8. List Group Rendering
        if (type === 'ListGroupBlock') {
            return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2 mx-2">
                    <div className="text-[10px] font-bold text-gray-500 mb-2">☰ DANH SÁCH NHÓM</div>
                    {['Mục 1', 'Mục 2', 'Mục 3'].map(item => (
                        <div key={item} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-[10px] text-gray-700">{item}</span>
                            <span className="text-gray-300 text-xs">›</span>
                        </div>
                    ))}
                </div>
            );
        }

        return <div className="p-2 bg-gray-100 text-[10px] text-center mb-1 border border-dashed border-gray-300 rounded mx-4 italic text-gray-400">Khối: {type}</div>;
    };

    return (
        <div className="relative mx-auto border-gray-900 bg-gray-900 border-[10px] rounded-[3rem] h-[650px] w-[320px] shadow-2xl transition-all duration-300 ring-4 ring-gray-200">
            {/* Tai thỏ */}
            <div className="w-[120px] h-[25px] bg-gray-900 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>

            {/* Màn hình */}
            <div className="h-full w-full bg-[#F2F2F7] rounded-[2.2rem] overflow-hidden pt-8 relative flex flex-col">

                {/* Status Bar Fake */}
                <div className="absolute top-2 right-6 text-[10px] font-bold text-black z-20 flex gap-1">
                    <span>5G</span> <span>100%</span>
                </div>

                {/* Nội dung chính */}
                <div key={forceKey} className="flex-1 overflow-y-auto pb-20 custom-scrollbar animate-fadeIn">
                    {layoutJson.map((block, idx) => (
                        <div key={idx} className="relative group hover:scale-[0.98] transition-transform duration-200 cursor-default">
                            {renderBlock(block, idx)}
                        </div>
                    ))}
                    {layoutJson.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                            <div className="text-4xl mb-2">📱</div>
                            <div className="text-xs">Chưa có nội dung</div>
                        </div>
                    )}
                </div>

                {/* --- THANH DEBUG PHIÊN BẢN (MỚI) --- */}
                <VersionDebugBar
                    timestamp={versionMeta?.updated_at}
                    itemCount={layoutJson.length}
                />
            </div>

            {/* Nút Home ảo */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full opacity-50"></div>
        </div>
    );
};

// --- 3. EDITOR TRỰC QUAN (VISUAL EDITOR) ---
const VisualEditor = ({ layout, setLayout, screensMap }) => {
    // Helper: Di chuyển vị trí
    const move = (idx, direction) => {
        const newLayout = [...layout];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newLayout.length) return;
        [newLayout[idx], newLayout[targetIdx]] = [newLayout[targetIdx], newLayout[idx]];
        setLayout(newLayout);
    };

    // Helper: Xóa
    const remove = (idx) => {
        if (!window.confirm('Xóa khối này khỏi giao diện?')) return;
        setLayout(layout.filter((_, i) => i !== idx));
    };

    // Helper: Thêm mới
    const addBlock = (type, screenKey = null) => {
        let newBlock = {};
        if (screenKey) {
            newBlock = { type, screen_key: screenKey };
        } else if (type === 'GridMenuBlock') {
            newBlock = { type: 'GridMenuBlock', data: { columns: 2, items_keys: [] } };
        } else {
            newBlock = { type }; // For BannerBlock, SummaryCardBlock
        }
        setLayout([...layout, newBlock]);
    };

    // Helper: Sửa items trong Menu Lưới
    const toggleMenuItem = (blockIndex, itemKey) => {
        const newLayout = [...layout];
        const block = { ...newLayout[blockIndex] };
        if (!block.data) block.data = { items_keys: [] };

        const keys = block.data.items_keys || [];
        if (keys.includes(itemKey)) {
            block.data.items_keys = keys.filter(k => k !== itemKey);
        } else {
            block.data.items_keys = [...keys, itemKey];
        }

        newLayout[blockIndex] = block;
        setLayout(newLayout);
    };

    // [V9.0] Dùng ALLOWED_BLOCKS thay vì hard-code từng button
    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* DANH SÁCH BLOCK ĐANG CÓ */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar p-1">
                {layout.map((block, idx) => {
                    const screen = block.screen_key ? screensMap[block.screen_key] : null;
                    const blockDef = ALLOWED_BLOCKS.find(b => b.type === block.type);
                    const label = screen ? screen.label : (blockDef?.label || block.type);
                    const colorClass = BLOCK_COLOR_MAP[blockDef?.color || 'blue'] || 'bg-white border-gray-200';

                    return (
                        <div key={idx} className={`p-3 rounded-lg border ${colorClass} shadow-sm group relative hover:shadow-md transition-all`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-200 w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-gray-600">{idx + 1}</div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{blockDef?.icon} {label}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">{block.type}</div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30">⬆</button>
                                    <button onClick={() => move(idx, 1)} disabled={idx === layout.length - 1} className="p-1 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30">⬇</button>
                                    <button onClick={() => remove(idx)} className="p-1 hover:bg-red-100 rounded text-red-500">✕</button>
                                </div>
                            </div>

                            {/* CẤU HÌNH RIÊNG CHO MENU LƯỚI */}
                            {block.type === 'GridMenuBlock' && (
                                <div className="mt-2 pt-2 border-t border-gray-200 animate-fadeIn bg-white/50 p-2 rounded">
                                    <div className="text-[10px] font-bold text-gray-500 mb-2">CHỌN NÚT HIỂN THỊ:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableScreens.filter(s => s.type === 'GRID_ITEM' || s.type === 'WEBVIEW').map(s => (
                                            <button
                                                key={s.key}
                                                onClick={() => toggleMenuItem(idx, s.key)}
                                                className={`px-2 py-1 text-[10px] rounded border transition-colors flex items-center gap-1 ${block.data?.items_keys?.includes(s.key) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {block.data?.items_keys?.includes(s.key) && <span>✓</span>}
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* THANH CÔNG CỤ THÊM MỚI — dùng ALLOWED_BLOCKS (V9.0) */}
            <div className="pt-4 border-t mt-2 -mx-4 px-4 pb-4">
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Thêm Block Chính Thức (V9.0 — 8 Block)
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {ALLOWED_BLOCKS.map(blockDef => (
                        <button
                            key={blockDef.type}
                            onClick={() => addBlock(blockDef.type)}
                            className={`flex items-center gap-2 p-3 border rounded-lg text-xs font-bold text-left transition-all shadow-sm hover:shadow ${BLOCK_COLOR_MAP[blockDef.color]} hover:opacity-90`}
                        >
                            <span className="text-xl">{blockDef.icon}</span>
                            <div>
                                <div>{blockDef.label}</div>
                                <div className="text-[9px] opacity-60 font-mono">{blockDef.type}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- 4. TRANG QUẢN TRỊ CHÍNH ---
export default function MobileAppBuilder() {
    const [activeTab, setActiveTab] = useState('LAYOUT');

    // API Data
    const { data: layoutsRaw, refetch: reloadLayouts } = useApiData('/api/v3/admin/mobile-layouts');
    const { data: screensRaw, refetch: reloadScreens } = useApiData('/api/v3/admin/mobile-layouts/preview/screens');
    const { data: appConfigRaw, refetch: reloadConfig } = useApiData('/api/v3/admin/app-versions');

    // Xử lý Data
    const layouts = Array.isArray(layoutsRaw) ? layoutsRaw : (layoutsRaw?.data || []);
    const screensMap = screensRaw || {};
    const appConfig = appConfigRaw?.data?.settings || {};
    const metaInfo = appConfigRaw?.data?.meta || {};

    // State
    const [selectedLayoutId, setSelectedLayoutId] = useState(null);
    const [layoutData, setLayoutData] = useState([]);
    const [forceRender, setForceRender] = useState(0);
    const [configForm, setConfigForm] = useState({});

    // [MỚI] State lưu version meta để hiện thị lên Simulator
    const [currentVersionMeta, setCurrentVersionMeta] = useState(null);

    // Chọn layout mặc định
    useEffect(() => {
        if (layouts.length > 0 && !selectedLayoutId) {
            setSelectedLayoutId(layouts[0].id);
        }
    }, [layouts]);

    // Load Data Layout
    useEffect(() => {
        if (selectedLayoutId && layouts.length > 0) {
            const layout = layouts.find(l => l.id == selectedLayoutId);
            if (layout) {
                const parsed = typeof layout.layout_json === 'string' ? JSON.parse(layout.layout_json) : layout.layout_json;
                setLayoutData(Array.isArray(parsed) ? parsed : []);
                setCurrentVersionMeta(layout.version_meta); // Lưu version meta
                setForceRender(Date.now());
            }
        }
    }, [selectedLayoutId, layouts]);

    useEffect(() => { setForceRender(Date.now()); }, [layoutData]);
    useEffect(() => { if (appConfig) setConfigForm(appConfig); }, [appConfig]);

    const handleSaveLayout = async () => {
        // Tìm layout đang chọn để lấy slug
        const currentLayout = layouts.find(l => l.id == selectedLayoutId);

        try {
            await axios.put(`/api/v3/admin/mobile-layouts/${selectedLayoutId}`, {
                layout_json: layoutData,
                is_active: true
            });

            // [V9.0]: Auto-broadcast UI.Invalidate sau khi save layout
            // Mobile App sẽ nhận event và refetch đúng màn hình qua useGlobalSocket
            try {
                await axios.post('/api/v3/admin/app-versions/invalidate-ui', {
                    screen_slug: currentLayout?.slug || null,
                });
            } catch (broadcastErr) {
                // Không block nếu broadcast fail — layout vẫn được lưu
                console.warn('[MobileAppBuilder] Broadcast UI.Invalidate failed (non-critical):', broadcastErr);
            }

            toast.success('Đã lưu & Gửi cập nhật giao diện tới App theo thời gian thực! 🚀');
            reloadLayouts();
        } catch (e) { toast.error('Lỗi lưu: ' + e.message); }
    };

    const handleSaveConfig = async () => {
        try {
            await axios.post('/api/v3/admin/app-versions', configForm);
            toast.success('Đã cập nhật cấu hình & Đồng bộ Socket!');
            reloadConfig();
        } catch (e) { toast.error('Lỗi lưu cấu hình'); }
    };

    const handleForcePush = async () => {
        if (!window.confirm('Cưỡng chế toàn bộ App đang mở tải lại giao diện ngay lập tức?')) return;
        try {
            await axios.post('/api/v2/security/app-versions/force-push');
            toast.success('Đã gửi lệnh Force Push qua Socket!');
            reloadConfig();
        } catch (e) { toast.error('Lỗi gửi lệnh Force Push'); }
    };

    return (
        <div className="p-6 min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden font-inter">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mobile App Builder</h1>
                    <p className="text-xs text-gray-500">Xây dựng giao diện App động (Server-Driven UI)</p>
                </div>
                <div className="bg-white p-1 rounded-lg shadow border flex">
                    {['SCREEN', 'LAYOUT', 'THEME', 'CONFIG'].map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'LAYOUT') reloadScreens(); }}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                            {tab === 'SCREEN' ? '1. Linh Kiện' : tab === 'LAYOUT' ? '2. Bố Cục & Preview' : tab === 'THEME' ? '3. Giao diện (Theme)' : '4. Cấu Hình App'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow border border-gray-200">
                {/* TAB 1 */}
                {activeTab === 'SCREEN' && <div className="h-full overflow-y-auto"><MobileScreenManager /></div>}

                {/* TAB 2: EDITOR */}
                {activeTab === 'LAYOUT' && (
                    <div className="flex h-full">
                        {/* Cột Trái */}
                        <div className="flex-1 p-4 flex flex-col border-r border-gray-200 max-w-xl bg-white">
                            <div className="flex justify-between mb-4 pb-4 border-b items-center">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-500">Layout:</label>
                                    <select className="border p-2 rounded text-sm font-bold bg-gray-50 min-w-[200px] outline-none focus:ring-2 ring-blue-500"
                                        value={selectedLayoutId || ''} onChange={e => setSelectedLayoutId(e.target.value)}>
                                        {layouts.map(l => (
                                            <option key={l.id} value={l.id}>{l.name} ({l.role_id ? l.role?.name : 'Mặc định'})</option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={handleSaveLayout} className="bg-green-600 text-white px-5 py-2 rounded text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-2 active:scale-95 transition-transform">
                                    <span>💾</span> Lưu & Publish
                                </button>
                            </div>

                            <VisualEditor layout={layoutData} setLayout={setLayoutData} screensMap={screensMap} />
                        </div>

                        {/* Cột Phải */}
                        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 relative bg-dot-pattern">
                            <div className="absolute top-4 right-4 text-xs text-gray-400 font-mono">
                                Live Preview Simulator
                            </div>
                            <AppSimulator
                                layoutJson={layoutData}
                                screensMap={screensMap}
                                forceKey={forceRender}
                                versionMeta={currentVersionMeta} // [MỚI] Truyền version vào để hiển thị
                            />
                        </div>
                    </div>
                )}

                {/* TAB 3 */}
                {activeTab === 'THEME' && <div className="h-full p-4 overflow-y-auto"><MobileThemeManager /></div>}

                {/* TAB 4: CONTROL CENTER */}
                {activeTab === 'CONFIG' && (
                    <div className="max-w-4xl mx-auto p-8 h-full overflow-y-auto bg-gray-50/30">
                        {/* 1. DASHBOARD OVERVIEW */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">SDUI Version</div>
                                <div className="text-xl font-mono font-bold text-blue-600">{metaInfo.sdui_version || 'v8.0.0'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Layout Hash</div>
                                <div className="text-sm font-mono font-bold text-gray-800 truncate" title={metaInfo.layout_hash}>{metaInfo.layout_hash || 'N/A'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Sync (Realtime)</div>
                                <div className="text-xs font-bold text-green-600">{metaInfo.last_sync || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 2. CHẾ ĐỘ BẢO TRÌ */}
                            <div className="bg-white border rounded-xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6 border-b pb-2">
                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        Bảo Trì Hệ Thống (Maintenance)
                                    </h3>
                                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" name="toggle" id="toggle"
                                            checked={configForm.maintenance_mode === "1"}
                                            onChange={e => setConfigForm({ ...configForm, maintenance_mode: e.target.checked ? "1" : "0" })}
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer outline-none" />
                                        <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${configForm.maintenance_mode === "1" ? 'bg-red-400' : 'bg-gray-300'}`}></label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">THÔNG BÁO BẢO TRÌ</label>
                                        <textarea
                                            className="w-full border p-3 rounded-lg text-sm bg-gray-50 h-24 focus:ring-2 ring-red-100 outline-none"
                                            placeholder="Nhập nội dung thông báo khi bảo trì..."
                                            value={configForm.maintenance_message || ''}
                                            onChange={e => setConfigForm({ ...configForm, maintenance_message: e.target.value })}
                                        />
                                    </div>
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-600 leading-relaxed">
                                        <b>Lưu ý:</b> Khi bật chế độ này, toàn bộ App sẽ bị khóa và hiển thị nội dung thông báo trên. Người dùng sẽ không thể thao tác bất kỳ tính năng nào.
                                    </div>
                                </div>
                            </div>

                            {/* 3. ĐIỀU KHIỂN CHIẾN LƯỢC & REQUIREMENTS */}
                            <div className="space-y-6">
                                <div className="bg-white border rounded-xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold mb-4 border-b pb-2">Phiên Bản Tối Thiểu</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-1">MIN IOS</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm font-mono"
                                                value={configForm.min_ios_version || ''}
                                                onChange={e => setConfigForm({ ...configForm, min_ios_version: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-1">MIN ANDROID</label>
                                            <input type="text" className="w-full border p-2 rounded text-sm font-mono"
                                                value={configForm.min_android_version || ''}
                                                onChange={e => setConfigForm({ ...configForm, min_android_version: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border rounded-xl p-6 shadow-sm border-blue-100">
                                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-blue-700">
                                        <span>⚡</span> Quick Actions
                                    </h3>
                                    <div className="space-y-3">
                                        <button onClick={handleSaveConfig} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200">
                                            Lưu & Đồng Bộ Ngay
                                        </button>
                                        <button onClick={handleForcePush} className="w-full bg-white border-2 border-orange-400 text-orange-500 py-3 rounded-lg font-bold hover:bg-orange-50 transition-all active:scale-[0.98]">
                                            Cưỡng Chế Làm Mới Toàn Hệ Thống
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
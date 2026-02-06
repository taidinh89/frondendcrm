import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useApiData } from '../../hooks/useApiData';
import MobileScreenManager from './MobileScreenManager';
import MobileThemeManager from './MobileThemeManager';

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
        // A. Block tham chiếu (Dùng Screen Key)
        if (block.screen_key) {
            const screen = screensMap[block.screen_key];
            if (!screen) return <div className="p-2 bg-red-50 text-[10px] text-red-500 border border-red-200 mb-2 rounded border-dashed">⚠ Missing: {block.screen_key}</div>;

            if (screen.type === 'HEADER_BANNER') return (
                <div className="p-4 text-white rounded-b-xl mb-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: screen.ui_config?.bg_color || '#007AFF' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">⦿</div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs backdrop-blur-sm border border-white/30">IMG</div>
                        <div>
                            <div className="font-bold text-sm">{screen.ui_config?.title || screen.label}</div>
                            <div className="text-[10px] opacity-80">Chức vụ...</div>
                        </div>
                    </div>
                </div>
            );
            if (screen.type === 'STATS_CARD') return (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2 mx-2 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-1 h-full bg-blue-500"></div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{screen.label}</div>
                        <div className="text-base font-bold text-gray-800">{screen.ui_config?.value || '15.000.000'}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${screen.ui_config?.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {screen.ui_config?.trend === 'up' ? '▲ 12%' : '▼ 5%'}
                    </div>
                </div>
            );
        }

        // B. Block Menu Lưới (Grid Menu)
        if (block.type === 'GRID_MENU' && block.data?.items_keys) {
            return (
                <div className="grid grid-cols-2 gap-2 p-2">
                    {block.data.items_keys.map(key => {
                        const btn = screensMap[key];
                        if (!btn) return <div key={key} className="bg-gray-100 p-2 text-[10px] rounded border-dashed border">? {key}</div>;
                        return (
                            <div key={key} className="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center aspect-[4/3] border border-gray-100 hover:border-blue-300 transition-colors">
                                {btn.icon_url ? <img src={btn.icon_url} className="w-8 h-8 mb-2 object-contain" alt="" /> : <div className="w-8 h-8 bg-blue-50 rounded-full mb-2 flex items-center justify-center text-xs text-blue-600">Icon</div>}
                                <span className="text-[10px] text-center font-bold text-gray-700">{btn.label}</span>
                                {btn.sub_label && <span className="text-[8px] text-gray-400">{btn.sub_label}</span>}
                            </div>
                        )
                    })}
                </div>
            )
        }

        return <div className="p-2 bg-gray-100 text-[10px] text-center mb-1 border border-dashed border-gray-300 rounded">Block: {block.type}</div>;
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
        } else if (type === 'GRID_MENU') {
            newBlock = { type: 'GRID_MENU', data: { columns: 2, items_keys: [] } };
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

    const availableScreens = Object.values(screensMap || {});

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* DANH SÁCH BLOCK ĐANG CÓ */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar p-1">
                {layout.map((block, idx) => {
                    const screen = block.screen_key ? screensMap[block.screen_key] : null;
                    const label = screen ? screen.label : (block.type === 'GRID_MENU' ? 'Menu Lưới (Grid)' : block.type);
                    const color = block.type === 'HEADER_BANNER' ? 'bg-blue-50 border-blue-200' :
                        block.type === 'GRID_MENU' ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200';

                    return (
                        <div key={idx} className={`p-3 rounded-lg border ${color} shadow-sm group relative hover:shadow-md transition-all`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-200 w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-gray-600">{idx + 1}</div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{label}</div>
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
                            {block.type === 'GRID_MENU' && (
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

            {/* THANH CÔNG CỤ THÊM MỚI */}
            <div className="pt-4 border-t mt-2 -mx-4 px-4 pb-4">
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Thêm Component vào Layout
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addBlock('GRID_MENU')} className="flex items-center gap-2 p-3 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 text-xs font-bold text-left transition-all shadow-sm hover:shadow">
                        <span className="text-xl bg-purple-200 w-6 h-6 rounded flex items-center justify-center">+</span>
                        Menu Lưới (Grid)
                    </button>

                    {availableScreens.filter(s => s.type !== 'GRID_ITEM').map(s => (
                        <button key={s.key} onClick={() => addBlock(s.type, s.key)} className="flex items-center gap-2 p-3 border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 rounded-lg text-gray-700 text-xs text-left truncate transition-all shadow-sm hover:shadow">
                            <span className="text-xl font-bold text-blue-500 bg-blue-100 w-6 h-6 rounded flex items-center justify-center">+</span>
                            <div className="truncate">
                                <div className="font-bold">{s.label || s.key}</div>
                                <div className="text-[9px] text-gray-400">{s.type}</div>
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
    const { data: layoutsRaw, refetch: reloadLayouts } = useApiData('/api/v2/security/mobile-layouts');
    const { data: screensRaw, refetch: reloadScreens } = useApiData('/api/v2/security/mobile-layouts/preview/screens');
    const { data: appConfigRaw, refetch: reloadConfig } = useApiData('/api/v2/security/app-versions');

    // Xử lý Data
    const layouts = Array.isArray(layoutsRaw) ? layoutsRaw : (layoutsRaw?.data || []);
    const screensMap = screensRaw || {};
    const appConfig = appConfigRaw || {};

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
        try {
            await axios.put(`/api/v2/security/mobile-layouts/${selectedLayoutId}`, {
                layout_json: layoutData,
                is_active: true
            });
            toast.success('Đã lưu & Cập nhật App!');
            reloadLayouts(); // Khi reload, useEffect sẽ chạy lại và cập nhật currentVersionMeta mới từ server
        } catch (e) { toast.error('Lỗi lưu: ' + e.message); }
    };

    const handleSaveConfig = async () => {
        try {
            await axios.post('/api/v2/security/app-versions', configForm);
            toast.success('Đã cập nhật cấu hình!');
            reloadConfig();
        } catch (e) { toast.error('Lỗi lưu cấu hình'); }
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

                {/* TAB 4 */}
                {activeTab === 'CONFIG' && (
                    <div className="max-w-3xl mx-auto p-8 h-full overflow-y-auto">
                        <div className="bg-white border rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 border-b pb-2">Cấu Hình Phiên Bản App</h3>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">iOS Min Version</label>
                                    <input type="text" className="w-full border p-2 rounded"
                                        value={configForm.min_ios_version || ''}
                                        onChange={e => setConfigForm({ ...configForm, min_ios_version: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Android Min Version</label>
                                    <input type="text" className="w-full border p-2 rounded"
                                        value={configForm.min_android_version || ''}
                                        onChange={e => setConfigForm({ ...configForm, min_android_version: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button onClick={handleSaveConfig} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">Cập nhật Cấu hình</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
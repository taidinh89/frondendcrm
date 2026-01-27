import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

// Dữ liệu giả lập (Hardcode tại Frontend để test giao diện trước)
const MOCK_THEMES = [
    {
        id: 1,
        key: 'default',
        name: 'Mặc định (Xanh Quốc Việt)',
        is_default: true,
        colors: {
            primary: '#007AFF',
            secondary: '#5AC8FA',
            background: '#F2F2F7',
            card: '#FFFFFF',
            text: '#000000',
            success: '#34C759',
            error: '#FF3B30'
        }
    },
    {
        id: 2,
        key: 'tet_holiday',
        name: 'Tết Nguyên Đán (Đỏ)',
        is_default: false,
        colors: {
            primary: '#D32F2F',
            secondary: '#FFD700',
            background: '#FFF5F5',
            card: '#FFFFFF',
            text: '#212121',
            success: '#4CAF50',
            error: '#B71C1C'
        }
    },
    {
        id: 3,
        key: 'dark_mode',
        name: 'Giao diện Tối (Dark)',
        is_default: false,
        colors: {
            primary: '#0A84FF',
            secondary: '#5E5CE6',
            background: '#000000',
            card: '#1C1C1E',
            text: '#FFFFFF',
            success: '#30D158',
            error: '#FF453A'
        }
    }
];

export default function MobileThemeManager() {
    const [themes, setThemes] = useState(MOCK_THEMES);
    const [selectedId, setSelectedId] = useState(1);

    const activeTheme = themes.find(t => t.id === selectedId);

    const updateColor = (key, value) => {
        const newThemes = themes.map(t => {
            if (t.id === selectedId) {
                return { ...t, colors: { ...t.colors, [key]: value } };
            }
            return t;
        });
        setThemes(newThemes);
    };

    const handleSave = () => {
        // Sau này sẽ gọi API: axios.post('/api/mobile-themes', activeTheme)
        console.log("Saving Theme:", activeTheme);
        toast.success(`Đã lưu cấu hình theme: ${activeTheme.name} (Giả lập)`);
    };

    return (
        <div className="flex h-full gap-6">
            {/* DANH SÁCH THEME (BÊN TRÁI) */}
            <div className="w-1/3 border-r pr-4 flex flex-col gap-3">
                <h3 className="font-bold text-gray-700 mb-2">Danh sách Giao diện</h3>
                {themes.map(theme => (
                    <div 
                        key={theme.id}
                        onClick={() => setSelectedId(theme.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${theme.id === selectedId ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border shadow-sm" style={{ backgroundColor: theme.colors.primary }}></div>
                            <div>
                                <div className="font-bold text-sm text-gray-800">{theme.name}</div>
                                <div className="text-[10px] text-gray-500">Key: {theme.key}</div>
                            </div>
                        </div>
                        {theme.is_default && <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">Default</span>}
                    </div>
                ))}
                
                <button className="mt-4 w-full py-2 border border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50 text-sm">
                    + Thêm Giao diện mới
                </button>
            </div>

            {/* EDITOR MÀU SẮC (BÊN PHẢI) */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTheme && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Chỉnh sửa màu sắc</h2>
                                <p className="text-sm text-gray-500">Thay đổi mã màu cho giao diện "{activeTheme.name}"</p>
                            </div>
                            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors">
                                Lưu Thay Đổi
                            </button>
                        </div>

                        {/* Bảng chọn màu */}
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(activeTheme.colors).map(([colorKey, colorValue]) => (
                                <div key={colorKey} className="bg-white p-3 rounded-lg border shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">{colorKey}</label>
                                        <span className="text-xs font-mono text-gray-400">{colorValue}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <input 
                                            type="color" 
                                            value={colorValue} 
                                            onChange={(e) => updateColor(colorKey, e.target.value)}
                                            className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                                        />
                                        <input 
                                            type="text" 
                                            value={colorValue}
                                            onChange={(e) => updateColor(colorKey, e.target.value)}
                                            className="flex-1 border rounded px-2 text-sm font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Preview Nhanh */}
                        <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: activeTheme.colors.background }}>
                            <h4 className="text-sm font-bold mb-3" style={{ color: activeTheme.colors.text }}>Preview nhanh trên App</h4>
                            <div className="p-4 rounded-lg shadow-sm mb-3" style={{ backgroundColor: activeTheme.colors.primary, color: '#FFF' }}>
                                Header Banner (Primary Color)
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 p-4 rounded-lg shadow-sm border" style={{ backgroundColor: activeTheme.colors.card }}>
                                    <div style={{ color: activeTheme.colors.text }}>Card Title</div>
                                    <div style={{ color: activeTheme.colors.secondary }}>Secondary Text</div>
                                </div>
                                <div className="flex-1 p-4 rounded-lg shadow-sm border" style={{ backgroundColor: activeTheme.colors.card }}>
                                    <div style={{ color: activeTheme.colors.error }}>Error Text</div>
                                    <div style={{ color: activeTheme.colors.success }}>Success Text</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
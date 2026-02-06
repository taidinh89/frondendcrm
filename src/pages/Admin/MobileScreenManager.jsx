import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useApiData } from '../../hooks/useApiData';

// --- CẤU HÌNH CONSTANTS ---
const TYPE_OPTIONS = ['GRID_ITEM', 'HEADER_BANNER', 'STATS_CARD', 'GRID_MENU'];
const ACTION_TYPES = ['NATIVE_SCREEN', 'WEBVIEW', 'LINK', 'API_CALL'];

// Danh sách các nghiệp vụ Backend hỗ trợ (ProcessActionController)
const REF_TYPES = [
    { value: 'AVATAR', label: 'Cập nhật Avatar' },
    { value: 'ATTENDANCE', label: 'Chấm công (GPS + Ảnh)' },
    { value: 'VISIT', label: 'Check-in Khách hàng' },
    { value: 'ORDER', label: 'Bằng chứng Giao hàng' }
];

// --- COMPONENT CON: FORM CẤU HÌNH HÀNH ĐỘNG (THÔNG MINH) ---
const ActionConfigForm = ({ configJson, onChange }) => {
    const [mode, setMode] = useState('JSON'); // JSON | GUI
    const [data, setData] = useState({
        mode: 'UPLOAD',
        endpoint: '/api/app/action/process-photo',
        require_gps: false,
        instruction: '',
        payload: { ref_type: 'AVATAR' }
    });

    // Parse JSON khi component mount
    useEffect(() => {
        try {
            const parsed = configJson ? JSON.parse(configJson) : {};
            if (parsed.mode) {
                setData({
                    ...data,
                    ...parsed,
                    payload: { ...data.payload, ...parsed.payload }
                });
                setMode('GUI'); // Nếu detect đúng format thì chuyển sang GUI
            }
        } catch (e) { }
    }, []);

    // Cập nhật ngược lại cha khi data đổi
    const updateParent = (newData) => {
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    if (mode === 'JSON') {
        return (
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500">Cấu hình JSON (Nâng cao)</label>
                    <button type="button" onClick={() => setMode('GUI')} className="text-xs text-blue-600 hover:underline">Chuyển sang Giao diện</button>
                </div>
                <textarea
                    className="w-full border rounded p-2 text-xs font-mono h-32 bg-gray-900 text-green-400"
                    value={configJson}
                    onChange={e => onChange(e.target.value)}
                    placeholder='{"mode": "UPLOAD", ...}'
                />
            </div>
        );
    }

    return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex justify-between mb-3 border-b border-blue-200 pb-2">
                <label className="text-xs font-bold text-blue-700 uppercase">Cấu hình Nghiệp vụ (Process Action)</label>
                <button type="button" onClick={() => setMode('JSON')} className="text-xs text-gray-500 hover:underline">Sửa JSON thô</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Loại Nghiệp vụ (Ref Type)</label>
                    <select
                        className="w-full border rounded p-1.5 text-xs bg-white"
                        value={data.payload?.ref_type}
                        onChange={e => updateParent({ ...data, payload: { ...data.payload, ref_type: e.target.value } })}
                    >
                        {REF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Câu nhắc (Instruction)</label>
                    <input
                        type="text"
                        className="w-full border rounded p-1.5 text-xs"
                        placeholder="VD: Chụp ảnh mặt trước..."
                        value={data.instruction}
                        onChange={e => updateParent({ ...data, instruction: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-blue-600"
                        checked={data.require_gps}
                        onChange={e => updateParent({ ...data, require_gps: e.target.checked })}
                    />
                    <span className="text-xs font-medium">Bắt buộc bật GPS</span>
                </label>

                <div className="text-[10px] text-gray-400 italic flex-1 text-right">
                    Endpoint: {data.endpoint}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH ---
export default function MobileScreenManager() {
    const { data: screensData, isLoading, refetch } = useApiData('/api/v2/security/mobile-screens');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [formData, setFormData] = useState({
        key: '', label: '', type: 'GRID_ITEM', icon_url: '',
        action_type: '', action_target: '',
        action_config: '{}', ui_config: '{}',
        is_active: true, order: 0
    });

    // Helper: Mở form
    const openModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({
                ...item,
                action_config: JSON.stringify(item.action_config || {}, null, 2),
                ui_config: JSON.stringify(item.ui_config || {}, null, 2),
            });
        } else {
            setFormData({
                key: '', label: '', type: 'GRID_ITEM', icon_url: '',
                action_type: 'NATIVE_SCREEN', action_target: '',
                action_config: '{}', ui_config: '{}', is_active: true, order: 0
            });
        }
        setIsModalOpen(true);
    };

    // Helper: Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                action_config: JSON.parse(formData.action_config || '{}'),
                ui_config: JSON.parse(formData.ui_config || '{}')
            };

            if (editingItem) {
                await axios.put(`/api/v2/security/mobile-screens/${editingItem.id}`, payload);
                toast.success('Cập nhật thành công!');
            } else {
                await axios.post('/api/v2/security/mobile-screens', payload);
                toast.success('Tạo mới thành công!');
            }
            setIsModalOpen(false);
            refetch();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Lỗi cú pháp JSON');
        }
    };

    // Helper: Delete
    const handleDelete = async (id) => {
        if (!window.confirm('Xóa linh kiện này?')) return;
        try {
            await axios.delete(`/api/v2/security/mobile-screens/${id}`);
            toast.success('Đã xóa!');
            refetch();
        } catch (e) { toast.error('Lỗi xóa'); }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;

    return (
        <div className="bg-white rounded-xl shadow h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Quản lý Linh kiện (Screens)</h2>
                    <p className="text-xs text-gray-500">Kho chứa các nút bấm và banner</p>
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold shadow hover:bg-blue-700">
                    + Tạo Mới
                </button>
            </div>

            {/* DANH SÁCH */}
            <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="p-3 border-b">Icon</th>
                            <th className="p-3 border-b">Key / Label</th>
                            <th className="p-3 border-b">Loại</th>
                            <th className="p-3 border-b">Hành động</th>
                            <th className="p-3 border-b text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {screensData?.data?.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="p-3 border-b w-12">
                                    {item.icon_url ? <img src={item.icon_url} className="w-8 h-8 object-contain bg-gray-100 rounded p-1" /> : <div className="w-8 h-8 bg-gray-200 rounded"></div>}
                                </td>
                                <td className="p-3 border-b">
                                    <div className="font-bold text-blue-600">{item.key}</div>
                                    <div className="text-gray-600">{item.label}</div>
                                </td>
                                <td className="p-3 border-b"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{item.type}</span></td>
                                <td className="p-3 border-b text-xs text-gray-500 max-w-xs truncate">
                                    <div className="font-bold text-gray-700">{item.action_type}</div>
                                    {item.action_target}
                                </td>
                                <td className="p-3 border-b text-right">
                                    <button onClick={() => openModal(item)} className="text-blue-600 hover:underline mr-3 font-medium">Sửa</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline font-medium">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL EDIT */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">{editingItem ? 'Chỉnh sửa' : 'Tạo mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="screenForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Mã Key *</label>
                                        <input required className="w-full border rounded p-2 text-sm" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} disabled={!!editingItem} placeholder="btn_..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Tên hiển thị</label>
                                        <input className="w-full border rounded p-2 text-sm" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Loại hiển thị</label>
                                        <select className="w-full border rounded p-2 text-sm bg-gray-50" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Link Icon (URL)</label>
                                        <input className="w-full border rounded p-2 text-sm" value={formData.icon_url} onChange={e => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://..." />
                                    </div>
                                </div>

                                <div className="border-t pt-4 mt-2">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-700 mb-1">Hành động (Action)</label>
                                            <select className="w-full border rounded p-2 text-sm font-bold text-blue-700 bg-blue-50" value={formData.action_type} onChange={e => setFormData({ ...formData, action_type: e.target.value })}>
                                                <option value="">-- Không --</option>
                                                {ACTION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Đích đến (Target)</label>
                                            <input className="w-full border rounded p-2 text-sm" value={formData.action_target} onChange={e => setFormData({ ...formData, action_target: e.target.value })} placeholder="ScreenName / URL" />
                                            <p className="text-[10px] text-gray-400 mt-1">VD: CheckInScreen, https://google.com</p>
                                        </div>
                                    </div>

                                    {/* FORM CẤU HÌNH THÔNG MINH (ACTION CONFIG) */}
                                    <div className="mb-4">
                                        <ActionConfigForm
                                            configJson={formData.action_config}
                                            onChange={(val) => setFormData({ ...formData, action_config: val })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">UI Config (JSON - Màu sắc, Style)</label>
                                        <textarea className="w-full border rounded p-2 text-xs font-mono h-20 bg-gray-50" value={formData.ui_config} onChange={e => setFormData({ ...formData, ui_config: e.target.value })} placeholder='{"color": "red"}' />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-between rounded-b-xl">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                <span className="font-bold text-sm">Kích hoạt</span>
                            </label>
                            <button form="screenForm" type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow">
                                Lưu Cấu Hình
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
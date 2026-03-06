import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// --- SUB-COMPONENT: THANH TIẾN ĐỘ SỨC KHỎE ---
// --- SUB-COMPONENT: THANH TIẾN ĐỘ SỨC KHỎE (CHUẨN XÁC) ---
const HealthBar = ({ stats }) => {
    if (!stats) return null;
    const total = stats.total_routes || 1;

    // Tính phần trăm thực tế
    const activePercent = Math.round((stats.secured / total) * 100);
    const maintPercent = Math.round((stats.maintenance / total) * 100);
    // Phần còn lại là rủi ro
    const riskPercent = 100 - activePercent - maintPercent;

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Độ phủ An ninh Hệ thống</h2>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-4xl font-black ${activePercent === 100 ? 'text-green-600' : 'text-gray-800'}`}>
                            {activePercent}%
                        </span>
                        <span className="text-sm font-bold text-gray-500">Hoạt động (Active)</span>
                    </div>
                </div>
                <div className="text-right flex gap-4 text-xs font-bold">
                    <div className="text-yellow-600">
                        🟡 Bảo trì: {stats.maintenance}
                    </div>
                    <div className="text-red-500">
                        🔴 Rủi ro: {stats.unprotected}
                    </div>
                    <div className="text-blue-600">
                        🔵 Tổng: {total}
                    </div>
                </div>
            </div>

            {/* Progress Bar 3 Màu */}
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                {/* Khúc Xanh: Active */}
                <div
                    style={{ width: `${activePercent}%` }}
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-1000 relative"
                >
                    {activePercent > 10 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">ACTIVE</span>}
                </div>

                {/* Khúc Vàng: Maintenance */}
                <div
                    style={{ width: `${maintPercent}%` }}
                    className="h-full bg-yellow-400 transition-all duration-1000 relative"
                >
                    {maintPercent > 10 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-yellow-800 font-bold">MAINT</span>}
                </div>

                {/* Khúc Đỏ: Unprotected */}
                <div
                    style={{ flex: 1 }}
                    className="h-full bg-red-500 stripe-pattern transition-all duration-1000 relative"
                >
                    {riskPercent > 10 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">RISK</span>}
                </div>
            </div>

            <p className="mt-3 text-[10px] text-gray-400 italic text-center">
                * Chỉ những API có trạng thái <b className="text-green-600">Active</b> mới được tính vào độ phủ an toàn.
            </p>
        </div>
    );
};

// --- SUB-COMPONENT: MODAL CHỈNH SỬA ---
const EditModal = ({ permission, onClose, onSave }) => {
    const [form, setForm] = useState({ label: '', description: '', module: '' });

    useEffect(() => {
        if (permission) setForm({
            label: permission.label || '',
            description: permission.description || '',
            module: permission.group || ''
        });
    }, [permission]);

    const handleSubmit = () => {
        onSave(permission.id, form);
    };

    if (!permission) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-zoom-in">
                <h3 className="text-lg font-black text-gray-800 mb-1">Thiết lập API</h3>
                <code className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 block w-max mb-6">{permission.name}</code>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Tên hiển thị (Tiếng Việt)</label>
                        <input
                            value={form.label}
                            onChange={e => setForm({ ...form, label: e.target.value })}
                            className="w-full border rounded-xl px-4 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="VD: Xem danh sách User"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nhóm (Module)</label>
                        <input
                            value={form.module}
                            onChange={e => setForm({ ...form, module: e.target.value })}
                            className="w-full border rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Mô tả kỹ thuật</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full border rounded-xl px-4 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="API này dùng để làm gì..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Đóng</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700">LƯU LẠI</button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH ---
const PermissionMatrix = ({ setAppTitle }) => {
    const [data, setData] = useState({ overview: null, matrix: {} });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [editingPerm, setEditingPerm] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({}); // Quản lý đóng/mở group
    const [actionLoading, setActionLoading] = useState(null); // ID of permission being modified

    useEffect(() => {
        if (setAppTitle) setAppTitle('Security Matrix v5.0');
        loadData();
    }, [setAppTitle]);

    const loadData = async () => {
        try {
            const res = await axios.get('/api/v2/security/permissions/matrix'); // Gọi API index
            setData(res.data);
            // Mặc định mở tất cả group
            const groups = {};
            Object.keys(res.data.matrix).forEach(key => groups[key] = true);
            setExpandedGroups(groups);
        } catch (e) {
            toast.error("Không thể tải Ma trận.");
        } finally {
            setLoading(false);
        }
    };

    // Toggle Status (API Call)
    const handleToggleStatus = async (perm) => {
        const newStatus = perm.status === 'active' ? 'maintenance' : 'active';

        // Optimistic Update
        const newData = { ...data };
        Object.keys(newData.matrix).forEach(group => {
            newData.matrix[group] = newData.matrix[group].map(p => p.id === perm.id ? { ...p, status: newStatus } : p);
        });
        setData(newData);

        try {
            await axios.put(`/api/v2/security/permissions/${perm.id}/status`, { status: newStatus });
            toast.success(`Đã chuyển trạng thái: ${newStatus.toUpperCase()}`);
        } catch (e) {
            toast.error("Lỗi cập nhật trạng thái");
            loadData(); // Revert nếu lỗi
        }
    };

    // Save Edit (API Call)
    const handleSaveEdit = async (id, formData) => {
        try {
            await axios.put(`/api/v2/security/permissions/${id}`, formData);
            toast.success("Đã cập nhật thông tin API");
            setEditingPerm(null);
            loadData();
        } catch (e) {
            toast.error("Lỗi lưu dữ liệu: " + e.message);
        }
    };

    // Toggle Group Collapse
    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const expandAll = () => {
        const groups = {};
        Object.keys(data.matrix).forEach(key => groups[key] = true);
        setExpandedGroups(groups);
    };

    const collapseAll = () => {
        const groups = {};
        Object.keys(data.matrix).forEach(key => groups[key] = false);
        setExpandedGroups(groups);
    };

    const handleBulkToggle = async (groupName, targetStatus) => {
        if (!window.confirm(`Chuyển TÀN BỘ API trong nhóm "${groupName}" sang ${targetStatus.toUpperCase()}?`)) return;

        const perms = data.matrix[groupName];
        setLoading(true);
        try {
            await Promise.all(perms.map(p =>
                axios.put(`/api/v2/security/permissions/${p.id}/status`, { status: targetStatus })
            ));
            toast.success(`Đã cập nhật nhóm ${groupName}`);
            loadData();
        } catch (e) {
            toast.error("Lỗi cập nhật hàng loạt");
            loadData();
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse text-xl">ĐANG TẢI MA TRẬN...</div>;

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen font-sans">
            <div className="max-w-[1400px] mx-auto">

                {/* 1. HEALTH BAR */}
                <HealthBar stats={data.overview} />

                {/* 2. TOOLBAR */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 sticky top-2 z-20">
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                        Ma trận Kiểm soát <span className="text-blue-600">v5.0</span>
                    </h1>
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2 w-full md:w-auto">
                        <input
                            className="px-4 py-2 bg-transparent outline-none font-medium w-full md:w-80"
                            placeholder="🔍 Tìm kiếm API, Tên hoặc Module..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                        <button onClick={expandAll} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition text-xs font-bold" title="Mở rộng tất cả">↕️ Mở</button>
                        <button onClick={collapseAll} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition text-xs font-bold" title="Thu gọn tất cả">↔️ Đóng</button>
                        <button onClick={loadData} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition">🔄</button>
                    </div>
                </div>

                {/* 3. MATRIX LIST */}
                <div className="space-y-6">
                    {Object.keys(data.matrix).map(group => {
                        // Logic lọc (Filter)
                        const permissions = data.matrix[group].filter(p =>
                            p.name.toLowerCase().includes(filter.toLowerCase()) ||
                            p.label.toLowerCase().includes(filter.toLowerCase()) ||
                            group.toLowerCase().includes(filter.toLowerCase())
                        );

                        if (permissions.length === 0) return null;

                        return (
                            <div key={group} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all">
                                {/* Group Header */}
                                <div
                                    onClick={() => toggleGroup(group)}
                                    className="group px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shadow-sm">
                                            {group.substring(0, 2).toUpperCase()}
                                        </div>
                                        <h3 className="font-bold text-gray-700 uppercase tracking-wide">{group} Module</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden group-hover:flex gap-1 mr-2 animate-fade-in">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleBulkToggle(group, 'active'); }}
                                                className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold hover:bg-green-200"
                                            >
                                                BATCH ACTIVE
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleBulkToggle(group, 'maintenance'); }}
                                                className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-bold hover:bg-yellow-200"
                                            >
                                                BATCH MAINT
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-gray-500">{permissions.length} API</span>
                                        <span className={`transform transition-transform ${expandedGroups[group] ? 'rotate-180' : ''}`}>▼</span>
                                    </div>
                                </div>

                                {/* Group Body */}
                                {expandedGroups[group] && (
                                    <div className="divide-y divide-gray-50">
                                        {permissions.map(perm => (
                                            <div key={perm.name} className="p-4 hover:bg-blue-50/30 transition flex flex-col md:flex-row items-center gap-4 group">

                                                {/* Cột 1: Thông tin chính */}
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-800 text-sm">{perm.label}</span>
                                                        {perm.security_level === 'risk' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-bold animate-pulse">NEW</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono">
                                                            {perm.name}
                                                        </code>
                                                        <span className="text-[10px] text-gray-400 truncate max-w-xs">{perm.description}</span>
                                                    </div>
                                                </div>

                                                {/* Cột 2: Hành động */}
                                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">

                                                    {/* Nút Sửa */}
                                                    <button
                                                        onClick={() => setEditingPerm(perm)}
                                                        className="text-gray-400 hover:text-blue-600 bg-white border border-transparent hover:border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                                    >
                                                        ✏️ Sửa
                                                    </button>

                                                    {/* Toggle Switch Xịn */}
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase ${perm.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                                            {perm.status === 'active' ? 'Active' : 'Maint'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleToggleStatus(perm)}
                                                            className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${perm.status === 'active' ? 'bg-green-500' : 'bg-gray-200'}`}
                                                        >
                                                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${perm.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal */}
            <EditModal
                permission={editingPerm}
                onClose={() => setEditingPerm(null)}
                onSave={handleSaveEdit}
            />
        </div>
    );
};

export default PermissionMatrix;
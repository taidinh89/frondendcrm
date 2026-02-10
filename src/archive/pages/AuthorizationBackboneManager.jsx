import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// =================================================================================
// SUB-COMPONENT: THẺ BÀI DASHBOARD (STYLE MỚI)
// =================================================================================
const StatCard = ({ title, count, type, icon, activeFilter, onClick, colorClass }) => {
    const isActive = activeFilter === type;
    return (
        <div
            onClick={() => onClick(type)}
            className={`
                relative overflow-hidden rounded-[2rem] p-6 cursor-pointer transition-all duration-300 border
                ${isActive
                    ? `bg-gradient-to-br ${colorClass} text-white shadow-xl scale-105 ring-2 ring-offset-2 ring-blue-300 border-transparent`
                    : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600 hover:shadow-md'
                }
            `}
        >
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                        {title}
                    </div>
                    <div className={`text-4xl font-black ${isActive ? 'text-white' : 'text-gray-800'}`}>
                        {count}
                    </div>
                </div>
                <div className={`text-2xl ${isActive ? 'text-white/90' : 'grayscale opacity-30'}`}>
                    {icon}
                </div>
            </div>
            <div className={`mt-4 text-[10px] font-bold px-2 py-1 rounded inline-block ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {isActive ? '● Đang xem danh sách này' : 'Bấm để lọc'}
            </div>
        </div>
    );
};

// =================================================================================
// PHẦN 1: USER COMMANDER TAB (LOGIC ĐÃ ĐỒNG BỘ)
// =================================================================================
const UserCommanderTab = () => {
    // --- STATE DỮ LIỆU ---
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE GIAO DIỆN ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // --- STATE EDIT ---
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);

    // 1. TẢI DỮ LIỆU
    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, rRes, dRes] = await Promise.all([
                axios.get('/api/v2/security/users?per_page=1000'),
                axios.get('/api/v2/security/roles?per_page=100'),
                axios.get('/api/v2/security/departments?per_page=100')
            ]);

            const safeData = (res) => res.data.data || res.data || [];
            setUsers(safeData(uRes));
            setRoles(safeData(rRes).filter(r => r.name !== 'Super Admin'));
            setDepartments(safeData(dRes));
        } catch (e) {
            console.error(e);
            toast.error("Lỗi kết nối Backbone Services!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 2. [LOGIC CHUẨN] KIỂM TRA LÃNH ĐẠO
    const checkIsManager = (u) => {
        // Ưu tiên 1: Cột is_admin trong DB
        if (u.is_admin === 1 || u.is_admin === true) return true;

        // Ưu tiên 2: Role Super Admin
        if (u.roles?.some(r => r.name === 'Super Admin')) return true;

        // Ưu tiên 3: Chức danh quản lý (Mở rộng từ khóa)
        const isDeptManager = u.departments?.some(d => {
            const pos = d.pivot?.position?.toLowerCase() || '';
            return ['trưởng', 'giám đốc', 'tp', 'gđ', 'manager', 'ceo', 'leader'].some(k => pos.includes(k));
        });

        return isDeptManager;
    };

    // 3. TÍNH TOÁN SỐ LIỆU (Dùng chung logic checkIsManager)
    const stats = useMemo(() => {
        return {
            total: users.length,
            active: users.filter(u => u.is_active).length,
            managers: users.filter(u => checkIsManager(u)).length,
            locked: users.filter(u => !u.is_active).length
        };
    }, [users]);

    // 4. LỌC DANH SÁCH
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filterType === 'active') matchesFilter = u.is_active;
        if (filterType === 'locked') matchesFilter = !u.is_active;
        if (filterType === 'admin') matchesFilter = checkIsManager(u);

        return matchesSearch && matchesFilter;
    });

    // 5. HÀNH ĐỘNG NHANH
    const toggleLockUser = async (e, user) => {
        e.stopPropagation();
        if (user.is_admin) return toast.warning("Không thể khóa System Admin!");

        if (!window.confirm(`Bạn có chắc muốn ${user.is_active ? 'KHÓA' : 'MỞ KHÓA'} tài khoản [${user.name}]?`)) return;

        try {
            const newStatus = !user.is_active;
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            await axios.put(`/api/v2/security/users/${user.id}`, { is_active: newStatus });
            toast.success(newStatus ? `Đã mở khóa ${user.name}` : `Đã khóa ${user.name}`);
        } catch (error) { toast.error("Lỗi cập nhật trạng thái"); fetchData(); }
    };

    const deleteUser = async (e, user) => {
        e.stopPropagation();
        if (user.is_admin) return toast.error("KHÔNG THỂ XÓA SYSTEM ADMIN!");

        if (!window.confirm(`CẢNH BÁO: Xóa nhân sự [${user.name}] sẽ xóa toàn bộ dữ liệu liên quan.\nTiếp tục?`)) return;

        try {
            setUsers(users.filter(u => u.id !== user.id));
            await axios.delete(`/api/v2/security/users/${user.id}`);
            toast.success("Đã xóa nhân sự.");
        } catch (error) { toast.error("Không thể xóa."); fetchData(); }
    };

    // 6. XỬ LÝ MODAL (Giữ nguyên)
    const openEditor = (user) => {
        setEditingUser(user);
        setSelectedRoles(user.roles?.map(r => r.id) || []);
        const currentDepts = user.departments?.map(d => ({
            id: d.id, name: d.name, position: d.pivot?.position || 'Nhân viên', access_level: d.pivot?.access_level || 'own_only'
        })) || [];
        if (currentDepts.length === 0) currentDepts.push({ id: '', position: 'Nhân viên', access_level: 'own_only' });
        setSelectedDepts(currentDepts);
    };

    const handleSaveChanges = async () => {
        try {
            await axios.put(`/api/v2/security/users/${editingUser.id}`, { name: editingUser.name, roles: selectedRoles });
            const deptPayload = {};
            selectedDepts.filter(d => d.id).forEach(d => { deptPayload[d.id] = { position: d.position, access_level: d.access_level }; });
            await axios.put(`/api/v2/security/users/${editingUser.id}/departments`, { departments: deptPayload });
            toast.success(`Đã cập nhật hồ sơ: ${editingUser.name}`);
            setEditingUser(null);
            fetchData();
        } catch (e) { toast.error("Lỗi lưu dữ liệu: " + (e.response?.data?.message || e.message)); }
    };

    if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse text-xl">ĐANG KẾT NỐI VỆ TINH NHÂN SỰ...</div>;

    return (
        <div className="animate-fade-in space-y-8">
            {/* --- DASHBOARD THÔNG MINH --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard title="Tổng nhân sự" count={stats.total} type="all" icon="👥" activeFilter={filterType} onClick={setFilterType} colorClass="from-blue-500 to-blue-600" />
                <StatCard title="Đang hoạt động" count={stats.active} type="active" icon="🟢" activeFilter={filterType} onClick={setFilterType} colorClass="from-green-500 to-green-600" />
                <StatCard title="Lãnh đạo & Admin" count={stats.managers} type="admin" icon="👑" activeFilter={filterType} onClick={setFilterType} colorClass="from-purple-500 to-purple-600" />
                <StatCard title="Đã khóa / Cấm" count={stats.locked} type="locked" icon="🔒" activeFilter={filterType} onClick={setFilterType} colorClass="from-red-500 to-red-600" />
            </div>

            {/* --- TOOLBAR --- */}
            <div className="flex justify-between items-center bg-white p-2 pr-4 rounded-2xl border border-gray-200 shadow-sm">
                <input
                    className="flex-1 bg-transparent px-6 py-3 outline-none font-bold text-gray-600 placeholder-gray-400"
                    placeholder={`🔍 Tìm kiếm trong ${filteredUsers.length} nhân sự...`}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                {filterType !== 'all' && (
                    <button onClick={() => setFilterType('all')} className="text-xs font-bold text-red-500 hover:underline px-4">✕ Xóa bộ lọc</button>
                )}
            </div>

            {/* --- DANH SÁCH USER --- */}
            <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm min-h-[500px]">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 sticky top-0 z-10 bg-white">
                        <tr>
                            <th className="px-8 py-5">Nhân sự</th>
                            <th className="px-6 py-5">Vai trò (Roles)</th>
                            <th className="px-6 py-5">Kiêm nhiệm</th>
                            <th className="px-6 py-5 text-center">Trạng thái</th>
                            <th className="px-6 py-5 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Không tìm thấy nhân sự nào.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-blue-50/40 transition cursor-pointer group" onClick={() => openEditor(user)}>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${user.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 grayscale'}`}>
                                            {user.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`font-bold ${user.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{user.name}</div>
                                                {/* HUY HIỆU ADMIN */}
                                                {(user.is_admin === 1 || user.is_admin === true) && (
                                                    <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 font-black">👑 ADMIN</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-1">
                                        {user.roles?.map(r => (
                                            <span key={r.id} className={`px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase border border-gray-200 ${r.name === 'Super Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : ''}`}>
                                                {r.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="space-y-1.5">
                                        {user.departments?.map(d => (
                                            <div key={d.id} className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-gray-700">{d.name}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${['trưởng', 'giám đốc', 'tp', 'gđ'].some(k => d.pivot?.position?.toLowerCase().includes(k)) ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {d.pivot?.position}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {user.is_active ? '● Active' : '● Locked'}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                        {(!user.is_admin) && (
                                            <>
                                                <button onClick={(e) => toggleLockUser(e, user)} title="Khóa" className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${user.is_active ? 'bg-white border-gray-200 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}>{user.is_active ? '🔒' : '🔓'}</button>
                                                <button onClick={(e) => deleteUser(e, user)} title="Xóa" className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all">🗑️</button>
                                            </>
                                        )}
                                        <button onClick={() => openEditor(user)} className="px-4 h-9 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95">Cấu hình</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL EDITOR (Nội dung như cũ) --- */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in border border-white/20">
                        {/* Header Modal */}
                        <div className="p-6 bg-white border-b flex justify-between items-center z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                    Hồ sơ: {editingUser.name}
                                    {editingUser.is_admin === 1 && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded border border-yellow-200">👑 SYSTEM ADMIN</span>}
                                </h3>
                                <div className="text-xs text-gray-500 mt-1">{editingUser.email}</div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 flex items-center justify-center font-bold transition-colors">✕</button>
                        </div>

                        {/* Body Modal */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                                <section>
                                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">1. Vai trò Hệ thống</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {roles.map(role => (
                                            <div key={role.id} onClick={() => selectedRoles.includes(role.id) ? setSelectedRoles(selectedRoles.filter(id => id !== role.id)) : setSelectedRoles([...selectedRoles, role.id])}
                                                className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${selectedRoles.includes(role.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRoles.includes(role.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white'}`}>{selectedRoles.includes(role.id) && '✓'}</div>
                                                <span className="text-xs font-bold">{role.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] mb-4">2. Kiêm nhiệm & Vị trí</h4>
                                    <div className="space-y-3">
                                        {selectedDepts.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-2xl border border-gray-200">
                                                <select className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none" value={item.id} onChange={e => { const arr = [...selectedDepts]; arr[idx].id = e.target.value; setSelectedDepts(arr); }}>
                                                    <option value="">-- Chọn Phòng --</option>
                                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                                <input className="w-32 bg-white border rounded px-2 py-1.5 text-xs font-medium" placeholder="Chức vụ" value={item.position} onChange={e => { const arr = [...selectedDepts]; arr[idx].position = e.target.value; setSelectedDepts(arr); }} />
                                                <select className="w-28 bg-white border rounded px-2 py-1.5 text-[10px] font-black uppercase text-gray-500" value={item.access_level} onChange={e => { const arr = [...selectedDepts]; arr[idx].access_level = e.target.value; setSelectedDepts(arr); }}>
                                                    <option value="own_only">Cá nhân</option>
                                                    <option value="department">Toàn phòng</option>
                                                    <option value="recursive">Toàn nhánh</option>
                                                </select>
                                                <button onClick={() => setSelectedDepts(selectedDepts.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                                            </div>
                                        ))}
                                        <button onClick={() => setSelectedDepts([...selectedDepts, { id: '', position: 'Nhân viên', access_level: 'own_only' }])} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-xs font-black text-gray-400 hover:text-blue-600 uppercase transition-all">+ Thêm Kiêm nhiệm</button>
                                    </div>
                                </section>
                            </div>
                            <div className="w-full md:w-80 bg-slate-50 border-l border-gray-200 p-6 flex flex-col">
                                <div className="flex-1 space-y-4">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><div className="text-[10px] font-black text-gray-400 uppercase mb-2">Quyền hạn</div>{selectedRoles.length > 0 ? <ul className="list-disc pl-4 text-blue-700 font-bold text-xs">{roles.filter(r => selectedRoles.includes(r.id)).map(r => <li key={r.id}>{r.name}</li>)}</ul> : <p className="text-xs text-red-500 italic">Chưa chọn vai trò.</p>}</div>
                                </div>
                                <button onClick={handleSaveChanges} className="mt-4 w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Lưu Hồ sơ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =================================================================================
// PHẦN 2: SECURITY LAYERS TAB (KIẾN TRÚC BẢO MẬT - GIỮ NGUYÊN)
// =================================================================================
const SecurityLayersTab = () => {
    // Component quản lý Layer 1, 2, 3 (Giữ nguyên như cũ)
    const [permissions, setPermissions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => { axios.get('/api/v2/security/permissions/list').then(res => setPermissions(res.data)).catch(console.error); }, []);
    const toggleStatus = async (perm) => {
        const newStatus = perm.status === 'active' ? 'maintenance' : 'active';
        setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, status: newStatus } : p));
        try { await axios.put(`/api/v2/security/permissions/${perm.id}/status`, { status: newStatus }); } catch (e) { }
    };
    const filtered = permissions.filter(p => p.name.includes(searchTerm) || p.label?.includes(searchTerm));

    return (
        <div className="flex h-full gap-6">
            <div className="flex-1 bg-white rounded-3xl border border-gray-200 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800">🛡️ Layer 1: API Firewall</h3><input className="bg-gray-50 border rounded-lg px-3 py-1 text-sm outline-none" placeholder="Tìm API..." onChange={e => setSearchTerm(e.target.value)} /></div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {filtered.map(perm => (
                        <div key={perm.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50">
                            <div><div className="font-bold text-sm text-gray-700">{perm.label || perm.name}</div><div className="text-[10px] text-gray-400 font-mono">{perm.name}</div></div>
                            <button onClick={() => toggleStatus(perm)} className={`w-10 h-6 rounded-full p-1 transition-colors ${perm.status === 'active' ? 'bg-green-500' : 'bg-gray-200'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${perm.status === 'active' ? 'translate-x-4' : ''}`} /></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-80 space-y-6">
                <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100"><h3 className="font-bold text-purple-900 mb-2">🎭 Layer 2: Roles</h3><p className="text-xs text-purple-700">Định nghĩa các nhóm quyền.</p></div>
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100"><h3 className="font-bold text-orange-900 mb-2">👁️ Layer 3: Scope</h3><p className="text-xs text-orange-700">Kiểm soát phạm vi dữ liệu.</p></div>
            </div>
        </div>
    );
};

// =================================================================================
// MAIN COMPONENT: BACKBONE COMMANDER V5.0 (ALL-IN-ONE)
// =================================================================================
const AuthorizationBackboneManager = ({ setAppTitle }) => {
    const [activeTab, setActiveTab] = useState('users');
    useEffect(() => { if (setAppTitle) setAppTitle('Backbone Commander v5.0'); }, [setAppTitle]);

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-[1800px] mx-auto space-y-6">
                <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 flex justify-between items-center sticky top-2 z-30 border border-white">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>👥 User Commander</button>
                        <button onClick={() => setActiveTab('layers')} className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'layers' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>🏗️ Security Architect</button>
                    </div>
                    <div className="pr-6 text-[10px] font-black text-slate-300 italic hidden md:block">BACKBONE V5.0 • INTEGRATED</div>
                </div>
                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 min-h-[800px] relative">
                    {activeTab === 'users' ? <UserCommanderTab /> : <SecurityLayersTab />}
                </div>
            </div>
        </div>
    );
};

export default AuthorizationBackboneManager;
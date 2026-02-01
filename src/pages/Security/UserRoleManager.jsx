import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// --- SUB-COMPONENT: THẺ BÀI THÔNG MINH ---
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

// --- COMPONENT CHÍNH ---
const UserRoleManager = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [filterType, setFilterType] = useState('all'); // all, active, admin, locked
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal States
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);

    // [NEW] Form States
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, rRes, dRes] = await Promise.all([
                axios.get('/api/security/users?per_page=1000'),
                axios.get('/api/security/roles?per_page=100'),
                axios.get('/api/security/departments?per_page=100')
            ]);

            // Helper lấy data an toàn
            const getData = (res) => res.data.data || res.data || [];

            setUsers(getData(uRes));
            setRoles(getData(rRes).filter(r => r.name !== 'Super Admin')); // Ẩn Super Admin để tránh xóa nhầm
            setDepartments(getData(dRes));
        } catch (e) {
            toast.error("Lỗi kết nối Server: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- [LOGIC QUAN TRỌNG] ĐỊNH NGHĨA ADMIN/QUẢN LÝ ---
    const checkIsManager = (u) => {
        // 1. [CAO NHẤT] Có cột is_admin = 1 trong Database (Super Admin cứng)
        if (u.is_admin === 1 || u.is_admin === true) return true;

        // 2. [CAO NHÌ] Có Role là "Super Admin" (Người quản lý phân quyền)
        if (u.roles?.some(r => r.name === 'Super Admin')) return true;

        // 3. [MỞ RỘNG] Các chức danh quản lý phòng ban (Trưởng phòng, Giám đốc...)
        // Nếu bạn chỉ muốn hiện Admin hệ thống thì bỏ phần số 3 này đi.
        // Ở đây tôi giữ lại để nhóm "Lãnh đạo" bao gồm cả Admin + Sếp phòng ban.
        const isDeptManager = u.departments?.some(d => {
            const pos = d.pivot?.position?.toLowerCase() || '';
            return ['trưởng', 'giám đốc', 'tp', 'gđ', 'manager', 'ceo'].some(k => pos.includes(k));
        });

        return isDeptManager;
    };

    // --- TÍNH TOÁN SỐ LIỆU ---
    const stats = useMemo(() => {
        return {
            total: users.length,
            active: users.filter(u => u.is_active).length,
            managers: users.filter(u => checkIsManager(u)).length, // Dùng hàm chuẩn ở trên
            locked: users.filter(u => !u.is_active).length
        };
    }, [users]);

    // --- LỌC DANH SÁCH ---
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filterType === 'active') matchesFilter = u.is_active;
        if (filterType === 'locked') matchesFilter = !u.is_active;
        if (filterType === 'admin') matchesFilter = checkIsManager(u); // Dùng hàm chuẩn ở trên

        return matchesSearch && matchesFilter;
    });

    // --- CÁC HÀM HÀNH ĐỘNG (GIỮ NGUYÊN) ---
    const toggleLock = async (e, user) => {
        e.stopPropagation();
        // Không cho phép khóa chính Super Admin (người có is_admin = 1)
        if (user.is_admin) {
            toast.warning("Không thể khóa Super Admin hệ thống!");
            return;
        }

        if (!window.confirm(`Bạn muốn ${user.is_active ? 'KHÓA 🔒' : 'MỞ KHÓA 🔓'} tài khoản ${user.name}?`)) return;

        try {
            const newStatus = !user.is_active;
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            await axios.put(`/api/security/users/${user.id}`, { is_active: newStatus });
            toast.success(newStatus ? `Đã mở khóa ${user.name}` : `Đã khóa ${user.name}`);
        } catch (e) { toast.error("Lỗi thao tác"); fetchData(); }
    };

    const deleteUser = async (e, user) => {
        e.stopPropagation();
        if (user.is_admin) {
            toast.error("KHÔNG THỂ XÓA SUPER ADMIN!");
            return;
        }
        if (!window.confirm(`CẢNH BÁO: Xóa nhân sự [${user.name}]?\nDữ liệu liên quan sẽ mất vĩnh viễn.`)) return;

        try {
            setUsers(users.filter(u => u.id !== user.id));
            await axios.delete(`/api/security/users/${user.id}`);
            toast.success("Đã xóa nhân sự.");
        } catch (e) { toast.error("Không thể xóa."); fetchData(); }
    };

    // --- MODAL CONFIGURATION ---
    const openEditor = (user) => {
        if (!user) {
            // Mode: Create New
            setEditingUser({ id: null, name: '', email: '', is_admin: 0, is_active: true });
            setEditName('');
            setEditEmail('');
            setEditPassword('');
            setSelectedRoles([]);
            setSelectedDepts([{ id: '', position: 'Nhân viên', access_level: 'own_only' }]);
            return;
        }

        // Mode: Edit
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPassword(''); // Reset password field
        setSelectedRoles(user.roles?.map(r => r.id) || []);

        const currentDepts = user.departments?.map(d => ({
            id: d.id, name: d.name, position: d.pivot?.position || 'Nhân viên', access_level: d.pivot?.access_level || 'own_only'
        })) || [];
        if (currentDepts.length === 0) currentDepts.push({ id: '', position: 'Nhân viên', access_level: 'own_only' });

        setSelectedDepts(currentDepts);
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: editName,
                email: editEmail,
                roles: selectedRoles,
                is_active: editingUser.is_active // Retain status if new or edit
            };

            if (editPassword) {
                payload.password = editPassword;
            }

            let targetId = editingUser.id;

            if (targetId) {
                // Update
                await axios.put(`/api/security/users/${targetId}`, payload);
            } else {
                // Create
                if (!editPassword) {
                    toast.error("Vui lòng nhập mật khẩu cho nhân sự mới!");
                    return;
                }
                const res = await axios.post('/api/security/users', payload);
                targetId = res.data.data.id;
            }

            const deptPayload = {};
            selectedDepts.filter(d => d.id).forEach(d => { deptPayload[d.id] = { position: d.position, access_level: d.access_level }; });
            await axios.put(`/api/security/users/${targetId}/departments`, { departments: deptPayload });

            toast.success(editingUser.id ? "Cập nhật thành công!" : "Tạo mới thành công!");
            setEditingUser(null);
            fetchData();
        } catch (e) { toast.error("Lỗi lưu dữ liệu: " + (e.response?.data?.message || e.message)); }
    };

    if (loading) return <div className="p-20 text-center font-black text-gray-400 animate-pulse text-xl tracking-widest">ĐANG TẢI DỮ LIỆU...</div>;

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen font-sans text-gray-800">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* 1. DASHBOARD */}
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-6">
                        Trung tâm Điều phối Nhân sự
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <StatCard title="Tổng nhân sự" count={stats.total} type="all" icon="👥" activeFilter={filterType} onClick={setFilterType} colorClass="from-blue-500 to-blue-600" />
                        <StatCard title="Đang hoạt động" count={stats.active} type="active" icon="🟢" activeFilter={filterType} onClick={setFilterType} colorClass="from-green-500 to-green-600" />
                        <StatCard title="Lãnh đạo & Admin" count={stats.managers} type="admin" icon="👑" activeFilter={filterType} onClick={setFilterType} colorClass="from-purple-500 to-purple-600" />
                        <StatCard title="Đã khóa / Cấm" count={stats.locked} type="locked" icon="🔒" activeFilter={filterType} onClick={setFilterType} colorClass="from-red-500 to-red-600" />
                    </div>
                </div>

                {/* 2. TOOLBAR */}
                <div className="bg-white p-2 pr-4 rounded-[1.5rem] border border-gray-200 shadow-sm flex items-center justify-between sticky top-4 z-20">
                    <input
                        className="flex-1 bg-transparent px-6 py-3 outline-none font-bold text-gray-600 placeholder-gray-400"
                        placeholder={`🔍 Tìm kiếm trong ${filteredUsers.length} nhân sự...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-2">
                        {filterType !== 'all' && (
                            <button onClick={() => setFilterType('all')} className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">✕ Xóa bộ lọc</button>
                        )}
                        <button onClick={() => openEditor(null)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
                            <span className="text-lg leading-none">+</span> Tạo Mới
                        </button>
                    </div>
                </div>

                {/* 3. MAIN LIST */}
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400">
                            <tr>
                                <th className="px-8 py-5">Nhân sự</th>
                                <th className="px-6 py-5">Vai trò (Roles)</th>
                                <th className="px-6 py-5">Kiêm nhiệm (Phòng ban)</th>
                                <th className="px-6 py-5 text-center">Trạng thái</th>
                                <th className="px-6 py-5 text-right">Tác vụ nhanh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Không tìm thấy dữ liệu phù hợp.</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} onClick={() => openEditor(user)} className="hover:bg-blue-50/40 transition cursor-pointer group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${user.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 grayscale'}`}>
                                                {user.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-bold ${user.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{user.name}</div>
                                                    {/* HIỂN THỊ CỜ ADMIN NẾU CÓ */}
                                                    {(user.is_admin === 1 || user.is_admin === true) && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 font-black" title="Super Admin Hệ thống">👑 ADMIN</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map(r => (
                                                <span key={r.id} className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${r.name === 'Super Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
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
                                            {/* Nút Khóa (Ẩn nếu là Admin cứng) */}
                                            {(!user.is_admin) && (
                                                <button onClick={(e) => toggleLock(e, user)} title={user.is_active ? "Khóa" : "Mở khóa"} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${user.is_active ? 'bg-white border-gray-200 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}>
                                                    {user.is_active ? '🔒' : '🔓'}
                                                </button>
                                            )}

                                            {/* Nút Xóa (Ẩn nếu là Admin cứng) */}
                                            {(!user.is_admin) && (
                                                <button onClick={(e) => deleteUser(e, user)} title="Xóa" className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all">🗑️</button>
                                            )}

                                            <button onClick={() => openEditor(user)} className="px-4 h-9 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95">Cấu hình</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL CONFIGURATION */}
                {editingUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in border border-white/20">

                            {/* Modal Header */}
                            <div className="p-6 bg-white border-b flex justify-between items-center z-10">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
                                        Hồ sơ: {editName}
                                        {(editingUser.is_admin === 1) && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">👑 SYSTEM ADMIN</span>}
                                    </h3>
                                    <div className="text-xs text-gray-500 mt-1">{editEmail}</div>
                                </div>
                                <button onClick={() => setEditingUser(null)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 font-bold">✕</button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                                    <section className="mb-8">
                                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">1. Thông tin cơ bản & Mật khẩu</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Họ và tên</label>
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full font-bold text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email đăng nhập</label>
                                                <input
                                                    value={editEmail}
                                                    onChange={e => setEditEmail(e.target.value)}
                                                    className="w-full font-bold text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="md:col-span-2 border-t border-blue-200 pt-4 mt-2">
                                                <label className="block text-[10px] font-bold uppercase text-red-500 mb-1 flex justify-between">
                                                    <span>Đặt lại mật khẩu</span>
                                                    <span className="italic font-normal normal-case opacity-70">⚠ Chỉ nhập nếu muốn đổi mật khẩu mới</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Nhập mật khẩu mới (Để trống nếu không đổi)"
                                                    value={editPassword}
                                                    onChange={e => setEditPassword(e.target.value)}
                                                    className="w-full font-bold text-red-600 placeholder-red-200 bg-white border border-red-100 rounded-xl px-4 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">2. Vai trò Hệ thống</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {roles.map(r => (
                                                <div key={r.id} onClick={() => selectedRoles.includes(r.id) ? setSelectedRoles(selectedRoles.filter(id => id !== r.id)) : setSelectedRoles([...selectedRoles, r.id])}
                                                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${selectedRoles.includes(r.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-600'}`}>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRoles.includes(r.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white'}`}>{selectedRoles.includes(r.id) && '✓'}</div><span className="text-xs font-bold">{r.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] mb-4">3. Kiêm nhiệm & Vị trí</h4>
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
                                    <button onClick={handleSave} className="mt-4 w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Lưu Hồ sơ</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserRoleManager;
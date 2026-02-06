import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserListTab = () => {
    // --- KHỞI TẠO STATES ---
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]); // Danh sách Bó quyền từ BE
    const [departments, setDepartments] = useState([]); // Danh sách Phòng ban từ BE
    const [scopeDefinitions, setScopeDefinitions] = useState([]); // Định nghĩa L2 từ BE
    const [loading, setLoading] = useState(true);

    // --- BỘ LỌC & PHÂN TRANG ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // --- MODAL THIẾT LẬP (QUAN TRỌNG) ---
    const [editingUser, setEditingUser] = useState(null);
    const [tempDepts, setTempDepts] = useState([]); // Lớp 2: [{id, access_level}]
    const [selectedRoles, setSelectedRoles] = useState([]); // Lớp 1: [id1, id2]

    // Hàm đảm bảo dữ liệu luôn là mảng để tránh lỗi .map()
    const ensureArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, rRes, dRes, sRes] = await Promise.all([
                axios.get('/api/v2/security/users?per_page=1000'),
                axios.get('/api/v2/security/roles?per_page=100'),
                axios.get('/api/v2/security/departments?per_page=100'),
                axios.get('/api/system/scope-definitions')
            ]);

            setUsers(ensureArray(uRes.data));
            setRoles(ensureArray(rRes.data).filter(r => r.name !== 'Super Admin'));
            setDepartments(ensureArray(dRes.data));
            setScopeDefinitions(sRes.data || {});
        } catch (e) {
            toast.error('Lỗi đồng bộ: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 1. TÍNH NĂNG: BẬT/TẮT TRẠNG THÁI
    const toggleStatus = async (user) => {
        try {
            await axios.put(`/api/v2/security/users/${user.id}`, { is_active: !user.is_active ? 1 : 0 });
            fetchData();
        } catch (e) { toast.error('Lỗi thực thi'); }
    };

    // 2. TÍNH NĂNG: LƯU TỔNG THỂ (L1 + L2) - ĐÃ CHỈNH SỬA THEO YÊU CẦU
    const handleSaveUserDetail = async () => {
        try {
            // Bước A: Cập nhật Vai trò (Lớp 1) và thông tin cơ bản
            // Gọi đến UserController@update
            await axios.put(`/api/v2/security/users/${editingUser.id}`, {
                name: editingUser.name,
                roles: selectedRoles // Gửi mảng ID các Bó quyền đã chọn
            });

            // Bước B: Cập nhật Kiêm nhiệm & Phạm vi dữ liệu (Lớp 2)
            // Gọi đến UserController@syncDepartments
            const deptPayload = {};
            (tempDepts || []).forEach(item => {
                if (item.id) {
                    deptPayload[item.id] = {
                        access_level: item.access_level,
                        position: item.position || 'Nhân viên'
                    };
                }
            });

            await axios.put(`/api/v2/security/users/${editingUser.id}/departments`, {
                departments: deptPayload
            });

            toast.success('Đã phân quyền và công tác thành công!');
            setEditingUser(null);
            fetchData();
        } catch (e) { toast.error('Lỗi lưu: ' + (e.response?.data?.message || 'Hệ thống từ chối')); }
    };

    // 3. LOGIC LỌC
    const filteredUsers = (users || []).filter((u) => {
        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'all' || u.departments?.some((d) => d.name === filterDept);
        const matchesStatus = filterStatus === 'all' || (filterStatus === '1' && u.is_active) || (filterStatus === '0' && !u.is_active);
        return matchesSearch && matchesDept && matchesStatus;
    });

    const currentItems = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-blue-600 uppercase tracking-widest">Đang kết nối Backbone Commander...</div>;

    return (
        <div className="space-y-6">
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <input
                    type="text" placeholder="Tìm tên, email nhân sự..."
                    className="flex-1 px-5 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
                <div className="flex gap-2">
                    <select className="px-4 py-3 bg-gray-50 rounded-2xl border-none font-bold text-gray-500 text-xs uppercase" onChange={(e) => setFilterDept(e.target.value)}>
                        <option value="all">Mọi phòng ban</option>
                        {(departments || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            {/* BẢNG DANH SÁCH */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400">Thành viên</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400">Trạng thái</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400">Bó quyền (L1)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400">Phòng ban (L2)</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-gray-400">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentItems.map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">{user.name?.charAt(0)}</div>
                                            <div>
                                                <div className="font-bold text-gray-900 leading-tight">{user.name}</div>
                                                <div className="text-[10px] text-gray-400 mt-1">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <button onClick={() => toggleStatus(user)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${user.is_active ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-200 text-gray-500'}`}>
                                            {user.is_active ? 'ACTIVE' : 'LOCKED'}
                                        </button>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {(user.roles || []).map(r => <span key={r.id} className="px-2 py-0.5 bg-blue-600 text-[9px] text-white rounded-md font-black uppercase tracking-tighter">{r.name}</span>)}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="space-y-1">
                                            {(user.departments || []).map(d => (
                                                <div key={d.id} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-700">{d.name}</span>
                                                    <span className="text-[9px] bg-white border border-blue-100 px-2 py-0.5 rounded-lg text-blue-600 font-black uppercase">
                                                        {d.pivot?.access_level || 'staff'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                // Nạp danh sách ID các quyền hiện có của user vào state để chọn
                                                setSelectedRoles((user.roles || []).map(r => r.id));
                                                setTempDepts((user.departments || []).map(d => ({
                                                    id: d.id,
                                                    access_level: d.pivot?.access_level || 'own_only',
                                                    position: d.pivot?.position || 'Nhân viên'
                                                })));
                                            }}
                                            className="px-5 py-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                        >
                                            Thiết lập
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                    <div className="p-6 bg-gray-50/50 border-t flex justify-center gap-2">
                        {[...Array(totalPages)].map((_, i) => (
                            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl font-bold text-xs ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400'}`}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL THIẾT LẬP NHÂN SỰ ĐA LỚP */}
            {editingUser && (
                <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] border border-white">
                        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Hồ sơ nhân sự</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{editingUser.email}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 text-2xl">✕</button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                            {/* PHẦN 1: PHÂN BỔ BÓ QUYỀN (LỚP 1 - CHỨC NĂNG) */}
                            <section>
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-5">Layer 1: Phân bổ Bó quyền chức năng</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(roles || []).map(role => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => {
                                                const has = selectedRoles.includes(role.id);
                                                setSelectedRoles(has ? selectedRoles.filter(id => id !== role.id) : [...selectedRoles, role.id]);
                                            }}
                                            className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center gap-3 ${selectedRoles.includes(role.id) ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100' : 'border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 ${selectedRoles.includes(role.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* PHẦN 2: VỊ TRÍ & PHẠM VI DỮ LIỆU (LỚP 2) */}
                            <section>
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-5">Layer 2: Vị trí & Phạm vi dữ liệu (Mục bạn bôi đỏ)</label>
                                <div className="space-y-3">
                                    {(tempDepts || []).map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <select
                                                className="flex-1 bg-transparent text-sm font-bold outline-none text-gray-800"
                                                value={item.id}
                                                onChange={(e) => {
                                                    const updated = [...tempDepts];
                                                    updated[idx].id = e.target.value;
                                                    setTempDepts(updated);
                                                }}
                                            >
                                                <option value="">Chọn đơn vị công tác...</option>
                                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>

                                            {/* Ô BÔI ĐỎ TRONG ẢNH CỦA BẠN - Đã thêm Fallback dữ liệu mặc định */}
                                            <select
                                                className="w-44 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[10px] font-black text-blue-600 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                value={item.access_level}
                                                onChange={(e) => {
                                                    const updated = [...tempDepts];
                                                    updated[idx].access_level = e.target.value;
                                                    setTempDepts(updated);
                                                }}
                                            >
                                                {(scopeDefinitions.length > 0 ? scopeDefinitions : [
                                                    { value: 'own_only', label: 'Cá nhân (Staff)' },
                                                    { value: 'department', label: 'Phòng ban (Manager)' },
                                                    { value: 'recursive', label: 'Toàn công ty (Director)' }
                                                ]).map(sd => (
                                                    <option key={sd.value} value={sd.value}>{sd.label}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setTempDepts(tempDepts.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 px-2 transition-colors">✕</button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setTempDepts([...tempDepts, { id: '', access_level: 'own_only', position: 'Nhân viên' }])}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-blue-50 transition-all"
                                    >
                                        + Thêm vị trí kiêm nhiệm
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="p-8 border-t bg-gray-50/50 flex gap-4">
                            <button onClick={() => setEditingUser(null)} className="flex-1 py-4 font-black text-gray-400 text-xs uppercase rounded-2xl">Hủy</button>
                            <button onClick={handleSaveUserDetail} className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 text-xs uppercase">Cập nhật Commander</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserListTab;
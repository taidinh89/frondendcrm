import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// =================================================================================
// 1. CẤU HÌNH: DANH SÁCH CHỨC NĂNG HỆ THỐNG (GIỮ NGUYÊN GỐC)
// =================================================================================
const SYSTEM_FEATURES = [
    { type: 'frontend', group: 'Kinh doanh', code: 'customer.view', label: 'Truy cập trang Khách hàng' },
    { type: 'frontend', group: 'Kinh doanh', code: 'customer-360.view', label: 'Xem Chân dung 360' },
    { type: 'backend', group: 'Kinh doanh', code: 'customer.create', label: 'Nút Thêm/Sửa Khách hàng' },
    { type: 'backend', group: 'Kinh doanh', code: 'customer.delete', label: 'Nút Xóa Khách hàng' },
    { type: 'frontend', group: 'Kinh doanh', code: 'sales.view', label: 'Truy cập trang Đơn bán' },
    { type: 'frontend', group: 'Kinh doanh', code: 'quotation.create', label: 'Truy cập trang Báo giá' },
    { type: 'backend', group: 'Kinh doanh', code: 'sales.create', label: 'Hành động Tạo/Sửa đơn' },
    { type: 'backend', group: 'Kinh doanh', code: 'sales.approve', label: 'Hành động Duyệt đơn' },
    { type: 'frontend', group: 'Kho vận', code: 'inventory.view', label: 'Truy cập trang Tồn kho' },
    { type: 'frontend', group: 'Kho vận', code: 'purchase.view', label: 'Truy cập trang Mua hàng' },
    { type: 'backend', group: 'Kho vận', code: 'inventory.adjust', label: 'Hành động Kiểm kê/Điều chỉnh' },
    { type: 'frontend', group: 'Tài chính', code: 'invoice.view', label: 'Truy cập Hóa đơn điện tử' },
    { type: 'frontend', group: 'Tài chính', code: 'report.debt', label: 'Truy cập Báo cáo Công nợ' },
    { type: 'frontend', group: 'Tài chính', code: 'report.sales', label: 'Truy cập Báo cáo Doanh thu' },
    { type: 'frontend', group: 'Báo cáo', code: 'report.product', label: 'Phân tích Nhóm Sản phẩm' },
    { type: 'frontend', group: 'Báo cáo', code: 'report.partner', label: 'Phân tích Đối tác & NCC' },
    { type: 'frontend', group: 'Tài chính', code: 'sepay.viewall', label: 'Xem tất cả giao dịch Sepay' },
    { type: 'frontend', group: 'Tài chính', code: 'sepay.create', label: 'Tạo giao dịch Sepay' },
    { type: 'frontend', group: 'Hệ thống', code: 'system.monitor', label: 'Truy cập Giám sát hệ thống' },
    { type: 'frontend', group: 'Hệ thống', code: 'system.security', label: 'Truy cập Phân quyền' },
    { type: 'backend', group: 'Hệ thống', code: 'system.dictionary', label: 'Quản lý Từ điển dữ liệu' },
    { type: 'backend', group: 'Hệ thống', code: 'system.sync', label: 'Cấu hình Đồng bộ API' },
];

// =================================================================================
// 2. HELPER: MODAL PHÂN PHÒNG BAN (MỚI - TÍCH HỢP)
// =================================================================================
const UserDepartmentModal = ({ user, onClose, onSave }) => {
    const [departments, setDepartments] = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptRes, userRes] = await Promise.all([
                    axios.get('/api/v2/security/departments?per_page=100'),
                    axios.get(`/api/v2/security/users/${user.id}`)
                ]);
                setDepartments(Array.isArray(deptRes.data.data) ? deptRes.data.data : []);
                const userData = userRes.data?.data || userRes.data;
                const userDepts = userData?.departments || [];
                if (Array.isArray(userDepts)) {
                    setSelectedDepts(userDepts.map(d => ({
                        id: d.id,
                        position: d.pivot?.position || 'staff',
                        access_level: d.pivot?.access_level || 'own_only',
                        is_primary: d.pivot?.is_primary || false
                    })));
                }
            } catch (e) { toast.error("Lỗi tải cơ cấu"); }
        };
        fetchData();
    }, [user.id]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.put(`/api/v2/security/users/${user.id}/departments`, { departments: selectedDepts });
            toast.success("Đã cập nhật cơ cấu nhân sự!");
            onSave(); onClose();
        } catch (e) { toast.error("Lỗi khi lưu!"); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-scaleUp">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Cơ cấu Nhân sự: {user.name}</h3>
                    <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="text-gray-500 border-b text-left">
                            <tr><th>Phòng ban</th><th>Chức vụ</th><th>Phạm vi xem</th><th>Xóa</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {selectedDepts.map((sd, idx) => (
                                <tr key={idx}>
                                    <td className="py-2">
                                        <select className="border rounded p-1 w-full" value={sd.id} onChange={e => {
                                            const newD = [...selectedDepts]; newD[idx].id = e.target.value; setSelectedDepts(newD);
                                        }}>
                                            <option value="">-- Chọn --</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-2 px-2">
                                        <select className="border rounded p-1" value={sd.position} onChange={e => {
                                            const newD = [...selectedDepts]; newD[idx].position = e.target.value; setSelectedDepts(newD);
                                        }}>
                                            <option value="staff">Nhân viên</option>
                                            <option value="manager">Trưởng phòng</option>
                                            <option value="deputy">Phó phòng</option>
                                        </select>
                                    </td>
                                    <td className="py-2">
                                        <select className="border rounded p-1 w-full" value={sd.access_level} onChange={e => {
                                            const newD = [...selectedDepts]; newD[idx].access_level = e.target.value; setSelectedDepts(newD);
                                        }}>
                                            <option value="own_only">Cá nhân</option>
                                            <option value="department">Phòng ban</option>
                                            <option value="recursive">Đệ quy</option>
                                        </select>
                                    </td>
                                    <td className="text-center"><button onClick={() => setSelectedDepts(selectedDepts.filter((_, i) => i !== idx))} className="text-red-400">✕</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => setSelectedDepts([...selectedDepts, { id: '', position: 'staff', access_level: 'own_only', is_primary: false }])} className="mt-4 text-blue-600 font-bold text-xs">+ THÊM VỊ TRÍ</button>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button onClick={onClose} className="px-4 py-2">Hủy</button>
                    <button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold shadow">{loading ? 'Đang lưu...' : '💾 LƯU CƠ CẤU'}</button>
                </div>
            </div>
        </div>
    );
};

// =================================================================================
// 3. ACTION MENU HELPER (GIỮ NGUYÊN GỐC)
// =================================================================================
const ActionMenu = ({ role, onRename, onClone, onImport, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" /></svg>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5 animate-fadeIn">
                    <div className="py-1">
                        <button onClick={() => { onRename(role); setIsOpen(false); }} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">✏️ Sửa tên nhóm</button>
                        <button onClick={() => { onClone(role); setIsOpen(false); }} className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 w-full text-left">©️ Nhân bản</button>
                        <button onClick={() => { onImport(role); setIsOpen(false); }} className="flex items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full text-left">📥 Nạp quyền...</button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => { onDelete(role); setIsOpen(false); }} className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">🗑️ Xóa nhóm</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// =================================================================================
// 4. TAB 1: QUẢN LÝ NGƯỜI DÙNG (GIỮ NGUYÊN LOGIC CŨ + CỘT PHÒNG BAN MỚI)
// =================================================================================
const UserManagementTab = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [deptModal, setDeptModal] = useState({ open: false, user: null }); // Mới
    const canManage = currentUser?.is_super_admin;

    const loadData = async () => {
        try {
            const [uRes, rRes] = await Promise.all([
                axios.get('/api/v2/security/users?per_page=100'),
                axios.get('/api/v2/security/roles?per_page=100')
            ]);
            setUsers(uRes.data.data || (Array.isArray(uRes.data) ? uRes.data : []));
            setRoles(rRes.data.data || (Array.isArray(rRes.data) ? rRes.data : []));
        } catch (error) { toast.error("Lỗi tải dữ liệu"); } finally { setLoading(false); }
    };
    useEffect(() => { loadData(); }, []);

    const handleToggleActive = async (user) => {
        if (!canManage) return toast.error("Cần quyền Super Admin!");
        if (user.is_super_admin) return toast.warning("Không thể khóa Super Admin!");
        try {
            await axios.put(`/api/v2/security/users/${user.id}`, { ...user, is_active: !user.is_active });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
            toast.success("Đã cập nhật trạng thái!");
        } catch (e) { toast.error("Lỗi cập nhật"); }
    };

    const handleDeleteUser = async (user) => {
        if (!canManage) return toast.error("Cần quyền Super Admin!");
        if (!window.confirm(`Xóa nhân viên ${user.name}?`)) return;
        try {
            await axios.delete(`/api/v2/security/users/${user.id}`);
            setUsers(prev => prev.filter(u => u.id !== user.id));
            toast.success("Đã xóa!");
        } catch (e) { toast.error("Lỗi xóa"); }
    };

    const handleToggleRole = async (user, role) => {
        const currentIds = Array.isArray(user.roles) ? user.roles.map(r => r.id) : [];
        const newIds = currentIds.includes(role.id) ? currentIds.filter(i => i !== role.id) : [...currentIds, role.id];
        try {
            await axios.put(`/api/v2/security/users/${user.id}`, { ...user, roles: newIds });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roles: newIds.map(rid => roles.find(r => r.id === rid)) } : u));
            toast.success("Đã lưu quyền!");
        } catch (e) { toast.error("Lỗi lưu"); }
    };

    const filteredUsers = users.filter(u => (u.name + u.email).toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div>Đang tải...</div>;

    return (
        <div className="space-y-4 animate-fadeIn">
            <input className="border p-2 rounded w-full md:w-1/3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="🔍 Tìm nhân viên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3">Nhân viên</th>
                            <th className="p-3 text-center">Trạng thái</th>
                            <th className="p-3">Vai trò</th>
                            <th className="p-3">Phòng ban</th> {/* Cột mới */}
                            <th className="p-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
                                <td className="p-3">
                                    <div className="font-bold text-gray-800">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => handleToggleActive(user)} disabled={!canManage || user.is_super_admin} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${user.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {Array.isArray(roles) && roles.filter(r => r.name !== 'Super Admin').map(role => {
                                            const isActive = user.roles?.some(ur => ur.id === role.id);
                                            return (
                                                <button key={role.id} onClick={() => handleToggleRole(user, role)} className={`px-2 py-0.5 rounded text-[11px] border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>
                                                    {role.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="p-3"> {/* Logic hiển thị phòng ban mới */}
                                    <div className="text-[10px] space-y-1">
                                        {Array.isArray(user.departments) && user.departments.length > 0 ? (
                                            user.departments.map(d => (
                                                <div key={d.id} className="bg-gray-100 px-1 rounded">● {d.name} <i className="text-blue-500">({d.pivot?.position})</i></div>
                                            ))
                                        ) : <span className="text-gray-300">Chưa phân phòng</span>}
                                        <button onClick={() => setDeptModal({ open: true, user })} className="block mt-1 text-blue-600 font-bold hover:underline">🏢 SỬA</button>
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    {!user.is_super_admin && <button onClick={() => handleDeleteUser(user)} className="text-gray-400 hover:text-red-600 p-1">🗑</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {deptModal.open && <UserDepartmentModal user={deptModal.user} onClose={() => setDeptModal({ open: false, user: null })} onSave={loadData} />}
        </div>
    );
};

// =================================================================================
// 5. TAB 2 & 3: MA TRẬN PHÂN QUYỀN (GIỮ NGUYÊN GỐC)
// =================================================================================
const PermissionMatrix = ({ typeFilter }) => {
    const [roles, setRoles] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalAction, setModalAction] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [importSourceId, setImportSourceId] = useState("");

    const fetchData = async () => {
        try {
            const rolesRes = await axios.get('/api/v2/security/roles?per_page=100');
            const roleData = (rolesRes.data.data || (Array.isArray(rolesRes.data) ? rolesRes.data : [])).filter(r => r.name !== 'Super Admin');
            setRoles(roleData);
            const matrixData = {};
            roleData.forEach(r => { matrixData[r.id] = r.permissions ? r.permissions.map(p => p.name) : []; });
            setMatrix(matrixData);
        } catch (error) { toast.error("Lỗi tải ma trận"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleToggle = (roleId, permCode) => {
        setMatrix(prev => {
            const current = prev[roleId] || [];
            return { ...prev, [roleId]: current.includes(permCode) ? current.filter(c => c !== permCode) : [...current, permCode] };
        });
    };

    const handleSave = async (roleId) => {
        try {
            await axios.post(`/api/v2/security/roles/${roleId}/sync-permissions`, { permissions: matrix[roleId] });
            toast.success("Đã lưu quyền!");
        } catch (e) { toast.error("Lỗi lưu quyền."); }
    };

    const handleModalSubmit = async () => {
        try {
            if (modalAction === 'rename') await axios.put(`/api/v2/security/roles/${selectedRole.id}`, { name: inputValue });
            if (modalAction === 'clone') await axios.post(`/api/v2/security/roles/${selectedRole.id}/clone`, { name: inputValue });
            if (modalAction === 'create') await axios.post(`/api/v2/security/roles`, { name: inputValue });
            if (modalAction === 'import') {
                setMatrix(prev => ({ ...prev, [selectedRole.id]: [...(matrix[importSourceId] || [])] }));
                setModalAction(null); return;
            }
            if (modalAction === 'delete') await axios.delete(`/api/v2/security/roles/${selectedRole.id}`);
            setModalAction(null); fetchData();
        } catch (e) { toast.error("Lỗi thao tác"); }
    };

    const filteredFeatures = SYSTEM_FEATURES.filter(f => f.type === typeFilter);
    const grouped = {};
    filteredFeatures.forEach(p => { if (!grouped[p.group]) grouped[p.group] = []; grouped[p.group].push(p); });

    if (loading) return <div>Đang tải...</div>;

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-end mb-4">
                <button onClick={() => setModalAction('create')} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold shadow hover:bg-blue-700">+ Tạo Nhóm Mới</button>
            </div>
            <div className="overflow-x-auto bg-white border rounded shadow-sm">
                <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 border text-left min-w-[250px] bg-gray-100">Chức năng</th>
                            {roles.map(r => (
                                <th key={r.id} className="p-2 border text-center min-w-[140px] bg-gray-100">
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <div className="font-bold text-gray-800 truncate max-w-[80px]">{r.name}</div>
                                        <ActionMenu role={r} onRename={() => { setSelectedRole(r); setInputValue(r.name); setModalAction('rename'); }} onClone={() => { setSelectedRole(r); setInputValue(r.name + ' Copy'); setModalAction('clone'); }} onImport={() => { setSelectedRole(r); setModalAction('import'); }} onDelete={() => { setSelectedRole(r); setModalAction('delete'); }} />
                                    </div>
                                    <button onClick={() => handleSave(r.id)} className="text-[10px] bg-green-600 text-white px-3 py-0.5 rounded w-full">LƯU</button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(grouped).map(([group, perms]) => (
                            <React.Fragment key={group}>
                                <tr className="bg-blue-50"><td colSpan={roles.length + 1} className="p-2 font-bold text-blue-800 pl-4 border-y uppercase text-xs">{group}</td></tr>
                                {perms.map(p => (
                                    <tr key={p.code} className="hover:bg-yellow-50 border-b">
                                        <td className="p-2 border pl-6"><div>{p.label}</div><div className="text-[10px] text-gray-400">{p.code}</div></td>
                                        {roles.map(r => (
                                            <td key={r.id} className="p-2 border text-center">
                                                <input type="checkbox" className="w-5 h-5" checked={matrix[r.id]?.includes(p.code) || false} onChange={() => handleToggle(r.id, p.code)} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Modal Logic (Giữ nguyên gốc) */}
            {modalAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="font-bold mb-4 uppercase text-sm">Thao tác Nhóm Quyền</h3>
                        {modalAction === 'import' ? (
                            <select className="w-full border p-2 rounded mb-4" value={importSourceId} onChange={e => setImportSourceId(e.target.value)}>
                                <option value="">-- Chọn nhóm nguồn --</option>
                                {roles.filter(r => r.id !== selectedRole.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        ) : modalAction !== 'delete' && <input className="w-full border p-2 rounded mb-4" value={inputValue} onChange={e => setInputValue(e.target.value)} />}
                        <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setModalAction(null)}>Hủy</button>
                            <button onClick={handleModalSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =================================================================================
// 6. TAB: ĐỊNH NGHĨA QUYỀN (GIỮ NGUYÊN GỐC)
// =================================================================================
const PermissionDefinitionTab = () => {
    const [loading, setLoading] = useState(false);
    const handleSync = async () => {
        setLoading(true);
        try {
            const payload = SYSTEM_FEATURES.map(f => ({ name: f.code, description: f.label }));
            await axios.post('/api/v2/security/permissions/bulk', { permissions: payload });
            toast.success("Đồng bộ thành công!");
        } catch (e) { toast.error("Lỗi đồng bộ"); } finally { setLoading(false); }
    };
    return (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex items-center justify-between">
            <div><h3 className="font-bold text-blue-800">⚙️ Đồng bộ Quyền</h3><p className="text-sm">Nạp <b>{SYSTEM_FEATURES.length}</b> chức năng vào DB.</p></div>
            <button onClick={handleSync} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700">Nạp dữ liệu</button>
        </div>
    );
};

// =================================================================================
// 7. MAIN CONTAINER (4 TAB CHUẨN)
// =================================================================================
const PermissionManager = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('users');
    const tabs = [
        { id: 'users', label: '👥 Quản lý Nhân sự', color: 'blue' },
        { id: 'frontend_matrix', label: '🖥️ Phân quyền Truy cập (Frontend)', color: 'green' },
        { id: 'backend_matrix', label: '⚙️ Phân quyền Xử lý (Backend)', color: 'orange' },
        { id: 'definition', label: '🛠️ Cấu hình Hệ thống', color: 'gray' },
    ];
    return (
        <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
            <div className="mb-6 border-b pb-4"><h2 className="text-2xl font-bold">Trung Tâm Quản Trị & Bảo Mật</h2></div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab.id ? `bg-white text-${tab.color}-600 shadow` : 'text-gray-500'}`}>{tab.label}</button>
                ))}
            </div>
            {activeTab === 'users' && <UserManagementTab currentUser={currentUser} />}
            {activeTab === 'frontend_matrix' && <PermissionMatrix typeFilter="frontend" />}
            {activeTab === 'backend_matrix' && <PermissionMatrix typeFilter="backend" />}
            {activeTab === 'definition' && <PermissionDefinitionTab />}
        </div>
    );
};

export { PermissionManager };
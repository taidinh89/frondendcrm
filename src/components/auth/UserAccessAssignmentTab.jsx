import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserAccessAssignmentTab = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, rRes] = await Promise.all([
                axios.get('/api/security/users?per_page=100'),
                axios.get('/api/security/roles?per_page=100')
            ]);
            setUsers(uRes.data.data || []);
            setRoles(rRes.data.data.filter(r => r.name !== 'Super Admin') || []);
        } catch (e) { toast.error("Lỗi nạp dữ liệu"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // HÀM BẬT/TẮT NHÂN VIÊN (Sửa lỗi nhận diện Boolean true/false)
    const toggleActive = async (user) => {
        try {
            const currentStatus = (user.is_active === true || user.is_active === 1);
            const newStatus = !currentStatus;
            await axios.put(`/api/security/users/${user.id}`, { is_active: newStatus ? 1 : 0 });
            toast.success(`Đã ${newStatus ? 'Bật' : 'Tắt'} nhân viên: ${user.name}`);
            fetchData();
        } catch (e) { toast.error("Lỗi cập nhật trạng thái"); }
    };

    // HÀM "DI CHUYỂN" NHÂN VIÊN VÀO NHÓM (QUYỀN ĐI THEO NHÓM)
    const changeUserRole = async (userId, roleId) => {
        try {
            // Sếp chỉ cần chọn Nhóm, Backend sẽ tự gán L1, L2, L3 tương ứng của Nhóm đó cho User
            await axios.put(`/api/security/users/${userId}`, { roles: [roleId] });
            toast.success("Đã thay đổi gói quyền thành công!");
            fetchData();
        } catch (e) { toast.error("Lỗi di chuyển nhóm"); }
    };

    if (loading) return <div className="p-10 text-center animate-pulse font-black uppercase">Đang nạp danh sách gói quyền...</div>;

    return (
        <div className="animate-fadeIn space-y-4">
            <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200 mb-8">
                <h3 className="font-black text-xl uppercase italic">Bảng Quản Trị Nhân Sự Nhanh</h3>
                <p className="text-xs opacity-80 mt-1">Sếp chỉ cần chọn Chức danh, mọi quyền hạn sẽ tự động đi theo.</p>
            </div>

            <div className="overflow-x-auto border-2 border-gray-100 rounded-[2.5rem] bg-white shadow-2xl shadow-blue-900/5">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 border-b-2">
                        <tr>
                            <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-center">Trạng thái</th>
                            <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Nhân viên</th>
                            <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Gói quyền (Chức danh)</th>
                            <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Phạm vi dữ liệu hiện tại</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => {
                            const isActive = (user.is_active === true || user.is_active === 1);
                            return (
                                <tr key={user.id} className={`hover:bg-blue-50/50 transition-colors ${!isActive ? 'bg-gray-50/70 opacity-60' : ''}`}>
                                    <td className="p-6 text-center">
                                        <button 
                                            onClick={() => toggleActive(user)}
                                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1.5'}`} />
                                        </button>
                                    </td>
                                    <td className="p-6">
                                        <div className="font-black text-gray-800 uppercase text-xs">{user.name}</div>
                                        <div className="text-[10px] text-gray-400 italic">{user.email}</div>
                                    </td>
                                    <td className="p-6">
                                        {/* SẾP CHỈ CẦN CHỌN Ở ĐÂY LÀ XONG */}
                                        <select 
                                            className="w-full border-2 border-gray-100 rounded-xl p-3 font-black text-xs text-blue-700 focus:border-blue-500 outline-none bg-blue-50/30"
                                            value={user.roles?.[0]?.id || ''}
                                            onChange={(e) => changeUserRole(user.id, e.target.value)}
                                        >
                                            <option value="">-- Chưa gán chức danh --</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.[0]?.data_scopes ? Object.entries(user.roles[0].data_scopes).map(([key, val]) => (
                                                <span key={key} className="text-[9px] bg-gray-100 px-2 py-1 rounded-lg font-bold text-gray-500 border border-gray-200 uppercase">
                                                    {key}: {val.length > 0 ? val.join(', ') : 'Tất cả'}
                                                </span>
                                            )) : <span className="text-[9px] text-gray-300 italic">Theo mặc định của nhóm</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserAccessAssignmentTab;
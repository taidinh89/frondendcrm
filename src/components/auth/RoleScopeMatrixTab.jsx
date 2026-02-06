import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const RoleScopeMatrixTab = ({ definitions, fetchDefinitions }) => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await axios.get('/api/v2/security/roles?per_page=100');
            // Loại bỏ Super Admin khỏi danh sách phân quyền vì Admin luôn có quyền tối cao
            const roleData = (res.data?.data || (Array.isArray(res.data) ? res.data : [])).filter(r => r.name !== 'Super Admin');
            setRoles(roleData);
        } catch (e) {
            toast.error("Lỗi tải danh sách nhóm quyền");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cập nhật Phạm vi (Scopes - Trục ngang)
     */
    const handleUpdateScope = async (roleId, key, value) => {
        const role = roles.find(r => r.id === roleId);
        const newScopes = { ...role.data_scopes, [key]: value };
        try {
            await axios.put(`/api/v2/security/roles/${roleId}/scopes`, { data_scopes: newScopes });
            toast.success("Đã cập nhật phạm vi dữ liệu");
            fetchRoles();
        } catch (e) {
            toast.error("Lỗi cập nhật phạm vi");
        }
    };

    /**
     * Cập nhật Chính sách hành vi (Policies - Lớp 3)
     */
    const handleUpdatePolicy = async (roleId, key, checked) => {
        const role = roles.find(r => r.id === roleId);
        const newPolicies = { ...role.access_policies, [key]: checked };
        try {
            await axios.put(`/api/v2/security/roles/${roleId}/scopes`, { access_policies: newPolicies });
            toast.success("Đã cập nhật chính sách bảo mật");
            fetchRoles();
        } catch (e) {
            toast.error("Lỗi cập nhật chính sách");
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Đang nạp ma trận bảo mật...</div>;

    return (
        <div className="overflow-x-auto border-2 border-gray-100 rounded-3xl animate-fadeIn">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 font-black border-b-2">
                    <tr>
                        <th className="p-6 w-48 bg-gray-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Nhóm quyền (Role)</th>
                        <th className="p-6 min-w-[350px]">Lớp 2: Phạm vi Dữ liệu (Scopes)</th>
                        <th className="p-6 min-w-[300px]">Lớp 3: Chính sách Bảo mật (Policies)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {roles.map(role => (
                        <tr key={role.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-6 font-black text-blue-800 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                {role.name}
                            </td>
                            <td className="p-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {definitions.scopes.map(s => (
                                        <div key={s.key} className={`flex flex-col p-3 rounded-xl border-2 transition-all ${s.status === 'active' ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200 opacity-60'
                                            }`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</label>
                                                {/* HIỂN THỊ ĐÈN TRẠNG THÁI TỪ BACKEND */}
                                                <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400'}`}></div>
                                            </div>

                                            <input
                                                className={`border rounded-lg px-3 py-2 text-xs w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all ${s.status === 'active' ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                                                    }`}
                                                placeholder={s.status === 'active' ? "Nhập mã (VD: VCB, MBBank)..." : "Chờ Dev tạo cột: " + s.db_column}
                                                disabled={s.status !== 'active'}
                                                defaultValue={role.data_scopes?.[s.key]?.join(', ')}
                                                onBlur={(e) => {
                                                    const vals = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                                                    handleUpdateScope(role.id, s.key, vals);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="grid grid-cols-1 gap-3">
                                    {definitions.policies.map(p => (
                                        <label key={p.key} className="group flex items-center gap-3 p-3 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-300 cursor-pointer transition-all hover:shadow-sm">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={role.access_policies?.[p.key] || false}
                                                onChange={(e) => handleUpdatePolicy(role.id, p.key, e.target.checked)}
                                            />
                                            <div className="flex-1">
                                                <div className="font-black text-gray-700 text-xs uppercase">{p.label}</div>
                                                <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{p.description}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RoleScopeMatrixTab;
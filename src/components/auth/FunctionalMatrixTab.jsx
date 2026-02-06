import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const FunctionalMatrixTab = () => {
    const [roles, setRoles] = useState([]);
    const [groupedPermissions, setGroupedPermissions] = useState({});
    const [matrix, setMatrix] = useState({});
    const [loading, setLoading] = useState(true);

    // HÀM QUAN TRỌNG: Sửa lỗi ReferenceError bằng cách định nghĩa bên trong Component
    const togglePermission = (roleId, permName) => {
        setMatrix(prev => {
            const current = prev[roleId] || [];
            const newPerms = current.includes(permName)
                ? current.filter(c => c !== permName)
                : [...current, permName];
            return { ...prev, [roleId]: newPerms };
        });
    };

    const fetchData = async () => {
        try {
            const [rolesRes, permsRes] = await Promise.all([
                axios.get('/api/v2/security/roles?per_page=100'),
                axios.get('/api/v2/security/permissions/list')
            ]);

            const roleData = (rolesRes.data?.data || (Array.isArray(rolesRes.data) ? rolesRes.data : [])).filter(r => r.name !== 'Super Admin');
            setRoles(roleData);

            const perms = Array.isArray(permsRes.data) ? permsRes.data : [];
            const groups = {};
            perms.forEach(p => {
                const moduleName = p.name?.split('.')[0]?.toUpperCase() || 'SYSTEM';
                if (!groups[moduleName]) groups[moduleName] = [];
                groups[moduleName].push(p);
            });
            setGroupedPermissions(groups);

            const currentMatrix = {};
            roleData.forEach(r => {
                currentMatrix[r.id] = r.permissions?.map(p => p.name) || [];
            });
            setMatrix(currentMatrix);
        } catch (e) { toast.error("Lỗi đồng bộ L1"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSaveMatrix = async (roleId) => {
        try {
            await axios.post(`/api/v2/security/roles/${roleId}/sync-permissions`, { permissions: matrix[roleId] });
            toast.success("Đã lưu mã quyền thành công!");
        } catch (e) { toast.error("Lưu thất bại"); }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-blue-600 uppercase">Đang nạp ma trận chức năng...</div>;

    return (
        <div className="animate-fadeIn">
            <div className="overflow-x-auto border-2 border-gray-100 rounded-[2rem] bg-white shadow-sm">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-50/80 border-b-2">
                            <th className="p-6 text-left w-80 sticky left-0 bg-gray-50 z-20 border-r-2 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tính năng hệ thống</th>
                            {roles.map(role => (
                                <th key={role.id} className="p-6 text-center min-w-[150px]">
                                    <div className="font-black text-blue-700 mb-2 uppercase text-[10px]">{role.name}</div>
                                    <button onClick={() => handleSaveMatrix(role.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black hover:bg-blue-700 transition-all uppercase">Lưu</button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(groupedPermissions).sort().map(moduleName => (
                            <React.Fragment key={moduleName}>
                                <tr className="bg-blue-50/30">
                                    <td colSpan={roles.length + 1} className="p-3 px-8 font-black text-blue-900 text-[10px] uppercase tracking-[0.2em] border-y border-blue-100">📦 {moduleName}</td>
                                </tr>
                                {groupedPermissions[moduleName].map((perm) => (
                                    <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                                        <td className="p-5 px-8 sticky left-0 bg-white z-10 border-r-2 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                                            <div className="font-black text-gray-800 text-xs uppercase">{perm.name?.split('.').slice(1).join(' ') || perm.name}</div>
                                            <div className="text-[10px] text-gray-400 italic mt-1">{perm.description || `Mã: ${perm.name}`}</div>
                                        </td>
                                        {roles.map(role => (
                                            <td key={role.id} className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 cursor-pointer accent-blue-600 rounded-lg transition-transform hover:scale-125"
                                                    checked={matrix[role.id]?.includes(perm.name) || false}
                                                    onChange={() => togglePermission(role.id, perm.name)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FunctionalMatrixTab;
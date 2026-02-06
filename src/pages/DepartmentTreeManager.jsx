import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Component con hiển thị từng Node trong cây (Recursive)
const TreeNode = ({ node, onEdit, onDelete, onAddChild, onManageUsers }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="ml-6 border-l-2 border-dashed border-blue-100 pl-4 my-2">
            <div className="flex items-center gap-3 group">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`cursor-pointer w-6 h-6 flex items-center justify-center rounded bg-gray-50 text-xs font-bold ${hasChildren ? 'text-blue-600' : 'text-gray-300'}`}
                >
                    {hasChildren ? (isOpen ? '−' : '+') : '○'}
                </div>

                <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm hover:border-blue-500 transition-all flex items-center justify-between flex-1 max-w-md">
                    <div>
                        <span className="text-xs font-black text-blue-600 uppercase mr-2">[{node.code}]</span>
                        <span className="font-bold text-gray-800">{node.name}</span>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-2">
                        <button onClick={() => onAddChild(node)} title="Thêm phòng con" className="p-1 hover:bg-blue-50 rounded text-blue-600">➕</button>
                        <button onClick={() => onManageUsers(node)} title="Quản lý nhân sự" className="p-1 hover:bg-green-50 rounded text-green-600">👥</button>
                        <button onClick={() => onEdit(node)} title="Sửa" className="p-1 hover:bg-orange-50 rounded text-orange-600">✏️</button>
                        <button onClick={() => onDelete(node)} title="Xóa" className="p-1 hover:bg-red-50 rounded text-red-600">🗑️</button>
                    </div>
                </div>
            </div>

            {isOpen && hasChildren && (
                <div className="mt-1">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            onManageUsers={onManageUsers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DepartmentTreeManager = ({ setAppTitle }) => {
    const [treeData, setTreeData] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // States cho Modal CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', parent_id: null });

    // States cho Modal Nhân sự
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [treeRes, userRes] = await Promise.all([
                axios.get('/api/v2/security/departments/tree'), // Lấy cây
                axios.get('/api/v2/security/users?per_page=1000')
            ]);
            setTreeData(Array.isArray(treeRes.data) ? treeRes.data : []);
            setAllUsers(userRes.data?.data || (Array.isArray(userRes.data) ? userRes.data : []));
        } catch (e) {
            toast.error('Lỗi tải sơ đồ tổ chức');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (setAppTitle) setAppTitle('Sơ đồ Tổ chức v5.0');
        loadData();
    }, []);

    // XỬ LÝ CRUD PHÒNG BAN
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDept && editingDept.id) {
                await axios.put(`/api/v2/security/departments/${editingDept.id}`, formData);
                toast.success('Đã cập nhật phòng ban');
            } else {
                await axios.post('/api/v2/security/departments', formData);
                toast.success('Đã tạo phòng ban mới');
            }
            setIsModalOpen(false);
            loadData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Lỗi thao tác');
        }
    };

    const handleDelete = async (dept) => {
        if (!window.confirm(`Xóa phòng [${dept.name}]?`)) return;
        try {
            await axios.delete(`/api/v2/security/departments/${dept.id}`);
            toast.success('Đã xóa thành công');
            loadData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể xóa');
        }
    };

    // XỬ LÝ ĐỒNG BỘ NHÂN SỰ
    const handleSyncUsers = async () => {
        try {
            await axios.post(`/api/v2/security/departments/${currentDept.id}/sync-users`, {
                users: selectedUsers
            });
            toast.success('Đã đồng bộ nhân sự cho phòng ' + currentDept.name);
            setIsUserModalOpen(false);
            loadData();
        } catch (e) {
            toast.error('Lỗi đồng bộ nhân sự');
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse font-black text-blue-600">ĐANG VẼ SƠ ĐỒ COMMANDER...</div>;

    return (
        <div className="p-8 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Organizational Backbone</h2>
                    <p className="text-gray-500 text-sm italic">Quản lý cấu trúc phân cấp và nhân sự kiêm nhiệm</p>
                </div>
                <button
                    onClick={() => {
                        setEditingDept(null);
                        setFormData({ name: '', code: '', parent_id: null });
                        setIsModalOpen(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
                >
                    + TẠO PHÒNG BAN GỐC
                </button>
            </div>

            {/* Render Cây */}
            <div className="bg-gray-50/50 p-8 rounded-[3rem] border border-gray-100 shadow-inner">
                {treeData.length > 0 ? treeData.map(node => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        onEdit={(d) => { setEditingDept(d); setFormData({ name: d.name, code: d.code, parent_id: d.parent_id }); setIsModalOpen(true); }}
                        onDelete={handleDelete}
                        onAddChild={(parent) => { setEditingDept(null); setFormData({ name: '', code: '', parent_id: parent.id }); setIsModalOpen(true); }}
                        onManageUsers={(d) => {
                            setCurrentDept(d);
                            setSelectedUsers(d.users?.map(u => u.id) || []);
                            setIsUserModalOpen(true);
                        }}
                    />
                )) : <div className="text-center py-20 text-gray-400 font-bold">Chưa có dữ liệu phòng ban.</div>}
            </div>

            {/* MODAL CRUD PHÒNG BAN */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6">
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                            {editingDept ? 'Cập nhật phòng ban' : 'Tạo phòng ban mới'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Tên phòng ban</label>
                                <input
                                    required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Mã định danh (Code)</label>
                                <input
                                    required value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
                                    placeholder="VD: PHONG_KINH_DOANH"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500">HỦY</button>
                            <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200">LƯU HỆ THỐNG</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL ĐỒNG BỘ NHÂN SỰ */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl p-8 flex flex-col max-h-[80vh]">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-800 uppercase">Nhân sự: {currentDept?.name}</h3>
                            <p className="text-sm text-gray-500">Chọn nhân viên trực thuộc phòng ban này</p>
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 p-2">
                            {allUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        const exists = selectedUsers.includes(user.id);
                                        setSelectedUsers(exists ? selectedUsers.filter(id => id !== user.id) : [...selectedUsers, user.id]);
                                    }}
                                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedUsers.includes(user.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 ${selectedUsers.includes(user.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`} />
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{user.name}</div>
                                        <div className="text-[10px] text-gray-400">{user.email}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500">ĐÓNG</button>
                            <button onClick={handleSyncUsers} className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-xl shadow-blue-200">ĐỒNG BỘ NGAY</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentTreeManager;
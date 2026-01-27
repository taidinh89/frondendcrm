// src/components/auth/OrgStructureTab.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Icon, Button } from '../ui';

const OrgStructureTab = () => {
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, type: 'create', data: null });
    const [formData, setFormData] = useState({ name: '', code: '', parent_id: null });

    const fetchTree = async () => {
        try {
            const res = await axios.get('/api/security/departments/tree');
            setTreeData(res.data);
        } catch (e) { toast.error("Không thể tải sơ đồ tổ chức"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTree(); }, []);

    const handleSave = async () => {
        try {
            if (modal.type === 'create') {
                await axios.post('/api/security/departments', formData);
                toast.success("Đã tạo phòng ban mới");
            } else {
                await axios.put(`/api/security/departments/${modal.data.id}`, formData);
                toast.success("Đã cập nhật thông tin");
            }
            setModal({ open: false });
            fetchTree();
        } catch (e) { toast.error(e.response?.data?.message || "Lỗi xử lý"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa phòng ban này có thể ảnh hưởng đến các nhân viên bên trong. Tiếp tục?")) return;
        try {
            await axios.delete(`/api/security/departments/${id}`);
            toast.success("Đã xóa thành công");
            fetchTree();
        } catch (e) { toast.error("Không thể xóa phòng ban đang có dữ liệu con"); }
    };

    const TreeNode = ({ node }) => (
        <div className="ml-8 border-l-2 border-blue-50 pl-4 my-3">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border group hover:border-blue-300 transition-all">
                <div>
                    <span className="font-bold text-gray-800">{node.name}</span>
                    <span className="ml-2 text-xs font-mono text-gray-400">[{node.code}]</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setFormData({ name: '', code: '', parent_id: node.id }); setModal({ open: true, type: 'create', data: node }); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">➕</button>
                    <button onClick={() => { setFormData({ name: node.name, code: node.code, parent_id: node.parent_id }); setModal({ open: true, type: 'edit', data: node }); }} className="p-1 text-orange-600 hover:bg-orange-50 rounded">✏️</button>
                    <button onClick={() => handleDelete(node.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                </div>
            </div>
            {node.children && node.children.map(child => <TreeNode key={child.id} node={child} />)}
        </div>
    );

    return (
        <div className="animate-fadeIn">
            <div className="mb-4 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Trục Dọc: Sơ đồ Tổ chức</h3>
                <Button onClick={() => { setFormData({ name: '', code: '', parent_id: null }); setModal({ open: true, type: 'create', data: null }); }} variant="blue">+ Tạo Phòng Ban Gốc</Button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border min-h-[400px]">
                {treeData.map(dept => <TreeNode key={dept.id} node={dept} />)}
            </div>

            {/* MODAL THÊM/SỬA PHÒNG BAN */}
            {modal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b font-bold text-lg">
                            {modal.type === 'create' ? 'Tạo Phòng Ban' : 'Cập nhật Phòng Ban'}
                        </div>
                        <div className="p-6 space-y-4">
                            <input className="w-full border rounded p-2" placeholder="Tên phòng ban" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <input className="w-full border rounded p-2 font-mono" placeholder="Mã (Code)" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setModal({open: false})}>Hủy</button>
                            <Button onClick={handleSave} variant="blue">Lưu lại</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgStructureTab;
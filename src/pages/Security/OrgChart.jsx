import React, { useEffect, useState, useMemo } from 'react';
// import departmentService from '../services/departmentService';
import departmentService from "../../services/departmentService";
// --- COMPONENT CON: FORM MODAL ---
const DepartmentModal = ({ show, onClose, onSubmit, initialData, parentOptions }) => {
    const [formData, setFormData] = useState({ name: '', code: '', parent_id: '' });

    useEffect(() => {
        if (initialData) {
            setFormData({ name: initialData.name, code: initialData.code, parent_id: initialData.parent_id || '' });
        } else {
            setFormData({ name: '', code: '', parent_id: '' });
        }
    }, [initialData]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-gray-800">{initialData ? '✏️ Chỉnh sửa Phòng ban' : '✨ Thêm Phòng ban Mới'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tên Phòng ban</label>
                        <input 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="VD: Phòng Kinh doanh 1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mã Phòng (Code)</label>
                        <input 
                            value={formData.code} 
                            onChange={e => setFormData({...formData, code: e.target.value})}
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-600 font-bold"
                            placeholder="VD: SALE01"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Trực thuộc (Phòng Cha)</label>
                        <select 
                            value={formData.parent_id} 
                            onChange={e => setFormData({...formData, parent_id: e.target.value})}
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">-- Là Khối/Ban gốc (Root) --</option>
                            {parentOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Hủy</button>
                    <button 
                        onClick={() => onSubmit(formData)} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow"
                    >
                        {initialData ? 'Lưu Thay đổi' : 'Tạo mới'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH ---
const DepartmentTreeManager = () => {
    const [treeData, setTreeData] = useState([]);
    const [flatList, setFlatList] = useState([]); // Dùng để đổ vào dropdown chọn cha
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingNode, setEditingNode] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await departmentService.getTree();
            setTreeData(data);
            
            // Làm phẳng cây để đếm số liệu và làm dropdown
            const flatten = (nodes, list = []) => {
                nodes.forEach(node => {
                    list.push({ id: node.id, name: node.name, parent_id: node.parent_id });
                    if (node.children) flatten(node.children, list);
                });
                return list;
            };
            setFlatList(flatten(data));
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    // --- KPI CALCULATION ---
    const stats = useMemo(() => {
        if (!flatList.length) return null;
        
        // 1. Tổng số phòng
        const total = flatList.length;

        // 2. Số lượng Khối/Ban (Root nodes)
        const roots = treeData.length;

        // 3. Tính độ sâu của cây (Max Depth)
        const getDepth = (node) => {
            if (!node.children || node.children.length === 0) return 1;
            return 1 + Math.max(...node.children.map(getDepth));
        };
        const maxDepth = treeData.length > 0 ? Math.max(...treeData.map(getDepth)) : 0;

        return { total, roots, maxDepth };
    }, [flatList, treeData]);

    // --- HANDLERS ---
    const handleCreate = () => {
        setEditingNode(null);
        setShowModal(true);
    };

    const handleEdit = (node) => {
        setEditingNode(node);
        setShowModal(true);
    };

    const handleDelete = async (node) => {
        if (!window.confirm(`Xóa phòng ban: "${node.name}"?\n\nCẢNH BÁO: Tất cả phòng ban con và nhân sự trực thuộc có thể bị ảnh hưởng.`)) return;
        try {
            await departmentService.deleteDepartment(node.id);
            alert("Đã xóa thành công!");
            fetchData();
        } catch (error) { alert("Lỗi xóa: " + error.message); }
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingNode) {
                await departmentService.updateDepartment(editingNode.id, formData);
            } else {
                await departmentService.createDepartment(formData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) { alert("Lỗi lưu: " + error.message); }
    };

    // --- RENDER TREE NODE (Recursive) ---
    const renderTree = (nodes, level = 0) => {
        return nodes.map(node => (
            <div key={node.id} className="relative">
                {/* Connector Lines */}
                {level > 0 && (
                    <div className="absolute -left-4 top-0 w-4 h-8 border-l-2 border-b-2 border-gray-200 rounded-bl-lg -translate-y-4"></div>
                )}
                
                <div className={`
                    flex items-center justify-between p-3 mb-2 rounded-lg border hover:shadow-md transition-all group
                    ${level === 0 ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 ml-6'}
                `}>
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-8 h-8 rounded flex items-center justify-center text-lg font-bold
                            ${level === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}
                        `}>
                            {level === 0 ? '🏢' : '📂'}
                        </div>
                        <div>
                            <h4 className={`font-bold ${level === 0 ? 'text-gray-800 text-base' : 'text-gray-700 text-sm'}`}>
                                {node.name}
                            </h4>
                            <div className="flex gap-2 text-[10px] text-gray-500 font-mono">
                                <span className="bg-gray-100 px-1 rounded">ID: {node.id}</span>
                                <span className="bg-blue-50 text-blue-600 px-1 rounded border border-blue-100">{node.code}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions (Hiện khi hover) */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleEdit(node)} 
                            className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 shadow-sm" title="Sửa"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={() => handleDelete(node)}
                            className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 shadow-sm" title="Xóa"
                        >
                            🗑️
                        </button>
                    </div>
                </div>

                {/* Recursive Children */}
                {node.children && node.children.length > 0 && (
                    <div className="border-l-2 border-gray-100 ml-4 pl-0">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            
            {/* 1. HEADER & DASHBOARD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            🌳 Cấu trúc Tổ chức (Department Tree)
                        </h1>
                        <p className="text-sm text-gray-500">Thiết kế sơ đồ bộ máy và phân cấp quản lý</p>
                    </div>
                    <button 
                        onClick={handleCreate}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <span>➕</span> Thêm Phòng ban
                    </button>
                </div>

                {/* KPI CARDS */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center gap-4">
                            <div className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">🏢</div>
                            <div>
                                <p className="text-blue-500 text-xs font-bold uppercase">Tổng Quy mô</p>
                                <p className="text-2xl font-black text-blue-900">{stats.total} <span className="text-sm font-normal text-gray-500">đơn vị</span></p>
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-center gap-4">
                            <div className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">📶</div>
                            <div>
                                <p className="text-purple-500 text-xs font-bold uppercase">Độ sâu Bộ máy</p>
                                <p className="text-2xl font-black text-purple-900">{stats.maxDepth} <span className="text-sm font-normal text-gray-500">cấp quản lý</span></p>
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center gap-4">
                            <div className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">👑</div>
                            <div>
                                <p className="text-green-600 text-xs font-bold uppercase">Khối / Ban gốc</p>
                                <p className="text-2xl font-black text-green-900">{stats.roots} <span className="text-sm font-normal text-gray-500">nhánh lớn</span></p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* 2. MAIN TREE VIEW */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
                    {loading ? (
                        <div className="text-center py-20 text-gray-400">Đang tải sơ đồ...</div>
                    ) : treeData.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">🌱</div>
                            <p className="text-gray-500">Chưa có phòng ban nào.</p>
                            <button onClick={handleCreate} className="text-blue-600 font-bold hover:underline mt-2">Tạo cái đầu tiên ngay</button>
                        </div>
                    ) : (
                        <div className="max-w-3xl">
                            {renderTree(treeData)}
                        </div>
                    )}
                </div>

                {/* 3. ASSISTANT / GUIDANCE (BÊN PHẢI) */}
                <div className="w-full lg:w-80 space-y-6">
                    
                    {/* Hướng dẫn 1 */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                        <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                            📘 Nguyên tắc Thừa kế
                        </h3>
                        <p className="text-sm text-indigo-800 mb-3 leading-relaxed">
                            Trong hệ thống Backbone v5.0, quyền hạn dữ liệu (Data Scope) sẽ chảy từ trên xuống dưới:
                        </p>
                        <ul className="space-y-2 text-xs text-indigo-700">
                            <li className="flex gap-2">
                                <span>👇</span>
                                <span><b>Trưởng phòng cha</b> mặc định có thể xem báo cáo của tất cả <b>Phòng con</b>.</span>
                            </li>
                            <li className="flex gap-2">
                                <span>🚫</span>
                                <span>Xóa một phòng cha sẽ làm các phòng con bị "mồ côi" (mất liên kết). Hãy cân nhắc kỹ!</span>
                            </li>
                        </ul>
                    </div>

                    {/* Hướng dẫn 2 */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3">💡 Mẹo đặt Mã (Code)</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <p>Nên sử dụng quy tắc <b>PREFIX + NUMBER</b> để dễ quản lý API:</p>
                            <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                                <div>SALE01 - Kinh doanh 1</div>
                                <div>SALE02 - Kinh doanh 2</div>
                                <div>ACC_HN - Kế toán Hà Nội</div>
                                <div>HR_HCM - Nhân sự HCM</div>
                            </div>
                            <p className="text-xs italic text-gray-400">Mã này sẽ được dùng trong các hàm check quyền <code>$user-&gt;inDepartment('SALE01')</code>.</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* MODAL */}
            <DepartmentModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onSubmit={handleSubmit}
                initialData={editingNode}
                parentOptions={flatList.filter(i => i.id !== editingNode?.id)} // Không cho chọn chính mình làm cha
            />

        </div>
    );
};

export default DepartmentTreeManager;
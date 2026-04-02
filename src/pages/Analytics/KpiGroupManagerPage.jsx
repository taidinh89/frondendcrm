import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Icon } from '../../components/ui.jsx';

const GROUP_TYPES = [
    { value: 'employee', label: '👤 Nhân viên', placeholder: 'Kéo tên NV...' },
    { value: 'customer', label: '🏪 Khách hàng', placeholder: 'Mã KH...' },
    { value: 'supplier', label: '🤝 Nhà cung cấp', placeholder: 'Mã NCC...' },
    { value: 'product',  label: '📦 Sản phẩm', placeholder: 'Mã SP...' },
];

const DEPARTMENTS = [
    { value: 'sales',      label: 'Kinh doanh' },
    { value: 'accounting', label: 'Kế toán' },
    { value: 'purchasing', label: 'Mua hàng' },
    { value: 'hr',         label: 'Nhân sự' },
];

export const KpiGroupManagerPage = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [lookupList, setLookupList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        name: '',
        group_type: 'employee',
        department: 'sales',
        description: '',
        members: []
    });

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v2/kpi/groups');
            setGroups(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    // Load lookup data for members based on group_type
    useEffect(() => {
        if (!showModal) return;
        axios.get('/api/v2/kpi/lookup', { params: { type: form.group_type, department: form.department } })
            .then(r => setLookupList(r.data || []))
            .catch(() => setLookupList([]));
    }, [form.group_type, form.department, showModal]);

    const handleSave = async () => {
        if (!form.name) return alert('Vui lòng nhập tên nhóm');
        try {
            if (editingGroup) {
                await axios.put(`/api/v2/kpi/groups/${editingGroup.id}`, form);
            } else {
                await axios.post('/api/v2/kpi/groups', form);
            }
            setShowModal(false);
            fetchGroups();
        } catch (e) {
            alert('Lỗi: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xác nhận xóa nhóm này?')) return;
        await axios.delete(`/api/v2/kpi/groups/${id}`);
        fetchGroups();
    };

    const openCreate = () => {
        setEditingGroup(null);
        setForm({ name: '', group_type: 'employee', department: 'sales', description: '', members: [] });
        setShowModal(true);
    };

    const openEdit = (group) => {
        setEditingGroup(group);
        setForm({
            name: group.name,
            group_type: group.group_type,
            department: group.department,
            description: group.description || '',
            members: group.members || []
        });
        setShowModal(true);
    };

    const toggleMember = (mKey) => {
        setForm(f => ({
            ...f,
            members: f.members.includes(mKey) 
                ? f.members.filter(k => k !== mKey) 
                : [...f.members, mKey]
        }));
    };

    const filteredLookup = lookupList.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.key?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">👥 Quản lý Nhóm KPI</h1>
                    <p className="text-sm text-slate-500">Tạo nhóm nhân viên, khách hàng, sản phẩm tùy chỉnh để đặt KPI tập trung.</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Icon name="plus" className="w-4 h-4" /> Tạo nhóm mới
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 animate-pulse font-black text-slate-300">ĐANG TẢI...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map(g => (
                        <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {g.department} · {GROUP_TYPES.find(t => t.value === g.group_type)?.label}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => openEdit(g)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Icon name="edit" className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(g.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Icon name="trash" className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <h3 className="font-black text-slate-800 text-lg">{g.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{g.description || 'Không có mô tả'}</p>
                            
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {g.members?.slice(0, 5).map((m, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                                            {m.substring(0, 2)}
                                        </div>
                                    ))}
                                    {g.members?.length > 5 && (
                                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                                            +{g.members.length - 5}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-black text-slate-500">
                                    {g.members?.length || 0} thành viên
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                Code: {g.group_code}
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                            Chưa có nhóm nào. Hãy tạo nhóm đầu tiên!
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-black text-slate-800">
                                {editingGroup ? '✏️ Chỉnh sửa nhóm' : '➕ Tạo nhóm tùy chỉnh mới'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><Icon name="x" className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left: General Info */}
                            <div className="p-6 space-y-4 md:w-1/3 border-r overflow-y-auto">
                                <div>
                                    <label className="label-xs">Tên nhóm</label>
                                    <input type="text" className="input-base w-full" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="VD: Team Miền Bắc, VIP 1..."/>
                                </div>
                                <div>
                                    <label className="label-xs">Bộ phận</label>
                                    <select className="input-base w-full" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                                        {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-xs">Loại thành viên</label>
                                    <select className="input-base w-full" value={form.group_type} onChange={e => setForm({...form, group_type: e.target.value, members: []})}>
                                        {GROUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-xs">Mô tả</label>
                                    <textarea className="input-base w-full min-h-[80px]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ghi chú về nhóm này..."/>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Thống kê</div>
                                    <div className="text-2xl font-black text-blue-700">{form.members.length}</div>
                                    <div className="text-xs text-blue-600">Thành viên đã chọn</div>
                                </div>
                            </div>

                            {/* Right: Member Selection */}
                            <div className="flex-1 p-6 flex flex-col overflow-hidden">
                                <div className="mb-4 shrink-0">
                                    <label className="label-xs">Chọn thành viên</label>
                                    <div className="relative">
                                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            className="input-base w-full pl-10" 
                                            placeholder="Tìm kiếm..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-2 custom-scrollbar">
                                    {filteredLookup.map(item => {
                                        const isSelected = form.members.includes(item.key);
                                        return (
                                            <button 
                                                key={item.key}
                                                onClick={() => toggleMember(item.key)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                    isSelected ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                                                }`}>
                                                    {isSelected && <Icon name="check" className="w-3 h-3"/>}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={`text-xs font-black truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{item.name}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">{item.key}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {filteredLookup.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-slate-300 italic">Không tìm thấy kết quả</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-slate-50 flex gap-3 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Đóng</button>
                            <button onClick={handleSave} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">LƯU NHÓM</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .label-xs { display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; }
                .input-base { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #334155; outline: none; transition: all 0.2s; }
                .input-base:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
                .btn-primary { background: #2563eb; color: white; border-radius: 14px; padding: 10px 20px; font-size: 14px; font-weight: 900; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.2); transition: all 0.2s; }
                .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default KpiGroupManagerPage;

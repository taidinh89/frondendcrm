import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, Icon } from '../ui';

const DefinitionManagerTab = () => {
    const [definitions, setDefinitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: null });
    const [formData, setFormData] = useState({ type: 'scope', module: '', key: '', db_column: '', label: '', description: '' });

    useEffect(() => { fetchDefinitions(); }, []);

    const fetchDefinitions = async () => {
        try {
            const res = await axios.get('/api/security/definitions');
            setDefinitions(res.data);
        } catch (e) { toast.error("Lỗi tải danh mục định nghĩa"); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            if (modal.data) {
                await axios.put(`/api/security/definitions/${modal.data.id}`, formData);
                toast.success("Đã cập nhật định nghĩa");
            } else {
                await axios.post('/api/security/definitions', formData);
                toast.success("Khai báo mục quyền mới thành công! Đang chờ Developer triển khai.");
            }
            setModal({ open: false });
            fetchDefinitions();
        } catch (e) { toast.error(e.response?.data?.message || "Lỗi xử lý"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa định nghĩa này sẽ làm mất hiệu lực các bộ lọc SQL liên quan. Chắc chắn?")) return;
        try {
            await axios.delete(`/api/security/definitions/${id}`);
            toast.success("Đã xóa định nghĩa");
            fetchDefinitions();
        } catch (e) { toast.error("Lỗi khi xóa"); }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Đang nạp từ điển bảo mật...</div>;

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                    <h3 className="font-black text-blue-900 uppercase">Quản trị Mục quyền Hệ thống (Backbone Dictionary)</h3>
                    <p className="text-xs text-blue-600">Admin khai báo tại đây -&gt; Dev tạo cột trong DB -&gt; Đèn chuyển sang màu Xanh.</p>
                </div>
                <Button onClick={() => { 
                    setFormData({ type: 'scope', module: '', key: '', db_column: '', label: '', description: '' });
                    setModal({ open: true, data: null });
                }} variant="blue">+ Khai báo mục mới</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {definitions.map(item => (
                    <div key={item.id} className={`p-5 rounded-2xl border-2 transition-all bg-white shadow-sm hover:shadow-md ${
                        item.status === 'active' ? 'border-green-100' : 'border-gray-200'
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                item.type === 'scope' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                            }`}>{item.type}</span>
                            
                            {/* ĐÈN TỰ ĐỘNG: XANH (ACTIVE) - XÁM (PENDING) */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                                item.status === 'active' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${item.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className="text-[10px] font-black uppercase">{item.status}</span>
                            </div>
                        </div>

                        <h4 className="font-bold text-gray-800 text-lg">{item.label}</h4>
                        <div className="text-[10px] font-mono text-gray-400 mb-3 italic">Key: {item.key} | Cột: {item.db_column || 'N/A'}</div>
                        <p className="text-xs text-gray-500 line-clamp-2 h-8">{item.description || 'Chưa có mô tả chi tiết.'}</p>

                        <div className="mt-6 flex justify-between items-center border-t pt-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.module}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { 
                                    setFormData(item); setModal({ open: true, data: item }); 
                                }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL KHAI BÁO */}
            {modal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleUp">
                        <div className="p-6 border-b font-black text-xl bg-gray-50">
                            {modal.data ? 'Cập nhật định nghĩa' : 'Khai báo mục quyền mới'}
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Loại quyền</label>
                                    <select className="w-full border-2 rounded-xl p-2.5 mt-1" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option value="scope">Scope (Lọc SQL)</option>
                                        <option value="policy">Policy (Chặn hành vi)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm module</label>
                                    <input className="w-full border-2 rounded-xl p-2.5 mt-1" placeholder="Ví dụ: Sepay, Kho" value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Mã khóa (Key - Phải khớp với Code)</label>
                                <input className="w-full border-2 rounded-xl p-2.5 mt-1 font-mono text-blue-600" placeholder="Ví dụ: banks, warehouses" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value.toLowerCase()})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Tên hiển thị trên Giao diện</label>
                                <input className="w-full border-2 rounded-xl p-2.5 mt-1" placeholder="Ví dụ: Số tài khoản ngân hàng" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
                            </div>
                            {formData.type === 'scope' && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên cột trong Database (Để Core tự lọc)</label>
                                    <input className="w-full border-2 rounded-xl p-2.5 mt-1 font-mono" placeholder="Ví dụ: account_number" value={formData.db_column} onChange={e => setFormData({...formData, db_column: e.target.value})} />
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t">
                            <button onClick={() => setModal({open: false})} className="font-bold text-gray-400">Hủy</button>
                            <Button onClick={handleSave} variant="blue">LƯU ĐỊNH NGHĨA</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DefinitionManagerTab;
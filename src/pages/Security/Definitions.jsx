import React, { useEffect, useState, useMemo } from 'react';
import securityService from '../../services/securityService';
import SuperTable from '../../components/ui/SuperTable';

const Definitions = () => {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDef, setEditingDef] = useState(null);
  const [formData, setFormData] = useState({ type: 'scope', key: '', label: '', module: '' });

  useEffect(() => { loadData(); }, []);

  // --- LOGIC PHÂN TÍCH SỐ LIỆU ---
  const stats = useMemo(() => {
    return {
      total: definitions.length,
      scopes: definitions.filter(d => d.type === 'scope').length,
      policies: definitions.filter(d => d.type === 'policy').length,
      modules: [...new Set(definitions.map(d => d.module))].length
    };
  }, [definitions]);

  // --- API ---
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await securityService.getDefinitions();
      setDefinitions(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.key || !formData.label) return alert("Thiếu thông tin Key/Label");
    try {
      editingDef 
        ? await securityService.updateDefinition(editingDef.id, formData)
        : await securityService.createDefinition(formData);
      setShowModal(false); loadData();
    } catch (error) { alert("Lỗi: " + error.message); }
  };

  const handleDelete = async (row) => {
    if (window.confirm(`Xóa định nghĩa "${row.key}"?`)) {
      await securityService.deleteDefinition(row.id); loadData();
    }
  };

  const handleEdit = (row) => {
    setEditingDef(row); setFormData(row); setShowModal(true);
  };

  const handleCreate = () => {
    setEditingDef(null); setFormData({ type: 'scope', key: '', label: '', module: '' }); setShowModal(true);
  };

  // --- COLUMNS ---
  const columns = [
    { header: 'Loại', accessor: 'type', sortable: true,
      render: (row) => row.type === 'scope' 
        ? <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">📡 Scope (Lọc)</span>
        : <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">🛡️ Policy (Chặn)</span>
    },
    { header: 'Mã Key (Dev dùng)', accessor: 'key', sortable: true,
      render: (row) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-red-600 font-mono">{row.key}</code>
    },
    { header: 'Tên hiển thị (Admin xem)', accessor: 'label', sortable: true, className: 'font-medium' },
    { header: 'Module', accessor: 'module', sortable: true, className: 'text-gray-500 italic' }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* 1. DASHBOARD */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Từ điển Dữ liệu & Chính sách</h1>
            <p className="text-sm text-gray-500">Quy hoạch các biến số bảo mật cho Developers</p>
          </div>
          <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow">+ Khai báo Mới</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <p className="text-blue-500 text-[10px] font-bold uppercase">Tổng định nghĩa</p>
              <p className="text-3xl font-black text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
              <p className="text-indigo-500 text-[10px] font-bold uppercase">Phạm vi (Lọc)</p>
              <p className="text-3xl font-black text-indigo-800">{stats.scopes}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded border border-purple-100">
              <p className="text-purple-500 text-[10px] font-bold uppercase">Chính sách (Chặn)</p>
              <p className="text-3xl font-black text-purple-800">{stats.policies}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-100">
              <p className="text-gray-500 text-[10px] font-bold uppercase">Số Modules</p>
              <p className="text-3xl font-black text-gray-800">{stats.modules}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. TABLE */}
      <SuperTable data={definitions} columns={columns} isLoading={loading} onEdit={handleEdit} onDelete={handleDelete} pageSize={10} />

      {/* 3. TƯ VẤN KỸ THUẬT (Dựa trên số liệu) */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📘 GIẢI THÍCH & HƯỚNG DẪN DÙNG:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          
          <div className="p-4 bg-blue-50 rounded border border-blue-100">
            <strong className="text-blue-800 block mb-2 text-lg">📡 Scope (Hiện có: {stats.scopes})</strong>
            <p className="mb-2">Là các từ khóa dùng để <b>LỌC DỮ LIỆU</b> (Lớp 2).</p>
            <ul className="list-disc ml-5 text-gray-600 space-y-1">
              <li>Ví dụ: <code>store_id</code>, <code>branch_code</code>, <code>warehouse_type</code>.</li>
              <li><b>Admin làm gì?</b> Khai báo Key ở đây -&gt; Vào trang Role chọn giá trị cho key đó (VD: Chọn "Kho Hà Nội" cho key <code>warehouse</code>).</li>
              <li><b>Dev làm gì?</b> Đảm bảo trong Database có cột tương ứng với Key này.</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded border border-purple-100">
            <strong className="text-purple-800 block mb-2 text-lg">🛡️ Policy (Hiện có: {stats.policies})</strong>
            <p className="mb-2">Là các từ khóa dùng để <b>CHẶN HÀNH VI</b> (Lớp 3).</p>
            <ul className="list-disc ml-5 text-gray-600 space-y-1">
              <li>Ví dụ: <code>block_excel</code>, <code>mask_phone_number</code>, <code>limit_daily_view</code>.</li>
              <li><b>Admin làm gì?</b> Khai báo Key -&gt; Vào trang Role bật/tắt (True/False) cho key này.</li>
              <li><b>Dev làm gì?</b> Viết Middleware hoặc logic trong code để check: <code>if (user.cant('block_excel')) ...</code></li>
            </ul>
          </div>

        </div>
      </div>

      {/* MODAL (Giữ nguyên form nhập liệu đơn giản) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-96 shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{editingDef ? 'Sửa Định nghĩa' : 'Khai báo Mới'}</h3>
            <div className="space-y-3">
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border p-2 rounded">
                <option value="scope">📡 Scope (Phạm vi dữ liệu)</option>
                <option value="policy">🛡️ Policy (Chính sách hành vi)</option>
              </select>
              <input value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} placeholder="Mã Key (VD: store_id)" className="w-full border p-2 rounded font-mono text-red-600" />
              <input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="Tên hiển thị (VD: Lọc theo Cửa hàng)" className="w-full border p-2 rounded" />
              <input value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} placeholder="Module (VD: Sales)" className="w-full border p-2 rounded" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Definitions;
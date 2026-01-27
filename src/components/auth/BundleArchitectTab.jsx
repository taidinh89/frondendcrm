import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BundleArchitectTab = () => {
  // --- STATES QUẢN LÝ DỮ LIỆU ---
  const [bundles, setBundles] = useState([]); // Danh sách Bó quyền (Roles)
  const [selectedBundle, setSelectedBundle] = useState(null); // Bó quyền đang chọn
  const [permissions, setPermissions] = useState({}); // Danh sách quyền L1 nhóm theo Module
  const [definitions, setDefinitions] = useState([]); // Định nghĩa L2 & L3 từ Backend
  const [loading, setLoading] = useState(true);

  // --- STATES UI ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');

  // 1. TẢI DỮ LIỆU ĐỒNG BỘ TỪ BACKEND
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, pRes, dRes] = await Promise.all([
        axios.get('/api/security/roles?per_page=100'),
        axios.get('/api/security/permissions/list'),
        axios.get('/api/security/definitions') // Lấy chốt chặn động L2, L3
      ]);

      const roleData = rRes.data.data.filter(r => r.name !== 'Super Admin');
      setBundles(roleData);
      setDefinitions(dRes.data || []);

      // Nhóm quyền L1 (Functional) theo Module (vd: sales, customer)
      const groups = {};
      pRes.data.forEach(p => {
        const mod = p.name?.split('.')[0]?.toUpperCase() || 'HỆ THỐNG';
        if (!groups[mod]) groups[mod] = [];
        groups[mod].push(p);
      });
      setPermissions(groups);

      // Tự động chọn Bó quyền đầu tiên nếu chưa chọn
      if (roleData.length > 0 && !selectedBundle) {
        setSelectedBundle(roleData[0]);
      } else if (selectedBundle) {
        // Cập nhật lại dữ liệu cho Bó quyền đang chọn sau khi load lại
        const updated = roleData.find(r => r.id === selectedBundle.id);
        if (updated) setSelectedBundle(updated);
      }
    } catch (e) {
      toast.error('Lỗi tải cấu hình: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. CÁC HÀM NGHIỆP VỤ QUẢN TRỊ BÓ QUYỀN (GIỮ NGUYÊN TÍNH NĂNG CỦA BẠN)
  
  const handleCreateNew = async () => {
    if (!newBundleName.trim()) return toast.warning('Vui lòng nhập tên bó quyền');
    try {
      await axios.post('/api/security/roles', { name: newBundleName.trim() });
      toast.success('Đã tạo bó quyền mới');
      setNewBundleName('');
      fetchData();
    } catch (e) { toast.error('Lỗi tạo bó quyền'); }
  };

  const handleClone = async (id) => {
    try {
      await axios.post(`/api/security/roles/${id}/clone`); // Route clone từ Backend
      toast.success('Nhân bản thành công');
      fetchData();
    } catch (e) { toast.error('Lỗi nhân bản'); }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm("Cảnh báo: Xóa bó quyền này sẽ ảnh hưởng đến các nhân sự đang sử dụng. Tiếp tục?")) return;
    try {
      await axios.delete(`/api/security/roles/${id}`);
      toast.success('Đã xóa bó quyền');
      if (selectedBundle?.id === id) setSelectedBundle(null);
      fetchData();
    } catch (e) { toast.error('Không thể xóa: ' + (e.response?.data?.message || 'Lỗi hệ thống')); }
  };

  // 3. LƯU TỔNG THỂ 3 LỚP (L1 - L2 - L3)
  const handleSaveAll = async () => {
    try {
      await axios.put(`/api/security/roles/${selectedBundle.id}`, {
        name: selectedBundle.name,
        permissions: selectedBundle.permissions?.map(p => p.name) || [], // Lớp 1
        data_scopes: selectedBundle.data_scopes || {}, // Lớp 2
        access_policies: selectedBundle.access_policies || {}, // Lớp 3
      });
      toast.success('Đã đồng bộ chốt chặn cho ' + selectedBundle.name);
      setIsEditingName(false);
      fetchData();
    } catch (e) { toast.error('Lỗi lưu: ' + (e.response?.data?.message || 'Lỗi hệ thống')); }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-blue-600">SYNCING BACKBONE...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[850px] bg-white p-2">
      
      {/* --- SIDEBAR: DANH SÁCH BÓ QUYỀN --- */}
      <div className="w-full lg:w-80 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-white/50">
          <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Danh mục Bó quyền</h4>
          <div className="flex gap-2">
            <input 
              value={newBundleName} 
              onChange={e => setNewBundleName(e.target.value)}
              placeholder="Tên mới..." 
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={handleCreateNew} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">➕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bundles.map(bundle => (
            <div 
              key={bundle.id}
              onClick={() => { setSelectedBundle(bundle); setIsEditingName(false); }}
              className={`group p-4 rounded-2xl cursor-pointer transition-all flex justify-between items-center ${selectedBundle?.id === bundle.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-white border border-transparent'}`}
            >
              <span className="font-bold text-sm truncate">{bundle.name}</span>
              <div className={`flex gap-2 transition-opacity ${selectedBundle?.id === bundle.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button onClick={(e) => { e.stopPropagation(); handleClone(bundle.id); }} title="Nhân bản" className="hover:scale-120">📑</button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(bundle.id); }} title="Xóa" className="text-red-400 hover:text-red-600">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- PANEL CHÍNH: CẤU HÌNH 3 LỚP BẢO MẬT --- */}
      {selectedBundle && (
        <div className="flex-1 bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 p-8 flex flex-col overflow-hidden">
          
          {/* Header: Edit Name & Save */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10 border-b border-gray-50 pb-8">
            <div className="flex-1 w-full">
              {isEditingName ? (
                <div className="flex gap-2">
                  <input 
                    autoFocus 
                    value={selectedBundle.name} 
                    onChange={e => setSelectedBundle({ ...selectedBundle, name: e.target.value })}
                    className="text-3xl font-black text-gray-800 border-b-4 border-blue-600 outline-none w-full bg-transparent"
                  />
                  <button onClick={() => setIsEditingName(false)} className="text-green-500 text-2xl">✓</button>
                </div>
              ) : (
                <h2 
                  onClick={() => setIsEditingName(true)} 
                  className="text-4xl font-black text-gray-800 tracking-tighter cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {selectedBundle.name} <span className="text-sm align-middle opacity-30">✏️</span>
                </h2>
              )}
              <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">ID Bó quyền: {selectedBundle.id} • Chế độ: Commander v5.0</p>
            </div>
            <button 
              onClick={handleSaveAll} 
              className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
            >
              Lưu thay đổi hệ thống
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-12 custom-scrollbar">
            
            {/* LỚP 1: MA TRẬN QUYỀN CHỨC NĂNG (Functional Matrix) */}
            <section>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-600"></span> Layer 1: Chốt chặn Chức năng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.keys(permissions).map(mod => (
                  <div key={mod} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                    <h4 className="font-black text-gray-400 text-[10px] uppercase mb-4 tracking-wider">{mod} MODULE</h4>
                    <div className="space-y-3">
                      {permissions[mod].map(perm => (
                        <label key={perm.id} className="flex items-center gap-3 group cursor-pointer">
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={selectedBundle.permissions?.some(bp => bp.id === perm.id)}
                              onChange={() => {
                                const has = selectedBundle.permissions?.some(bp => bp.id === perm.id);
                                const newPerms = has 
                                  ? selectedBundle.permissions.filter(bp => bp.id !== perm.id)
                                  : [...(selectedBundle.permissions || []), perm];
                                setSelectedBundle({ ...selectedBundle, permissions: newPerms });
                              }}
                              className="w-5 h-5 accent-blue-600 rounded-lg cursor-pointer"
                            />
                          </div>
                          <span className={`text-sm font-bold transition-colors ${selectedBundle.permissions?.some(bp => bp.id === perm.id) ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            {perm.description || perm.name.split('.').slice(1).join(' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LỚP 2 & 3: ĐỊNH NGHĨA ĐỘNG TỪ BACKEND */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-10">
              
              {/* Layer 2: Scopes (Vùng dữ liệu) */}
              <section className="bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-100/50">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-8">Layer 2: Phạm vi dữ liệu</h3>
                <div className="space-y-6">
                  {definitions.filter(d => d.type === 'scope').map(def => (
                    <div key={def.key}>
                      <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">{def.label}</label>
                      <input 
                        type="text" 
                        value={selectedBundle.data_scopes?.[def.key]?.join(', ') || ''}
                        onChange={e => {
                          const val = e.target.value.split(',').map(x => x.trim()).filter(x => x);
                          setSelectedBundle({
                            ...selectedBundle,
                            data_scopes: { ...(selectedBundle.data_scopes || {}), [def.key]: val }
                          });
                        }}
                        placeholder="VD: 1, 5, 10 (Để trống = Không giới hạn)"
                        className="w-full px-5 py-4 bg-white border border-blue-100 rounded-2xl text-sm font-bold text-blue-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                      />
                    </div>
                  ))}
                  {definitions.filter(d => d.type === 'scope').length === 0 && (
                    <div className="text-xs italic text-gray-400 text-center py-4">Chưa có định nghĩa Scope nào từ Backend.</div>
                  )}
                </div>
              </section>

              {/* Layer 3: Policies (Chính sách chốt chặn) */}
              <section className="bg-orange-50/30 p-8 rounded-[2.5rem] border border-orange-100/50">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] mb-8">Layer 3: Chốt chặn Chính sách</h3>
                <div className="space-y-4">
                  {definitions.filter(d => d.type === 'policy').map(def => (
                    <div key={def.key} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-orange-100/50 shadow-sm group hover:border-orange-300 transition-all">
                      <span className="text-sm font-bold text-gray-700">{def.label}</span>
                      <button 
                        onClick={() => {
                          const curr = !!selectedBundle.access_policies?.[def.key];
                          setSelectedBundle({
                            ...selectedBundle,
                            access_policies: { ...(selectedBundle.access_policies || {}), [def.key]: !curr }
                          });
                        }}
                        className={`relative w-14 h-7 rounded-full transition-all shadow-inner ${selectedBundle.access_policies?.[def.key] ? 'bg-orange-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${selectedBundle.access_policies?.[def.key] ? 'left-8' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                  {definitions.filter(d => d.type === 'policy').length === 0 && (
                    <div className="text-xs italic text-gray-400 text-center py-4">Chưa có định nghĩa Policy nào từ Backend.</div>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BundleArchitectTab;
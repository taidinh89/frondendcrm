import React, { useEffect, useState, useMemo } from 'react';
import securityService from '../../services/securityService';
import SuperTable from '../../components/ui/SuperTable';

const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [permissionMatrix, setPermissionMatrix] = useState({}); 
  const [selectedPermissions, setSelectedPermissions] = useState([]); 
  const [formData, setFormData] = useState({ name: '', data_scopes: '{}', access_policies: '{}' });
  const [scopeType, setScopeType] = useState('custom');

  useEffect(() => { loadRoles(); loadPermissionMatrix(); }, []);

  // --- LOGIC PHÂN TÍCH SỐ LIỆU (REAL-TIME ADVICE) ---
  const stats = useMemo(() => {
    if (!roles.length) return null;
    
    // Đếm Role quyền lực (Global)
    const globalRoles = roles.filter(r => {
      const scope = typeof r.data_scopes === 'string' ? JSON.parse(r.data_scopes || '{}') : r.data_scopes;
      return scope?.view_type === 'global';
    });

    // Đếm Role rác (Không có quyền nào)
    const emptyRoles = roles.filter(r => (r.permissions?.length || 0) === 0);

    return {
      total: roles.length,
      globalCount: globalRoles.length,
      emptyCount: emptyRoles.length,
      avgPerms: Math.round(roles.reduce((acc, r) => acc + (r.permissions?.length || 0), 0) / roles.length)
    };
  }, [roles]);

  // --- API CALLS ---
  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await securityService.getRoles({ per_page: 100 });
      setRoles(res.data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const loadPermissionMatrix = async () => {
    try {
      const res = await securityService.getSystemHealth();
      setPermissionMatrix(res.matrix);
    } catch (error) { console.error(error); }
  };

  // --- HANDLERS ---
  const handleCreate = () => {
    setEditingRole(null); setFormData({ name: '', data_scopes: '{}', access_policies: '{}' });
    setSelectedPermissions([]); setScopeType('own'); setShowModal(true);
  };

  const handleEdit = async (role) => {
    setEditingRole(role);
    try {
      const res = await securityService.getRoleDetail(role.id);
      const scopes = res.role.data_scopes || {};
      let type = 'custom';
      if (!Object.keys(scopes).length || scopes.view_type === 'own_only') type = 'own';
      else if (scopes.department === 'own') type = 'department';
      else if (scopes.view_type === 'global') type = 'global';

      setScopeType(type);
      setFormData({
        name: res.role.name,
        data_scopes: JSON.stringify(scopes, null, 2),
        access_policies: JSON.stringify(res.role.access_policies || {}, null, 2)
      });
      setSelectedPermissions(res.assigned_permissions || []);
      setShowModal(true);
    } catch (error) { alert(error.message); }
  };

  const handleSave = async () => {
    if (!formData.name) return alert("Thiếu tên chức danh");
    try {
      const payload = {
        name: formData.name, permissions: selectedPermissions,
        data_scopes: JSON.parse(formData.data_scopes),
        access_policies: JSON.parse(formData.access_policies)
      };
      editingRole ? await securityService.updateRole(editingRole.id, payload) : await securityService.createRole(payload);
      setShowModal(false); loadRoles(); alert("Đã lưu thành công!");
    } catch (error) { alert("Lỗi JSON hoặc Server: " + error.message); }
  };

  const handleClone = async (role) => {
    if (window.confirm(`Nhân bản "${role.name}"?`)) {
      await securityService.cloneRole(role.id); loadRoles();
    }
  };

  const handleDelete = async (role) => {
    if (window.confirm(`Xóa "${role.name}"?`)) {
      await securityService.deleteRole(role.id); loadRoles();
    }
  };

  const handleScopeTypeChange = (type) => {
    setScopeType(type);
    let newJson = '{}';
    if (type === 'own') newJson = JSON.stringify({ view_type: 'own_only' }, null, 2);
    if (type === 'department') newJson = JSON.stringify({ department: 'own' }, null, 2);
    if (type === 'global') newJson = JSON.stringify({ view_type: 'global' }, null, 2);
    setFormData(prev => ({ ...prev, data_scopes: newJson }));
  };

  const toggleModule = (perms) => {
    const names = perms.map(p => p.name);
    const allSelected = names.every(n => selectedPermissions.includes(n));
    setSelectedPermissions(prev => allSelected ? prev.filter(n => !names.includes(n)) : [...new Set([...prev, ...names])]);
  };

  // --- COLUMNS ---
  const columns = [
    { header: 'Chức danh', accessor: 'name', sortable: true, className: 'font-bold text-gray-800' },
    { header: 'Quyền hạn', accessor: 'permissions_count', sortable: true,
      render: (row) => <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">🛡️ {row.permissions?.length || 0} quyền</span>
    },
    { header: 'Phạm vi (Scope)', accessor: 'data_scopes',
      render: (row) => {
        const s = row.data_scopes || {};
        if (s.view_type === 'global') return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">🌍 Toàn cục</span>;
        if (s.department === 'own') return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">📂 Phòng ban</span>;
        return <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">👤 Cá nhân</span>;
      }
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* 1. DASHBOARD & KPI */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Thư viện Chức danh</h1>
            <p className="text-sm text-gray-500">Quản lý các gói quyền hạn (Roles)</p>
          </div>
          <button onClick={handleCreate} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow flex items-center gap-2">
            <span>➕</span> Tạo Chức danh Mới
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <p className="text-blue-500 text-[10px] font-bold uppercase">Tổng Chức danh</p>
              <p className="text-3xl font-black text-blue-800">{stats.total}</p>
            </div>
            <div className={`p-3 rounded border ${stats.globalCount > 2 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`${stats.globalCount > 2 ? 'text-red-500' : 'text-gray-500'} text-[10px] font-bold uppercase`}>Quyền Toàn Cục</p>
              <p className={`text-3xl font-black ${stats.globalCount > 2 ? 'text-red-800' : 'text-gray-800'}`}>{stats.globalCount}</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
              <p className="text-indigo-500 text-[10px] font-bold uppercase">Trung bình</p>
              <p className="text-3xl font-black text-indigo-800">{stats.avgPerms} <span className="text-xs text-indigo-400">quyền/role</span></p>
            </div>
            <div className={`p-3 rounded border ${stats.emptyCount > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`${stats.emptyCount > 0 ? 'text-orange-500' : 'text-green-600'} text-[10px] font-bold uppercase`}>Role Rỗng (Rác)</p>
              <p className={`text-3xl font-black ${stats.emptyCount > 0 ? 'text-orange-800' : 'text-green-800'}`}>{stats.emptyCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUPER TABLE */}
      <SuperTable data={roles} columns={columns} isLoading={loading} onEdit={handleEdit} onClone={handleClone} onDelete={handleDelete} pageSize={10} actionWidth="160px" />

      {/* 3. TƯ VẤN THÔNG MINH (Dựa trên số liệu thật) */}
      {stats && (
        <div className="mt-6 bg-white border-l-4 border-indigo-500 rounded-r-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">🤖 TRỢ LÝ HỆ THỐNG KHUYẾN NGHỊ:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            
            {/* Tư vấn về Global Role */}
            {stats.globalCount > 3 ? (
              <li className="flex items-start text-red-600">
                <span className="mr-2">⚠️</span>
                <b>Cảnh báo bảo mật:</b> Bạn đang có tới <b>{stats.globalCount} chức danh</b> xem được toàn bộ dữ liệu công ty. 
                Hãy rà soát lại, chỉ nên cấp quyền này cho: <i>Giám đốc, Kế toán trưởng, Admin</i>. Các vị trí khác nên chuyển về "Phòng ban" hoặc "Cá nhân".
              </li>
            ) : (
              <li className="flex items-start text-green-700">
                <span className="mr-2">✅</span>
                Số lượng Role toàn cục ({stats.globalCount}) đang ở mức an toàn.
              </li>
            )}

            {/* Tư vấn về Role rác */}
            {stats.emptyCount > 0 ? (
              <li className="flex items-start text-orange-600">
                <span className="mr-2">🧹</span>
                <b>Dọn dẹp:</b> Hệ thống phát hiện <b>{stats.emptyCount} chức danh rỗng</b> (chưa gán quyền nào). 
                Hãy bấm nút 🗑️ xóa chúng đi để danh sách gọn gàng hơn.
              </li>
            ) : (
              <li className="flex items-start text-green-700">
                <span className="mr-2">✅</span>
                Dữ liệu sạch sẽ, không có chức danh rác.
              </li>
            )}
            
            <li className="flex items-start text-blue-600">
              <span className="mr-2">ℹ️</span>
              <b>Mẹo:</b> Sử dụng tính năng <b>Nhân bản (Clone)</b> 📑 để tạo nhanh chức danh tương tự nhau (VD: tạo "Sale Hà Nội" từ "Sale Admin") thay vì tạo mới từ đầu.
            </li>
          </ul>
        </div>
      )}

      {/* MODAL (GIỮ NGUYÊN CODE CŨ CỦA MODAL ĐỂ TIẾT KIỆM DÒNG - CHỈ COPY PHẦN TRÊN) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-gray-50 flex justify-between"><h2 className="font-bold">Chỉnh sửa Chức danh</h2><button onClick={() => setShowModal(false)}>✕</button></div>
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 p-6 overflow-y-auto border-r">
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 mb-4 font-bold" placeholder="Tên chức danh..." />
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(permissionMatrix).map(group => (
                    <div key={group} className="border p-3 rounded bg-gray-50">
                      <div className="flex justify-between font-bold text-sm mb-2"><span>{group}</span><button onClick={() => toggleModule(permissionMatrix[group])} className="text-blue-600 text-xs">Chọn hết</button></div>
                      <div className="max-h-32 overflow-y-auto">
                        {permissionMatrix[group].map(p => (
                          <label key={p.name} className="flex gap-2 text-sm p-1 hover:bg-white cursor-pointer">
                            <input type="checkbox" checked={selectedPermissions.includes(p.name)} onChange={() => setSelectedPermissions(prev => prev.includes(p.name)?prev.filter(x=>x!==p.name):[...prev,p.name])} />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-96 bg-gray-50 p-6">
                <label className="font-bold text-xs mb-2 block">PHẠM VI (LỚP 2)</label>
                <select value={scopeType} onChange={e => handleScopeTypeChange(e.target.value)} className="w-full border p-2 mb-2 rounded">
                  <option value="own">👤 Cá nhân</option><option value="department">📂 Phòng ban</option><option value="global">🌍 Toàn cục</option><option value="custom">🔧 Tùy chỉnh</option>
                </select>
                {scopeType==='custom' && <textarea value={formData.data_scopes} onChange={e=>setFormData({...formData, data_scopes:e.target.value})} className="w-full border p-2 text-xs font-mono h-24 mb-4"/>}
                
                <label className="font-bold text-xs mb-2 block">CHÍNH SÁCH (LỚP 3)</label>
                <textarea value={formData.access_policies} onChange={e=>setFormData({...formData, access_policies:e.target.value})} className="w-full border p-2 text-xs font-mono h-24"/>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2"><button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded">Hủy</button><button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Lưu</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManager;
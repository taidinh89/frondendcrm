import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Activity, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import monitorConfigService from '../services/monitorConfigService';

const MonitorServiceManager = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ id: null, name: '', keyword: '', is_active: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await monitorConfigService.getAll();
      setServices(data);
    } catch (error) {
      toast.error("Không thể tải cấu hình giám sát");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await monitorConfigService.update(formData.id, formData);
        toast.success("Cập nhật thành công!");
      } else {
        await monitorConfigService.create(formData);
        toast.success("Thêm mới thành công!");
      }
      setIsEditing(false);
      setFormData({ id: null, name: '', keyword: '', is_active: true });
      loadData(); // Reload list
    } catch (error) {
      toast.error("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa dịch vụ này?")) return;
    try {
      await monitorConfigService.delete(id);
      toast.success("Đã xóa dịch vụ");
      loadData();
    } catch (error) {
      toast.error("Không thể xóa dịch vụ");
    }
  };

  const handleEdit = (service) => {
    setFormData(service);
    setIsEditing(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            Cấu hình Mục tiêu Giám sát
          </h1>
          <p className="text-sm text-gray-500">Quản lý các dịch vụ (Service) được hệ thống tự động theo dõi.</p>
        </div>
        <button 
          onClick={() => { setFormData({ id: null, name: '', keyword: '', is_active: true }); setIsEditing(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Thêm Dịch vụ
        </button>
      </div>

      {/* FORM MODAL (Đơn giản hóa) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">{formData.id ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ Mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên Dịch vụ (Service Name)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded mt-1 uppercase" 
                  placeholder="VD: SHOPEE"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Từ khóa nhận diện (Domain/URL)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded mt-1" 
                  placeholder="VD: shopee.vn, api.shopee"
                  value={formData.keyword}
                  onChange={e => setFormData({...formData, keyword: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Phân cách bằng dấu phẩy nếu có nhiều domain.</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Tên Dịch vụ</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Từ khóa (Keywords)</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((svc) => (
              <tr key={svc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{svc.name}</td>
                <td className="px-6 py-4 font-mono text-sm text-blue-600">{svc.keyword}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {svc.is_active ? 'Đang theo dõi' : 'Tạm dừng'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(svc)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Sửa</button>
                  <button onClick={() => handleDelete(svc.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Xóa</button>
                </td>
              </tr>
            ))}
            {services.length === 0 && !loading && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">Chưa có dịch vụ nào được cấu hình.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonitorServiceManager;
import axios from 'axios';

// Đảm bảo bạn đã cấu hình base URL trong axios instance của dự án
// Nếu chưa, hãy thay 'axios' bằng instance đã cấu hình (ví dụ: apiConfig)
const API_URL = '/api/security'; 

const securityService = {
  // 1. Lấy dữ liệu Ma trận & Sức khỏe hệ thống (Dashboard + Matrix)
  getSystemHealth: async () => {
    try {
      const response = await axios.get(`${API_URL}/permissions/matrix`);
      return response.data; // Trả về { overview, matrix }
    } catch (error) {
      console.error("Lỗi tải dữ liệu bảo mật:", error);
      throw error;
    }
  },

  // 2. Kích hoạt Máy quét & Đồng bộ (Vá lỗ hổng)
  syncPermissions: async () => {
    try {
      const response = await axios.post(`${API_URL}/permissions/sync`);
      return response.data;
    } catch (error) {
      console.error("Lỗi đồng bộ quyền:", error);
      throw error;
    }
  },

  // 3. Cập nhật trạng thái quyền (Bật/Tắt đèn xanh đỏ)
  updatePermissionStatus: async (id, status) => {
    try {
      const response = await axios.put(`${API_URL}/permissions/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 4. Cập nhật thông tin hiển thị (Label)
  updatePermissionInfo: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/permissions/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // 5. Tạo quyền thủ công (Pre-define)
  createPermission: async (data) => {
    try {
      // Gọi đến API store của Controller
      const response = await axios.post(`${API_URL}/permissions`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },


  // 6. Lấy danh sách Role
  getRoles: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/roles`, { params });
      return response.data;
    } catch (error) { throw error; }
  },

  // 7. Lấy chi tiết 1 Role (kèm permissions đã gán)
  getRoleDetail: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/roles/${id}`);
      return response.data; // Trả về { role, assigned_permissions }
    } catch (error) { throw error; }
  },

  // 8. Tạo mới Role
  createRole: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/roles`, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 9. Cập nhật Role (Tên + Quyền + Scope)
  updateRole: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/roles/${id}`, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 10. Nhân bản Role (Clone)
  cloneRole: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/roles/${id}/clone`);
      return response.data;
    } catch (error) { throw error; }
  },

  // 11. Xóa Role
  deleteRole: async (id) => {
    try {
      await axios.delete(`${API_URL}/roles/${id}`);
    } catch (error) { throw error; }
  },

  // === ĐỊNH NGHĨA THAM SỐ (SCOPES & POLICIES) ===

  // 12. Lấy danh sách định nghĩa
  getDefinitions: async () => {
    try {
      const response = await axios.get(`${API_URL}/definitions`);
      return response.data; // Trả về mảng các definitions
    } catch (error) { throw error; }
  },

  // 13. Tạo định nghĩa mới
  createDefinition: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/definitions`, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 14. Cập nhật định nghĩa
  updateDefinition: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/definitions/${id}`, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 15. Xóa định nghĩa
  deleteDefinition: async (id) => {
    try {
      await axios.delete(`${API_URL}/definitions/${id}`);
    } catch (error) { throw error; }
  }
};


export default securityService;
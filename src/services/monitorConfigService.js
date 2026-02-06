// Trỏ ra thư mục cha để lấy cấu hình axiosGlobal
import axios from '../axiosGlobal';

const monitorConfigService = {
  // 1. Lấy danh sách dịch vụ
  // Gọi vào: api/security/monitor-services
  getAll: async () => {
    try {
      const response = await axios.get('/api/v2/security/monitor-services');
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy danh sách cấu hình:", error);
      throw error;
    }
  },

  // 2. Thêm dịch vụ mới
  // Gọi vào: POST api/security/monitor-services
  create: async (data) => {
    try {
      const response = await axios.post('/api/v2/security/monitor-services', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 3. Cập nhật dịch vụ
  // Gọi vào: PUT api/security/monitor-services/{id}
  update: async (id, data) => {
    try {
      const response = await axios.put(`/api/v2/security/monitor-services/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 4. Xóa dịch vụ
  // Gọi vào: DELETE api/security/monitor-services/{id}
  delete: async (id) => {
    try {
      const response = await axios.delete(`/api/v2/security/monitor-services/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default monitorConfigService;
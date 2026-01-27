// Trỏ đúng ra file axiosGlobal ở thư mục cha
import axios from '../axiosGlobal'; 

const monitorService = {
  // Lấy toàn bộ thông tin sức khỏe hệ thống (Dashboard)
  getSystemHealth: async () => {
    try {
      // --- SỬA Ở ĐÂY: Thêm /api vào trước ---
      const response = await axios.get('/api/v2/system/intelligence');
      return response.data;
    } catch (error) {
      console.error("Monitor API Error:", error);
      throw error;
    }
  },

  // (Mở rộng sau này) Giải quyết lỗi
  resolveAnomaly: async (id) => {
    return await axios.post(`/api/v2/monitor/anomalies/${id}/resolve`);
  }
};

export default monitorService;

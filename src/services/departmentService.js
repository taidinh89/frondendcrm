import axios from 'axios';

// Đổi lại URL nếu cần (API Backend của bạn)
const API_URL = '/api/v2/security/departments';
const USER_API_URL = '/api/v2/security/users';

const departmentService = {
  // 1. Lấy cây phòng ban (Tree)
  getTree: async () => {
    try {
      const response = await axios.get(`${API_URL}/tree`);
      return response.data; // Trả về cấu trúc cây phân cấp
    } catch (error) { throw error; }
  },

  // 2. Lấy chi tiết phòng ban (kèm danh sách user)
  getDetail: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data; // { id, name, users: [...] }
    } catch (error) { throw error; }
  },

  // 3. Tạo phòng ban mới
  createDepartment: async (data) => {
    try {
      const response = await axios.post(API_URL, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 4. Gán chức danh (Role) cho Nhân sự (Logic Boss)
  // Hàm này gọi API update User để gán Role mới
  assignRoleToUser: async (userId, roleIds) => {
    try {
      // Lưu ý: Backend UserController update nhận mảng roles
      const response = await axios.put(`${USER_API_URL}/${userId}`, {
        roles: roleIds // [1, 2]
      });
      return response.data;
    } catch (error) { throw error; }
  },

  // 5. Tìm kiếm nhân sự (để thêm vào phòng)
  searchUsers: async (keyword) => {
    try {
      const response = await axios.get(`${USER_API_URL}`, { params: { search: keyword } });
      return response.data.data;
    } catch (error) { throw error; }
  },
  updateMember: async (deptId, userId, data) => {
    try {
      // Gọi API cập nhật Pivot table (department_user)
      const response = await axios.put(`${API_URL}/${deptId}/users/${userId}`, data);
      return response.data;
    } catch (error) { throw error; }
  },

  // 6. Gán nhân sự vào phòng (Sync)
  addUserToDepartment: async (userId, deptIds) => {
    try {
      // Backend UserController có hàm syncDepartments
      const response = await axios.put(`${USER_API_URL}/${userId}/departments`, {
        departments: deptIds
      });
      return response.data;
    } catch (error) { throw error; }
  }
};

export default departmentService;
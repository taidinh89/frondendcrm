import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';  // Thêm import này cho Tailwind v4

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Lấy đường dẫn build từ file .env, nếu không có thì mặc định là 'dist'
  const buildPath = env.VITE_BUILD_PATH || 'dist';

  return {
     // === THAY ĐỔI QUAN TRỌNG ===
    // Chỉ cho Vite biết đường dẫn cơ sở của ứng dụng.
    // Ví dụ: '/main/' hoặc '/dev/'.
    // Điều này sẽ sửa lại tất cả các đường dẫn tài nguyên trong file index.html.
    base: `/${buildPath}/`,
    plugins: [
      react(),
      tailwindcss()  // Thêm plugin Tailwind vào đây
    ],
    build: {
      // Đường dẫn build ra, trỏ đến thư mục public của Laravel
      // Giả sử cấu trúc thư mục là:
      // - projects/
      //   - backend/ (Laravel)
      //   - frontend/ (React - dự án hiện tại)
      outDir: `../backend/public/${buildPath}`,
      
      // Xóa thư mục outDir trước mỗi lần build để đảm bảo sạch sẽ
      emptyOutDir: true,
      
      // Tạo file manifest.json, cần thiết cho việc tích hợp với Laravel
      manifest: true,
    }
  };
});
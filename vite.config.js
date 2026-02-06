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

      // Tối ưu hóa chunking
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Nhóm các thư viện React lõi
              if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router/')) {
                return 'vendor-react';
              }
              // Nhóm Ant Design (rất nặng)
              if (id.includes('antd') || id.includes('@ant-design/icons')) {
                return 'vendor-antd';
              }
              // Nhóm các thư viện đồ thị
              if (id.includes('chart.js') || id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              // Các thư viện utility lớn
              if (id.includes('lodash') || id.includes('moment') || id.includes('date-fns') || id.includes('axios')) {
                return 'vendor-utils';
              }
              // Nhóm Icon (Lucide có rất nhiều file nhỏ)
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Nhóm Editor và UI components lớn khác
              if (id.includes('react-quill') || id.includes('codemirror') || id.includes('react-select')) {
                return 'vendor-ui-heavy';
              }
              // Mặc định cho các node_modules khác
              return 'vendor-others';
            }
          }
        }
      },
      // Tăng giới hạn cảnh báo kích thước chunk
      chunkSizeWarningLimit: 1000,
    }
  };
});
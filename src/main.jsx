import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios';

// --- CẤU HÌNH QUAN TRỌNG ---
// Thiết lập để Axios luôn gửi kèm cookie trong các yêu cầu
axios.defaults.withCredentials = true;

// Hàm khởi tạo ứng dụng
const initializeApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
};

// --- BƯỚC BẮT BUỘC CHO LARAVEL SANCTUM ---
// Trước khi render ứng dụng, gọi đến endpoint của Sanctum để lấy CSRF cookie.
// Sau khi lấy cookie thành công, Laravel sẽ tự động xác thực các yêu cầu API tiếp theo.
axios.get('/sanctum/csrf-cookie').then(() => {
  initializeApp();
}).catch(error => {
  console.error("Không thể lấy CSRF token. Ứng dụng không thể khởi động.", error);
  // Có thể hiển thị một thông báo lỗi ra màn hình ở đây
});

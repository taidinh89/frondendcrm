// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// 1. Kích hoạt Smart API (Đã có Blacklist fix lỗi)
import './axiosGlobal';

// 2. Cấu hình Credentials (QUAN TRỌNG ĐỂ GIỮ LOGIN GIỮA CÁC TRANG)
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';

// =============================================================================
// 🔥 [LOGIC MỚI] KẾT NỐI VỚI MOBILE APP (SERVER-DRIVEN UI) 🔥
// =============================================================================
const checkMobileToken = () => {
  try {
    // 1. Mobile App (WebView) đã bơm token vào localStorage với key 'auth_token'
    // trước khi trang web kịp load.
    const mobileToken = localStorage.getItem('auth_token');

    if (mobileToken) {
      console.log("📱 [Mobile-Bridge] Phát hiện Token từ App:", mobileToken);

      // 2. Gắn Token vào Header để mọi request Axios sau này đều mang theo
      // Điều này giúp Laravel Sanctum xác thực được User ngay lập tức.
      axios.defaults.headers.common['Authorization'] = `Bearer ${mobileToken}`;

      // (Optional) Debug: Nếu bạn muốn chắc chắn nó chạy, bỏ comment dòng dưới
      // console.warn("DEBUG: Web đã nhận diện phiên đăng nhập từ Mobile!");
    } else {
      console.log("💻 [Web-Mode] Không tìm thấy Token mobile, chạy chế độ Web bình thường.");
    }
  } catch (e) {
    console.error("[Mobile-Bridge] Lỗi khi đọc token:", e);
  }
};

// Gọi hàm kiểm tra ngay lập tức trước khi App React khởi động
checkMobileToken();
// =============================================================================


// --- LOGIC NHẬN DIỆN THƯ MỤC (DEPLOYMENT) ---
const getBasename = () => {
  const path = window.location.pathname;
  // Danh sách các folder deploy thực tế trên server (nếu có)
  const deployFolders = ['/dev', '/main', '/test', '/dev1'];
  const foundBase = deployFolders.find(base => path.startsWith(base));
  return foundBase || '/';
};

// Register Service Worker for Push Notifications (Smart Path Detection)
if ('serviceWorker' in navigator) {
  const swPath = getBasename() === '/' ? '/sw.js' : `${getBasename()}/sw.js`;
  navigator.serviceWorker.register(swPath)
    .then(reg => console.log('%c[SW] Registered at:', 'color: #4caf50', swPath, reg))
    .catch(err => console.error('%c[SW] Registration Failed:', 'color: #f44336', err));
}

const initializeApp = () => {
  const basename = getBasename();
  console.log("🚀 App launching at:", basename);

  ReactDOM.createRoot(document.getElementById('root')).render(
    // Bỏ StrictMode nếu muốn log sạch hơn, nhưng React 18+ khuyến khích giữ lại
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
};

// Gọi CSRF (Laravel Sanctum) -> Sau đó mới khởi động App
// Lưu ý: Nhờ './axiosGlobal', request này sẽ đi thẳng xuống server (không qua cache)
axios.get('/sanctum/csrf-cookie').then(() => {
  console.log("✅ CSRF Init Success");
  initializeApp();
}).catch((err) => {
  console.warn("⚠️ CSRF Init Failed (App will try to load anyway):", err.message);
  // Vẫn cho App chạy tiếp để tránh màn hình trắng nếu lỗi mạng nhẹ
  initializeApp();
});
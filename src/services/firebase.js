// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import chatApi from "./chatApi";

const firebaseConfig = {
    apiKey: "AIzaSyDNVYlMNutvQn_XzsWFBLOdsonFrjGS8ks",
    authDomain: "chat-90195.firebaseapp.com",
    projectId: "chat-90195",
    storageBucket: "chat-90195.firebasestorage.app",
    messagingSenderId: "385555927567",
    appId: "1:385555927567:web:137763b35213aa89c2897a",
    measurementId: "G-WKB2ZRLSCS"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);


export const requestForToken = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;

        // VAPID KEY CHUẨN - Pass string directly to Firebase (SDK handles conversion)
        const vapidKeyString = "BLT9qldzKER5uvdppbqgHYvIqzf6V-mxuEH3Y1TJE6nibrDTyhIon68pSVw1KKD76gGrlwJRnS-n5S72H-sBQe4";

        console.log('[FCM] 📡 Đang xin cấp Token...');
        const currentToken = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: vapidKeyString
        });

        if (currentToken) {
            console.log('%c[FCM] ✅ TOKEN THÀNH CÔNG:', 'color: #4caf50; font-weight: bold;', currentToken);

            // Đồng bộ với VPS Chat sẽ được thực hiện bởi pushManager.js
            // Tránh gọi ở đây gây ra tình trạng double-request và log spam
            return currentToken;
        }
    } catch (err) {
        console.error('%c[FCM] ❌ LỖI NGHIÊM TRỌNG:', 'color: #f44336; font-weight: bold;', err);

        // NẾU VẪN BÁO LỖI ATOB: ĐÂY LÀ LỖI CACHE CỦA FIREBASE SDK
        if (err.message.includes('atob')) {
            console.warn('%c🚨 HÃY LÀM BƯỚC NÀY ĐỂ HẾT LỖI CHẮC CHẮN:', 'color: #ff9800; font-weight: bold;');
            console.log('1. Nhấn F12 -> Application -> Storage');
            console.log('2. Nhấn nút "Clear site data" (Nút to ở giữa)');
            console.log('3. Nhấn F5 lại trang.');
        }
    }
    return null;
};

export const onMessageListener = (callback) =>
    onMessage(messaging, (payload) => {
        console.log("[FCM] Received:", payload);
        if (callback) callback(payload);
    });

export { messaging };

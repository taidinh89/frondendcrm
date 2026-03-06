// public/sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Initialiser Firebase trong Service Worker
firebase.initializeApp({
    apiKey: "AIzaSyDNVYlMNutvQn_XzsWFBLOdsonFrjGS8ks",
    authDomain: "chat-90195.firebaseapp.com",
    projectId: "chat-90195",
    storageBucket: "chat-90195.firebasestorage.app",
    messagingSenderId: "385555927567",
    appId: "1:385555927567:web:137763b35213aa89c2897a",
    measurementId: "G-WKB2ZRLSCS"
});

const messaging = firebase.messaging();

// 2. Xử lý Background Message từ Firebase (FCM)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Firebase Background Message Received:', payload);
    const title = payload.notification?.title || 'Tin nhắn mới';
    const options = {
        body: payload.notification?.body || 'Nhấn để xem.',
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload.data
    };
    self.registration.showNotification(title, options);
});

// 3. (Legacy) Xử lý Push Event thủ công nếu không qua Firebase SDK
self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[SW] Native Push Received:', data);

            // Nếu data đã có format chuẩn, hiển thị luôn
            const title = data.title || 'Bạn có tin nhắn mới';
            const options = {
                body: data.body || 'Nhấn để xem chi tiết.',
                icon: '/logo.png',
                badge: '/logo.png',
                data: {
                    url: data.url || '/'
                }
            };
            event.waitUntil(self.registration.showNotification(title, options));
        } catch (e) {
            console.warn('[SW] Push event but data is not JSON or format invalid');
        }
    }
});

// 4. Xử lý Click vào thông báo
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification Clicked');
    event.notification.close();

    // Đường dẫn mở ra khi click (từ payload FCM hoặc manual push)
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Nếu đã có tab đang mở, focus vào nó
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Nếu chưa có, mở cửa sổ mới
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

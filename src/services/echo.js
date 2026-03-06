import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Tắt/Bật log của Pusher trong quá trình dev
// window.Pusher.logToConsole = true;

const createChatEcho = () => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        console.warn('[ChatEcho] No token found, Echo connection deferred.');
        return null;
    }

    console.info('%c[ChatEcho] Initializing connection to chat node...', 'color: #9c27b0; font-weight: bold;');

    return new Echo({
        broadcaster: 'reverb',
        key: 'v8b9ezbiusabn3kcqago',
        wsHost: 'chat.maytinhquocviet.com',
        wsPort: 443,
        wssPort: 443,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: 'https://chat.maytinhquocviet.com/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

export const chatEcho = createChatEcho();
export { createChatEcho };

import React from 'react';
import { Icon } from './ui';

export const LoginPage = () => {
    const handleLogin = () => { window.location.href = '/auth/google/redirect'; };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center w-full max-w-sm">
                <h1 className="text-3xl font-bold mb-2 text-gray-800">Chào mừng bạn</h1>
                <p className="text-gray-600 mb-8">Đăng nhập vào hệ thống QuocvietCRM</p>
                <button 
                    onClick={handleLogin} 
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-300"
                >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.196C34.863 5.568 29.742 3.333 24 3.333C10.795 3.333 0 14.128 0 27.333S10.795 51.333 24 51.333c13.415 0 24-10.845 24-24.25c0-1.638-.146-3.232-.401-4.75z" /><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l4.843-4.843C34.863 5.568 29.742 3.333 24 3.333c-7.982 0-14.905 4.87-18.497 11.83z" /><path fill="#4CAF50" d="M24 51.333c5.742 0 10.863-2.235 14.804-5.864l-6.571-4.819C29.655 44.892 25.039 48 24 48c-4.735 0-8.828-2.585-10.99-6.306l-6.571 4.819C9.095 46.463 15.918 51.333 24 51.333z" /><path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l6.571 4.819c3.917-3.605 6.216-8.994 6.216-15.14c0-1.638-.146-3.232-.401-4.75z" /></svg>
                    Đăng nhập bằng Google
                </button>
            </div>
        </div>
    );
};

export const Header = ({ user, onLogout, currentView }) => {
    const handleLogout = async () => {
        try { await axios.post('/logout'); onLogout(); } 
        catch (error) { console.error('Lỗi khi đăng xuất:', error); onLogout(); }
    };
    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
            <h1 className="text-xl font-semibold text-gray-800">{currentView.label}</h1>
             <div className="flex items-center space-x-4">
                {user && <span className="text-gray-800 hidden sm:block">Chào, {user.name}</span>}
                <button onClick={handleLogout} className="text-gray-600 hover:text-blue-600" title="Đăng xuất">
                    <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </button>
            </div>
        </header>
    );
};

export const Sidebar = ({ currentView, setCurrentView, navItems }) => (
    <div className="w-64 bg-white text-gray-800 flex flex-col flex-shrink-0 border-r">
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b text-blue-600">QUOCVIET</div>
        <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map(item => (
                <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center px-4 py-2.5 rounded-md transition-colors duration-200 text-sm font-medium ${currentView === item.id ? 'text-white bg-blue-500 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <Icon path={item.icon} className="w-5 h-5" /> 
                    <span className="ml-3">{item.label}</span>
                </button>
            ))}
        </nav>
    </div>
);

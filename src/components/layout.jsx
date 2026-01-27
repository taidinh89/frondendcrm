// src/components/layout.jsx
import React from 'react';
import { Icon } from './ui';
import axios from 'axios'; 

export const LoginPage = () => {
    const handleLogin = () => { window.location.href = '/auth/google/redirect'; };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center w-full max-w-sm">
                <h1 className="text-3xl font-bold mb-2">Quốc Việt CRM</h1>
                <button onClick={handleLogin} className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg">Đăng nhập bằng Google</button>
            </div>
        </div>
    );
};

export const Header = ({ user, onLogout, currentView, onToggleSidebar, isSidebarPinned, onTogglePin, onSearchClick }) => {
    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0 z-10">
            <div className="flex items-center">
                {/* --- 1. SỬA ICON MENU MOBILE (Giữ nguyên hoặc làm đậm hơn) --- */}
                <button onClick={onToggleSidebar} className="lg:hidden mr-3 text-gray-500 hover:text-blue-600 transition-colors">
                    <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </button>

                {/* --- 2. SỬA ICON THU GỌN/MỞ RỘNG TRÊN PC (Fix lỗi icon chỉ có 1 gạch) --- */}
                <button onClick={onTogglePin} className="hidden lg:block mr-4 text-gray-500 hover:text-blue-600 transition-colors" title={isSidebarPinned ? "Thu gọn menu" : "Ghim menu"}>
                     {/* Dùng icon 3 gạch (Hamburger) chuẩn để làm nút toggle */}
                    <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </button>

                <h1 className="text-lg font-semibold text-gray-800">{currentView.label}</h1>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={onSearchClick} className="text-gray-600 hover:text-blue-600 transition-colors">
                    <Icon path="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM21 21l-5.657-5.657" />
                </button>
                
                {user && <span className="text-sm hidden sm:block font-medium text-gray-700">Chào, {user.name}</span>}
                
                {/* --- 3. SỬA ICON LOGOUT (Fix lỗi icon bị mất hình) --- */}
                <button onClick={onLogout} className="text-gray-500 hover:text-red-600 transition-colors" title="Đăng xuất">
                    {/* Icon "Cánh cửa có mũi tên đi ra" (Arrow Right On Rectangle) */}
                    <Icon path="M15.75 9V5.25a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h6.75a2.25 2.25 0 002.25-2.25v-3.75m-3-3.75h10.5m-10.5 0l3-3m-3 3l3 3" />
                </button>
            </div>
        </header>
    );
};

export const Sidebar = ({ navItems, currentViewId, setCurrentViewId, isSidebarOpen, setIsSidebarOpen, isSidebarPinned, checkAccess }) => {
    const [isTempOpen, setIsTempOpen] = React.useState(false);
    const pinnedClasses = "w-64"; 
    const unpinnedClasses = "w-20"; 
    const sidebarWidthClass = isSidebarPinned ? pinnedClasses : (isTempOpen ? pinnedClasses : unpinnedClasses);

    // PHÂN NHÓM MENU
    const groupedItems = navItems.reduce((acc, item) => {
        const group = item.group || 'Chung';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>

            <div 
                className={`bg-white text-gray-800 flex flex-col flex-shrink-0 border-r z-40 transition-all duration-300 fixed lg:relative inset-y-0 left-0 h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarWidthClass}`}
                onMouseEnter={() => !isSidebarPinned && setIsTempOpen(true)}
                onMouseLeave={() => !isSidebarPinned && setIsTempOpen(false)}
            >
                <div className="h-16 flex items-center justify-center border-b flex-shrink-0 px-4">
                    <img src="/logo.png" alt="Logo" className="" />
                    <span className={`ml-3 text-xl font-bold text-blue-600 truncate transition-all ${isSidebarPinned || isTempOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>QUỐC VIỆT</span>
                </div>

                {/* PHẦN CUỘN MENU: Quan trọng nhất để fix lỗi mobile */}
                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden custom-sidebar">
                    {Object.entries(groupedItems).map(([groupName, items]) => {
                        const visibleItems = items.filter(item => !checkAccess || checkAccess(item.permission));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={groupName}>
                                <h3 className={`px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase transition-opacity ${isSidebarPinned || isTempOpen ? 'opacity-100' : 'opacity-0'}`}>{groupName}</h3>
                                <div className="space-y-1">
                                    {visibleItems.map(item => (
                                        <button 
                                            key={item.id} 
                                            onClick={() => { setCurrentViewId(item.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                                            className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentViewId === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                                            title={item.label}
                                        >
                                            <Icon path={item.icon} className="w-5 h-5 flex-shrink-0" /> 
                                            <span className={`ml-3 truncate transition-all ${isSidebarPinned || isTempOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>
        </>
    );
};
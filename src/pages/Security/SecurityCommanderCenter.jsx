import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserListTab from '../../components/auth/UserListTab'; // Đảm bảo đường dẫn đúng
import BundleArchitectTab from '../../components/auth/BundleArchitectTab'; // Đảm bảo đường dẫn đúng

// =================================================================================
// SUB-COMPONENT: BIỂU ĐỒ & THẺ BÀI (DASHBOARD)
// =================================================================================
const DonutChart = ({ percent, color, label }) => (
    <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
            <path className={`${color}`} strokeDasharray={`${percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
        <div className="absolute flex flex-col items-center">
            <span className="text-xl font-black text-gray-800">{percent}%</span>
            <span className="text-[7px] font-bold uppercase text-gray-400">{label}</span>
        </div>
    </div>
);

const ExecutiveDashboard = ({ onNavigate }) => {
    const [stats, setStats] = useState({
        users: { total: 0, active: 0, locked: 0, admins: 0 },
        system: { total_api: 0, secured: 0, risk: 0 },
        roles: []
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Gọi song song các API để lấy số liệu tổng hợp
                const [uRes, pRes, rRes] = await Promise.all([
                    axios.get('/api/v2/security/users?per_page=1000'),
                    axios.get('/api/v2/security/permissions/matrix'),
                    axios.get('/api/v2/security/roles?per_page=100')
                ]);

                const users = uRes.data?.data || (Array.isArray(uRes.data) ? uRes.data : []);
                const roleData = rRes.data?.data || (Array.isArray(rRes.data) ? rRes.data : []);
                const matrix = pRes.data.overview || {};

                // Logic đếm Admin chuẩn (is_admin=1 HOẶC Role Super Admin)
                const adminCount = users.filter(u =>
                    u.is_admin === 1 || u.is_admin === true ||
                    u.roles?.some(r => r.name === 'Super Admin')
                ).length;

                setStats({
                    users: {
                        total: users.length,
                        active: users.filter(u => u.is_active).length,
                        locked: users.filter(u => !u.is_active).length,
                        admins: adminCount
                    },
                    system: {
                        total_api: matrix.total_routes || 0,
                        secured: matrix.secured || 0,
                        risk: matrix.unprotected || 0
                    },
                    roles: roleData.map(r => ({
                        name: r.name,
                        count: users.filter(u => u.roles?.some(ur => ur.id === r.id)).length
                    }))
                });
            } catch (e) { console.error("Dashboard Load Error:", e); }
        };
        loadStats();
    }, []);

    const securityScore = stats.system.total_api ? Math.round((stats.system.secured / stats.system.total_api) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Hàng 1: 3 Thẻ Quan trọng nhất */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* CARD 1: SỨC KHỎE AN NINH */}
                <div onClick={() => onNavigate('bundles')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-50 hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">An ninh Hệ thống</div>
                            <h3 className="text-sm font-bold text-gray-600 w-32 leading-relaxed">Tỷ lệ API đã được bảo vệ tuyệt đối</h3>
                            <div className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl inline-block group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                🛡️ Vá lỗ hổng ngay
                            </div>
                        </div>
                        <DonutChart percent={securityScore} label="Secured" color={securityScore > 80 ? 'text-green-500' : 'text-red-500'} />
                    </div>
                </div>

                {/* CARD 2: NHÂN SỰ VẬN HÀNH */}
                <div onClick={() => onNavigate('users')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-green-50 hover:-translate-y-1 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Quy mô Nhân sự</div>
                            <div className="text-5xl font-black text-gray-800">{stats.users.total}</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center text-2xl">👥</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                            <span className="block text-xl font-bold text-green-600">{stats.users.active}</span>
                            <span className="text-[8px] uppercase font-bold text-gray-400">Active</span>
                        </div>
                        <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
                            <span className="block text-xl font-bold text-red-500">{stats.users.locked}</span>
                            <span className="text-[8px] uppercase font-bold text-red-400">Locked</span>
                        </div>
                    </div>
                </div>

                {/* CARD 3: CẢNH BÁO LÃNH ĐẠO */}
                <div onClick={() => onNavigate('users')} className="bg-gradient-to-br from-purple-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-xl shadow-purple-200 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[10px] font-black uppercase text-purple-200 tracking-widest mb-1">Super Admins</div>
                                <div className="text-5xl font-black">{stats.users.admins}</div>
                            </div>
                            <div className="text-3xl">👑</div>
                        </div>
                        <p className="text-xs text-purple-100 mt-4 opacity-80 leading-relaxed font-medium">
                            Số lượng tài khoản có quyền truy cập tối thượng vào hệ thống.
                        </p>
                    </div>
                    {/* Background effect */}
                    <div className="absolute -right-5 -bottom-5 text-9xl opacity-10 rotate-12">🛡️</div>
                </div>
            </div>

            {/* Hàng 2: Biểu đồ phân bổ & Trợ lý */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Cột trái: Phân bổ Role */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Phân bổ Vai trò (Role Structure)</h3>
                    <div className="space-y-5">
                        {stats.roles.map((role, idx) => (
                            <div key={idx} className="group cursor-pointer" onClick={() => onNavigate('users')}>
                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 group-hover:text-blue-600">
                                    <span>{role.name}</span>
                                    <span>{role.count} nhân sự</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${role.name === 'Super Admin' ? 'bg-purple-500' : 'bg-blue-500'}`}
                                        style={{ width: `${stats.users.total ? (role.count / stats.users.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cột phải: Trợ lý AI */}
                <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-200 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🤖</div>
                            <div>
                                <h3 className="font-bold text-lg">AI Assistant</h3>
                                <p className="text-[10px] uppercase font-bold text-blue-200">Real-time Analysis</p>
                            </div>
                        </div>
                        <ul className="space-y-4 text-sm font-medium text-blue-100">
                            {securityScore < 100 && (
                                <li className="flex gap-2">
                                    <span>⚠️</span>
                                    <span>Hệ thống còn <b>{stats.system.risk} API</b> chưa được phân quyền. Cần xử lý ngay.</span>
                                </li>
                            )}
                            {stats.users.admins > 3 && (
                                <li className="flex gap-2">
                                    <span>🛑</span>
                                    <span>Cảnh báo: Có quá nhiều Super Admin ({stats.users.admins}). Khuyến nghị tối đa 3 người.</span>
                                </li>
                            )}
                            <li className="flex gap-2">
                                <span>✅</span>
                                <span>Hệ thống vận hành ổn định. <b>{stats.users.active} user</b> đang hoạt động bình thường.</span>
                            </li>
                        </ul>
                    </div>
                    <button onClick={() => onNavigate('bundles')} className="mt-6 w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase text-xs hover:bg-blue-50 transition-colors">
                        Thiết lập lại Cấu trúc
                    </button>
                </div>
            </div>
        </div>
    );
};

// =================================================================================
// MAIN PAGE: SECURITY COMMANDER CENTER
// =================================================================================
const SecurityCommanderCenter = ({ setAppTitle }) => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | users | bundles

    useEffect(() => {
        if (setAppTitle) setAppTitle('Commander Center v6.0');
    }, [setAppTitle]);

    const handleNavigate = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="p-4 md:p-8 bg-[#f1f5f9] min-h-screen font-sans text-gray-800">
            <div className="max-w-[1800px] mx-auto space-y-8">

                {/* 1. TOP HEADER NAVIGATION (COMMANDER STYLE) */}
                <div className="bg-white p-3 rounded-[2rem] shadow-2xl shadow-slate-200/50 flex justify-between items-center sticky top-4 z-50 border border-white/50 backdrop-blur-md bg-white/90">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gray-900 text-white shadow-lg scale-105' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                            📊 Tổng hành dinh
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                            👥 Quản trị Nhân sự
                        </button>
                        <button
                            onClick={() => setActiveTab('bundles')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'bundles' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                            🏗️ Kiến trúc Bảo mật
                        </button>
                    </div>
                    <div className="hidden lg:block pr-6">
                        <span className="text-[10px] font-black text-gray-300 italic">SECURE COMMANDER • EXECUTIVE VIEW</span>
                    </div>
                </div>

                {/* 2. MAIN CONTENT AREA */}
                <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 p-8 min-h-[800px] relative">

                    {activeTab === 'dashboard' && <ExecutiveDashboard onNavigate={handleNavigate} />}

                    {/* Tái sử dụng Component cũ nhưng hiển thị trong giao diện mới */}
                    {activeTab === 'users' && (
                        <div className="animate-fade-in">
                            <UserListTab />
                        </div>
                    )}

                    {activeTab === 'bundles' && (
                        <div className="animate-fade-in">
                            <BundleArchitectTab />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SecurityCommanderCenter;
import React from 'react';
import { Icon } from './ui';
import axios from 'axios';
import { Link } from 'react-router-dom';

export const LoginPage = () => {
    const handleGoogleLogin = () => { window.location.href = '/auth/google/redirect'; };

    // [NEW] Email/Password Login Logic
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // [NEW] 2FA State
    const [step, setStep] = React.useState(1); // 1: Login, 2: OTP
    const [otp, setOtp] = React.useState('');
    const [tempUserId, setTempUserId] = React.useState(null);
    const [rememberDevice, setRememberDevice] = React.useState(false); // [NEW]

    // [NEW] Handle Redirect Error from Google Login
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorMsg = params.get('error');
        if (errorMsg) {
            setError(errorMsg);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Gọi API Login
            const res = await axios.post('/api/login', { email, password });

            // [NEW] Check for 2FA requirement
            if (res.data.require_2fa) {
                setTempUserId(res.data.user_id);
                setStep(2);
                setLoading(false); // Stop loading to let user interact
                // notification could be added here
                return;
            }

            // 2. Lưu Token (Fallback if 2FA disabled)
            const token = res.data.token;
            if (token) {
                localStorage.setItem('auth_token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                window.location.href = '/dashboard';
            } else {
                setError('Không nhận được token xác thực.');
            }
        } catch (err) {
            console.error("Login Error:", err);
            const msg = err.response?.data?.message || err.response?.data?.email?.[0] || 'Đăng nhập thất bại';
            setError(msg);
        } finally {
            if (step === 1) setLoading(false); // Only stop loading if staying on step 1
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post('/api/auth/2fa/verify', {
                user_id: tempUserId,
                code: otp,
                remember_device: rememberDevice // [NEW]
            });

            const token = res.data.token;
            if (token) {
                localStorage.setItem('auth_token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                window.location.href = '/dashboard';
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Mã xác thực không đúng.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            await axios.post('/api/auth/2fa/resend', { user_id: tempUserId });
            // Ideally show success message, but we might not have toast here.
            // Using error state for success msg temporarily or just console
            console.log('Resent OTP');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-blue-600 uppercase tracking-widest mb-2">Quoc Viet CRM</h1>
                        <p className="text-sm font-medium text-gray-400">Đăng nhập hệ thống quản trị</p>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    placeholder="example@quocviet.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex justify-between items-center text-xs mt-2">
                                <label className="flex items-center text-gray-500 font-bold cursor-pointer select-none">
                                    <input type="checkbox" className="mr-2 rounded text-blue-600 focus:ring-blue-500" />
                                    Ghi nhớ
                                </label>
                                <Link to="/reset-password" className="text-blue-600 font-bold hover:underline">Quên mật khẩu?</Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}

                            <div className="text-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Xác thực 2 bước</h3>
                                <p className="text-xs text-gray-500 mt-1">Vui lòng nhập mã OTP 6 số đã gửi đến email của bạn.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 text-center">Mã OTP</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-black text-2xl text-center tracking-[0.5em] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    placeholder="######"
                                />
                            </div>

                            {/* [NEW] Trusted Device Checkbox */}
                            <div className="flex items-center justify-center text-xs mt-2">
                                <label className="flex items-center text-gray-600 font-bold cursor-pointer select-none hover:text-blue-600">
                                    <input
                                        type="checkbox"
                                        checked={rememberDevice}
                                        onChange={(e) => setRememberDevice(e.target.checked)}
                                        className="mr-2 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    Tin cậy thiết bị này (Không hỏi lại 2FA 30 ngày)
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Đang xác thực...' : 'Xác nhận'}
                            </button>

                            <div className="flex justify-between mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(''); }}
                                    className="text-xs font-bold text-gray-400 hover:text-gray-600"
                                >
                                    ← Quay lại
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                >
                                    Gửi lại mã?
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400 font-bold text-[10px] uppercase">Hoặc</span></div>
                        </div>

                        <button onClick={handleGoogleLogin} className="mt-6 w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-3 transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Đăng nhập bằng Google</span>
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">© 2024 Quoc Viet Technology</p>
                </div>
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

                {user && (
                    <Link to="/profile" className="text-sm hidden sm:flex font-medium text-gray-700 hover:text-blue-600 transition-colors items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase border border-blue-200">
                            {user.avatar ? <img src={user.avatar} alt="avar" className="w-full h-full rounded-full object-cover" /> : user.name?.charAt(0)}
                        </div>
                        <span>Chào, {user.name}</span>
                    </Link>
                )}

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
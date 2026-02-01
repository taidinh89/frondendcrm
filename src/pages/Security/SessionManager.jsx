import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Icon } from '../../components/ui';
import toast from 'react-hot-toast';
import { X, Shield, Globe, Smartphone, Monitor, Clock, LogOut, ChevronRight, UserX, Search, RefreshCw, Briefcase, Calendar } from 'lucide-react';

const SessionManager = () => {
    // State cho danh sách User
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // State cho Modal chi tiết
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSessions, setUserSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // --- 1. FETCH DANH SÁCH USER (GROUPED) ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/security/sessions', { params: { search } });
            setUsers(res.data.data); // Paginated response
        } catch (error) {
            toast.error("Không thể tải danh sách người dùng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [search]);

    // --- 2. FETCH CHI TIẾT SESSIONS CỦA 1 USER ---
    const handleViewDetails = async (user) => {
        setSelectedUser(user);
        setLoadingSessions(true);
        setUserSessions([]);

        try {
            const res = await axios.get(`/api/security/sessions/user/${user.id}`);
            setUserSessions(res.data.sessions);
        } catch (error) {
            toast.error("Lỗi khi tải chi tiết phiên đăng nhập.");
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedUser(null);
        setUserSessions([]);
    };

    // --- 3. ACTIONS (REVOKE) ---
    const handleRevokeSession = async (sessionId) => {
        if (!window.confirm("Bạn muốn buộc thiết bị này đăng xuất?")) return;
        try {
            await axios.delete(`/api/security/sessions/${sessionId}`);
            toast.success("Đã thu hồi phiên thành công.");
            // Reload list sessions
            handleViewDetails(selectedUser);
            // Reload list users (để cập nhật count nếu cần)
            fetchUsers();
        } catch (error) {
            toast.error("Thu hồi thất bại.");
        }
    };

    const handleRevokeUser = async (userId, userName) => {
        if (!window.confirm(`CẢNH BÁO: Bạn có chắc muốn ĐĂNG XUẤT TOÀN BỘ phiên của ${userName}?`)) return;
        try {
            await axios.delete(`/api/security/sessions/user/${userId}`);
            toast.success(`Đã đăng xuất ${userName} khỏi tất cả thiết bị.`);
            fetchUsers();
            if (selectedUser?.id === userId) handleCloseModal();
        } catch (error) {
            toast.error("Thao tác thất bại.");
        }
    };

    // Helper UI
    const getStatusColor = (status) => {
        if (status === 'Online') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'Away') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-500 border-gray-200';
    };

    const getDeviceIcon = (info) => {
        if (info.includes('Mobile')) return <Smartphone className="w-4 h-4" />;
        return <Monitor className="w-4 h-4" />;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <Shield className="text-blue-600 w-8 h-8" />
                        Giám sát Phiên Đăng nhập
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1 ml-10">
                        Quản lý người dùng online và kiểm soát truy cập tập trung.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button onClick={fetchUsers} className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Tìm nhân sự..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* MAIN TABLE (USERS) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Nhân sự</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Số phiên</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Hoạt động cuối</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">IP Address</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-12 text-gray-400">Đang tải dữ liệu...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-12 text-gray-400">Không có người dùng nào đang hoạt động.</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => handleViewDetails(user)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm uppercase shrink-0 border-2 border-white shadow-sm">
                                                {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{user.name}</div>
                                                <div className="text-xs text-gray-500 text-ellipsis overflow-hidden max-w-[150px]">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user.session_count > 1 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {user.session_count}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${user.status === 'Online' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                            <span className="text-sm font-medium text-gray-600">{user.last_active_at}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{user.last_ip}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleViewDetails(user)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleRevokeUser(user.id, user.name)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Đăng xuất tất cả"
                                            >
                                                <UserX className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL CHI TIẾT */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header & User Profile */}
                        <div className="relative bg-white">
                            <button onClick={handleCloseModal} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 z-10">
                                <X className="w-6 h-6" />
                            </button>

                            <div className="px-8 py-8 bg-gradient-to-br from-blue-50/50 to-white border-b border-gray-100">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    {/* Large Avatar */}
                                    <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md shrink-0 border border-gray-100">
                                        <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-2xl uppercase overflow-hidden">
                                            {selectedUser.avatar ? <img src={selectedUser.avatar} className="w-full h-full object-cover" /> : selectedUser.name.charAt(0)}
                                        </div>
                                    </div>

                                    {/* User Details */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-black text-gray-800">{selectedUser.name}</h2>
                                            {selectedUser.role && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-md tracking-wider shadow-sm">{selectedUser.role}</span>}
                                            {selectedUser.is_active !== undefined && (
                                                selectedUser.is_active ?
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-md tracking-wider shadow-sm">Active</span> :
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-md tracking-wider shadow-sm">Inactive</span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 font-medium mb-3 flex items-center gap-2">{selectedUser.email}</p>

                                        <div className="flex flex-wrap gap-6 text-xs text-gray-500 font-medium">
                                            {selectedUser.position ? (
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>{selectedUser.position}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Nhân viên</span>
                                                </div>
                                            )}
                                            {selectedUser.created_at && (
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Tham gia: {selectedUser.created_at}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-0 max-h-[60vh] overflow-y-auto">
                            {loadingSessions ? (
                                <div className="p-12 text-center text-gray-400">Đang tải chi tiết...</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-white sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Thiết bị</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">IP / Địa điểm</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Thời gian</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {userSessions.map(session => (
                                            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                                            {getDeviceIcon(session.device_info)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-800">{session.device_info}</div>
                                                            <div className="flex gap-2 items-center">
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                    {session.type}
                                                                </span>
                                                                <div className="text-xs text-gray-500 truncate max-w-[120px]" title={session.user_agent}>
                                                                    {session.user_agent}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                                                        <Globe className="w-3 h-3 text-gray-400" />
                                                        {session.ip_address}
                                                    </div>
                                                    <div className={`mt-1 inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(session.status)}`}>
                                                        {session.status}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-gray-600 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Active: {session.last_used_at}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-1 pl-4">
                                                        Login: {session.created_at}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!session.is_current ? (
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-colors"
                                                        >
                                                            <LogOut className="w-4 h-4" /> Đăng xuất
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Hiện tại</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => handleRevokeUser(selectedUser.id, selectedUser.name)}
                                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                            >
                                <UserX className="w-4 h-4" /> Đăng xuất tất cả thiết bị
                            </button>
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionManager;

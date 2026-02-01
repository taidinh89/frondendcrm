import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const ProfilePage = ({ currentUser, setAppTitle }) => {
    useEffect(() => {
        setAppTitle('Thông tin cá nhân');
    }, [setAppTitle]);

    const [loading, setLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || null);
    
    // Form Data
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        avatar: null // File object
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                 toast.error('File quá lớn! Vui lòng chọn ảnh dưới 5MB.');
                 return;
            }
            setFormData({ ...formData, avatar: file });
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            if (formData.avatar) {
                data.append('avatar', formData.avatar);
            }

            const response = await axios.post('/api/user/profile', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success('Cập nhật hồ sơ thành công!');
            
            // Reload page to reflect changes (or update context if available)
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if(!confirm('Bạn có chắc muốn gửi email đổi mật khẩu? Link sẽ được gửi về email của bạn.')) return;
        
        const toastId = toast.loading('Đang gửi yêu cầu...');
        try {
            await axios.post('/api/auth/password/email', { email: currentUser.email });
            toast.success('Đã gửi link đổi mật khẩu! Vui lòng kiểm tra email.', { id: toastId });
        } catch (error) {
            toast.error(error.response?.data?.email || 'Lỗi gửi email.', { id: toastId });
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                Hồ sơ cá nhân
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cột trái: Avatar & Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="relative group cursor-pointer mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-inner">
                            <img 
                                src={avatarPreview || "https://ui-avatars.com/api/?name=" + (currentUser?.name || "User")} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                            <Icon path="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-800">{currentUser?.name}</h2>
                    <p className="text-gray-500 text-sm mb-4">{currentUser?.email}</p>
                    
                    <div className="w-full border-t pt-4 mt-2">
                        <button 
                            type="button"
                            onClick={handlePasswordReset}
                            className="w-full py-2 px-4 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg flex items-center justify-center gap-2 transition-colors border border-yellow-200"
                        >
                            <Icon path="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            Đổi mật khẩu
                        </button>
                        <p className="text-xs text-gray-400 mt-2 text-justify">
                            * Hệ thống sẽ gửi một liên kết xác thực vào email của bạn. Liên kết này chỉ có hiệu lực trong 24 giờ.
                        </p>
                    </div>
                </div>

                {/* Cột phải: Form thông tin */}
                <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-6 border-b pb-2">Chỉnh sửa thông tin</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                            <input 
                                type="text" 
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Không thể thay đổi)</span></label>
                            <input 
                                type="email" 
                                value={currentUser?.email}
                                disabled
                                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                             <div className="flex flex-wrap gap-2">
                                {currentUser?.roles?.map(role => (
                                    <span key={role.id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-semibold">
                                        {role.name}
                                    </span>
                                ))}
                                {(!currentUser?.roles || currentUser?.roles.length === 0) && <span className="text-gray-400 text-sm">Thành viên</span>}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

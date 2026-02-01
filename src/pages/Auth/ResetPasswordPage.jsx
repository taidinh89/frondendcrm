import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Icon } from '../../components/ui';

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Auto-fill from URL params
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token || !email) {
            toast.error('Đường dẫn không hợp lệ hoặc đã hết hạn.');
            // setTimeout(() => navigate('/login'), 3000);
        }
    }, [token, email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== passwordConfirmation) {
            toast.error('Mật khẩu xác nhận không khớp!');
            return;
        }

        if (password.length < 8) {
            toast.error('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/auth/password/reset', {
                email,
                token,
                password,
                password_confirmation: passwordConfirmation
            });

            setSuccess(true);
            toast.success('Đổi mật khẩu thành công! Chuyển hướng đăng nhập...');

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || error.response?.data?.email || 'Lỗi đổi mật khẩu. Token có thể đã hết hạn.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon path="M4.5 12.75l6 6 9-13.5" className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Đổi mật khẩu thành công!</h2>
                    <p className="text-gray-500 mb-6">Bạn sẽ được chuyển hướng về trang đăng nhập trong giây lát...</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Đặt lại mật khẩu</h1>
                    <p className="text-sm text-gray-500 mt-1">Nhập mật khẩu mới cho tài khoản <br /> <span className="font-semibold text-gray-700">{email}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ít nhất 8 ký tự"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nhập lại mật khẩu mới"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md mt-2 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button, Icon } from '../ui';

// Cấu hình thời gian
const TIMEOUT_SECONDS = 360; // 6 phút
const POLL_INTERVAL = 3000;  // 3 giây gọi 1 lần

export const QrDisplay = ({ orderData, onReset }) => {
    const [status, setStatus] = useState('pending'); 
    const [isPolling, setIsPolling] = useState(true);
    const [lastCheckedStr, setLastCheckedStr] = useState('Vừa xong');
    const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
    
    // Progress bar cho polling (Hiệu ứng visual)
    const [progress, setProgress] = useState(0);

    const pollIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // 1. Hàm gọi API kiểm tra
    const checkStatus = async () => {
        try {
            // Reset thanh progress về 0 để chạy lại hiệu ứng
            setProgress(0);
            setLastCheckedStr(new Date().toLocaleTimeString('vi-VN'));

            const res = await axios.get(`/api/v2/sepay/status/${orderData.order_code}`);
            if (res.data.status === 'paid' || res.data.payment_status === 'paid') {
                setStatus('paid');
                stopAllIntervals();
                playSound();
            }
        } catch (error) {
            console.error("Lỗi check status:", error);
        }
    };

    const playSound = () => {
        const audio = new Audio('/sounds/success.mp3');
        audio.play().catch(e => {}); 
    };

    // 2. Dừng toàn bộ timer
    const stopAllIntervals = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setIsPolling(false);
    };

    // 3. Hàm Resume (Tiếp tục chờ khi đã timeout)
    const handleResumePolling = () => {
        setStatus('pending');
        setTimeLeft(120); // Cho thêm 2 phút chờ
        setIsPolling(true);
        startPollingLoops(); // Khởi động lại vòng lặp
        checkStatus(); // Check ngay lập tức 1 cái
    };

    // 4. Khởi động các vòng lặp
    const startPollingLoops = () => {
        // A. Loop gọi API (3s/lần)
        pollIntervalRef.current = setInterval(checkStatus, POLL_INTERVAL);

        // B. Loop đếm ngược tổng thời gian (1s/lần)
        countdownIntervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    stopAllIntervals(); // Hết giờ -> Dừng
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // C. Loop hiệu ứng thanh loading (chạy từ 0% -> 100% trong 3s)
        // Để người dùng cảm nhận được thời gian sắp check tiếp theo
        const step = 100 / (POLL_INTERVAL / 100); // Tính bước nhảy
        progressIntervalRef.current = setInterval(() => {
            setProgress((old) => {
                if (old >= 100) return 0;
                return old + step;
            });
        }, 100);
    };

    // 5. Setup khi mount component
    useEffect(() => {
        setStatus('pending');
        setTimeLeft(TIMEOUT_SECONDS);
        setIsPolling(true);
        startPollingLoops();

        return () => stopAllIntervals();
    }, [orderData]); // Reset khi có order mới

    // Format phút:giây
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-fade-in transition-all">
            {/* --- TRẠNG THÁI: THÀNH CÔNG --- */}
            {status === 'paid' ? (
                <div className="text-center space-y-4 py-6">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce-short">
                        <Icon path="M4.5 12.75l6 6 9-13.5" className="w-12 h-12 text-green-600 stroke-2"/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-green-700">Thanh toán thành công!</h2>
                        <p className="text-gray-500">Giao dịch đã được ghi nhận.</p>
                    </div>
                    <Button onClick={onReset} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        Tạo đơn mới
                    </Button>
                </div>
            ) : (
                /* --- TRẠNG THÁI: ĐANG CHỜ / HẾT GIỜ --- */
                <div className="text-center w-full max-w-sm relative">
                    {/* Header thông tin tiền */}
                    <div className="mb-6">
                        <div className="text-sm text-gray-500 mb-1 uppercase tracking-wide font-semibold">Quét mã VietQR</div>
                        <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                            {new Intl.NumberFormat('vi-VN').format(orderData.amount)} <span className="text-xl">đ</span>
                        </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="relative group mx-auto w-64 h-64 bg-white p-2 rounded-xl shadow-inner border border-gray-100">
                        {/* Ảnh QR */}
                        <img 
                            src={orderData.qr_url} 
                            alt="QR Code" 
                            className={`w-full h-full object-contain rounded-lg transition-all duration-500 ${isPolling ? '' : 'grayscale opacity-20 blur-sm'}`}
                        />

                        {/* Overlay khi hết giờ (Timeout) */}
                        {!isPolling && timeLeft === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-fade-in">
                                <div className="bg-white/90 p-4 rounded-xl shadow-xl backdrop-blur-sm">
                                    <div className="text-red-500 font-bold mb-2">Đã hết thời gian chờ</div>
                                    <Button onClick={handleResumePolling} size="sm" variant="primary" className="shadow-lg animate-pulse">
                                        Tiếp tục chờ (2p)
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {/* Góc scan animation (trang trí) */}
                        {isPolling && (
                            <>
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                                {/* Scan line chạy dọc */}
                                <div className="absolute inset-x-0 h-0.5 bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_linear_infinite]"></div>
                            </>
                        )}
                    </div>

                    {/* Status Bar & Actions */}
                    <div className="mt-6 space-y-4">
                        {isPolling ? (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 relative overflow-hidden">
                                {/* Thanh loading chạy ở dưới */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1 bg-blue-400 transition-all duration-100 ease-linear"
                                    style={{ width: `${progress}%` }}
                                ></div>
                                
                                <div className="flex justify-between items-center text-sm relative z-10">
                                    <span className="flex items-center text-blue-700 font-medium">
                                        <span className="relative flex h-3 w-3 mr-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                        </span>
                                        Đang chờ thanh toán...
                                    </span>
                                    <span className="font-mono font-bold text-blue-800">{formatTime(timeLeft)}</span>
                                </div>
                            </div>
                        ) : (
                            // Trạng thái dừng thủ công hoặc hết giờ
                            timeLeft > 0 && (
                                <div className="bg-yellow-50 text-yellow-700 p-2 rounded text-sm">
                                    Đã tạm dừng kiểm tra.
                                </div>
                            )
                        )}

                        {/* Nút Refresh thủ công & Thông tin */}
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                            <span>Check lần cuối: {lastCheckedStr}</span>
                            <button 
                                onClick={() => { checkStatus(); setIsPolling(true); }}
                                className="flex items-center hover:text-blue-600 transition-colors"
                                title="Kiểm tra ngay lập tức"
                            >
                                <Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-3 h-3 mr-1"/>
                                Kiểm tra ngay
                            </button>
                        </div>
                        
                        <div className="text-xs text-gray-400 border-t pt-3 mt-2">
                            Nội dung CK: <span className="font-mono font-bold select-all text-black text-sm bg-gray-100 px-1 rounded">{orderData.content || orderData.order_code}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
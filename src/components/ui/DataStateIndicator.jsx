import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import moment from 'moment';
import axios from 'axios';

/**
 * DataStateIndicator Component
 * Hiển thị trạng thái dữ liệu (Lần cuối cập nhật) và nút Ép tính lại (Force Refresh)
 * 
 * Props:
 * - lastUpdated: string (ISO date)
 * - scope: 'accounting' | 'inventory' | 'sales' | 'all'
 * - onRefreshSuccess: callback function
 */
const DataStateIndicator = ({ lastUpdated, scope = 'all', onRefreshSuccess }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleForceRefresh = async () => {
        if (cooldown > 0 || isRefreshing) return;

        setIsRefreshing(true);
        setError(null);

        try {
            const response = await axios.post('/api/v3/force-refresh', { scope });
            if (response.data.success) {
                setCooldown(60); // 60s cooldown
                if (onRefreshSuccess) onRefreshSuccess(response.data);
            }
        } catch (err) {
            console.error('Refresh failed:', err);
            if (err.response && err.response.status === 429) {
                setError('Vui lòng đợi 60s giữa các lần yêu cầu');
                setCooldown(30); // Giả định còn 30s
            } else {
                setError('Không thể làm mới dữ liệu lúc này');
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const timeAgo = lastUpdated ? moment(lastUpdated).fromNow() : 'Không rõ';

    return (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm border-r border-gray-300 pr-3">
                <Clock size={14} className="text-blue-500" />
                <span>Cập nhật: <b className="text-gray-700">{timeAgo}</b></span>
            </div>

            <button
                onClick={handleForceRefresh}
                disabled={isRefreshing || cooldown > 0}
                className={`flex items-center gap-2 px-3 py-1 rounded transition-all duration-200 text-sm font-medium
                    ${cooldown > 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95 border border-blue-200 shadow-sm'
                    }`}
            >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Đang cập nhật...' : cooldown > 0 ? `Chờ ${cooldown}s` : 'Ép tính lại'}
            </button>

            {error && (
                <div className="flex items-center gap-1 text-red-500 text-xs animate-pulse">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default DataStateIndicator;

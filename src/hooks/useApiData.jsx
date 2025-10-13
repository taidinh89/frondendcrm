import { useState, useEffect } from 'react';
import axios from 'axios';

export const useApiData = (endpoint, params = {}) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [trigger, setTrigger] = useState(0);

    const refetch = () => setTrigger(t => t + 1);

    // Chuyển object params thành chuỗi để theo dõi sự thay đổi một cách đáng tin cậy
    const stringifiedParams = JSON.stringify(params);

    useEffect(() => {
        // Nếu không có endpoint, không làm gì cả
        if (!endpoint) {
             setData([]);
             setIsLoading(false);
             return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            console.log(`🚀 [API Request] Gửi đi:`, { endpoint, params });
            try {
                // Sửa lỗi: Luôn sử dụng object `params` được truyền vào
                const response = await axios.get(endpoint, { params });
                
                console.log(`✅ [API Response] Nhận về từ ${endpoint}:`, response.data);
                setData(response.data.data || []);
                
                // Xử lý cả trường hợp có phân trang và không có
                if (response.data.meta && response.data.links) {
                    setPagination(response.data.meta);
                } else {
                    setPagination(null);
                }
            } catch (err) {
                console.error(`❌ [API Error] Lỗi từ ${endpoint}:`, err.response || err);
                setError(`Không thể tải dữ liệu. Lỗi: ${err.response?.data?.message || err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // Effect này sẽ chạy lại mỗi khi endpoint, params, hoặc trigger thay đổi
    }, [endpoint, stringifiedParams, trigger]);

    return { data, isLoading, error, pagination, fetchData: refetch };
};
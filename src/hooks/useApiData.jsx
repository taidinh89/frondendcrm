// src/hooks/useApiData.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { appConfig } from '../config/appConfig.js';

axios.defaults.baseURL = appConfig.api.baseUrl;
axios.defaults.withCredentials = true;

/**
 * useApiData v4 - Smart Deduplication (Chống trùng lặp thông minh)
 * 1. Deduplication: Nếu gọi cùng 1 API + params trong < 500ms -> Bỏ qua lần gọi thứ 2.
 * 2. AbortController: Hủy request cũ nếu người dùng đổi filter quá nhanh.
 * 3. Auto Array Param: Tự sửa mảng cho Laravel.
 */
export const useApiData = (endpoint, params = {}, debounceDelay = 300) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [trigger, setTrigger] = useState(0);

    const abortControllerRef = useRef(null);
    
    // [THÔNG MINH] Bộ nhớ lưu vết request cuối cùng
    const lastRequestInfo = useRef({
        signature: '', // Lưu "dấu vân tay" của request (URL + Params)
        timestamp: 0   // Lưu thời điểm gọi
    });

    const refetch = () => {
        // Khi người dùng bấm nút Refresh thủ công, ta reset bộ nhớ để ép buộc gọi lại
        lastRequestInfo.current = { signature: '', timestamp: 0 };
        setTrigger((prev) => prev + 1);
    };

    // 1. Tạo "dấu vân tay" (Signature) cho params hiện tại
    const paramsKey = JSON.stringify(params);

    // 2. Helper xử lý params cho Laravel
    const serializedParams = useMemo(() => {
        const p = new URLSearchParams();
        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value === null || value === undefined || value === '') return;
            if (Array.isArray(value)) {
                value.forEach(val => p.append(`${key}[]`, val));
            } else {
                p.append(key, value);
            }
        });
        return p;
    }, [paramsKey]);

    useEffect(() => {
        if (!endpoint) {
            setData(null);
            return;
        }

        // Tạo chữ ký định danh duy nhất cho lần gọi này
        const currentSignature = `${endpoint}?${serializedParams.toString()}`;
        const now = Date.now();

        // ============================================================
        // [LOGIC CHỐNG GỌI TRÙNG LẶP]
        // Nếu request này GIỐNG HỆT request trước
        // VÀ thời gian giữa 2 lần quá ngắn (dưới 500ms)
        // => BỎ QUA LUÔN (Không gọi API, không set Loading)
        // ============================================================
        if (
            currentSignature === lastRequestInfo.current.signature &&
            (now - lastRequestInfo.current.timestamp) < 500
        ) {
            console.log(`%c[Smart Dedup] Đã chặn request trùng lặp: ${endpoint}`, 'color: orange');
            return; 
        }

        // Nếu không trùng, cập nhật lại thông tin request mới nhất
        lastRequestInfo.current = {
            signature: currentSignature,
            timestamp: now
        };

        setIsLoading(true);

        const fetchData = async () => {
            // Hủy request cũ nếu còn treo
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            setError(null);

            try {
                // Gọi API
                const response = await axios.get(currentSignature, {
                    signal: controller.signal
                });

                const rawData = response.data;
                
                // Xử lý dữ liệu trả về
                if (rawData && rawData.data && (rawData.meta || rawData.links)) {
                    setData(rawData.data);
                    setPagination(rawData.meta || rawData);
                } else if (rawData && rawData.data) {
                    setData(rawData.data);
                } else {
                    setData(rawData);
                }

            } catch (err) {
                if (axios.isCancel(err)) return;
                console.error("API Error:", err);
                if (!controller.signal.aborted) {
                    setError(err.response?.data?.message || err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        // Vẫn giữ debounce nhẹ để tốt cho việc gõ tìm kiếm (Search Input)
        const timeoutId = setTimeout(() => {
            fetchData();
        }, debounceDelay);

        return () => {
            clearTimeout(timeoutId);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };

    }, [endpoint, paramsKey, trigger, serializedParams]); // Thêm serializedParams vào dep

    return { data, isLoading, error, pagination, refetch };
};
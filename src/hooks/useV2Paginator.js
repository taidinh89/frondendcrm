import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useV2Paginator = (apiEndpoint, initialParams = {}) => {
    const [data, setData] = useState([]);
    const [paginationInfo, setPaginationInfo] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0,
        per_page: 25
    });
    
    // State quản lý loading
    const [isLoading, setIsLoading] = useState(true);       // Loading lần đầu hoặc chuyển trang (replace)
    const [isFetchingMore, setIsFetchingMore] = useState(false); // Loading khi cuộn thêm (append)
    const [error, setError] = useState(null);
    
    // State params
    const [params, setParams] = useState({
        page: 1,
        ...initialParams
    });

    // Hàm core để gọi API
    const fetchData = useCallback(async (page = 1, isAppending = false) => {
        if (isAppending) {
            setIsFetchingMore(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        // Loại bỏ các params rỗng/null trước khi gửi
        const activeParams = { ...params, page };
        Object.keys(activeParams).forEach(key => 
            (activeParams[key] === null || activeParams[key] === undefined || activeParams[key] === '') && delete activeParams[key]
        );

        try {
            // Lấy token (nếu cần)
            const token = localStorage.getItem('token');
            const config = {
                params: activeParams,
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            };

            const response = await axios.get(apiEndpoint, config);
            
            // Xử lý dữ liệu trả về từ Laravel (Resource Collection)
            const responseData = response.data || {};
            const dataArray = responseData.data || [];
            
            // Lấy thông tin phân trang từ 'meta' (chuẩn mới) hoặc root (chuẩn cũ)
            const meta = responseData.meta || responseData || {}; 

            if (!Array.isArray(dataArray)) throw new Error("Dữ liệu trả về không phải mảng (Array).");

            // LOGIC QUAN TRỌNG:
            // - Nếu isAppending = true (dùng fetchNextPage) -> Nối dữ liệu cũ + mới
            // - Nếu isAppending = false (dùng changePage/refresh) -> Thay thế hoàn toàn bằng dữ liệu mới
            setData(prev => isAppending ? [...prev, ...dataArray] : dataArray);
            
            setPaginationInfo({
                current_page: meta.current_page || 1,
                last_page: meta.last_page || 1,
                total: meta.total || 0,
                from: meta.from || 0,
                to: meta.to || 0,
                per_page: meta.per_page || 25
            });

        } catch (err) {
            console.error(`[Paginator] Error fetching ${apiEndpoint}:`, err);
            setError(err.response?.data?.message || err.message || "Lỗi tải dữ liệu.");
            if (!isAppending) {
                setData([]); // Chỉ clear data nếu là load mới, không clear khi đang load thêm
            }
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [apiEndpoint, params]); 

    // Effect: Gọi lại khi URL hoặc Filter thay đổi (luôn về trang 1)
    useEffect(() => {
        fetchData(1, false);
    }, [fetchData]);

    // --- CÁC HÀM ĐIỀU KHIỂN ---

    // 1. fetchNextPage (Dành cho Infinite Scroll - Cũ)
    const fetchNextPage = useCallback(() => {
        if (!isFetchingMore && paginationInfo.current_page < paginationInfo.last_page) {
            // Gọi fetchData với cờ isAppending = true
            fetchData(paginationInfo.current_page + 1, true);
        }
    }, [isFetchingMore, paginationInfo, fetchData]);

    // 2. changePage (Dành cho Pagination truyền thống - Mới)
    const changePage = useCallback((pageNumber) => {
        if (pageNumber < 1 || pageNumber > paginationInfo.last_page) return;
        setParams(prev => ({ ...prev, page: pageNumber }));
    }, [paginationInfo.last_page]);

    // 3. applyFilters (Reset về trang 1)
    const applyFilters = useCallback((newParams) => {
        setParams(prev => ({ ...prev, ...newParams, page: 1 }));
    }, []);

    // 4. refresh
    const refresh = useCallback(() => {
        fetchData(1, false);
    }, [fetchData]);

    return {
        data,
        paginationInfo,
        isLoading,      // Dùng cho màn hình loading chính
        isFetchingMore, // Dùng cho spinner nhỏ ở cuối (Infinite Scroll)
        error,
        applyFilters,
        refresh,
        fetchNextPage,  // <-- Tương thích ngược cho các trang cũ
        changePage      // <-- Dùng cho trang Khách hàng mới
    };
};
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useApiData = (endpoint, params = {}) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});
    const [trigger, setTrigger] = useState(0);

    const refetch = () => setTrigger(t => t + 1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(endpoint, {
                params: {
                    page: currentPage,
                    per_page: 15,
                    search: searchQuery,
                    ...filters,
                    ...params
                }
            });
            setData(response.data.data);
            setPagination(response.data.meta);
        } catch (err) {
            setError(`Không thể tải dữ liệu. Lỗi: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [endpoint, currentPage, searchQuery, JSON.stringify(params), JSON.stringify(filters), trigger]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300); 
        return () => clearTimeout(timer);
    }, [fetchData]);
    
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
           refetch();
        }
    }, [searchQuery, JSON.stringify(filters)]);

    return { data, isLoading, error, pagination, searchQuery, setSearchQuery, setCurrentPage, setFilters, fetchData: refetch };
};

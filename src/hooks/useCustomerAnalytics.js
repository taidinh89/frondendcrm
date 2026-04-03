import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const useCustomerAnalytics = (filters) => {
  const queryObject = useQuery({
    queryKey: ['customer-360', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/v3/customer-analysis', { params: filters });
      return data;
    },
    staleTime: 1000 * 60 * 5, // Dữ liệu được coi là "tươi" trong 5 phút
    placeholderData: (previousData) => previousData, // Giữ lại dữ liệu cũ khi đang load dữ liệu mới (tránh nháy màn hình)
    retry: 1,
  });

  return queryObject;
};

/**
 * Hook để kích hoạt việc tính toán lại RFM (Background Job)
 */
export const useRefreshAnalytics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.get('/api/v3/customer-analysis', { params: { refresh: true } });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Yêu cầu làm mới dữ liệu đã được gửi!');
      // Xóa cache để force fetch lại sau này (tuy nhiên job cần thời gian để xong)
      // queryClient.invalidateQueries({ queryKey: ['customer-360'] });
    },
    onError: (error) => {
      toast.error('Không thể kích hoạt làm mới dữ liệu: ' + (error.response?.data?.message || error.message));
    }
  });
};

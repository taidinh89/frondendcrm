// src/components/SyncStatusBar.jsx
import React from 'react';
import * as UI from './ui.jsx';

// Format time helper
const formatTime = (isoString) => {
    const date = new Date(isoString);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = date.toLocaleDateString('vi-VN');
    return { time, date: `${dateStr}` };
};

const formatTimeAgo = (isoString) => {
    if (!isoString) return "chưa chạy";
    const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "vài giây trước";
};

export const SyncStatusBar = ({
    syncStatuses,
    isSyncing,
    isRefreshDisabled,
    isManualSyncing,
    isManualSyncDisabled,
    manualSyncError,
    manualSyncSuccess,
    onRefresh,
    onManualSync,
    startDate,
    endDate,
}) => {
    const purchase = syncStatuses?.fetch_purchase_invoices;
    const sales = syncStatuses?.fetch_sales_invoices;

    const purchaseTime = purchase?.last_sync_at ? formatTime(purchase.last_sync_at) : null;
    const salesTime = sales?.last_sync_at ? formatTime(sales.last_sync_at) : null;

    // [SỬA]: Đổi từ 'bg-' (background) sang 'text-' (text color) để áp dụng cho icon
    const purchaseDiffMinutes = purchase?.last_sync_at ? (new Date() - new Date(purchase.last_sync_at)) / (1000 * 60) : Infinity;
    let purchaseColor = 'text-gray-300'; // Mặc định
    let purchaseAnimation = '';
    if (purchase?.status === 'running') {
        purchaseColor = 'text-blue-600';
        purchaseAnimation = 'animate-pulse';
    } else if (purchase?.status === 'success') {
        purchaseColor = purchaseDiffMinutes < 30 ? 'text-green-500' : 'text-yellow-500';
    } else if (purchase?.status === 'error') {
        purchaseColor = 'text-red-500';
    }

    // [SỬA]: Đổi từ 'bg-' (background) sang 'text-' (text color)
    const salesDiffMinutes = sales?.last_sync_at ? (new Date() - new Date(sales.last_sync_at)) / (1000 * 60) : Infinity;
    let salesColor = 'text-gray-300'; // Mặc định
    let salesAnimation = '';
    if (sales?.status === 'running') {
        salesColor = 'text-blue-600';
        salesAnimation = 'animate-pulse';
    } else if (sales?.status === 'success') {
        salesColor = salesDiffMinutes < 30 ? 'text-green-500' : 'text-yellow-500';
    } else if (sales?.status === 'error') {
        salesColor = 'text-red-500';
    }

    const [showPurchaseDetail, setShowPurchaseDetail] = React.useState(false);
    const [showSalesDetail, setShowSalesDetail] = React.useState(false);

    return (
        <> 
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between gap-3">
                
                {/* Trạng thái đồng bộ (gọn) */}
                <div className="flex flex-1 items-center gap-4 overflow-hidden">
                    {/* Mua vào */}
                    <div className="flex items-center gap-2">
                        {/* [SỬA]: Thay chấm tròn bằng Icon "Tải xuống" (Mua vào) */}
                        <div className="relative group flex-shrink-0">
                            <UI.Icon
                                // Icon: ArrowDownTray
                                path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                className={`w-5 h-5 ${purchaseColor} ${purchaseAnimation}`}
                            />
                            {/* Tooltip khi hover */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Mua vào: {purchase?.message || 'Chưa có thông tin'}
                            </div>
                        </div>
                        {/* Text (Ẩn trên mobile, hiện trên desktop) */}
                        <div className="hidden md:block text-sm truncate">
                            <span className="font-medium text-gray-700">Mua:</span>{' '}
                            {purchaseTime ? (
                                <span className="text-gray-600">
                                    {purchaseTime.time}{' '}
                                    <span className="text-gray-400 text-xs">({formatTimeAgo(purchase?.last_sync_at)})</span>
                                </span>
                            ) : (
                                <span className="text-gray-400 italic">chưa chạy</span>
                            )}
                        </div>
                    </div>

                    {/* Bán ra */}
                    <div className="flex items-center gap-2">
                        {/* [SỬA]: Thay chấm tròn bằng Icon "Tải lên" (Bán ra) */}
                        <div className="relative group flex-shrink-0">
                            <UI.Icon
                                // Icon: ArrowUpTray
                                path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5v12"
                                className={`w-5 h-5 ${salesColor} ${salesAnimation}`}
                            />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Bán ra: {sales?.message || 'Chưa có thông tin'}
                            </div>
                        </div>
                         {/* Text (Ẩn trên mobile, hiện trên desktop) */}
                        <div className="hidden md:block text-sm truncate">
                            <span className="font-medium text-gray-700">Bán:</span>{' '}
                            {salesTime ? (
                                <span className="text-gray-600">
                                    {salesTime.time}{' '}
                                    <span className="text-gray-400 text-xs">({formatTimeAgo(sales?.last_sync_at)})</span>
                                </span>
                            ) : (
                                <span className="text-gray-400 italic">chưa chạy</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nút hành động */}
                <div className="flex flex-shrink-0 items-center gap-2">
                    {/* Nút Refresh */}
                    <UI.Button
                        variant="secondary"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isSyncing || isManualSyncing || isRefreshDisabled}
                        title={isRefreshDisabled ? "Chỉ được làm mới mỗi phút" : "Làm mới trạng thái"}
                    >
                        {/* Icon (Luôn hiện) */}
                        {isSyncing || isManualSyncing ? ( 
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        ) : isRefreshDisabled ? (
                            <UI.Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4" />
                        ) : (
                            <UI.Icon path="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className="w-4 h-4"/>
                        )}
                        {/* Text (Ẩn trên mobile) */}
                        <span className="hidden md:inline ml-1.5">{isRefreshDisabled ? 'Đợi...' : 'Làm mới'}</span>
                    </UI.Button>

                    {/* Nút Đồng bộ thủ công */}
                    <UI.Button
                        variant="primary"
                        size="sm"
                        onClick={onManualSync}
                        disabled={isManualSyncing || isManualSyncDisabled}
                        title={isManualSyncDisabled ? "Chờ 1 phút để đồng bộ lại" : `Đồng bộ từ lần đồng bộ cuối đến nay`}
                    >
                        {/* Icon (Luôn hiện) */}
                        {isManualSyncing ? (
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        ) : isManualSyncDisabled ? (
                            <UI.Icon path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4" />
                        ) : (
                            // [SỬA]: Dùng icon "CloudArrowDown" (Đồng bộ) cho hợp lý hơn
                            <UI.Icon path="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.33-2.33 3 3 0 013.75 5.75M12 16.5z" className="w-4 h-4"/>
                        )}
                        {/* Text (Ẩn trên mobile) */}
                        <span className="hidden md:inline ml-1.5">
                            {isManualSyncing ? 'Đang gửi...' : isManualSyncDisabled ? 'Chờ 1p' : 'Đồng bộ'}
                        </span>
                    </UI.Button>
                </div>
            </div>

            {/* Thông báo lỗi/thành công (giữ nguyên) */}
            {manualSyncError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{manualSyncError}</div>
            )}
            {manualSyncSuccess && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">{manualSyncSuccess}</div>
            )}
        </>
    );
};
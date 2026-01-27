// src/config/appConfig.js

export const appConfig = {
  // [THÊM MỚI] App Version - DÙNG ĐỂ XÓA CACHE
  app: {
    CURRENT_VERSION: 'v1.0', 
    VERSION_KEY: 'app_version', 
  },
  
  // Authentication Settings
  auth: {
    AUTH_TOKEN_KEY: 'authToken',
  },
  
  // API Settings
  api: {
    baseUrl: '/', 
    timeout: 10000,
    params: { perPage: -1, defaultSort: 'id|desc' },
  },

  // Theme Settings
  theme: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    primaryColor: 'blue-600',
    secondaryColor: 'gray-600',
    successColor: 'green-600',
    dangerColor: 'red-600',
    background: { primary: 'bg-gray-50', secondary: 'bg-white' },
    text: { primary: 'text-gray-800', secondary: 'text-gray-600', muted: 'text-gray-400' },
    border: { default: 'border-gray-200', focus: 'border-blue-500' },
  },

  // UI Settings
  ui: {
    searchPlaceholder: 'Tìm kiếm...',
    button: {
      baseClasses: 'px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
      variants: {
        primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
        danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
      },
      disabledClasses: 'disabled:opacity-50 disabled:cursor-not-allowed',
    },
    modal: { maxWidth: 'max-w-lg', maxHeight: 'max-h-[90vh]' },
  },

  // Table Settings
  table: {
    rowMinHeight: 55,
    virtualizerOverscan: 10,
    dynamicColumnDefaultWidth: 150,
    maxVisibleColumns: 15,
    defaultColumnVisibility: true,
  },

  // Search Settings
  search: { debounceDelay: 1200 },
};

// =================================================================
// CẦU DAO TỔNG - CHẾ ĐỘ BẢO MẬT
// false = TẮT (Ai cũng vào được, dùng khi đang Dev/Test)
// true  = BẬT (Hệ thống sẽ lọc quyền)
// =================================================================
export const ENABLE_PERMISSION_CHECK = true;
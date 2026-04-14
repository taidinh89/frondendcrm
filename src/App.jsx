// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LoginPage, Header, Sidebar } from './components/Layout/layout.jsx';
import { appConfig, ENABLE_PERMISSION_CHECK } from './config/appConfig.js';
import { Toaster } from 'react-hot-toast';

const ENABLE_LOG = true;

// --- 1. IMPORT CÁC TRANG NGHIỆP VỤ (LAZY LOADING) ---
const DashboardContent = React.lazy(() => import('./pages/Dashboard/DashboardContent.jsx').then(m => ({ default: m.DashboardContent })));
const CustomersContent = React.lazy(() => import('./pages/Business/CustomersContent.jsx').then(m => ({ default: m.CustomersContent })));
const SalesOrdersContent = React.lazy(() => import('./pages/Business/SalesOrdersContent.jsx').then(m => ({ default: m.SalesOrdersContent })));
const PurchaseOrdersContent = React.lazy(() => import('./pages/Business/PurchaseOrdersContent.jsx').then(m => ({ default: m.PurchaseOrdersContent })));
const GlobalSearchModal = React.lazy(() => import('./components/modals/GlobalSearchModal.jsx').then(m => ({ default: m.GlobalSearchModal })));
const InventoriesContent = React.lazy(() => import('./pages/Inventory/InventoriesContent.jsx').then(m => ({ default: m.InventoriesContent })));
const PurchasingIntelligenceHub = React.lazy(() => import('./pages/Inventory/PurchasingIntelligenceHub.jsx'));

const InvoicesContent = React.lazy(() => import('./pages/Finance/InvoicesContent.jsx').then(m => ({ default: m.InvoicesContent })));
const SalesAnalysisContent = React.lazy(() => import('./pages/Analytics/SalesAnalysisContent.jsx').then(m => ({ default: m.SalesAnalysisContent })));
const ProductGroupAnalysisContent = React.lazy(() => import('./pages/Analytics/ProductGroupAnalysisContent.jsx').then(m => ({ default: m.ProductGroupAnalysisContent })));
const PartnerAnalysisContent = React.lazy(() => import('./pages/Analytics/PartnerAnalysisContent.jsx').then(m => ({ default: m.PartnerAnalysisContent })));
const InventoryAnalysisContent = React.lazy(() => import('./pages/Analytics/InventoryAnalysisContent.jsx').then(m => ({ default: m.InventoryAnalysisContent })));
const DebtRiskPage = React.lazy(() => import('./pages/Finance/DebtRiskPage.jsx').then(m => ({ default: m.DebtRiskPage })));
const Customer360Content = React.lazy(() => import('./pages/Business/Customer360Content.jsx').then(m => ({ default: m.Customer360Content })));
const KpiManagerPage = React.lazy(() => import('./pages/Analytics/KpiManagerPage.jsx'));
const KpiEntryPage = React.lazy(() => import('./pages/Analytics/KpiEntryPage.jsx'));
const KpiGroupManagerPage = React.lazy(() => import('./pages/Analytics/KpiGroupManagerPage.jsx'));
const KpiScorecardPage = React.lazy(() => import('./pages/Analytics/KpiScorecardPage.jsx'));
const KpiDashboardPage = React.lazy(() => import('./pages/Analytics/KpiDashboardPage.jsx'));
const KpiPerformancePage = React.lazy(() => import('./pages/Analytics/KpiPerformancePage.jsx'));
const DictionaryManagementPage = React.lazy(() => import('./pages/System/DictionaryManagementPage.jsx').then(m => ({ default: m.DictionaryManagementPage })));
const SepayDashboard = React.lazy(() => import('./pages/Sepay/SepayDashboard.jsx').then(m => ({ default: m.SepayDashboard })));
const SepayCashier = React.lazy(() => import('./pages/Sepay/SepayCashier.jsx').then(m => ({ default: m.SepayCashier })));
const DepartmentTreeManager = React.lazy(() => import("./pages/System/DepartmentTreeManager.jsx"));
const UserRoleManager = React.lazy(() => import('./pages/Security/UserRoleManager'));
const SecurityDashboard = React.lazy(() => import('./pages/Security/Dashboard'));
const PermissionMatrix = React.lazy(() => import('./pages/Security/PermissionMatrix'));
const RoleManager = React.lazy(() => import('./pages/Security/RoleManager'));
const OrgChart = React.lazy(() => import('./pages/Security/OrgChart'));
const Definitions = React.lazy(() => import('./pages/Security/Definitions'));
const SecurityCommanderCenter = React.lazy(() => import('./pages/Security/SecurityCommanderCenter'));
const SessionManager = React.lazy(() => import('./pages/Security/SessionManager'));
const VisualThemeEditor = React.lazy(() => import('./pages/Security/VisualThemeEditor'));
const VisualThemeBuilderV2 = React.lazy(() => import('./pages/Security/VisualThemeBuilderV2'));
const SiteManager = React.lazy(() => import('./pages/Security/SiteManager'));
const ThemeVersionManager = React.lazy(() => import('./pages/Security/ThemeVersionManager'));
const SystemIntelligenceDashboard = React.lazy(() => import('./pages/System/SystemIntelligenceDashboard.jsx'));
const UnitConversionManager = React.lazy(() => import('./pages/Inventory/UnitConversionManager.jsx'));
const SystemMonitorPage = React.lazy(() => import('./pages/System/SystemMonitorPage.jsx').then(m => ({ default: m.SystemMonitorPage })));
const ImportManagement = React.lazy(() => import('./pages/System/ImportManagement.jsx'));
const QrHistoryPage = React.lazy(() => import("./pages/Sepay/QrHistoryPage.jsx").then(m => ({ default: m.QrHistoryPage })));
const InvoiceDashboardPage = React.lazy(() => import('./pages/Finance/InvoiceDashboardPage.jsx').then(m => ({ default: m.InvoiceDashboardPage })));
const InvoiceDashboardV2 = React.lazy(() => import('./pages/Finance/InvoiceDashboardV2.jsx').then(m => ({ default: m.InvoiceDashboardV2 })));
const QuotationList = React.lazy(() => import('./pages/Business/QuotationList').then(m => ({ default: m.QuotationList })));
const QuotationFormNew = React.lazy(() => import('./pages/Business/QuotationFormNew').then(m => ({ default: m.QuotationFormNew })));
const MobileScreenManager = React.lazy(() => import('./pages/Admin/MobileScreenManager'));
const AppSDUIManager = React.lazy(() => import('./pages/Admin/AppSDUIManager'));
const MobileAppBuilder = React.lazy(() => import('./pages/Admin/MobileAppBuilder.jsx'));
const MediaLibrary = React.lazy(() => import('./pages/Admin/MediaLibrary.jsx'));
const MediaStudioPage = React.lazy(() => import('./pages/Admin/MediaStudioPage.jsx'));
const NewsFeedManager = React.lazy(() => import('./pages/Admin/NewsFeedManager.jsx'));
const BlockLibrary = React.lazy(() => import('./pages/AppManager/BlockLibrary.jsx'));
const ScreenBuilder = React.lazy(() => import('./pages/AppManager/ScreenBuilder.jsx'));
const TargetingManager = React.lazy(() => import('./pages/AppManager/TargetingManager.jsx'));
const NavigationManager = React.lazy(() => import('./pages/AppManager/NavigationManager.jsx'));
const VersionHistory = React.lazy(() => import('./pages/AppManager/VersionHistory.jsx'));
const AuditCenter = React.lazy(() => import('./pages/AppManager/AuditCenter.jsx'));
const DeviceMonitoring = React.lazy(() => import('./pages/AppManager/DeviceMonitoring.jsx'));
const ApiMonitoringCenter = React.lazy(() => import('./pages/AppManager/ApiMonitoringCenter.jsx'));
const AppConfigManager = React.lazy(() => import('./pages/AppManager/AppConfigManager.jsx'));
const RemoteLogManager = React.lazy(() => import('./pages/AppManager/RemoteLogManager.jsx'));
const LandingPageList = React.lazy(() => import('./pages/LandingPages/LandingPageList.jsx'));
const LandingPageEditor = React.lazy(() => import('./pages/LandingPages/LandingPageEditor.jsx'));
const SepaySyncManager = React.lazy(() => import('./pages/Sepay/SepaySyncManager.jsx').then(m => ({ default: m.SepaySyncManager })));
const MonitorServiceManager = React.lazy(() => import('./pages/System/MonitorServiceManager.jsx'));
const EcountAutomationPanel = React.lazy(() => import('./pages/System/EcountAutomationPanel.jsx'));
const CrmTestingPanel = React.lazy(() => import('./pages/System/CrmTestingPanel.jsx'));
const ProductStandardization = React.lazy(() => import('./pages/Inventory/ProductStandardization.jsx').then(m => ({ default: m.ProductStandardization })));
const ProductMappingManager = React.lazy(() => import('./pages/Inventory/ProductMappingManager.jsx').then(m => ({ default: m.ProductMappingManager })));
const EcountProductManager = React.lazy(() => import('./pages/Inventory/EcountProductManager.jsx').then(m => ({ default: m.EcountProductManager })));
const DirectInventoryChecker = React.lazy(() => import('./pages/Inventory/DirectInventoryChecker.jsx').then(m => ({ default: m.DirectInventoryChecker })));
const ProductMobileManagerV3 = React.lazy(() => import('./components/Product/ProductMobileManagerV3.jsx'));
const ProductUnifiedEditor = React.lazy(() => import('./pages/Product/ProductUnifiedEditor'));
const ChatBubble = React.lazy(() => import('./components/Chat/ChatBubble.jsx'));
const OmnichannelChatPage = React.lazy(() => import('./components/Chat/OmnichannelChatPage.jsx'));
const InternalChatPage = React.lazy(() => import('./pages/Communication/InternalChatPage.jsx'));
const ChannelManager = React.lazy(() => import('./components/Chat/ChannelManager.jsx'));
const StaffGroupManager = React.lazy(() => import('./components/Chat/StaffGroupManager.jsx'));
const NotificationManager = React.lazy(() => import('./components/Notification/NotificationManager.jsx'));
const ProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage.jsx').then(m => ({ default: m.ProfilePage })));
const ResetPasswordPage = React.lazy(() => import('./pages/Auth/ResetPasswordPage.jsx').then(m => ({ default: m.ResetPasswordPage })));
const ProductList = React.lazy(() => import('./pages/ThienDuc/Products/ProductList.jsx'));
const SyncDashboard = React.lazy(() => import('./pages/ThienDuc/SyncCenter/SyncDashboard.jsx'));

// --- NEW V3 DOMAIN PAGES (LAZY) ---
const ForecastPage = React.lazy(() => import('./pages/Analytics/ForecastPage.jsx'));
const AccountingPage = React.lazy(() => import('./pages/Finance/AccountingPage.jsx'));
const HRPerformancePage = React.lazy(() => import('./pages/Analytics/HRPerformancePage.jsx'));
const ProductAnalyticsPage = React.lazy(() => import('./pages/Finance/ProductAnalyticsPage.jsx'));
const CashReceiptsList = React.lazy(() => import('./pages/Finance/CashReceiptsList.jsx'));
const CashPaymentsList = React.lazy(() => import('./pages/Finance/CashPaymentsList.jsx'));

// --- 3. CẤU HÌNH MENU (NAV ITEMS) ---
const navItems = [
    { id: 'forecast-v3', path: '/v3/kpi/forecast', label: 'Dự báo Nhập hàng (V3)', group: 'KPI & Mục tiêu', permission: 'purchase.view', iconName: 'activity', component: <ForecastPage /> },
    { id: 'hr-performance-v3', path: '/v3/kpi/hr-performance', label: 'Hiệu suất Nhân viên (V3)', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'users', component: <HRPerformancePage /> },
    { id: 'accounting-v3', path: '/v3/finance/accounting', label: 'Không gian Kế toán (V3)', group: 'Tài chính', permission: 'report.debt', iconName: 'credit-card', component: <AccountingPage /> },
    
    { id: 'chat-v2', path: '/chat-v2', label: 'Chat Đa kênh V2', group: 'Giao tiếp', permission: null, iconName: 'chat', component: <OmnichannelChatPage /> },
    { id: 'internal-chat', path: '/internal-chat', label: 'Chat Nội bộ', group: 'Giao tiếp', permission: null, iconName: 'chat', component: <InternalChatPage /> },
    { id: 'chat-admin', path: '/quanly/chat-admin', label: 'Quản lý Kênh Chat', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'cog', component: <ChannelManager /> },
    { id: 'user-group-manager', path: '/quanly/user-groups', label: 'Quản lý Nhóm NV', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'users', component: <StaffGroupManager /> },
    { id: 'notification-admin', path: '/quanly/notifications/admin', label: 'Trung tâm Thông báo', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'bell', component: <NotificationManager /> },
    { id: 'dashboard', path: '/dashboard', label: 'Tổng quan Hệ thống', group: 'Chung', permission: null, iconName: 'home', component: <DashboardContent /> },
    { id: 'customers', path: '/customers', label: 'Quản lý Khách hàng & NCC', group: 'Kinh doanh', permission: 'customer.view', iconName: 'users', component: <CustomersContent /> },
    { id: 'sales-orders', path: '/sales-orders', label: 'Đơn Bán Hàng', group: 'Kinh doanh', permission: 'sales.view', iconName: 'shopping-bag', component: <SalesOrdersContent /> },
    { id: 'purchase-orders', path: '/purchase-orders', label: 'Đơn Mua Hàng', group: 'Kinh doanh', permission: 'purchase.view', iconName: 'truck', component: <PurchaseOrdersContent /> },
    { id: 'Quotation-list', path: '/quotations', label: 'Danh sách Báo giá', group: 'Kinh doanh', permission: 'inventory.view', iconName: 'clipboard-list', component: <QuotationList /> },
    { id: 'Quotation-form-new', path: '/quotations/create', label: 'Tạo Báo giá Mới', group: 'Kinh doanh', permission: 'inventory.view', iconName: 'plus-circle', component: <QuotationFormNew /> },
    { id: 'inventories', path: '/inventories', label: 'Quản lý Tồn Kho', group: 'Tồn kho - Web', permission: 'inventory.view', iconName: 'package', component: <InventoriesContent /> },
    { id: 'invoice-dashboard', path: '/invoice-dashboard', label: 'Dashboard Hóa đơn', group: 'Báo cáo', permission: 'invoice.view', iconName: 'bar-chart', component: <InvoiceDashboardPage /> },
    { id: 'invoice-dashboard-v2', path: '/invoice-dashboard-v2', label: 'Dashboard Hóa đơn (V2)', group: 'Báo cáo', permission: 'invoice.view', iconName: 'activity', component: <InvoiceDashboardV2 /> },
    { id: 'invoice-products-analytics', path: '/finance/invoice-products', label: 'Phân tích Mặt hàng (HĐ)', group: 'Báo cáo', permission: 'invoice.view', iconName: 'tag', component: <ProductAnalyticsPage /> },
    { id: 'invoices', path: '/invoices', label: 'Hóa đơn Điện tử', group: 'Tồn kho - Web', permission: 'invoice.view', iconName: 'file-text', component: <InvoicesContent /> },
    { id: 'cash-receipts', path: '/cash-receipts', label: 'Nhật ký Thu tiền (Ecount)', group: 'Báo cáo', permission: 'report.debt', iconName: 'arrow-up', component: <CashReceiptsList /> },
    { id: 'cash-payments', path: '/cash-payments', label: 'Nhật ký Chi tiền (Ecount)', group: 'Báo cáo', permission: 'report.debt', iconName: 'arrow-down', component: <CashPaymentsList /> },
    { id: 'product-standardization', path: '/product-standardization', label: 'Đối soát Đa kênh', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'arrow-up-down', component: <ProductStandardization /> },
    { id: 'product-mobile-manager-v3', path: '/product-mobile-v3', label: 'Quản lý SP web v3 (Mới)', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'monitor', component: <ProductMobileManagerV3 /> },
    { id: 'ecount-manager', path: '/ecount-manager', label: 'Kho ECount (Master)', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'database', component: <EcountProductManager /> },
    { id: 'direct-inventory', path: '/direct-inventory', label: 'Dritex Tồn kho (Live)', group: 'Tồn kho - Web', permission: 'inventory.view', iconName: 'package', component: <DirectInventoryChecker /> },
    { id: 'media-library', path: '/quanly/system/media', label: 'Kho Media (Ảnh)', group: 'Media', permission: 'system.security', iconName: 'image', component: <MediaLibrary /> },
    { id: 'media-studio-page', path: '/quanly/system/media-studio', label: 'Media Studio (Chế ảnh)', group: 'Media', permission: 'system.security', iconName: 'wand', component: <MediaStudioPage /> },
    { id: 'sales-analysis', path: '/sales-analysis', label: 'Phân tích Kinh doanh', group: 'Báo cáo', permission: 'report.sales', iconName: 'bar-chart', component: <SalesAnalysisContent /> },
    { id: 'product-group-analysis', path: '/product-group-analysis', label: 'Phân tích Nhóm SP', group: 'Báo cáo', permission: 'report.product', iconName: 'grid', component: <ProductGroupAnalysisContent /> },
    { id: 'partner-analysis', path: '/partner-analysis', label: 'Phân tích Đối tác', group: 'Báo cáo', permission: 'report.partner', iconName: 'users', component: <PartnerAnalysisContent /> },
    { id: 'inventory-analysis', path: '/inventory-analysis', label: 'Tương tác & Quyết định Nhập', group: 'Báo cáo', permission: 'purchase.view', iconName: 'activity', component: <InventoryAnalysisContent /> },
    // { id: 'purchasing-hub', path: '/purchasing-hub', label: 'Trung tâm Quyết định Nhập', group: 'Báo cáo', permission: 'purchase.view', iconName: 'activity', component: <PurchasingIntelligenceHub /> },
    { id: 'debt-risk', path: '/debt-risk', label: 'Quản trị Rủi ro Công nợ', group: 'Báo cáo', permission: 'report.debt', iconName: 'alert-triangle', component: <DebtRiskPage /> },
    { id: 'customer-360', path: '/customer-360', label: 'Chân dung Khách hàng', group: 'Báo cáo', permission: 'customer.view', iconName: 'user', component: <Customer360Content /> },
    { id: 'kpi-dashboard', path: '/kpi/dashboard', label: 'Dashboard KPI', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'bar-chart', component: <KpiDashboardPage /> },
    { id: 'kpi-performance', path: '/kpi/performance', label: '🔥 Hiệu suất & Gán KPI', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'activity', component: <KpiPerformancePage /> },
    { id: 'kpi-scorecard', path: '/kpi/scorecard', label: '🏆 Bảng điểm KPI', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'award', component: <KpiScorecardPage /> },
    { id: 'kpi-manager', path: '/kpi/manager', label: '⚙️ Quản lý KPI (Detail)', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'cog', component: <KpiManagerPage /> },
    { id: 'kpi-setup', path: '/kpi/setup', label: '🚀 Thiết lập KPI (Bulk)', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'plus-circle', component: <KpiEntryPage /> },
    { id: 'kpi-groups', path: '/kpi/groups', label: 'Quản lý Nhóm KPI', group: 'KPI & Mục tiêu', permission: 'report.sales', iconName: 'users', component: <KpiGroupManagerPage /> },

    { id: 'qr-history', path: '/quanly/qr-history', label: 'Lịch sử QR Code', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'refresh', component: <QrHistoryPage /> },
    { id: 'sepay-sync-management', path: '/quanly/sepay-sync-management', label: 'Quản lý Đồng bộ Sepay', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'refresh', component: <SepaySyncManager /> },
    { id: 'sepay-admin', path: '/quanly/sepay-admin', label: 'Quản trị Dòng tiền', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'credit-card', component: <SepayDashboard /> },
    { id: 'sepay-cashier', path: '/sepay-cashier', label: 'Thu ngân (QR Code)', group: 'Thanh toán', permission: 'sepay.create', iconName: 'grid', component: <SepayCashier /> },
    { id: 'security-commander', path: '/quanly/security/commander', label: 'Trung tâm Chỉ huy (Sếp)', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'shield', component: <SecurityCommanderCenter /> },
    { id: 'session-manager', path: '/quanly/security/sessions', label: 'Quản lý Phiên đăng nhập', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'lock', component: <SessionManager /> },
    { id: 'visual-builder', path: '/quanly/security/visual-builder', label: 'Visual Theme Builder', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <VisualThemeEditor /> },
    { id: 'visual-builder-v2', path: '/quanly/security/visual-builder-v2', label: 'Visual Builder PRO', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <VisualThemeBuilderV2 /> },
    { id: 'user-role-manager', path: '/quanly/security/users', label: 'Quản lý Người dùng', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <UserRoleManager /> },
    { id: 'security-dashboard', path: '/quanly/security/dashboard', label: 'Bảng điều khiển An ninh', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'shield', component: <SecurityDashboard /> },
    { id: 'permission-matrix', path: '/quanly/security/matrix', label: 'Ma trận Phân quyền', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'grid', component: <PermissionMatrix /> },
    { id: 'role-manager', path: '/quanly/security/roles', label: 'Quản lý Vai trò', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'lock', component: <RoleManager /> },
    { id: 'org-chart', path: '/quanly/security/org-chart', label: 'Sơ đồ Tổ chức', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <OrgChart /> },
    { id: 'site-manager', path: '/quanly/security/sites', label: 'Danh sách Site & Domain', group: 'Quản lý Website', permission: 'system.security', iconName: 'globe', component: <SiteManager /> },
    { id: 'theme-version-manager', path: '/quanly/security/theme-versions', label: 'Quản lý Phiên bản', group: 'Quản lý Website', permission: 'system.security', iconName: 'refresh', component: <ThemeVersionManager /> },
    { id: 'definitions', path: '/quanly/security/definitions', label: 'Định nghĩa An ninh', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'info', component: <Definitions /> },
    { id: 'department-tree', path: '/quanly/department-tree', label: 'Quản lý Phòng ban', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <DepartmentTreeManager /> },
    { id: 'dictionary-management', path: '/quanly/dictionary', label: 'Quản lý Từ điển', group: 'Hệ thống - Dữ liệu', permission: 'system.dictionary', iconName: 'database', component: <DictionaryManagementPage /> },
    { id: 'system-monitor-v2', path: '/quanly/system/monitor-v2', label: 'Giám sát & Vận hành V2.2', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'activity', component: <SystemMonitorPage /> },
    { id: 'observer-dashboard', path: '/quanly/system/intelligence', label: 'Trung tâm Giám sát API', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'activity', component: <SystemIntelligenceDashboard /> },
    { id: 'monitor-config', path: '/quanly/system/monitor-config', label: 'Cấu hình Giám sát API', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'cog', component: <MonitorServiceManager /> },
    { id: 'ecount-automation', path: '/quanly/system/ecount-automation', label: 'Ecount Control Panel', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'terminal', component: <EcountAutomationPanel /> },
    { id: 'crm-automation', path: '/quanly/system/crm-tester', label: 'Bot Thử Nghiệm Login', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'shield', component: <CrmTestingPanel /> },
    { id: 'landing-pages', path: '/quanly/landing-pages', label: 'Quản lý Landing Pages', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <LandingPageList /> },

    // --- [MOBILE APP] HUB ĐIỀU HÀNH V8.4 ELITE ---
    { id: 'sdui-hub', path: '/quanly/admin/app-manager/hub', label: 'Dashboard Điều Hành', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'dashboard', component: <AppSDUIManager /> },
    { id: 'app-config', path: '/quanly/admin/app-manager/config', label: 'Cấu hình Hệ thống', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'cog', component: <AppConfigManager /> },
    { id: 'notification-admin-v3', path: '/quanly/admin/app-manager/notifications', label: 'Broadcast Push (FCM)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'bell', component: <NotificationManager /> },
    { id: 'news-feed-admin', path: '/quanly/admin/app-manager/news-feed', label: 'Quản lý Bảng Tin', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'message-square', component: <NewsFeedManager /> },

    { id: 'sdui-blocks', path: '/quanly/admin/app-manager/blocks', label: 'Kho Linh Kiện (Blocks)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'grid', component: <BlockLibrary /> },
    { id: 'sdui-screens', path: '/quanly/admin/app-manager/screens', label: 'Thiết Kế Màn Hình', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'layout', component: <ScreenBuilder /> },
    { id: 'sdui-navigation', path: '/quanly/admin/app-manager/navigation', label: 'Thanh Điều Hướng (Tab)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'compass', component: <NavigationManager /> },
    { id: 'sdui-targeting', path: '/quanly/admin/app-manager/targeting', label: 'Phân Phối & Targeting', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'globe', component: <TargetingManager /> },

    { id: 'sdui-devices', path: '/quanly/admin/app-manager/devices', label: 'Giám sát Định danh IP/1:1', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'monitor', component: <DeviceMonitoring /> },
    { id: 'sdui-api-monitor', path: '/quanly/admin/app-manager/api-monitor', label: 'Monitoring API (Audit)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'activity', component: <ApiMonitoringCenter /> },
    { id: 'sdui-app-logs', path: '/quanly/admin/app-manager/logs', label: 'Remote Logs (Exception)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'bug', component: <RemoteLogManager /> },
    { id: 'sdui-versions', path: '/quanly/admin/app-manager/snapshots', label: 'Lịch Sử Phiên Bản', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'clock', component: <VersionHistory /> },
    { id: 'sdui-audit', path: '/quanly/admin/app-manager/audit', label: 'Trung tâm Kiểm soát', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'shield', component: <AuditCenter /> },
    { id: 'thienduc-products', path: '/quanly/thienduc/products', label: 'Sản phẩm Thiên Đức V4', group: 'Thiên Đức V4', permission: 'thienduc.admin', iconName: 'package', component: <ProductList /> },
    { id: 'thienduc-sync', path: '/quanly/thienduc/sync', label: 'Trung tâm Đồng bộ', group: 'Thiên Đức V4', permission: 'thienduc.admin', iconName: 'refresh', component: <SyncDashboard /> },
];

const MainLayout = ({
    user, onLogout, navItems, currentViewId, handleNavigate,
    isSidebarOpen, setIsSidebarOpen, isSidebarPinned, setIsSidebarPinned,
    isSearchOpen, setIsSearchOpen, activeRouteItem, setAppTitle, navigate
}) => {
    const checkAccess = (requiredPerm, requiredPolicy = null) => {
        if (!ENABLE_PERMISSION_CHECK) return true;
        if (!user) return false;
        if (user.is_admin || user.is_super_admin) return true;
        if (requiredPolicy && user.access_policies?.[requiredPolicy] === true) return false;
        if (!requiredPerm) return true;
        const myPerms = user.permissions || [];
        return myPerms.includes('*') || myPerms.includes(requiredPerm);
    };

    return (
        <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest animate-pulse">Đang tải tài nguyên cơ sở...</p>
            </div>
        }>
            <div className={`flex h-screen overflow-hidden ${appConfig.theme.background.primary}`}>
                <Sidebar
                    navItems={navItems}
                    currentViewId={currentViewId}
                    setCurrentViewId={handleNavigate}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    isSidebarPinned={isSidebarPinned}
                    checkAccess={checkAccess}
                    user={user}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header
                        user={user}
                        onLogout={onLogout}
                        currentView={activeRouteItem}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        isSidebarPinned={isSidebarPinned}
                        onTogglePin={() => setIsSidebarPinned(!isSidebarPinned)}
                        onSearchClick={() => setIsSearchOpen(true)}
                        navigate={navigate}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 relative">
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/kpi" element={<Navigate to="/kpi/dashboard" replace />} />
                            <Route path="/kpi/entry" element={<Navigate to="/kpi/setup" replace />} />
                            {navItems.map(item => (
                                <Route
                                    key={item.id}
                                    path={item.path}
                                    element={
                                        checkAccess(item.permission) ? (
                                            React.cloneElement(item.component, {
                                                setAppTitle,
                                                currentUser: user,
                                                checkAccess
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                                <h2 className="text-2xl font-bold">TỪ CHỐI TRUY CẬP</h2>
                                                <button onClick={() => navigate('/dashboard')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded">Về trang chủ</button>
                                            </div>
                                        )
                                    }
                                />
                            ))}
                            <Route path="/quanly/quotations/edit/:id" element={<QuotationFormNew />} />
                            <Route path="/quanly/product-mapping/:id" element={<ProductMappingManager />} />
                            <Route path="/quanly/landing-pages/create" element={<LandingPageEditor />} />
                            <Route path="/quanly/landing-pages/:id/edit" element={<LandingPageEditor />} />
                            <Route path="/quanly/product-mobile-v3/create" element={<ProductUnifiedEditor />} />
                            <Route path="/quanly/product-mobile-v3/:id" element={<ProductUnifiedEditor />} />
                            <Route
                                path="/profile"
                                element={user ? <ProfilePage currentUser={user} setAppTitle={setAppTitle} /> : <Navigate to="/login" />}
                            />
                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="*" element={<div className="flex items-center justify-center h-full text-gray-400 font-bold text-2xl">404 - Trang không tồn tại</div>} />
                        </Routes>
                    </main>
                </div>
                <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={(id) => { handleNavigate(id); setIsSearchOpen(false); }} />
                <ChatBubble user={user} />
            </div>
        </React.Suspense>
    );
};

const BASE_APP_TITLE = 'QuocVietCRM';

const App = () => {
    useEffect(() => {
        const checkAppVersion = () => {
            const storedVersion = localStorage.getItem(appConfig.app.VERSION_KEY);
            const currentVersion = appConfig.app.CURRENT_VERSION;
            if (storedVersion !== currentVersion) {
                const mobileToken = localStorage.getItem('auth_token');
                localStorage.clear();
                if (mobileToken) localStorage.setItem('auth_token', mobileToken);
                localStorage.setItem(appConfig.app.VERSION_KEY, currentVersion);
                window.location.reload();
            }
        };
        checkAppVersion();
    }, []);

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pageTitle, setPageTitle] = useState(BASE_APP_TITLE);
    const navigate = useNavigate();
    const location = useLocation();

    const activeRouteItem = navItems.find(item => item.path === location.pathname) || navItems[0];
    const currentViewId = activeRouteItem.id;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarPinned, setIsSidebarPinned] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const setAppTitle = useCallback((titleSuffix = '') => {
        setPageTitle(titleSuffix ? `${titleSuffix} | ${BASE_APP_TITLE}` : BASE_APP_TITLE);
    }, []);

    useEffect(() => { document.title = pageTitle; }, [pageTitle]);
    useEffect(() => { setAppTitle(activeRouteItem?.label); }, [activeRouteItem, setAppTitle]);

    // [DYNAMIC FAVICON]
    useEffect(() => {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        link.href = (import.meta.env.BASE_URL || '/') + 'logo2.png';
        document.getElementsByTagName('head')[0].appendChild(link);
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            // [OPTIMIZATION] Nếu đang ở trang login và không có dấu hiệu session cũ, 
            // bỏ qua check API để tránh lỗi 401 hiển thị trong console (gây hiểu lầm cho khách hàng)
            if (window.location.pathname.includes('/login')) {
                const hasLocalSession = localStorage.getItem('auth_token') || localStorage.getItem('user');
                if (!hasLocalSession) {
                    setIsLoading(false);
                    return;
                }
            }

            try {
                const response = await axios.get('/api/user');
                const userData = response.data.user || response.data;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                if (!localStorage.getItem('auth_token')) {
                    try {
                        const tokenRes = await axios.get('/api/auth/token');
                        if (tokenRes.data.token) localStorage.setItem('auth_token', tokenRes.data.token);
                    } catch (e) { }
                }
            } catch (error) {
                setUser(null);
                localStorage.removeItem('user');
                localStorage.removeItem('auth_token');
                delete axios.defaults.headers.common['Authorization'];
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const onLogout = async () => {
        try { await axios.post('/api/logout'); } catch (error) { }
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        window.location.href = '/login';
    };

    const handleNavigate = (viewId) => {
        const item = navItems.find(i => i.id === viewId);
        if (item && item.path) navigate(item.path);
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/password/reset" element={<ResetPasswordPage />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/*" element={user ? (
                <MainLayout
                    user={user} onLogout={onLogout} navItems={navItems} currentViewId={currentViewId}
                    handleNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
                    isSidebarPinned={isSidebarPinned} setIsSidebarPinned={setIsSidebarPinned}
                    isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen}
                    activeRouteItem={activeRouteItem} setAppTitle={setAppTitle} navigate={navigate}
                />
            ) : <Navigate to="/login" />} />
        </Routes>
    );
};

export default App;

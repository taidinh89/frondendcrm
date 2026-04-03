// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LoginPage, Header, Sidebar } from './components/Layout/layout.jsx';
import { appConfig, ENABLE_PERMISSION_CHECK } from './config/appConfig.js';
import { Toaster } from 'react-hot-toast';

const ENABLE_LOG = true;

// --- 1. IMPORT CÁC TRANG NGHIỆP VỤ ---
import { DashboardContent } from './pages/Dashboard/DashboardContent.jsx';
import { CustomersContent } from './pages/Business/CustomersContent.jsx';
import { SalesOrdersContent } from './pages/Business/SalesOrdersContent.jsx';
import { PurchaseOrdersContent } from './pages/Business/PurchaseOrdersContent.jsx';
import { InventoriesContent } from './pages/Inventory/InventoriesContent.jsx';
import PurchasingIntelligenceHub from './pages/Inventory/PurchasingIntelligenceHub.jsx';

import { InvoicesContent } from './pages/Finance/InvoicesContent.jsx';
import { SalesAnalysisContent } from './pages/Analytics/SalesAnalysisContent.jsx';
import { ProductGroupAnalysisContent } from './pages/Analytics/ProductGroupAnalysisContent.jsx';
import { PartnerAnalysisContent } from './pages/Analytics/PartnerAnalysisContent.jsx';
import { InventoryAnalysisContent } from './pages/Analytics/InventoryAnalysisContent.jsx';
import { DebtRiskPage } from './pages/Finance/DebtRiskPage.jsx';
import { Customer360Content } from './pages/Business/Customer360Content.jsx';
import KpiManagerPage from './pages/Analytics/KpiManagerPage.jsx';
import KpiEntryPage from './pages/Analytics/KpiEntryPage.jsx';
import KpiGroupManagerPage from './pages/Analytics/KpiGroupManagerPage.jsx';
import KpiScorecardPage from './pages/Analytics/KpiScorecardPage.jsx';
import KpiDashboardPage from './pages/Analytics/KpiDashboardPage.jsx';
import KpiPerformancePage from './pages/Analytics/KpiPerformancePage.jsx';
import { DictionaryManagementPage } from './pages/System/DictionaryManagementPage.jsx';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal.jsx';
import { SepayDashboard } from './pages/Sepay/SepayDashboard.jsx';
import { SepayCashier } from './pages/Sepay/SepayCashier.jsx';
import DepartmentTreeManager from "./pages/System/DepartmentTreeManager.jsx";
import UserRoleManager from './pages/Security/UserRoleManager';
import SecurityDashboard from './pages/Security/Dashboard';
import PermissionMatrix from './pages/Security/PermissionMatrix';
import RoleManager from './pages/Security/RoleManager';
import OrgChart from './pages/Security/OrgChart';
import Definitions from './pages/Security/Definitions';
import SecurityCommanderCenter from './pages/Security/SecurityCommanderCenter';
import SessionManager from './pages/Security/SessionManager';
import VisualThemeEditor from './pages/Security/VisualThemeEditor';
import VisualThemeBuilderV2 from './pages/Security/VisualThemeBuilderV2';
import SiteManager from './pages/Security/SiteManager';
import ThemeVersionManager from './pages/Security/ThemeVersionManager';
import SystemIntelligenceDashboard from './pages/System/SystemIntelligenceDashboard.jsx';
import UnitConversionManager from './pages/Inventory/UnitConversionManager.jsx';
import { SystemMonitorPage } from './pages/System/SystemMonitorPage.jsx';
import ImportManagement from './pages/System/ImportManagement.jsx';
import { QrHistoryPage } from "./pages/Sepay/QrHistoryPage.jsx";
import { InvoiceDashboardPage } from './pages/Finance/InvoiceDashboardPage.jsx';
import { QuotationList } from './pages/Business/QuotationList';
import { QuotationFormNew } from './pages/Business/QuotationFormNew';
import MobileScreenManager from './pages/Admin/MobileScreenManager';
import AppSDUIManager from './pages/Admin/AppSDUIManager';
import MobileAppBuilder from './pages/Admin/MobileAppBuilder.jsx';
import MediaLibrary from './pages/Admin/MediaLibrary.jsx';
import MediaStudioPage from './pages/Admin/MediaStudioPage.jsx';
import NewsFeedManager from './pages/Admin/NewsFeedManager.jsx';
import BlockLibrary from './pages/AppManager/BlockLibrary.jsx';
import ScreenBuilder from './pages/AppManager/ScreenBuilder.jsx';
import TargetingManager from './pages/AppManager/TargetingManager.jsx';
import NavigationManager from './pages/AppManager/NavigationManager.jsx';
import VersionHistory from './pages/AppManager/VersionHistory.jsx';
import AuditCenter from './pages/AppManager/AuditCenter.jsx';
import DeviceMonitoring from './pages/AppManager/DeviceMonitoring.jsx';
import ApiMonitoringCenter from './pages/AppManager/ApiMonitoringCenter.jsx';
import AppConfigManager from './pages/AppManager/AppConfigManager.jsx';
import RemoteLogManager from './pages/AppManager/RemoteLogManager.jsx';
import LandingPageList from './pages/LandingPages/LandingPageList.jsx';
import LandingPageEditor from './pages/LandingPages/LandingPageEditor.jsx';
import { SepaySyncManager } from './pages/Sepay/SepaySyncManager.jsx';
import MonitorServiceManager from './pages/System/MonitorServiceManager.jsx';
import { ProductStandardization } from './pages/Inventory/ProductStandardization.jsx';
import { ProductMappingManager } from './pages/Inventory/ProductMappingManager.jsx';
import { EcountProductManager } from './pages/Inventory/EcountProductManager.jsx';
import { DirectInventoryChecker } from './pages/Inventory/DirectInventoryChecker.jsx';
import ProductMobileManagerV3 from './components/Product/ProductMobileManagerV3.jsx';
import ProductUnifiedEditor from './pages/Product/ProductUnifiedEditor';
import OmnichannelChatPage from './components/Chat/OmnichannelChatPage.jsx';
import InternalChatPage from './pages/Communication/InternalChatPage.jsx';
import ChatBubble from './components/Chat/ChatBubble.jsx';
import ChannelManager from './components/Chat/ChannelManager.jsx';
import StaffGroupManager from './components/Chat/StaffGroupManager.jsx';
import NotificationManager from './components/Notification/NotificationManager.jsx';
import { ProfilePage } from './pages/Profile/ProfilePage.jsx';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage.jsx';
import ProductList from './pages/ThienDuc/Products/ProductList.jsx';
import SyncDashboard from './pages/ThienDuc/SyncCenter/SyncDashboard.jsx';

// --- 3. CẤU HÌNH MENU (NAV ITEMS) ---
const navItems = [
    { id: 'chat-v2', path: '/chat-v2', label: 'Chat Đa kênh V2', group: 'Giao tiếp', permission: null, iconName: 'chat', component: <OmnichannelChatPage /> },
    { id: 'internal-chat', path: '/internal-chat', label: 'Chat Nội bộ', group: 'Giao tiếp', permission: null, iconName: 'chat', component: <InternalChatPage /> },
    { id: 'chat-admin', path: '/chat-admin', label: 'Quản lý Kênh Chat', group: 'Giao tiếp', permission: 'system.security', iconName: 'cog', component: <ChannelManager /> },
    { id: 'user-group-manager', path: '/user-groups', label: 'Quản lý Nhóm NV', group: 'Giao tiếp', permission: 'system.security', iconName: 'users', component: <StaffGroupManager /> },
    { id: 'notification-admin', path: '/notifications/admin', label: 'Trung tâm Thông báo', group: 'Giao tiếp', permission: 'system.security', iconName: 'bell', component: <NotificationManager /> },
    { id: 'dashboard', path: '/dashboard', label: 'Tổng quan Hệ thống', group: 'Chung', permission: null, iconName: 'home', component: <DashboardContent /> },
    { id: 'customers', path: '/customers', label: 'Quản lý Khách hàng & NCC', group: 'Kinh doanh', permission: 'customer.view', iconName: 'users', component: <CustomersContent /> },
    { id: 'sales-orders', path: '/sales-orders', label: 'Đơn Bán Hàng', group: 'Kinh doanh', permission: 'sales.view', iconName: 'shopping-bag', component: <SalesOrdersContent /> },
    { id: 'purchase-orders', path: '/purchase-orders', label: 'Đơn Mua Hàng', group: 'Kinh doanh', permission: 'purchase.view', iconName: 'truck', component: <PurchaseOrdersContent /> },
    { id: 'Quotation-list', path: '/quotations', label: 'Danh sách Báo giá', group: 'Kinh doanh', permission: 'inventory.view', iconName: 'clipboard-list', component: <QuotationList /> },
    { id: 'Quotation-form-new', path: '/quotations/create', label: 'Tạo Báo giá Mới', group: 'Kinh doanh', permission: 'inventory.view', iconName: 'plus-circle', component: <QuotationFormNew /> },
    { id: 'inventories', path: '/inventories', label: 'Quản lý Tồn Kho', group: 'Tồn kho - Web', permission: 'inventory.view', iconName: 'package', component: <InventoriesContent /> },
    { id: 'invoice-dashboard', path: '/invoice-dashboard', label: 'Dashboard Hóa đơn', group: 'Báo cáo', permission: 'invoice.view', iconName: 'bar-chart', component: <InvoiceDashboardPage /> },
    { id: 'invoices', path: '/invoices', label: 'Hóa đơn Điện tử', group: 'Tồn kho - Web', permission: 'invoice.view', iconName: 'file-text', component: <InvoicesContent /> },
    { id: 'product-standardization', path: '/product-standardization', label: 'Đối soát Đa kênh', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'arrow-up-down', component: <ProductStandardization /> },
    { id: 'product-mobile-manager-v3', path: '/product-mobile-v3', label: 'Quản lý SP web v3 (Mới)', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'monitor', component: <ProductMobileManagerV3 /> },
    { id: 'ecount-manager', path: '/ecount-manager', label: 'Kho ECount (Master)', group: 'Tồn kho - Web', permission: 'system.sync', iconName: 'database', component: <EcountProductManager /> },
    { id: 'direct-inventory', path: '/direct-inventory', label: 'Dritex Tồn kho (Live)', group: 'Tồn kho - Web', permission: 'inventory.view', iconName: 'package', component: <DirectInventoryChecker /> },
    { id: 'media-library', path: '/system/media', label: 'Kho Media (Ảnh)', group: 'Media', permission: 'system.security', iconName: 'image', component: <MediaLibrary /> },
    { id: 'media-studio-page', path: '/system/media-studio', label: 'Media Studio (Chế ảnh)', group: 'Media', permission: 'system.security', iconName: 'wand', component: <MediaStudioPage /> },
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

    { id: 'qr-history', path: '/qr-history', label: 'Lịch sử QR Code', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'refresh', component: <QrHistoryPage /> },
    { id: 'sepay-sync-management', path: '/sepay-sync-management', label: 'Quản lý Đồng bộ Sepay', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'refresh', component: <SepaySyncManager /> },
    { id: 'sepay-admin', path: '/sepay-admin', label: 'Quản trị Dòng tiền', group: 'Thanh toán', permission: 'sepay.viewall', iconName: 'credit-card', component: <SepayDashboard /> },
    { id: 'sepay-cashier', path: '/sepay-cashier', label: 'Thu ngân (QR Code)', group: 'Thanh toán', permission: 'sepay.create', iconName: 'grid', component: <SepayCashier /> },
    { id: 'security-commander', path: '/security/commander', label: 'Trung tâm Chỉ huy (Sếp)', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'shield', component: <SecurityCommanderCenter /> },
    { id: 'session-manager', path: '/security/sessions', label: 'Quản lý Phiên đăng nhập', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'lock', component: <SessionManager /> },
    { id: 'visual-builder', path: '/security/visual-builder', label: 'Visual Theme Builder', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <VisualThemeEditor /> },
    { id: 'visual-builder-v2', path: '/security/visual-builder-v2', label: 'Visual Builder PRO', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <VisualThemeBuilderV2 /> },
    { id: 'user-role-manager', path: '/security/users', label: 'Quản lý Người dùng', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <UserRoleManager /> },
    { id: 'security-dashboard', path: '/security/dashboard', label: 'Bảng điều khiển An ninh', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'shield', component: <SecurityDashboard /> },
    { id: 'permission-matrix', path: '/security/matrix', label: 'Ma trận Phân quyền', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'grid', component: <PermissionMatrix /> },
    { id: 'role-manager', path: '/security/roles', label: 'Quản lý Vai trò', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'lock', component: <RoleManager /> },
    { id: 'org-chart', path: '/security/org-chart', label: 'Sơ đồ Tổ chức', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <OrgChart /> },
    { id: 'site-manager', path: '/security/sites', label: 'Danh sách Site & Domain', group: 'Quản lý Website', permission: 'system.security', iconName: 'globe', component: <SiteManager /> },
    { id: 'theme-version-manager', path: '/security/theme-versions', label: 'Quản lý Phiên bản', group: 'Quản lý Website', permission: 'system.security', iconName: 'refresh', component: <ThemeVersionManager /> },
    { id: 'definitions', path: '/security/definitions', label: 'Định nghĩa An ninh', group: 'Hệ thống - Bảo mật', permission: 'system.security', iconName: 'info', component: <Definitions /> },
    { id: 'department-tree', path: '/department-tree', label: 'Quản lý Phòng ban', group: 'Hệ thống - Nhân sự', permission: 'system.security', iconName: 'users', component: <DepartmentTreeManager /> },
    { id: 'dictionary-management', path: '/dictionary', label: 'Quản lý Từ điển', group: 'Hệ thống - Dữ liệu', permission: 'system.dictionary', iconName: 'database', component: <DictionaryManagementPage /> },
    { id: 'system-monitor-v2', path: '/system/monitor-v2', label: 'Giám sát & Vận hành V2.2', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'activity', component: <SystemMonitorPage /> },
    { id: 'observer-dashboard', path: '/system/intelligence', label: 'Trung tâm Giám sát API', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'activity', component: <SystemIntelligenceDashboard /> },
    { id: 'monitor-config', path: '/system/monitor-config', label: 'Cấu hình Giám sát API', group: 'Hệ thống - Giám sát', permission: 'system.security', iconName: 'cog', component: <MonitorServiceManager /> },
    { id: 'landing-pages', path: '/landing-pages', label: 'Quản lý Landing Pages', group: 'Quản lý Website', permission: 'system.security', iconName: 'layout', component: <LandingPageList /> },

    // --- [MOBILE APP] HUB ĐIỀU HÀNH V8.4 ELITE ---
    { id: 'sdui-hub', path: '/admin/app-manager/hub', label: 'Dashboard Điều Hành', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'dashboard', component: <AppSDUIManager /> },
    { id: 'app-config', path: '/admin/app-manager/config', label: 'Cấu hình Hệ thống', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'cog', component: <AppConfigManager /> },
    { id: 'notification-admin', path: '/admin/app-manager/notifications', label: 'Broadcast Push (FCM)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'bell', component: <NotificationManager /> },
    { id: 'news-feed-admin', path: '/admin/app-manager/news-feed', label: 'Quản lý Bảng Tin', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'message-square', component: <NewsFeedManager /> },

    { id: 'sdui-blocks', path: '/admin/app-manager/blocks', label: 'Kho Linh Kiện (Blocks)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'grid', component: <BlockLibrary /> },
    { id: 'sdui-screens', path: '/admin/app-manager/screens', label: 'Thiết Kế Màn Hình', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'layout', component: <ScreenBuilder /> },
    { id: 'sdui-navigation', path: '/admin/app-manager/navigation', label: 'Thanh Điều Hướng (Tab)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'compass', component: <NavigationManager /> },
    { id: 'sdui-targeting', path: '/admin/app-manager/targeting', label: 'Phân Phối & Targeting', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'globe', component: <TargetingManager /> },

    { id: 'sdui-devices', path: '/admin/app-manager/devices', label: 'Giám sát Định danh IP/1:1', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'monitor', component: <DeviceMonitoring /> },
    { id: 'sdui-api-monitor', path: '/admin/app-manager/api-monitor', label: 'Monitoring API (Audit)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'activity', component: <ApiMonitoringCenter /> },
    { id: 'sdui-app-logs', path: '/admin/app-manager/logs', label: 'Remote Logs (Exception)', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'bug', component: <RemoteLogManager /> },
    { id: 'sdui-versions', path: '/admin/app-manager/snapshots', label: 'Lịch Sử Phiên Bản', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'clock', component: <VersionHistory /> },
    { id: 'sdui-audit', path: '/admin/app-manager/audit', label: 'Trung tâm Kiểm soát', group: '[MOBILE HUB] ĐIỀU HÀNH 8.4', permission: 'system.security', iconName: 'shield', component: <AuditCenter /> },
    { id: 'thienduc-products', path: '/thienduc/products', label: 'Sản phẩm Thiên Đức V4', group: 'Thiên Đức V4', permission: 'thienduc.admin', iconName: 'package', component: <ProductList /> },
    { id: 'thienduc-sync', path: '/thienduc/sync', label: 'Trung tâm Đồng bộ', group: 'Thiên Đức V4', permission: 'thienduc.admin', iconName: 'refresh', component: <SyncDashboard /> },
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
        <div className={`flex h-screen overflow-hidden ${appConfig.theme.background.primary}`}>
            <Sidebar
                navItems={navItems}
                currentViewId={currentViewId}
                setCurrentViewId={handleNavigate}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isSidebarPinned={isSidebarPinned}
                checkAccess={checkAccess}
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
                        <Route path="/quotations/edit/:id" element={<QuotationFormNew />} />
                        <Route path="/product-mapping/:id" element={<ProductMappingManager />} />
                        <Route path="/landing-pages/create" element={<LandingPageEditor />} />
                        <Route path="/landing-pages/:id/edit" element={<LandingPageEditor />} />
                        <Route path="/product-mobile-v3/create" element={<ProductUnifiedEditor />} />
                        <Route path="/product-mobile-v3/:id" element={<ProductUnifiedEditor />} />
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

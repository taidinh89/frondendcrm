// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LoginPage, Header, Sidebar } from './components/Layout/layout.jsx';
import { appConfig, ENABLE_PERMISSION_CHECK } from './config/appConfig.js';
import { Toaster } from 'react-hot-toast';

const ENABLE_LOG = true; // [DEBUG] Toggle log logout

// --- 1. IMPORT CÁC TRANG NGHIỆP VỤ ---
import { DashboardContent } from './pages/Dashboard/DashboardContent.jsx';
import { CustomersContent } from './pages/Business/CustomersContent.jsx';
import { SalesOrdersContent } from './pages/Business/SalesOrdersContent.jsx';
import { PurchaseOrdersContent } from './pages/Business/PurchaseOrdersContent.jsx';
import { InventoriesContent } from './pages/Inventory/InventoriesContent.jsx';
import { DirectInventoryChecker } from './pages/Inventory/DirectInventoryChecker.jsx';
import { InvoicesContent } from './pages/Finance/InvoicesContent.jsx';
import { SalesAnalysisContent } from './pages/Analytics/SalesAnalysisContent.jsx';
import { ProductGroupAnalysisContent } from './pages/Analytics/ProductGroupAnalysisContent.jsx';
import { PartnerAnalysisContent } from './pages/Analytics/PartnerAnalysisContent.jsx';

import { DebtRiskPage } from './pages/Finance/DebtRiskPage.jsx';
import { Customer360Content } from './pages/Business/Customer360Content.jsx';
import { DictionaryManagementPage } from './pages/System/DictionaryManagementPage.jsx';
import { GlobalSearchModal } from './components/Modals/GlobalSearchModal.jsx';
import { SepayDashboard } from './pages/Sepay/SepayDashboard.jsx';
import { SepayCashier } from './pages/Sepay/SepayCashier.jsx';
import DepartmentTreeManager from "./pages/System/DepartmentTreeManager.jsx";
import UserRoleManager from './pages/Security/UserRoleManager';

// --- 2. IMPORT MODULE BẢO MẬT (SECURITY) ---
import SecurityDashboard from './pages/Security/Dashboard';
import PermissionMatrix from './pages/Security/PermissionMatrix';
import RoleManager from './pages/Security/RoleManager';
import OrgChart from './pages/Security/OrgChart';
import Definitions from './pages/Security/Definitions';
import SecurityCommanderCenter from './pages/Security/SecurityCommanderCenter';
import SessionManager from './pages/Security/SessionManager'; // [NEW]
import VisualThemeEditor from './pages/Security/VisualThemeEditor'; // [NEW]
import VisualThemeBuilderV2 from './pages/Security/VisualThemeBuilderV2'; // [NEW V2]
import SiteManager from './pages/Security/SiteManager'; // [NEW]
import ThemeVersionManager from './pages/Security/ThemeVersionManager'; // [NEW]

import SystemIntelligenceDashboard from './pages/System/SystemIntelligenceDashboard.jsx';
import UnitConversionManager from './pages/Inventory/UnitConversionManager.jsx';
import { SystemMonitorPage } from './pages/System/SystemMonitorPage.jsx';
import ImportManagement from './pages/System/ImportManagement.jsx';
import { QrHistoryPage } from "./pages/Sepay/QrHistoryPage.jsx";
import { InvoiceDashboardPage } from './pages/Finance/InvoiceDashboardPage.jsx';
import { QuotationList } from './pages/Business/QuotationList';
import { QuotationFormNew } from './pages/Business/QuotationFormNew';
// import { QuotationListV2 } from './pages/Business/QuotationListV2';
// import { QuotationFormV2 } from './pages/../archive/pages/QuotationFormV2';
import MobileScreenManager from './pages/Admin/MobileScreenManager';
import MobileAppBuilder from './pages/Admin/MobileAppBuilder.jsx';
import MediaLibrary from './pages/Admin/MediaLibrary.jsx';
import MediaStudioPage from './pages/Admin/MediaStudioPage.jsx';

// [NEW] Landing Page Management
import LandingPageList from './pages/LandingPages/LandingPageList.jsx';
import LandingPageEditor from './pages/LandingPages/LandingPageEditor.jsx';

import { SepaySyncManager } from './pages/Sepay/SepaySyncManager.jsx';
import MonitorServiceManager from './pages/System/MonitorServiceManager.jsx';
import { ProductStandardization } from './pages/Inventory/ProductStandardization.jsx';
import { ProductMappingManager } from './pages/Inventory/ProductMappingManager.jsx';
import { EcountProductManager } from './pages/Inventory/EcountProductManager.jsx';
import ProductMobileManagerV3 from './components/Product/ProductMobileManagerV3.jsx'; // [NEW V3 MAIN]
import ProductMobileDetailV3 from './components/Product/ProductMobileDetailV3.jsx'; // [NEW V3 DETAIL]
import ProductUnifiedEditor from './pages/Product/ProductUnifiedEditor';

// [NEW] User & Auth Pages
import { ProfilePage } from './pages/Profile/ProfilePage.jsx';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage.jsx';

// --- 3. CẤU HÌNH MENU (NAV ITEMS) ---
const navItems = [
    {
        id: 'dashboard',
        path: '/dashboard',
        label: 'Tổng quan Hệ thống',
        group: 'Chung',
        permission: null,
        icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M3 13h18M3 13V21M21 13V21M3 21h18',
        component: <DashboardContent />
    },
    // ... (Keep other generic items) ...
    { id: 'customers', path: '/customers', label: 'Quản lý Khách Hàng', group: 'Kinh doanh', permission: 'customer.view', icon: 'M18 18.72a9.094 9.094 0 00-9 0m9 0a8.966 8.966 0 00-4.5-7.962m-4.5 7.962a8.966 8.966 0 01-4.5-7.962m0 0A5.25 5.25 0 0113.5 10.5m0 0v5.25m0 0v5.25m0 0A5.25 5.25 0 0113.5 10.5M6 6.75A5.25 5.25 0 0111.25 1.5m0 0A5.25 5.25 0 0116.5 6.75m-5.25 0v5.25m-5.25 0A5.25 5.25 0 0111.25 1.5', component: <CustomersContent /> },
    { id: 'customer-360', path: '/customer-360', label: 'Chân dung Khách hàng', group: 'Kinh doanh', permission: 'customer.view', icon: 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z', component: <Customer360Content /> },
    { id: 'sales-orders', path: '/sales-orders', label: 'Đơn Bán Hàng', group: 'Kinh doanh', permission: 'sales.view', icon: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.517l.288.756a3 3 0 01-.19 3.822L17.5 16.891a3 3 0 01-4.757 0l-1.39-2.366a3 3 0 01-1.096-3.822l.288-.756m11.356-1.517l-1.39 2.366a3 3 0 01-4.757 0L17.5 16.891a3 3 0 01-4.757 0l-1.39-2.366m11.356-1.517l.288.756a3 3 0 01-.19 3.822L17.5 16.891a3 3 0 01-4.757 0l-1.39-2.366', component: <SalesOrdersContent /> },
    { id: 'purchase-orders', path: '/purchase-orders', label: 'Đơn Mua Hàng', group: 'Kinh doanh', permission: 'purchase.view', icon: 'M16.023 9.348h4.992v-.001a.75.75 0 01.588.826l-1.7 8.5A.75.75 0 0118.25 19H5.75a.75.75 0 01-.73-.725l-1.7-8.5A.75.75 0 013.988 9.35v-.001H9v2.25a.75.75 0 001.5 0V9.35h3.023v2.25a.75.75 0 001.5 0V9.35zM12 2.25c-2.485 0-4.5 2.015-4.5 4.5V9.35h9V6.75c0-2.485-2.015-4.5-4.5-4.5z', component: <PurchaseOrdersContent /> },
    { id: 'Quotation-list', path: '/quotations', label: 'Danh sách Báo giá', group: 'Kinh doanh', permission: 'inventory.view', icon: 'M12 6v12m-3-2.818l-.504-.252a1.125 1.125 0 010-2.052l.504-.252L12 12m-3-2.818v2.818m3-2.818l.504.252a1.125 1.125 0 010 2.052l-.504.252L12 12m3-2.818v2.818M11.25 18a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z', component: <QuotationList /> },
    { id: 'Quotation-form-new', path: '/quotations/create', label: 'Tạo Báo giá Mới', group: 'Kinh doanh', permission: 'inventory.view', icon: 'M12 6v12m-3-2.818l-.504-.252a1.125 1.125 0 010-2.052l.504-.252L12 12m-3-2.818v2.818m3-2.818l.504.252a1.125 1.125 0 010 2.052l-.504.252L12 12m3-2.818v2.818M11.25 18a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z', component: <QuotationFormNew /> },
    { id: 'inventories', path: '/inventories', label: 'Quản lý Tồn Kho', group: 'Web', permission: 'inventory.view', icon: 'M3 12a9 9 0 0118 0v7.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 19.5V12zm1.5 6.75a.75.75 0 001.5 0v-5.25h13.5V18a.75.75 0 001.5 0V12H4.5v6.75zm1.5-1.5a.75.75 0 000-1.5h1.5a.75.75 0 000 1.5H6zM15 12.75a.75.75 0 000-1.5h3.75a.75.75 0 000 1.5H15z', component: <InventoriesContent /> },
    { id: 'direct-inventory', path: '/direct-inventory', label: 'Đối soát Tồn Kho (Gốc)', group: 'Web', permission: 'inventory.view', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .415.162.793.425 1.07.262.277.612.43 1.075.43.463 0 .813-.153 1.075-.43.263-.277.425-.655.425-1.07 0-.231-.035-.454-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25c1.039 0 1.897.712 2.126 1.66m-5.8 0a2.251 2.251 0 002.126 1.66m5.8 0a2.251 2.251 0 012.126-1.66m0 0a2.251 2.251 0 00-2.126-1.66', component: <DirectInventoryChecker /> },
    {
        id: 'invoice-dashboard',
        path: '/invoice-dashboard',
        label: 'Dashboard Hóa đơn',
        group: 'Báo cáo',
        permission: 'invoice.view',
        icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
        component: <InvoiceDashboardPage />
    },
    { id: 'invoices', path: '/invoices', label: 'Hóa đơn Điện tử', group: 'Web', permission: 'invoice.view', icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m4.5-12h-8.25A2.25 2.25 0 009 6.75v10.5A2.25 2.25 0 0011.25 19.5h7.5A2.25 2.25 0 0021 17.25V9.75A2.25 2.25 0 0018.75 7.5H15', component: <InvoicesContent /> },
    { id: 'product-standardization', path: '/product-standardization', label: 'Đối soát Đa kênh', group: 'Web', permission: 'system.sync', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', component: <ProductStandardization /> },
    { id: 'product-mobile-manager-v3', path: '/product-mobile-v3', label: 'Quản lý SP web v3 (Mới)', group: 'Web', permission: 'system.sync', icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3', component: <ProductMobileManagerV3 /> }, // [NEW V3 ITEM]
    { id: 'ecount-manager', path: '/ecount-manager', label: 'Kho ECount (Master)', group: 'Web', permission: 'system.sync', icon: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9', component: <EcountProductManager /> },
    { id: 'product-unified-editor', path: '/product-edit/:id', label: 'Editor', group: 'Hidden', permission: 'system.sync', icon: '', component: <ProductUnifiedEditor />, hidden: true },

    // --- NHÓM MEDIA (DƯỚI WEB) ---
    {
        id: 'media-library',
        path: '/system/media',
        label: 'Kho Media (Ảnh)',
        group: 'Media',
        permission: 'system.security',
        icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
        component: <MediaLibrary />
    },
    {
        id: 'media-studio-page',
        path: '/system/media-studio',
        label: 'Media Studio (Chế ảnh)',
        group: 'Media',
        permission: 'system.security',
        icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z',
        component: <MediaStudioPage />
    },

    { id: 'sales-analysis', path: '/sales-analysis', label: 'Phân tích Kinh doanh', group: 'Báo cáo', permission: 'report.sales', icon: 'M11.75 21a.75.75 0 01-.75-.75V3.75A.75.75 0 0111.75 3h.5a.75.75 0 01.75.75v16.5a.75.75 0 01-.75.75h-.5zm3.75-2.25a.75.75 0 01-.75-.75V7.5a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75h-.5zm3.75-4.5a.75.75 0 01-.75-.75V11.25a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75v3.75a.75.75 0 01-.75.75h-.5zM7.25 18.75a.75.75 0 01-.75-.75V15a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75v3.75a.75.75 0 01-.75.75h-.5zM3 16.5a.75.75 0 01-.75-.75V17.25a.75.75 0 01.75-.75h.5a.75.75 0 01.75.75v-1.5a.75.75 0 01-.75.75H3z', component: <SalesAnalysisContent /> },
    { id: 'product-group-analysis', path: '/product-group-analysis', label: 'Phân tích Nhóm SP', group: 'Báo cáo', permission: 'report.product', icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7m-13 0a3 3 0 106 0 3 3 0 00-6 0z', component: <ProductGroupAnalysisContent /> },
    { id: 'partner-analysis', path: '/partner-analysis', label: 'Phân tích Đối tác', group: 'Báo cáo', permission: 'report.partner', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', component: <PartnerAnalysisContent /> },
    { id: 'debt-risk', path: '/debt-risk', label: 'Quản trị Rủi ro Công nợ', group: 'Báo cáo', permission: 'report.debt', icon: 'M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002zM12 15.75h.007v.008H12v-.008z', component: <DebtRiskPage /> },
    {
        id: 'qr-history',
        path: '/qr-history',
        label: 'Lịch sử QR Code',
        group: 'Thanh toán',
        permission: 'sepay.viewall',
        icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
        component: <QrHistoryPage />
    },
    { id: 'sepay-sync-management', path: '/sepay-sync-management', label: 'Quản lý Đồng bộ Sepay', group: 'Thanh toán', permission: 'sepay.viewall', icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M3 13h18M3 13V21M21 13V21M3 21h18', component: <SepaySyncManager /> },
    { id: 'sepay-admin', path: '/sepay-admin', label: 'Quản trị Dòng tiền', group: 'Thanh toán', permission: 'sepay.viewall', icon: 'M12 6v12m-3-2.818l-.504-.252a1.125 1.125 0 010-2.052l.504-.252L12 12m-3-2.818v2.818m3-2.818l.504.252a1.125 1.125 0 010 2.052l-.504.252L12 12m3-2.818v2.818M11.25 18a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z', component: <SepayDashboard /> },
    { id: 'sepay-cashier', path: '/sepay-cashier', label: 'Thu ngân (QR Code)', group: 'Thanh toán', permission: 'sepay.create', icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z', component: <SepayCashier /> },
    { id: 'security-commander', path: '/security/commander', label: 'Trung tâm Chỉ huy (Sếp)', group: 'Hệ thống', permission: 'system.security', icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z', component: <SecurityCommanderCenter /> },
    { id: 'session-manager', path: '/security/sessions', label: 'Quản lý Phiên đăng nhập', group: 'Hệ thống', permission: 'system.security', icon: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z', component: <SessionManager /> }, // [NEW]
    {
        id: 'visual-builder',
        path: '/security/visual-builder',
        label: 'Visual Theme Builder (Màu/HTML)',
        group: 'Quản lý Website',
        permission: 'system.security',
        icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043 9.02c.868 0 1.597-.56 1.848-1.32.257-.757.083-1.615-.464-2.203a3.989 3.989 0 00-1.384-2.446m2.771 7.193l.117-.3a.675.675 0 111.233.54l-.117.3c-.424.814-1.258 1.34-2.164 1.34H9.412a2.31 2.31 0 01-1.782-3.693m7.5 1.5l.117-.3c.424-.814 1.258-1.34 2.164-1.34h2.234a2.31 2.31 0 011.782 3.693l-.117.3a1.5 1.5 0 01-2.164.54 1.5 1.5 0 01-1.233-.54l.117-.3z',
        component: <VisualThemeEditor />
    },
    {
        id: 'visual-builder-v2',
        path: '/security/visual-builder-v2',
        label: 'Visual Builder PRO (Siêu việt)',
        group: 'Quản lý Website',
        permission: 'system.security',
        icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', // Zap Icon
        component: <VisualThemeBuilderV2 />
    },
    { id: 'user-role-manager', path: '/security/users', label: 'Quản lý Người dùng', group: 'Hệ thống', permission: 'system.security', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', component: <UserRoleManager /> },
    { id: 'security-dashboard', path: '/security/dashboard', label: 'Bảng điều khiển An ninh', group: 'Hệ thống', permission: 'system.security', icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M3 13h18M3 13V21M21 13V21M3 21h18', component: <SecurityDashboard /> },
    { id: 'permission-matrix', path: '/security/matrix', label: 'Ma trận Phân quyền', group: 'Hệ thống', permission: 'system.security', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', component: <PermissionMatrix /> },
    { id: 'role-manager', path: '/security/roles', label: 'Quản lý Vai trò', group: 'Hệ thống', permission: 'system.security', icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M3 13h18M3 13V21M21 13V21M3 21h18', component: <RoleManager /> },
    { id: 'org-chart', path: '/security/org-chart', label: 'Sơ đồ Tổ chức (OrgChart)', group: 'Hệ thống', permission: 'system.security', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', component: <OrgChart /> },
    {
        id: 'site-manager',
        path: '/security/sites',
        label: 'Danh sách Site & Domain',
        group: 'Quản lý Website',
        permission: 'system.security',
        icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253',
        component: <SiteManager />
    },
    {
        id: 'theme-version-manager',
        path: '/security/theme-versions',
        label: 'Quản lý Phiên bản (Clone/Draft)',
        group: 'Quản lý Website',
        permission: 'system.security',
        icon: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-.978 0-.344-.128-.688-.349-.979-.215-.282-.401-.603-.401-.958a.563.563 0 01.562-.563h.75c.311 0 .563.251.563.563 0 .355-.186.676-.401.959-.221.29-.349.634-.349.978 0 .344.128.688.349.979.215.282.401.603.401.958a.563.563 0 01-.562.563h-.75a.563.563 0 01-.563-.563zm0 6c0-.355.186-.676.401-.959.221-.29.349-.634.349-.978 0-.344-.128-.688-.349-.979-.215-.282-.401-.603-.401-.958a.563.563 0 01.562-.563h.75c.311 0 .563.251.563.563 0 .355-.186.676-.401.959-.221.29-.349.634-.349.978 0 .344.128.688.349.979.215.282.401.603.401.958a.563.563 0 01-.562.563h-.75a.563.563 0 01-.563-.563zm0 6c0-.355.186-.676.401-.959.221-.29.349-.634.349-.978 0-.344-.128-.688-.349-.979-.215-.282-.401-.603-.401-.958a.563.563 0 01.562-.563h.75c.311 0 .563.251.563.563 0 .355-.186.676-.401.959-.221.29-.349.634-.349.978 0 .344.128.688.349.979.215.282.401.603.401.958a.563.563 0 01-.562.563h-.75a.563.563 0 01-.563-.563zM3.75 6h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5zm0 6h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5zm0 6h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5z',
        component: <ThemeVersionManager />
    },
    { id: 'definitions', path: '/security/definitions', label: 'Định nghĩa An ninh', group: 'Hệ thống', permission: 'system.security', icon: 'M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M3 13h18M3 13V21M21 13V21M3 21h18', component: <Definitions /> },
    { id: 'department-tree', path: '/department-tree', label: 'Quản lý Phòng ban', group: 'Hệ thống', permission: 'system.security', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', component: <DepartmentTreeManager /> },
    { id: 'dictionary-management', path: '/dictionary', label: 'Quản lý Từ điển', group: 'Hệ thống', permission: 'system.dictionary', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-.75a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 017.5 4.125v.75a3.375 3.375 0 00-3.375 3.375H3.75a1.125 1.125 0 00-1.125 1.125v2.625c0 .621.504 1.125 1.125 1.125h1.5A3.375 3.375 0 007.5 16.5v.75a1.125 1.125 0 001.125 1.125h1.5a3.375 3.375 0 003.375-3.375v-.75a1.125 1.125 0 011.125-1.125h1.5c.621 0 1.125-.504 1.125-1.125zM10.5 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z', component: <DictionaryManagementPage /> },
    {
        id: 'system-monitor-v2',
        path: '/system/monitor-v2',
        label: 'Giám sát & Vận hành V2.2',
        group: 'Hệ thống',
        permission: 'system.security',
        icon: 'M9 12.75L11.25 15 15 9.75m-3-10.5c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 15.75h.007v.008H12v-.008z',
        component: <SystemMonitorPage />
    },
    {
        id: 'observer-dashboard',
        path: '/system/intelligence',
        label: 'Trung tâm Giám sát API(Live)',
        group: 'Hệ thống',
        permission: 'system.security',
        icon: 'M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-1 5h2v6h-2V9zm0-4h2v2h-2V5z',
        component: <SystemIntelligenceDashboard />
    },
    {
        id: 'monitor-config',
        path: '/system/monitor-config',
        label: 'Cấu hình Giám sát API',
        group: 'Hệ thống',
        permission: 'system.security',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
        component: <MonitorServiceManager />
    },
    {
        id: 'mobile-screen-manager',
        path: '/system/mobile-screens',
        label: 'Quản lý App Mobile',
        group: 'Hệ thống',
        permission: 'system.security',
        icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
        component: <MobileScreenManager />
    },
    { id: 'mobileapp-builder', path: '/system/mobileapp-builder', label: 'Xây dựng App Mobile', group: 'Hệ thống', permission: 'system.security', icon: 'M12 6v12m-3-2.818l-.504-.252a1.125 1.125 0 010-2.052l.504-.252L12 12m-3-2.818v2.818m3-2.818l.504.252a1.125 1.125 0 010 2.052l-.504.252L12 12m3-2.818v2.818M11.25 18a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z', component: <MobileAppBuilder /> },

    // --- LANDING PAGE MANAGEMENT ---
    {
        id: 'landing-pages',
        path: '/landing-pages',
        label: 'Quản lý Landing Pages',
        group: 'Quản lý Website',
        permission: 'system.security',
        icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z',
        component: <LandingPageList />
    },

];

const BASE_APP_TITLE = 'QuocVietCRM';

const App = () => {
    // --- [LOGIC MỚI] TỰ ĐỘNG RESET LOCAL STORAGE KHI NÂNG CẤP ---
    useEffect(() => {
        const checkAppVersion = () => {
            const storedVersion = localStorage.getItem(appConfig.app.VERSION_KEY);
            const currentVersion = appConfig.app.CURRENT_VERSION;

            if (storedVersion !== currentVersion) {
                console.warn(`[System] Phát hiện phiên bản mới: ${storedVersion} -> ${currentVersion}`);
                console.warn('[System] Tiến hành dọn dẹp Cache & Config...');

                // 1. Giữ lại Token của Mobile App (Để tránh logout user trên điện thoại)
                const mobileToken = localStorage.getItem('auth_token');

                // 2. Xóa sạch LocalStorage (Xóa hết config cột cũ, filter cũ...)
                localStorage.clear();

                // 3. Khôi phục lại Token Mobile (Nếu có)
                if (mobileToken) {
                    localStorage.setItem('auth_token', mobileToken);
                }

                // 4. Lưu Version mới vào
                localStorage.setItem(appConfig.app.VERSION_KEY, currentVersion);

                // 5. Reload trang để áp dụng
                window.location.reload();
            }
        };
        checkAppVersion();
    }, []);
    // -----------------------------------------------------------

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
    useEffect(() => {
        setAppTitle(activeRouteItem?.label);
    }, [activeRouteItem, setAppTitle]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get('/api/user');
                setUser(response.data.user || response.data);
            } catch (error) { setUser(null); } finally { setIsLoading(false); }
        };
        checkAuth();
    }, []);

    const onLogout = async () => {
        if (ENABLE_LOG) console.debug("[Auth] Starting Logout Process...");

        // 1. Gọi API hủy Token (Fire & Forget - Có await nhưng catch luôn lỗi để flow không chết)
        try {
            if (ENABLE_LOG) console.debug("[Auth] Calling Backend Logout API...");
            await axios.post('/api/logout');
            if (ENABLE_LOG) console.debug("[Auth] Backend Logout Success");
        } catch (error) {
            console.warn("[Auth] Logout API failed (likely network/offline), proceeding with local cleanup:", error);
        }

        // 2. [QUAN TRỌNG] Xóa sạch LocalStorage & SessionStorage (Ưu tiên Client)
        if (ENABLE_LOG) console.debug("[Auth] Clearing LocalStorage & SessionStorage...");
        localStorage.clear();
        sessionStorage.clear();

        // 3. Xóa Cookies (Nếu có)
        if (ENABLE_LOG) console.debug("[Auth] Clearing Cookies...");
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // 4. Xóa Default Header & Reset State
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);

        // 5. Force Reload để về trang Login (Xóa sạch Cache memory của React/Axios)
        if (ENABLE_LOG) console.debug("[Auth] Redirecting to Login...");
        window.location.href = '/login';
    };

    const handleNavigate = (viewId) => {
        const item = navItems.find(i => i.id === viewId);
        if (item && item.path) {
            navigate(item.path);
        }
    };

    const MainLayout = ({ user, onLogout }) => {
        const checkAccess = (requiredPerm, requiredPolicy = null) => {
            if (!ENABLE_PERMISSION_CHECK) return true;
            if (!user) return false;
            if (user.is_admin) return true;
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
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 relative">
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />

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

                            {/* [NEW] Landing Page Routes */}
                            <Route path="/landing-pages/create" element={<LandingPageEditor />} />
                            <Route path="/landing-pages/:id/edit" element={<LandingPageEditor />} />

                            {/* [V3] Product Manager V3 Routes - Now unified for V3/V4 support */}
                            <Route path="/product-mobile-v3/create" element={<ProductUnifiedEditor />} />
                            <Route path="/product-mobile-v3/:id" element={<ProductUnifiedEditor />} />

                            {/* [NEW] User Profile Route (Protected) */}
                            <Route
                                path="/profile"
                                element={
                                    user ? (
                                        <ProfilePage currentUser={user} setAppTitle={setAppTitle} />
                                    ) : (
                                        <Navigate to="/login" />
                                    )
                                }
                            />

                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="*" element={<div className="flex items-center justify-center h-full text-gray-400 font-bold text-2xl">404 - Trang không tồn tại</div>} />
                        </Routes>
                    </main>
                </div>
                <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={(id) => { handleNavigate(id); setIsSearchOpen(false); }} />
            </div>
        );
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <Routes>
            {/* [NEW] Public Password Reset Routes */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/password/reset" element={<ResetPasswordPage />} />

            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/*" element={user ? <MainLayout user={user} onLogout={onLogout} /> : <Navigate to="/login" />} />
        </Routes>
    );
};

export default App;
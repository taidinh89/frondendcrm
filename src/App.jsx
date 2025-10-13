// src/App.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import các component từ các file đã được tách nhỏ
// SỬA LỖI: Chỉnh lại đường dẫn tương đối cho chính xác
import { LoginPage, Header, Sidebar } from './components/layout.jsx';
import { SalesContent } from './pages/SalesContent.jsx';
import { CustomersContent } from './pages/CustomersContent.jsx';
import { WarehousesContent } from './pages/WarehousesContent.jsx';
import { ProductsContent } from './pages/ProductsContent.jsx';
import { PurchasesContent } from './pages/PurchasesContent.jsx';
// BƯỚC 2.1: Import component tồn kho vừa tạo
import { InventoriesContent } from './pages/InventoriesContent.jsx';

// ==============================================================================
// == COMPONENT LOGIC CHÍNH (Main Logic)                                       ==
// ==============================================================================
const App = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentViewId, setCurrentViewId] = useState('dashboard');

    // BƯỚC 2.2: Thêm mục "Tồn Kho" vào danh sách điều hướng
    const navItems = [
        { id: 'dashboard', label: 'Bảng tin', icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z', component: <div className="p-6">Trang Bảng tin đang được xây dựng...</div> },
        { id: 'sales', label: 'Đơn Bán Hàng', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V6.375m18 15.375V18.75a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v1.5m16.5 0v.375c0 .621-.504 1.125-1.125 1.125H6.75a1.125 1.125 0 01-1.125-1.125v-.375m13.5 0H3.75', component: <SalesContent /> },
        { id: 'purchases', label: 'Đơn Mua Hàng', icon: 'M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9', component: <PurchasesContent /> },
        { id: 'customers', label: 'Khách Hàng', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.598m-11.964 4.598a2.397 2.397 0 01-.67-1.766S4.875 16.5 4.875 16.5z', component: <CustomersContent /> },
        { id: 'products', label: 'Sản phẩm', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z', component: <ProductsContent /> },
        { id: 'warehouses', label: 'Kho Hàng', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375M9 17.25h6.375', component: <WarehousesContent /> },
        // --- MỤC MỚI ĐƯỢC THÊM VÀO ĐÂY ---
        { id: 'inventories', label: 'Tồn Kho', icon: 'M2.25 7.125A3.375 3.375 0 005.625 3.75h12.75c1.86 0 3.375 1.515 3.375 3.375v9.75c0 1.86-1.515 3.375-3.375 3.375H5.625A3.375 3.375 0 002.25 16.875V7.125z', component: <InventoriesContent /> },
    ];

    useEffect(() => {
        const checkAuth = async () => {
            setIsLoading(true);
            try { 
                const response = await axios.get('/api/user'); 
                setUser(response.data); 
            } 
            catch (error) { 
                console.error("Lỗi xác thực:", error); 
                setUser(null); 
            } 
            finally { setIsLoading(false); }
        };
        checkAuth();
    }, []);
    
    const handleToolbarAction = (action, view) => {
        alert(`Thực hiện hành động '${action}' cho trang '${view.label}'`);
    };

    const MainLayout = ({ user, onLogout }) => {
        const currentView = navItems.find(item => item.id === currentViewId) || navItems[0];
        
        const componentWithProps = React.cloneElement(currentView.component, { 
            onToolbarAction: (action) => handleToolbarAction(action, currentView) 
        });

        return (
            <div className="flex h-screen bg-gray-100 font-sans">
                <Sidebar currentView={currentViewId} setCurrentView={setCurrentViewId} navItems={navItems} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header user={user} onLogout={onLogout} currentView={currentView} />
                    <div className="flex-1 overflow-y-auto">
                        {componentWithProps}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-500">Đang tải ứng dụng...</div>;
    }
    
    return user ? <MainLayout user={user} onLogout={() => setUser(null)} /> : <LoginPage />;
};

export default App;
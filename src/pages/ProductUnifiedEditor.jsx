import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ProductMobileDetailV3 from '../components/ProductMobileDetailV3';
import { productApi } from '../api/admin/productApi';

const ProductUnifiedEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine initial mode and product data
    // If ID is 'new' or 'create', we are in create mode
    const isCreate = id === 'new' || id === 'create';
    const mode = isCreate ? 'create' : 'edit';

    // If passed via state (e.g. from Ecount), use it
    const initialProduct = location.state?.product || (isCreate ? { id: 'temp' } : { id });
    console.log("[DEBUG] Editor received state:", location.state);

    const [dictionary, setDictionary] = useState(location.state?.dictionary || null);

    // Fetch dictionary if missing
    useEffect(() => {
        if (!dictionary) {
            const fetchDict = async () => {
                try {
                    const [brandsRes, catsRes, sitesRes] = await Promise.all([
                        productApi.getBrandsV2({ mode: 'simple', per_page: 500 }),
                        productApi.getCategoriesV2({ mode: 'simple', per_page: 500 }),
                        productApi.getSites()
                    ]);

                    const brands = brandsRes.data.data || brandsRes.data || [];
                    const cats = catsRes.data.data || catsRes.data || [];
                    const sites = sitesRes.data.data || sitesRes.data || [];

                    setDictionary({
                        brands: Array.isArray(brands) ? brands : [],
                        categories: Array.isArray(cats) ? cats.map(c => ({
                            id: String(c.id),
                            name: c.name,
                            image: c.image
                        })) : [],
                        sites: Array.isArray(sites) ? sites.filter(i => i.code !== 'QVC').map(i => ({ code: i.code, label: i.name, domain: i.domain })) : []
                    });
                } catch (e) {
                    console.error("Failed to load dictionary", e);
                    toast.error("Không thể tải danh mục dữ liệu");
                }
            };
            fetchDict();
        }
    }, [dictionary]);

    const handleClose = () => {
        // Navigate back or to a specific list
        if (location.state?.returnUrl) {
            navigate(location.state.returnUrl);
        } else {
            navigate(-1);
        }
    };

    const handleSuccess = (data) => {
        // [V3 ENHANCEMENT] After success, always go to the main product list 
        // as requested by the user, especially when creating from Ecount.
        if (isCreate) {
            toast.success("Khởi tạo sản phẩm thành công!");
            navigate('/product-mobile-v3', { replace: true });
        } else {
            // If editing, we can still follow the returnUrl if provided
            if (location.state?.returnUrl) {
                navigate(location.state.returnUrl);
            } else {
                navigate('/product-mobile-v3');
            }
        }
    };

    return (
        <ProductMobileDetailV3
            isOpen={true}
            onClose={handleClose}
            product={initialProduct}
            mode={mode}
            dictionary={dictionary}
            onSuccess={handleSuccess}
            onRefresh={() => { }} // Optional: Handle refresh if needed
        />
    );
};

export default ProductUnifiedEditor;

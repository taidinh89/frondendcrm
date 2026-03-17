import { create } from 'zustand';

export const useThienDucStore = create((set) => ({
    products: [],
    page: 1,
    limit: 50,
    hasMore: true,
    loading: false,
    filters: {
        search: '',
        sync_status: ''
    },

    setProducts: (items, totalItems) => set((state) => ({
        products: Array.isArray(items) ? items : [],
        hasMore: Array.isArray(items) ? items.length < totalItems : false
    })),

    appendProducts: (items, totalItems) => set((state) => {
        const itemsToAppend = Array.isArray(items) ? items : [];
        const newProducts = [...state.products, ...itemsToAppend];
        return {
            products: newProducts,
            hasMore: newProducts.length < totalItems
        };
    }),

    setPage: (page) => set({ page }),

    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
        page: 1,
        products: []
    })),

    setLoading: (loading) => set({ loading }),

    updateProductInList: (productId, updatedData) => set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, ...updatedData } : p)
    }))
}));

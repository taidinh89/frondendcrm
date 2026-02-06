import React, { useState, useEffect } from 'react';
import * as UI from '../../components/ui';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import axiosClient from '../../axiosGlobal';

const productLinkApi = {
    getLinks: (productId) => axiosClient.get(`/api/v2/product-links/${productId}`),
    addLink: (data) => axiosClient.post(`/api/v2/product-links`, data),
    removeLink: (id) => axiosClient.delete(`/api/v2/product-links/${id}`),
    filterProducts: (params) => axiosClient.get(`/api/v2/products/filter/links`, { params })
};

const LinkedProductManager = () => {
    // Left Filter Panel
    const [filter, setFilter] = useState({ has_links: true });

    // Master List
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    // Selected Product & Detail
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [links, setLinks] = useState([]);
    const [loadingLinks, setLoadingLinks] = useState(false);

    // Add Link Form
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [linkType, setLinkType] = useState('ACCESSORY');

    useEffect(() => {
        fetchProducts();
    }, [filter, page]);

    useEffect(() => {
        if (selectedProduct) {
            fetchLinks(selectedProduct.id);
        } else {
            setLinks([]);
        }
    }, [selectedProduct]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productLinkApi.filterProducts({ ...filter, page });
            setProducts(res.data.data);
        } catch (error) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const fetchLinks = async (id) => {
        setLoadingLinks(true);
        try {
            const res = await productLinkApi.getLinks(id);
            setLinks(res.data.data || []);
        } catch (error) {
            toast.error("Failed to load links");
        } finally {
            setLoadingLinks(false);
        }
    };

    const handleSearch = debounce(async (query) => {
        if (!query) return;
        try {
            // Using existing lookup or search API
            const res = await axiosClient.get(`/v1/products/lookup?search=${query}`);
            // Normalize result to array
            const data = res.data.data ? [res.data.data] : [];
            // OR if lookup returns single item, we might need a proper search list API.
            // Let's assume we use the V2 products list for better search
            const searchRes = await axiosClient.get(`/v2/web/products?search=${query}`);
            setSearchResults(searchRes.data.data || []);
        } catch (e) {
            console.error(e);
        }
    }, 500);

    const handleAddLink = async (targetId) => {
        try {
            await productLinkApi.addLink({
                source_product_id: selectedProduct.id,
                target_product_id: targetId,
                link_type: linkType
            });
            toast.success("Link added!");
            setIsAdding(false);
            setSearchQuery('');
            setSearchResults([]);
            fetchLinks(selectedProduct.id);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add link");
        }
    };

    const handleRemoveLink = async (id) => {
        if (!window.confirm("Remove this link?")) return;
        try {
            await productLinkApi.removeLink(id);
            toast.success("Link removed");
            fetchLinks(selectedProduct.id);
        } catch (error) {
            toast.error("Failed to remove link");
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* SIDEBAR FILTER */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">Link Manager</h2>
                </div>
                <div className="p-4 space-y-2">
                    <button
                        onClick={() => setFilter({ has_links: true })}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${filter.has_links ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        🔗 Linked Products
                    </button>
                    <button
                        onClick={() => setFilter({ has_links: false })}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${!filter.has_links ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        🚫 Orphan Products
                    </button>
                </div>
            </div>

            {/* PRODUCT LIST */}
            <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <input type="text" placeholder="Filter list..." className="w-full bg-slate-100 border-none rounded-lg px-4 py-2 text-xs font-bold focus:ring-2 ring-indigo-500 outline-none" />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-10 text-center text-xs text-slate-400">Loading...</div>
                    ) : (
                        products.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProduct(p)}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-indigo-50 transition-all ${selectedProduct?.id === p.id ? 'bg-indigo-50 border-indigo-200' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <img src={p.proThum || 'https://placehold.co/50'} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.proName}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{p.storeSKU}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col relative">
                {selectedProduct ? (
                    <>
                        <div className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
                            <h3 className="font-black text-sm text-slate-800">
                                Managing Links for: <span className="text-indigo-600">{selectedProduct.proName}</span>
                            </h3>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                            >
                                + Add Link
                            </button>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                            {loadingLinks ? (
                                <div className="text-center py-20">Loading links...</div>
                            ) : links.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                                    <UI.Icon name="link" className="w-12 h-12 opacity-20" />
                                    No linked products found. Add one to get started.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {links.map(link => (
                                        <div key={link.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-6">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${link.link_type === 'ACCESSORY' ? 'bg-purple-100 text-purple-600' :
                                                    link.link_type === 'UPSELL' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {link.link_type}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <img src={link.target_product?.proThum} className="w-12 h-12 rounded-lg bg-slate-100 object-cover" />
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{link.target_product?.proName}</div>
                                                        <div className="text-xs text-slate-400">{link.target_product?.storeSKU}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveLink(link.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <UI.Icon name="trash-2" className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <UI.Icon name="package" className="w-16 h-16 opacity-20" />
                        Select a product to manage links
                    </div>
                )}

                {/* ADD LINK MODAL */}
                {isAdding && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-20">
                        <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl text-slate-800">Add New Link</h3>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full"><UI.Icon name="x" className="w-6 h-6" /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    {['ACCESSORY', 'SIMILAR', 'UPSELL', 'VARIANT'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setLinkType(type)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${linkType === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search product to link (Name, SKU)..."
                                        className="w-full text-lg font-bold p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none"
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                    />

                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-10">
                                            {searchResults.map(res => (
                                                <div
                                                    key={res.id}
                                                    onClick={() => handleAddLink(res.id)}
                                                    className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex items-center gap-4"
                                                >
                                                    <img src={res.main_image || res.proThum} className="w-10 h-10 rounded bg-slate-200 object-cover" />
                                                    <div>
                                                        <div className="text-xs font-black text-slate-800">{res.name || res.proName}</div>
                                                        <div className="text-[10px] text-slate-500">{res.sku || res.storeSKU}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkedProductManager;

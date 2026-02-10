import React, { useState } from 'react';
import { Icon } from '../ui';
import { SectionHeader } from './ProductFormElements';

const ProductSeoSection = ({ formData, onChange }) => {
    const [keywordInput, setKeywordInput] = useState('');

    const handleAddKeyword = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = keywordInput.trim();
            if (val) {
                const current = formData.meta_keywords ? formData.meta_keywords.split(',').map(s => s.trim()).filter(Boolean) : [];
                if (!current.includes(val)) {
                    onChange({ ...formData, meta_keywords: [...current, val].join(', ') });
                }
            }
            setKeywordInput('');
        }
    };

    const removeKeyword = (kToRemove) => {
        const current = formData.meta_keywords ? formData.meta_keywords.split(',').map(s => s.trim()).filter(Boolean) : [];
        onChange({ ...formData, meta_keywords: current.filter(k => k !== kToRemove).join(', ') });
    };

    const keywords = formData.meta_keywords ? formData.meta_keywords.split(',').map(s => s.trim()).filter(Boolean) : [];

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader title="Cấu hình SEO Search" icon="search" color="blue" />

            <div className="mt-5 space-y-6">
                {/* PREVIEW GOOGLE */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Xem trước kết quả Google</p>
                    <div className="bg-white p-4 rounded-lg shadow-sm font-sans max-w-2xl">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            qvc.vn <Icon name="chevronRight" className="w-3 h-3" /> ... {formData.request_path || '/slug-san-pham'}
                        </div>
                        <h3 className="text-xl text-[#1a0dab] font-medium hover:underline cursor-pointer truncate">
                            {formData.meta_title || formData.proName || 'Tiêu đề sản phẩm chưa nhập'}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {formData.meta_description || formData.proSummary || 'Mô tả sản phẩm sẽ hiển thị ở đây trên kết quả tìm kiếm Google.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meta Title (Tiêu đề SEO)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.meta_title || ''}
                                onChange={e => onChange({ ...formData, meta_title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-sm text-slate-700 transition-all placeholder:font-normal"
                                placeholder={formData.proName || "Nhập tiêu đề SEO..."}
                            />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${(formData.meta_title?.length || 0) > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                                {(formData.meta_title?.length || 0)}/60
                            </span>
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meta Keywords</label>
                        <div className="p-2 border-2 border-slate-100 rounded-xl bg-slate-50 focus-within:bg-white focus-within:border-blue-500 transition-all">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {keywords.map((k, i) => (
                                    <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                        {k}
                                        <button onClick={() => removeKeyword(k)} className="hover:text-blue-900"><Icon name="x" className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={e => setKeywordInput(e.target.value)}
                                onKeyDown={handleAddKeyword}
                                className="w-full bg-transparent outline-none text-sm font-medium"
                                placeholder="Nhập từ khóa rồi Enter..."
                            />
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meta Description</label>
                        <div className="relative">
                            <textarea
                                value={formData.meta_description || ''}
                                onChange={e => onChange({ ...formData, meta_description: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-500 rounded-xl outline-none text-sm font-medium text-slate-700 transition-all resize-none placeholder:font-normal"
                                placeholder="Mô tả ngắn gọn cho SEO..."
                            ></textarea>
                            <span className={`absolute right-3 bottom-3 text-[10px] font-bold ${(formData.meta_description?.length || 0) > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                                {(formData.meta_description?.length || 0)}/160
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductSeoSection;

import React, { useState } from 'react';
import { Icon } from './ui';
import { SectionHeader } from './ProductFormElements';
import RichTextEditor from './RichTextEditor';

const ProductContentSection = ({
    formData,
    onChange,
    proName,
    onSetGlobalTaskCount,
    onMediaLibraryRequest,
    isStackMode = false,
    productId
}) => {
    const [activeTab, setActiveTab] = useState('description');

    return (
        <div className="space-y-6">
            {/* SPECIAL OFFER */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <SectionHeader title="Khuyến mãi đặc biệt" icon="gift" color="rose" />
                <div className="mt-4">
                    <textarea
                        value={formData.specialOffer || ''}
                        onChange={e => onChange({ ...formData, specialOffer: e.target.value })}
                        className="w-full px-4 py-3 bg-rose-50/30 border border-rose-100 rounded-xl outline-none text-sm font-medium text-slate-700 transition-all focus:bg-white focus:border-rose-500 placeholder:text-rose-300 min-h-[100px]"
                        placeholder="Nhập nội dung khuyến mãi (HTML cơ bản)..."
                    ></textarea>
                    <p className="text-[10px] text-slate-400 mt-2 text-right">Hiển thị nổi bật dưới giá bán</p>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <SectionHeader title="Nội dung chi tiết" icon="file-text" color="indigo" />

                    <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab('description')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'description' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon name="align-left" className="w-3.5 h-3.5" /> Bài viết
                        </button>
                        <button
                            onClick={() => setActiveTab('spec')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'spec' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon name="list" className="w-3.5 h-3.5" /> Thông số
                        </button>
                    </div>
                </div>

                <div className="p-0">
                    <RichTextEditor
                        key={activeTab} // [FIX] Force re-mount on tab switch to prevent content loss
                        value={activeTab === 'description' ? formData.description : formData.spec}
                        onChange={v => onChange({ ...formData, [activeTab]: v })}
                        proName={proName}
                        productId={productId}
                        onTaskCountChange={onSetGlobalTaskCount}
                        onLibraryRequest={onMediaLibraryRequest}
                        className="border-none"
                    />
                </div>
                <style>{`
                    .quill { border: none !important; }
                    .ql-toolbar { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #fff !important; padding: 12px 16px !important; }
                    .ql-container { border: none !important; font-size: 15px; background: #fff; min-height: 400px; }
                    .ql-editor { padding: 24px 32px; line-height: 1.8; color: #334155; }
                `}</style>
            </div>
        </div>
    );
};

export default ProductContentSection;

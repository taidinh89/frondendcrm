import React, { useState } from 'react';
import MediaManager from '../../components/MediaManager';
import { Icon } from '../../components/ui';

const MediaStudioPage = () => {
    // Trang này thực chất là MediaManager ở chế độ tập trung vào việc "chế" ảnh
    // Hoặc có thể là một giao diện giới thiệu trước khi vào Manager
    return (
        <div className="h-screen overflow-hidden flex flex-col bg-slate-50">
            <div className="px-8 py-4 bg-white border-b flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Media Studio</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Công cụ chế biến ảnh sản phẩm chuyên nghiệp</p>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                    <Icon name="wand" className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Studio Mode</span>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <MediaManager isStandalone={true} />
            </div>
        </div>
    );
};

export default MediaStudioPage;

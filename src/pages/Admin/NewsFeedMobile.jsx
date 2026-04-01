import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData';
import moment from 'moment';
import 'moment/locale/vi';

moment.locale('vi');

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    if (cleanUrl.startsWith('storage/')) return `https://crm.maytinhquocviet.com/${cleanUrl}`;
    return `https://crm.maytinhquocviet.com/storage/${cleanUrl}`;
};

const PostStatus = ({ status }) => {
    const isVisible = status === 'active' || status === 'published';
    return (
        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isVisible ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {isVisible ? 'Công khai' : 'Bản nháp'}
        </div>
    );
};

export default function NewsFeedMobile() {
    const { data: resp, isLoading } = useApiData('/api/v3/admin/news-feed');
    const posts = Array.isArray(resp) ? resp : (resp?.data || []);

    if (isLoading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Đang tải bảng tin...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex justify-center">
            <div className="w-full max-w-lg bg-white min-h-screen shadow-2xl flex flex-col">
                
                {/* 1. Mobile Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-black italic tracking-tighter text-slate-800">
                        QVC <span className="text-indigo-600">Feed</span>
                    </h1>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 relative">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">2</span>
                        </div>
                    </div>
                </header>

                {/* 2. Story Bar (Mockup) */}
                <div className="flex gap-4 overflow-x-auto p-4 border-b border-slate-50 scrollbar-hide">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-16 h-16 rounded-full p-0.5 border-2 border-indigo-600 relative">
                            <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden">
                                <img src="https://lh3.googleusercontent.com/a/ACg8ocLHM146uordTvf3SbjGQiMdZcKJd73Yk8WNSI7KLarjBNYrHw=s96-c" className="w-full h-full object-cover" alt="me" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">+</div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Tin của bạn</span>
                    </div>
                    {/* Render some mock stories from active users */}
                    {posts.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-indigo-600">
                                <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden">
                                    <img src={p.user?.avatar || `https://ui-avatars.com/api/?name=${p.user?.name}&background=random`} className="w-full h-full object-cover" alt="user" />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-800 truncate w-16 text-center">{p.user?.name?.split(' ').pop()}</span>
                        </div>
                    ))}
                </div>

                {/* 3. Feed */}
                <div className="flex-1 bg-slate-100 space-y-2 py-2">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white p-4 shadow-sm border-y border-slate-100">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-50">
                                        <img src={post.user?.avatar || `https://ui-avatars.com/api/?name=${post.user?.name}&background=random`} className="w-full h-full object-cover" alt="avatar" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-800 text-[13px]">{post.user?.name}</span>
                                            <PostStatus status={post.status} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold">{moment(post.created_at).fromNow()}</span>
                                    </div>
                                </div>
                                <button className="text-slate-300">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                                </button>
                            </div>

                            {/* Content */}
                            <p className="text-[14px] text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

                            {/* Media Grid */}
                            {post.images && post.images.length > 0 && (
                                <div className="rounded-2xl overflow-hidden mb-3 border border-slate-50 max-h-[400px]">
                                    {post.images.length === 1 ? (
                                        <img 
                                            src={getImageUrl(post.images[0])} 
                                            className="w-full object-cover max-h-[400px]" 
                                            alt="post img" 
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1 bg-slate-100">
                                            {post.images.slice(0, 4).map((img, i) => (
                                                <div key={i} className={`aspect-square relative ${post.images.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                                                    <img src={getImageUrl(img)} className="w-full h-full object-cover" alt="post item" loading="lazy" />
                                                    {i === 3 && post.images.length > 4 && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-xl">
                                                            +{post.images.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 text-[11px] font-bold text-slate-400">
                                <div className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[8px] text-white">👍</div>
                                        <div className="w-4 h-4 rounded-full bg-rose-500 border border-white flex items-center justify-center text-[8px] text-white">❤️</div>
                                    </div>
                                    <span>{post.likes_count || 0}</span>
                                </div>
                                <span>{post.comments_count || 0} bình luận</span>
                            </div>

                            {/* Buttons */}
                            <div className="flex pt-2">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.708c.94 0 1.741.56 2.083 1.348L23 18.292a1.99 1.99 0 01-1.921 2.708H4.292a1.99 1.99 0 01-1.921-2.708l2.209-6.944A2.25 2.25 0 016.634 10H10V4.5a2.5 2.5 0 115 0V10z" /></svg>
                                    <span className="text-xs font-black">Thích</span>
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    <span className="text-xs font-black">Bình luận</span>
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    <span className="text-xs font-black">Chia sẻ</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 4. Navigation Tab Bar (Floating Style) */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-xl rounded-2xl p-2 px-6 flex justify-between items-center shadow-2xl border border-white/10">
                    <div className="flex flex-col items-center gap-1 text-indigo-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                        <span className="text-[8px] font-black uppercase">Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <span className="text-[8px] font-black uppercase">Friends</span>
                    </div>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/50 flex items-center justify-center text-white -mt-6 border-4 border-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span className="text-[8px] font-black uppercase">Videos</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span className="text-[8px] font-black uppercase">Menu</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

import React, { useMemo } from 'react';
import * as Lucide from 'lucide-react';

const IconMap = {
    'ATTENDANCE': { icon: 'CalendarCheck', color: '#3b82f6', label: 'Chấm công' },
    'REPORT': { icon: 'BarChart3', color: '#10b981', label: 'Báo cáo' },
    'CONTACT': { icon: 'Users2', color: '#f59e0b', label: 'Danh bạ' },
    'CHAT': { icon: 'MessageSquareText', color: '#8b5cf6', label: 'Trò chuyện' },
    'TASKS': { icon: 'ClipboardList', color: '#ef4444', label: 'Nhiệm vụ' },
    'NEWS': { icon: 'Newspaper', color: '#3b82f6', label: 'Bản tin' },
};

const RealityIcon = ({ name, className = "w-6 h-6" }) => {
    const iconKey = name?.toUpperCase();
    const config = IconMap[iconKey] || { icon: 'Layers', color: '#64748b' };
    const LucideIcon = Lucide[config.icon] || Lucide.Layers;
    return <LucideIcon className={className} strokeWidth={2.5} color="white" />;
};

const DEVICE_SKINS = {
    'iphone_15_pro': {
        name: 'iPhone 15 Pro (Notch)',
        frameClass: 'rounded-[55px] border-[12px] border-slate-900 ring-2 ring-slate-800/10',
        notch: <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-[60]">
            <div className="w-32 h-6 bg-black rounded-b-3xl flex items-center justify-center">
                <div className="w-10 h-1 bg-white/10 rounded-full mb-1"></div>
            </div>
        </div>
    },
    'iphone_14_island': {
        name: 'iPhone 14 (Island)',
        frameClass: 'rounded-[55px] border-[12px] border-slate-900',
        notch: <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-[60] flex items-center justify-end px-4">
            <div className="w-2 h-2 bg-blue-500/20 rounded-full"></div>
        </div>
    },
    's24_ultra': {
        name: 'S24 Ultra (Punch)',
        frameClass: 'rounded-[30px] border-[10px] border-slate-950',
        notch: <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-[60] shadow-inner border border-white/5"></div>
    }
};

export default function MobilePreviewFrame({
    items = [],
    onItemClick,
    onTabChange,
    activeScreen = 'goto_feed',
    deviceType = 'iphone_15_pro',
    orientation = 'portrait',
    realFeedData = []
}) {
    const skin = DEVICE_SKINS[deviceType] || DEVICE_SKINS.iphone_15_pro;
    const isLandscape = orientation === 'landscape';

    const renderVariables = (text) => {
        if (!text) return '';
        return text
            .replace(/{{user_name}}/g, 'Tài Nguyễn Đình')
            .replace(/{{dept}}/g, 'Quốc Việt Technology');
    };

    const normalizedItems = useMemo(() => {
        return items.map(item => ({
            ...item,
            block_type: item.type || item.block_type || 'GridMenuBlock',
            bg_color: item.color || item.bg_color || '#3b82f6',
        }));
    }, [items]);

    const profileBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'ProfileHeaderBlock'), [normalizedItems]);
    const composerBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'PostComposerBlock'), [normalizedItems]);
    const gridItems = useMemo(() => normalizedItems.filter(i => i.block_type === 'GridMenuBlock').sort((a, b) => a.position - b.position), [normalizedItems]);
    const socialFeedBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'SocialFeedBlock'), [normalizedItems]);
    const summaryCardBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'SummaryCardBlock'), [normalizedItems]);

    return (
        <div className="flex justify-center items-center py-4 bg-slate-200/50 rounded-[50px] shadow-inner">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .mobile-reality { font-family: 'Inter', sans-serif !important; user-select: none; }
                .soft-shadow { box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
                .status-bar-dark { background: #131c31; color: white; }
                .nav-dark { background: #0f172a; color: #94a3b8; }
                .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>

            <div className={`relative mobile-reality overflow-hidden transition-all duration-500 flex flex-col bg-[#f6f9fc] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] ${isLandscape ? 'w-[812px] h-[375px]' : 'w-[375px] h-[812px]'} ${skin.frameClass}`}>

                {/* STATUS BAR - MATCH APP */}
                {!isLandscape && (
                    <div className="px-8 pt-6 pb-2 flex justify-between items-center text-[12px] font-bold z-50 status-bar-dark">
                        <span>16:48</span>
                        <div className="flex gap-2 items-center">
                            <span className="text-[10px]">📶 🛜</span>
                            <div className="flex items-center gap-1.5 bg-green-500 px-1.5 py-0.5 rounded text-[10px]">77% 🔋</div>
                        </div>
                    </div>
                )}

                {!isLandscape && skin.notch}

                {/* APP HEADER */}
                <div className="px-5 py-3 flex justify-between items-center z-40 bg-white shadow-sm pb-4">
                    <div className="flex items-center gap-1 cursor-pointer active:opacity-60">
                        <h1 className="text-[26px] font-[800] text-[#1e293b] tracking-tight">
                            {activeScreen === 'goto_feed' ? 'Bảng tin' : 'Hệ thống'}
                        </h1>
                        <span className="text-slate-400 text-lg font-light mt-1.5">⌄</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100/50 flex items-center justify-center text-lg">✨</div>
                        <div className="w-10 h-10 rounded-full bg-slate-100/50 flex items-center justify-center text-lg relative">
                            🔔
                            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className={`flex-1 overflow-y-auto px-4 space-y-4 pb-32 custom-scrollbar-hide ${isLandscape ? 'grid grid-cols-2 gap-5 space-y-0 pt-5' : 'pt-4'}`}>

                    <div className="space-y-4">
                        {/* PROFILE CARD */}
                        {profileBlock && (
                            <div className="bg-white rounded-2xl p-4 soft-shadow flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all" onClick={() => onItemClick?.(profileBlock)}>
                                <div className="w-14 h-14 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-[18px]">TN</div>
                                <div className="leading-tight">
                                    <h3 className="text-[#1e293b] text-[15px] font-[800]">Xin chào, Tài Nguyễn Đình</h3>
                                    <p className="text-slate-400 text-[11px] font-medium mt-1">Thành viên QVC</p>
                                    <p className="text-slate-400 text-[11px] font-medium">Phòng ban Quốc Việt Technology</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl p-3 soft-shadow flex justify-between items-center cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🏢</span>
                                <span className="text-[12px] font-bold text-slate-700 tracking-tight">CÔNG TY TNHH CÔNG NGHỆ QUỐC VIỆT</span>
                            </div>
                            <span className="text-slate-300 text-lg font-bold">›</span>
                        </div>

                        {/* STORY ROW */}
                        <div className="flex gap-4 px-1 overflow-x-auto custom-scrollbar-hide">
                            {['Vân', 'Tùng', 'Huyền', 'Tất cả'].map((name, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 flex-none">
                                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center p-[2px] ${i === 0 ? 'border-blue-500' : 'border-slate-300'}`}>
                                        <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-xl text-slate-400">👤</div>
                                    </div>
                                    <span className={`text-[11px] font-medium ${i === 0 ? 'text-black' : 'text-slate-600'}`}>{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* COMPOSER */}
                        {composerBlock && (
                            <div className="bg-white rounded-2xl p-4 soft-shadow space-y-4" onClick={() => onItemClick?.(composerBlock)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl text-slate-500">👤</div>
                                    <div className="flex-1 bg-slate-50 h-10 rounded-full flex items-center px-4">
                                        <span className="text-slate-400 text-[13px]">Bạn đang nghĩ gì?</span>
                                    </div>
                                </div>
                                <div className="flex justify-between px-4 pt-1">
                                    <div className="flex items-center gap-1.5"><span className="text-lg">🖼️</span> <span className="text-[12px] text-slate-800 font-medium">Ảnh</span></div>
                                    <div className="flex items-center gap-1.5"><span className="text-lg">📍</span> <span className="text-[12px] text-slate-800 font-medium">Vị trí</span></div>
                                    <div className="flex items-center gap-1.5"><span className="text-lg">😊</span> <span className="text-[12px] text-slate-800 font-medium">Cảm xúc</span></div>
                                </div>
                            </div>
                        )}

                        {/* GRID FEATURES */}
                        {gridItems.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 soft-shadow">
                                <h4 className="text-[15px] font-bold text-[#1e293b] mb-4">{gridItems[0].metadata?.title || 'Tính năng cốt lõi'}</h4>
                                <div className="grid grid-cols-4 gap-y-6">
                                    {gridItems.map((item, idx) => {
                                        let iconEl = <RealityIcon name={item.icon} className="w-6 h-6" />;
                                        let bgStyle = { backgroundColor: item.bg_color };
                                        let extraClass = "rounded-[20px] shadow-sm";

                                        // Fake custom icons for exact match
                                        if (item.label === 'Chấm công') {
                                            iconEl = <span className="text-2xl">⏰</span>;
                                        } else if (item.label === 'Báo cáo') {
                                            iconEl = <span className="text-2xl">📊</span>;
                                            bgStyle = { backgroundColor: '#10b981' };
                                        } else if (item.label === 'Danh bạ') {
                                            iconEl = <span className="text-2xl">👥</span>;
                                            bgStyle = { backgroundColor: '#f59e0b' };
                                        } else if (item.label === 'Chat') {
                                            iconEl = <span className="text-2xl">💬</span>;
                                            bgStyle = { backgroundColor: '#8b5cf6' };
                                        }

                                        return (
                                            <div key={idx} onClick={() => onItemClick?.(item)} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-all">
                                                <div className={`w-14 h-14 flex items-center justify-center ${extraClass}`} style={bgStyle}>
                                                    {iconEl}
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-600 text-center">{item.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SUMMARY CARD */}
                        {summaryCardBlock && (
                            <div className="bg-white rounded-2xl p-4 soft-shadow relative group" onClick={() => onItemClick?.(summaryCardBlock)}>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[15px] font-bold text-slate-800">{summaryCardBlock.metadata?.title || 'Tình trạng công việc'}</h4>
                                    <span className="text-slate-400 bg-slate-100 rounded p-1 text-xs">🔄</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-3">Đang offline - Chế độ an toàn</p>
                                <p className="text-[13px] font-bold text-slate-700">Công việc: <span className="font-normal text-slate-400">...</span></p>
                                <div className="w-full h-[1px] bg-slate-100 mt-2 mb-2"></div>
                            </div>
                        )}

                        {/* FEED REAL DATA */}
                        {socialFeedBlock && (
                            <div className="space-y-4" onClick={() => onItemClick?.(socialFeedBlock)}>
                                {(realFeedData && realFeedData.length > 0 ? realFeedData : [1]).map((post, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-4 soft-shadow">
                                        <div className="flex gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg overflow-hidden">
                                                {post.avatar ? <img src={post.avatar} className="w-full h-full object-cover" /> : '👤'}
                                            </div>
                                            <div className="leading-tight pt-0.5">
                                                <div className="font-bold text-[#1e293b] text-[14px]">
                                                    {post.author || 'Tài Nguyễn Đình'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">{post.timestamp || 'Mới đây'}</div>
                                            </div>
                                        </div>
                                        <p className="text-slate-700 text-[13px] leading-relaxed mb-3 line-clamp-2">
                                            {post.content || '"Hôm nay trời đẹp quá, mọi người cùng cố gắng nhé! 🚀"'}
                                        </p>
                                        {post.images && post.images.length > 0 && (
                                            <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden mb-2">
                                                <img src={post.images[0]} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM NAV - MATCH APP DARK */}
                <div className={`absolute bottom-0 inset-x-0 nav-dark flex justify-between items-center z-[100] ${isLandscape ? 'pb-2 pt-2 px-8' : 'pt-2 pb-6 px-4'}`}>
                    {[
                        { label: 'Trang chủ', img: '🏠', slug: 'goto_feed' },
                        { label: 'CRM', img: '🌐', slug: 'goto_crm' },
                        { label: 'Chấm công', img: '📍', slug: 'goto_attendance' },
                        { label: 'Thông báo', img: '🔔', slug: 'goto_notification' },
                        { label: 'Hồ sơ', img: '👤', slug: 'goto_profile' }
                    ].map((nav, idx) => {
                        const isActive = activeScreen === nav.slug;
                        return (
                            <div key={idx} onClick={() => onTabChange?.(nav.slug)} className={`flex flex-col items-center gap-1 w-[16%] cursor-pointer transition-all ${isActive ? 'scale-110 active-tab-scale' : 'opacity-50 hover:opacity-100'}`}>
                                <div className={`text-xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`}>{nav.img}</div>
                                <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>{nav.label}</span>
                                {isActive && <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5"></div>}
                            </div>
                        );
                    })}
                </div>
                {!isLandscape && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-white rounded-full z-[110]"></div>}
            </div>
        </div>
    );
}

const BOTTOM_NAV_ITEMS = [
    { label: 'Trang chủ', icon: '🏠', slug: 'goto_feed' },
    { label: 'CRM', icon: '🌐', slug: 'goto_more' },
    { label: 'Chấm công', icon: '📍', slug: 'goto_attendance' },
    { label: 'Thông báo', icon: '🔔', slug: 'goto_notification' },
    { label: 'Hồ sơ', icon: '👤', slug: 'goto_profile' },
    { label: 'tasks', icon: '🔻', slug: 'goto_tasks' },
];

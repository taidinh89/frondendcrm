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

const SCREEN_TITLES = {
    'goto_feed': 'Bảng tin',
    'goto_crm': 'Hệ thống CRM',
    'goto_attendance': 'Chấm công',
    'goto_notification': 'Thông báo',
    'goto_profile': 'Cá nhân',
    'goto_more': 'Khám phá',
    'goto_tasks': 'Dự án',
    'goto_reports': 'Báo cáo',
    'goto_contacts': 'Danh bạ'
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
    const gridItems = useMemo(() => normalizedItems.filter(i => i.block_type === 'GridMenuBlock').sort((a, b) => a.position - b.position), [normalizedItems]);
    const summaryCardBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'SummaryCardBlock'), [normalizedItems]);
    const socialFeedBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'SocialFeedBlock'), [normalizedItems]);
    const composerBlock = useMemo(() => normalizedItems.find(i => i.block_type === 'PostComposerBlock'), [normalizedItems]);

    return (
        <div className="flex justify-center items-center py-4 bg-slate-100/30 rounded-[50px] shadow-sm">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .mobile-reality { font-family: 'Inter', sans-serif !important; user-select: none; }
                .soft-shadow { box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.08); }
                .status-bar-reality { color: #0f172a; }
                .tab-bar-reality { background: #ffffff; border-top: 1px solid #f1f5f9; backdrop-filter: blur(20px); }
                .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .bg-app-gradient { background: linear-gradient(180deg, #E8F0FE 0%, #FBFCFE 100%); }
                .active-tab-text { color: #3b82f6; font-weight: 700; }
            `}</style>

            <div className={`relative mobile-reality overflow-hidden transition-all duration-500 flex flex-col bg-app-gradient shadow-[0_50px_100px_-20px_rgba(15,23,42,0.25)] ${isLandscape ? 'w-[812px] h-[375px]' : 'w-[375px] h-[812px]'} ${skin.frameClass}`}>

                {/* STATUS BAR */}
                {!isLandscape && (
                    <div className="px-8 pt-10 pb-2 flex justify-between items-center text-[14px] font-[700] z-50 status-bar-reality">
                        <span>11:32</span>
                        <div className="flex gap-1.5 items-center">
                            <span className="text-[14px] opacity-90">📶 🛜 🔋</span>
                        </div>
                    </div>
                )}

                {/* APP HEADER */}
                <div className="px-5 py-4 flex justify-between items-center z-40 mb-2">
                    <h1 className="text-[32px] font-[800] text-[#0f172a] tracking-tight">
                        {SCREEN_TITLES[activeScreen] || 'Hệ thống'}
                    </h1>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-lg shadow-sm border border-white/50 cursor-pointer active:scale-90 transition-all">✨</div>
                        <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-lg shadow-sm border border-white/50 relative cursor-pointer active:scale-90 transition-all">
                            🔔
                            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2 border-white"></div>
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-32 custom-scrollbar-hide pt-2">

                    {/* PROFILE SECTION */}
                    {profileBlock && (
                        <div className="space-y-3" onClick={() => onItemClick?.(profileBlock)}>
                            <div className="bg-white rounded-[20px] p-5 soft-shadow flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all border border-slate-50">
                                <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white font-bold text-[20px] shadow-lg shadow-blue-200">TN</div>
                                <div className="flex-1">
                                    <h3 className="text-[#0f172a] text-[17px] font-[800] leading-tight tracking-tight">Xin chào, Tài Nguyễn Đình</h3>
                                    <p className="text-[#64748b] text-[13px] font-medium mt-0.5 opacity-80">Quản trị viên hệ thống</p>
                                    <p className="text-[#3b82f6] text-[12px] font-bold mt-1 bg-blue-50/50 inline-block px-2 py-0.5 rounded-md">QVC Elite V8.4</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-5 soft-shadow flex justify-between items-center cursor-pointer border border-slate-50 active:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-lg">🏢</div>
                                    <span className="text-[14px] font-[800] text-[#0f172a] tracking-tight">CÔNG TY CÔNG NGHỆ QUỐC VIỆT</span>
                                </div>
                                <span className="text-[#cbd5e1] text-xl font-light">›</span>
                            </div>
                        </div>
                    )}

                    {/* COMPOSER */}
                    {composerBlock && (
                        <div className="bg-white rounded-[20px] p-4 soft-shadow flex items-center gap-3 cursor-pointer active:scale-[0.98] border border-slate-50" onClick={() => onItemClick?.(composerBlock)}>
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl text-slate-400">👤</div>
                            <div className="flex-1 bg-slate-50 h-11 rounded-full flex items-center px-4 border border-slate-100">
                                <span className="text-[#94a3b8] text-[14px] font-medium">Bạn đang nghĩ gì?</span>
                            </div>
                            <span className="text-2xl opacity-60">🖼️</span>
                        </div>
                    )}

                    {/* GRID FEATURES */}
                    {gridItems.length > 0 && (
                        <div className="bg-white rounded-[24px] p-5 soft-shadow border border-slate-50">
                            {gridItems[0].metadata?.title && (
                                <h4 className="text-[16px] font-[800] text-[#0f172a] mb-5 tracking-tight">{gridItems[0].metadata?.title}</h4>
                            )}
                            <div className="flex flex-wrap gap-y-8">
                                {gridItems.map((item, idx) => (
                                    <div key={idx} onClick={() => onItemClick?.(item)} className="w-1/4 flex flex-col items-center gap-2.5 cursor-pointer active:scale-95 transition-all">
                                        <div className={`w-[54px] h-[54px] flex items-center justify-center rounded-[18px] shadow-sm border border-black/5`} style={{ backgroundColor: item.bg_color || '#f8fafc' }}>
                                            <RealityIcon name={item.icon} className="text-2xl" />
                                        </div>
                                        <span className="text-[11px] font-[700] text-[#475569] text-center leading-tight tracking-tight px-1">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SUMMARY CARD */}
                    {summaryCardBlock && (
                        <div className="bg-white rounded-[24px] p-5 soft-shadow border border-slate-50 relative overflow-hidden" onClick={() => onItemClick?.(summaryCardBlock)}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[16px] font-[800] text-[#0f172a] tracking-tight">{summaryCardBlock.metadata?.title || 'Thông số vận hành'}</h4>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs text-slate-400 cursor-pointer">🔄</div>
                            </div>

                            {summaryCardBlock.data?.stats ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {summaryCardBlock.data.stats.map((stat, si) => (
                                        <div key={si} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                            <p className="text-[11px] font-[700] text-[#94a3b8] uppercase tracking-wider mb-1">{stat.label}</p>
                                            <p className="text-[18px] font-[800] text-[#3b82f6] tracking-tighter">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 bg-[#ef4444]/5 py-1.5 px-3 rounded-lg border border-[#ef4444]/10">
                                        <span className="text-[12px]">⚠️</span>
                                        <span className="text-[#ef4444] text-[11px] font-[800] tracking-tight uppercase">Hệ thống đang bảo trì</span>
                                    </div>
                                    <p className="text-[13px] text-[#64748b] font-medium leading-relaxed opacity-80">
                                        Vui lòng quay lại sau ít phút để cập nhật dữ liệu mới nhất từ trung tâm điều hành.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SOCIAL FEED */}
                    {socialFeedBlock && (
                        <div className="space-y-4" onClick={() => onItemClick?.(socialFeedBlock)}>
                            {(realFeedData && realFeedData.length > 0 ? realFeedData : [1]).map((post, i) => (
                                <div key={i} className="bg-white rounded-[20px] p-5 soft-shadow border border-slate-50">
                                    <div className="flex gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden border border-slate-50 shadow-sm">
                                            {post.avatar ? <img src={post.avatar} className="w-full h-full object-cover" /> : '👤'}
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <div className="font-[800] text-[#0f172a] text-[15px] tracking-tight">
                                                {post.author || 'Quản trị viên'}
                                            </div>
                                            <div className="text-[11px] text-[#94a3b8] font-bold uppercase mt-0.5 flex items-center gap-1.5">
                                                <span>{post.timestamp || 'Mới đây'}</span>
                                                <span className="opacity-30">•</span>
                                                <span className="text-[#3b82f6]">Tin tức QVC</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[#1e293b] text-[14px] leading-[1.6] font-medium mb-4 tracking-tight">
                                        {post.content || 'Nội dung thông báo hệ thống được mô phỏng trực tiếp từ dữ liệu thực tế...'}
                                    </p>
                                    <div className="flex justify-between pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-sm font-bold"><span>👍</span> 12</div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-sm font-bold"><span>💬</span> 4</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* BOTTOM TAB BAR */}
                <div className="absolute bottom-0 inset-x-0 tab-bar-reality flex justify-around items-center z-[100] pt-[12px] pb-[32px] px-3">
                    {[
                        { label: 'Trang chủ', img: '🏠', slug: 'goto_feed' },
                        { label: 'CRM', img: '🌐', slug: 'goto_crm' },
                        { label: 'Chấm công', img: '📍', slug: 'goto_attendance' },
                        { label: 'Thông báo', img: '🔔', slug: 'goto_notification' },
                        { label: 'Hồ sơ', img: '👤', slug: 'goto_profile' }
                    ].map((nav, idx) => {
                        const isActive = activeScreen === nav.slug;
                        return (
                            <div key={idx} onClick={() => onTabChange?.(nav.slug)} className="flex flex-col items-center gap-1.5 transition-all active:scale-90 cursor-pointer w-[18%]">
                                <div className={`text-[25px] transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_4px_8px_rgba(59,130,246,0.3)]' : 'opacity-40 grayscale-[0.5]'}`}>{nav.img}</div>
                                <span className={`text-[10px] font-[700] tracking-tight transition-all ${isActive ? 'active-tab-text' : 'text-[#94a3b8]'}`}>{nav.label}</span>
                            </div>
                        );
                    })}
                </div>
                {!isLandscape && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-[#000000] rounded-full z-[110] opacity-[0.08]"></div>}
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

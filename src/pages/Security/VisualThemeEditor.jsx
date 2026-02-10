import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Icon, Modal } from '../../components/ui';
import MediaManager from '../../components/Core/MediaManager';

const VisualThemeEditor = () => {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [activeTab, setActiveTab] = useState('html_header');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Schema & Patterns
    const [schema, setSchema] = useState([]);
    const [patterns, setPatterns] = useState({});

    // Code States
    const [codes, setCodes] = useState({
        html_header: '',
        html_footer: '',
        css_custom: '',
        js_custom: '',
        product_template_html: ''
    });

    const [themeConfig, setThemeConfig] = useState({});
    const [versions, setVersions] = useState([]);
    const [editingVersionId, setEditingVersionId] = useState(null);

    // Media Manager State
    const [isMediaOpen, setIsMediaOpen] = useState(false);

    useEffect(() => {
        fetchSites();
        fetchSchema();
        fetchPatterns();
    }, []);

    useEffect(() => {
        if (selectedSite) {
            setEditingVersionId(selectedSite.active_theme_version_id);
            fetchVersions();
        }
    }, [selectedSite]);

    useEffect(() => {
        if (editingVersionId) {
            fetchVersionData(editingVersionId);
        }
    }, [editingVersionId]);

    const fetchSites = async () => {
        try {
            const res = await axios.get('/api/v2/security/sites');
            setSites(res.data.data);
            if (res.data.data.length > 0 && !selectedSite) {
                setSelectedSite(res.data.data[0]);
            }
        } catch (e) { toast.error("Lỗi nạp Site"); }
        finally { setIsLoading(false); }
    };

    const fetchSchema = async () => {
        try {
            const res = await axios.get('/api/v2/web/schema/variables');
            // Parse and flatten schema from object to array
            const raw = res.data.data?.schema || {};
            const flatList = [];

            Object.keys(raw).forEach(group => {
                const groupItems = raw[group];
                if (typeof groupItems === 'object') {
                    Object.keys(groupItems).forEach(key => {
                        const item = groupItems[key];
                        flatList.push({
                            key: `${group}.${key}`,
                            ...item,
                            desc: item.description || item.desc || ''
                        });
                    });
                }
            });

            setSchema(flatList);
        } catch (e) { console.error("Lỗi nạp schema", e); }
    };

    const fetchPatterns = async () => {
        try {
            const res = await axios.get('/api/v2/web/patterns');
            setPatterns(res.data.data);
        } catch (e) { console.error("Lỗi nạp mẫu"); }
    };

    const fetchVersions = async () => {
        if (!selectedSite) return;
        try {
            const res = await axios.get(`/api/v2/security/themes/${selectedSite.theme_id}/versions`);
            setVersions(res.data.data);
        } catch (e) { console.error("Lỗi nạp phiên bản"); }
    };

    const fetchVersionData = async (vId) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/v2/security/theme-versions/${vId}`);
            const v = res.data.data;
            setCodes({
                html_header: v.html_header || '',
                html_footer: v.html_footer || '',
                css_custom: v.css_custom || '',
                js_custom: v.js_custom || '',
                product_template_html: v.product_template_html || ''
            });
            setThemeConfig(v.config_json || {});
        } catch (e) { toast.error("Lỗi nạp dữ liệu"); }
        finally { setIsLoading(false); }
    };

    const handleSave = async (autoSnapshot = false) => {
        setIsSaving(true);
        try {
            await axios.post(`/api/v2/security/theme-versions/${editingVersionId}/update-programmable`, {
                ...codes,
                config_json: themeConfig,
                auto_snapshot: autoSnapshot
            });
            toast.success(autoSnapshot ? "Đã snapshot & lưu!" : "Đã đồng bộ code!");
            if (autoSnapshot) fetchVersions();
        } catch (e) { toast.error("Lỗi lưu code"); }
        finally { setIsSaving(false); }
    };

    const insertPattern = (html) => {
        setCodes(prev => ({ ...prev, [activeTab]: prev[activeTab] + "\n" + html }));
        toast.success("Đã chèn mẫu thiết kế!");
    };

    const insertVariable = (key) => {
        setCodes(prev => ({ ...prev, [activeTab]: prev[activeTab] + key }));
    };

    const onMediaSelect = (media) => {
        const url = media.preview_url;
        let insertion = "";
        if (activeTab === 'css_custom') {
            insertion = `url("${url}")`;
        } else if (activeTab === 'js_custom') {
            insertion = `"${url}"`;
        } else {
            insertion = `<img src="${url}" alt="${media.original_name}" />`;
        }
        setCodes(prev => ({ ...prev, [activeTab]: prev[activeTab] + insertion }));
        setIsMediaOpen(false);
        toast.success("Đã chèn file từ kho!");
    };

    const renderCodeEditor = (key, label, language = 'html') => (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-tight">{label}</h3>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsMediaOpen(true)}
                        className="flex items-center gap-2 text-[10px] bg-slate-900 text-indigo-300 px-4 py-1.5 rounded-xl hover:bg-black transition-all font-black uppercase tracking-widest border border-indigo-500/20"
                    >
                        <Icon name="image" className="w-3.5 h-3.5" /> Media Gallery
                    </button>
                    <button
                        onClick={() => setCodes({ ...codes, [key]: '' })}
                        className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase"
                    >
                        Clear
                    </button>
                </div>
            </div>
            <div className="flex-1 relative group">
                <textarea
                    value={codes[key]}
                    onChange={(e) => setCodes({ ...codes, [key]: e.target.value })}
                    className="w-full h-full bg-slate-900 text-indigo-300 p-8 rounded-3xl font-mono text-sm outline-none focus:ring-4 ring-indigo-500/20 transition-all border-none shadow-2xl resize-none custom-scrollbar"
                    placeholder={`Write ${language} here...`}
                    spellCheck="false"
                />
            </div>
        </div>
    );

    if (isLoading && sites.length === 0) return <div className="p-10 text-center animate-pulse">INIT ASSET ENGINE...</div>;

    return (
        <div className="p-6 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-100px)]">
            {/* TOP HEADER */}
            <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            ASSET BUILDER <span className="text-indigo-600">V5.1</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Media & Pattern Integration</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <select
                        value={selectedSite?.code}
                        onChange={(e) => setSelectedSite(sites.find(s => s.code === e.target.value))}
                        className="bg-slate-50 border-none rounded-2xl text-[11px] font-black text-indigo-600 px-4 py-2 outline-none focus:ring-2 ring-indigo-100"
                    >
                        {sites.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.open(`/web/${selectedSite?.code}?v_id=${editingVersionId}`, '_blank')}
                        className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-[11px] tracking-widest border border-slate-100"
                    >
                        Live Preview
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] tracking-widest hover:shadow-xl transition-all"
                    >
                        {isSaving ? 'Saving...' : 'Publish Design'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* TOOLBAR (LEFT) */}
                <div className="w-56 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest p-2 mb-1">Navigation</p>
                        {[
                            { id: 'html_header', label: 'header.html', icon: 'code' },
                            { id: 'html_footer', label: 'footer.html', icon: 'code' },
                            { id: 'css_custom', label: 'global.css', icon: 'layout' },
                            { id: 'js_custom', label: 'main.js', icon: 'activity' },
                            { id: 'product_template_html', label: 'product.tpl', icon: 'grid' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon name={tab.icon} className="w-3.5 h-3.5" />
                                <span className="font-bold text-[11px] uppercase tracking-tighter">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* PATTERNS */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex-1 overflow-y-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Sample Patterns</p>
                        <div className="space-y-3">
                            {patterns[activeTab.replace('html_', '').replace('_custom', '').replace('_template_html', '')]?.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => insertPattern(p.html)}
                                    className="w-full text-left p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-400 transition-all group"
                                >
                                    <h5 className="font-black text-[10px] text-slate-700 uppercase group-hover:text-indigo-600">{p.name}</h5>
                                    <p className="text-[8px] text-slate-400 mt-1 uppercase">Insert Fragment</p>
                                </button>
                            )) || <p className="text-[9px] text-slate-400 font-bold italic">No patterns yet</p>}
                        </div>
                    </div>
                </div>

                {/* MAIN EDITOR (CENTER) */}
                <div className="flex-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    {renderCodeEditor(activeTab, `Building: ${activeTab}`)}
                </div>

                {/* RIGHT SIDEBAR (VARIABLES & HISTORY) */}
                <div className="w-80 flex flex-col gap-6 overflow-hidden">
                    {/* VARIABLE REFERENCE */}
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col h-1/2 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Icon name="code" className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Variable Registry</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-2">
                            {schema.map(v => (
                                <div
                                    key={v.key}
                                    onClick={() => insertVariable(v.key)}
                                    className="p-3 bg-slate-50 rounded-2xl border border-slate-50 hover:bg-white hover:border-indigo-200 cursor-pointer transition-all group"
                                >
                                    <code className="text-[10px] font-black text-indigo-600 group-hover:text-indigo-700 block">{v.key}</code>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1 leading-relaxed uppercase">{v.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VERSION HISTORY */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 flex flex-col h-1/2 overflow-hidden shadow-2xl shadow-indigo-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-indigo-300 text-[10px] uppercase tracking-widest">Checkpoints</h3>
                            <button onClick={() => handleSave(true)} className="text-[9px] bg-indigo-500 text-white px-4 py-2 rounded-xl font-black uppercase hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20">Snapshot</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {versions.map(v => (
                                <div
                                    key={v.id}
                                    onClick={() => setEditingVersionId(v.id)}
                                    className={`p-4 rounded-2xl transition-all cursor-pointer border ${editingVersionId === v.id
                                        ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-500/40 translate-x-1'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${v.id === selectedSite?.active_theme_version_id ? 'bg-green-400 text-green-900' : 'bg-white/10 text-white/40'
                                            }`}>
                                            {v.id === selectedSite?.active_theme_version_id ? 'Active' : 'Draft'}
                                        </span>
                                    </div>
                                    <h4 className={`font-black text-[11px] truncate mt-1 ${editingVersionId === v.id ? 'text-white' : 'text-slate-300'}`}>
                                        {v.version_tag}
                                    </h4>
                                    <p className={`text-[8px] font-bold mt-1.5 uppercase ${editingVersionId === v.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                        {new Date(v.updated_at).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MEDIA MANAGER MODAL */}
            {isMediaOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full h-full rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center px-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Select Asset</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Insert media directly into code</p>
                            </div>
                            <button onClick={() => setIsMediaOpen(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MediaManager
                                onSelect={onMediaSelect}
                                isStandalone={false}
                                type="all"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisualThemeEditor;

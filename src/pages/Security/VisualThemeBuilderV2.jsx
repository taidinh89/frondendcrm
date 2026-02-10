import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Icon } from '../../components/ui'; // Assuming this exists based on V1
import MediaManager from '../../components/Core/MediaManager';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

const ICON_PATHS = {
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    loader: "M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83",
    code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
    layout: "M3 3h18v18H3z M9 3v18 M3 9h18",
    hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"
};

const VisualThemeBuilderV2 = () => {
    // --- STATE ---
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

    // Filter/Search State for Variables/Patterns
    const [searchTerm, setSearchTerm] = useState('');

    // UI State
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('variables'); // 'variables' | 'history'

    // --- EFFECT: Initial Load ---
    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchSites(), fetchSchema(), fetchPatterns()]);
            setIsLoading(false);
        };
        init();
    }, []);

    // --- EFFECT: Site Selection ---
    useEffect(() => {
        if (selectedSite) {
            setEditingVersionId(selectedSite.active_theme_version_id);
            fetchVersions();
        }
    }, [selectedSite]);

    // --- EFFECT: Version Change ---
    useEffect(() => {
        if (editingVersionId) {
            fetchVersionData(editingVersionId);
        }
    }, [editingVersionId]);

    // --- API CALLS ---
    const fetchSites = async () => {
        try {
            const res = await axios.get('/api/v2/security/sites');
            setSites(res.data.data);
            if (res.data.data.length > 0 && !selectedSite) {
                setSelectedSite(res.data.data[0]);
            }
        } catch (e) { toast.error("Lỗi nạp danh sách Site"); }
    };

    const fetchSchema = async () => {
        try {
            const res = await axios.get('/api/v2/web/schema/variables');
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
        } catch (e) {
            console.error("Lỗi nạp schema", e);
            // Fallback mock if API fails during dev
        }
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
        // Don't show full loading spinner to avoid flickering, just maybe a small indicator
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
        } catch (e) { toast.error("Lỗi nạp dữ liệu phiên bản"); }
    };

    // --- ACTIONS ---
    const handleSave = async (autoSnapshot = false) => {
        setIsSaving(true);
        try {
            await axios.post(`/api/v2/security/theme-versions/${editingVersionId}/update-programmable`, {
                ...codes,
                config_json: themeConfig,
                auto_snapshot: autoSnapshot
            });
            toast.success(autoSnapshot ? "Đã tạo Snapshot & Lưu!" : "Đã lưu thay đổi!");
            if (autoSnapshot) fetchVersions();
        } catch (e) { toast.error("Lỗi khi lưu"); }
        finally { setIsSaving(false); }
    };

    const insertCode = (text) => {
        // Simple append for now, ideally insert at cursor but that requires ref to editor instance
        // With simplified state bind, appending is safest default without complex ref handling
        // For CodeMirror component, we can controlled value update.
        // A better way is to copy to clipboard or just append.
        // For this V2, let's append with new line.
        setCodes(prev => ({ ...prev, [activeTab]: prev[activeTab] + "\n" + text }));
        toast.success("Đã chèn mã!");
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
        setCodes(prev => ({ ...prev, [activeTab]: prev[activeTab] + "\n" + insertion }));
        setIsMediaOpen(false);
        toast.success("Đã chèn Media!");
    };

    // --- RENDER HELPERS ---
    const getLanguageExtension = (key) => {
        if (key.includes('css')) return [css()];
        if (key.includes('js')) return [javascript({ jsx: false })];
        return [html()];
    };

    // Filtered lists
    const filteredVariables = schema.filter(v => v.key.toLowerCase().includes(searchTerm.toLowerCase()) || v.desc.toLowerCase().includes(searchTerm.toLowerCase()));
    const currentPatterns = patterns[activeTab.replace('html_', '').replace('_custom', '').replace('_template_html', '')] || [];

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-slate-900 text-indigo-400 font-mono animate-pulse">
            INITIALIZING SUPER BUILDER V2...
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#0d1117] text-slate-300 overflow-hidden font-sans">
            {/* --- TOP HEADER --- */}
            <div className="h-14 border-b border-slate-800 bg-[#161b22] px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
                            <Icon name="zap" path={ICON_PATHS.zap} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-wide">VISUAL BUILDER <span className="text-indigo-400">PRO</span></h1>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Parallel Engine V2</p>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-slate-700 mx-2" />

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">Context:</span>
                        <select
                            value={selectedSite?.code}
                            onChange={(e) => setSelectedSite(sites.find(s => s.code === e.target.value))}
                            className="bg-[#0d1117] text-white text-xs border border-slate-700 rounded-md px-3 py-1.5 focus:border-indigo-500 outline-none transition-colors min-w-[150px]"
                        >
                            {sites.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.open(`/web/${selectedSite?.code}?v_id=${editingVersionId}`, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs font-semibold border border-transparent hover:border-slate-700"
                    >
                        <Icon name="external-link" className="w-3.5 h-3.5" />
                        Live Preview
                    </button>

                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-indigo-400 rounded-md hover:bg-slate-700 transition-all text-xs font-bold border border-slate-700"
                    >
                        <Icon name="camera" path={ICON_PATHS.camera} className="w-3.5 h-3.5" />
                        Snapshot
                    </button>

                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-all text-xs font-bold shadow-lg shadow-indigo-900/20 active:scale-95"
                    >
                        {isSaving ? (
                            <>
                                <Icon name="loader" path={ICON_PATHS.loader} className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Icon name="save" className="w-3.5 h-3.5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* --- MAIN WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR: FILES & PATTERNS */}
                <div className="w-64 bg-[#161b22] border-r border-slate-800 flex flex-col shrink-0">
                    <div className="p-3 border-b border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2">Project Files</span>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {[
                            { id: 'html_header', label: 'header.html', icon: 'layout', path: ICON_PATHS.layout, color: 'text-orange-400' },
                            { id: 'html_footer', label: 'footer.html', icon: 'layout', path: ICON_PATHS.layout, color: 'text-orange-400' },
                            { id: 'css_custom', label: 'global.css', icon: 'hash', path: ICON_PATHS.hash, color: 'text-blue-400' },
                            { id: 'js_custom', label: 'main.js', icon: 'code', path: ICON_PATHS.code, color: 'text-yellow-400' },
                            { id: 'product_template_html', label: 'product_detail.tpl', icon: 'file-text', path: ICON_PATHS['file-text'], color: 'text-green-400' }
                        ].map(file => (
                            <button
                                key={file.id}
                                onClick={() => setActiveTab(file.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors border-l-2 ${activeTab === file.id
                                    ? 'bg-[#0d1117] text-white border-indigo-500'
                                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`}
                            >
                                <Icon name={file.icon} path={file.path} className={`w-4 h-4 ${activeTab === file.id ? file.color : 'text-slate-600'}`} />
                                {file.label}
                            </button>
                        ))}

                        <div className="mt-6 mb-2 px-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Snippets</span>
                        </div>
                        <div className="px-2 space-y-1">
                            {currentPatterns.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => insertCode(p.html)}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-800 group transition-all"
                                >
                                    <div className="text-xs font-semibold text-slate-300 group-hover:text-white truncate">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 group-hover:text-slate-500">Click to insert</div>
                                </button>
                            ))}
                            {currentPatterns.length === 0 && (
                                <div className="px-3 py-2 text-[10px] text-slate-600 italic">No snippets available for this file type</div>
                            )}
                        </div>
                    </div>

                    <div className="p-3 border-t border-slate-800">
                        <button
                            onClick={() => setIsMediaOpen(true)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-md text-xs font-semibold transition-all"
                        >
                            <Icon name="image" className="w-4 h-4" />
                            Open Media Gallery
                        </button>
                    </div>
                </div>

                {/* CENTER EDITOR */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
                    <div className="h-9 flex items-center justify-between px-4 border-b border-slate-800 bg-[#0d1117]">
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-2">
                            Editing: <span className="text-indigo-400 font-bold">{activeTab}</span>
                        </span>
                        <span className="text-[10px] text-slate-600">Auto-complete enabled</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <CodeMirror
                            value={codes[activeTab]}
                            height="100%"
                            theme={vscodeDark}
                            extensions={getLanguageExtension(activeTab)}
                            onChange={(val) => setCodes({ ...codes, [activeTab]: val })}
                            className="text-sm h-full"
                            basicSetup={{
                                lineNumbers: true,
                                highlightActiveLineGutter: true,
                                highlightSpecialChars: true,
                                history: true,
                                foldGutter: true,
                                drawSelection: true,
                                dropCursor: true,
                                allowMultipleSelections: true,
                                indentOnInput: true,
                                syntaxHighlighting: true,
                                bracketMatching: true,
                                closeBrackets: true,
                                autocompletion: true,
                                rectangularSelection: true,
                                crosshairCursor: true,
                                highlightActiveLine: true,
                                highlightSelectionMatches: true,
                                closeBracketsKeymap: true,
                                defaultKeymap: true,
                                searchKeymap: true,
                                historyKeymap: true,
                                foldKeymap: true,
                                completionKeymap: true,
                                lintKeymap: true,
                            }}
                        />
                    </div>
                </div>

                {/* RIGHT SIDEBAR: TOOLBOX */}
                <div className="w-80 bg-[#161b22] border-l border-slate-800 flex flex-col shrink-0">
                    <div className="flex border-b border-slate-800">
                        <button
                            onClick={() => setRightPanelTab('variables')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${rightPanelTab === 'variables' ? 'border-indigo-500 text-white bg-[#0d1117]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Variables
                        </button>
                        <button
                            onClick={() => setRightPanelTab('history')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 ${rightPanelTab === 'history' ? 'border-indigo-500 text-white bg-[#0d1117]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            History
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {rightPanelTab === 'variables' ? (
                            <div className="flex flex-col h-full">
                                <div className="p-3 border-b border-slate-800">
                                    <div className="relative">
                                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search variables..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500 placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {filteredVariables.map(v => (
                                        <div
                                            key={v.key}
                                            onClick={() => insertCode(v.key)}
                                            className="group p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-lg cursor-pointer transition-all"
                                        >
                                            <code className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 block mb-1">{v.key}</code>
                                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{v.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-3 border-b border-slate-800">
                                    <p className="text-[10px] text-slate-500">Restore points allow you to revert changes.</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {versions.map(v => (
                                        <div
                                            key={v.id}
                                            onClick={() => setEditingVersionId(v.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${editingVersionId === v.id
                                                ? 'bg-indigo-900/20 border-indigo-500/50'
                                                : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${v.id === selectedSite?.active_theme_version_id
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-slate-700 text-slate-400'
                                                    }`}>
                                                    {v.id === selectedSite?.active_theme_version_id ? 'LIVE' : 'BACKUP'}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(v.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className={`text-xs font-bold truncate ${editingVersionId === v.id ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                {v.version_tag}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                {new Date(v.updated_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MEDIA MODAL */}
            {isMediaOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#161b22] w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col shadow-2xl border border-slate-800 text-slate-200">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold">Media Library</h2>
                            <button onClick={() => setIsMediaOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-2">
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

export default VisualThemeBuilderV2;

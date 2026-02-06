import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Layout, Card, Button, Input, Select, Form, message, Tabs, Space,
    Row, Col, Switch, DatePicker, Tag
} from 'antd';
import {
    SaveOutlined, EyeOutlined, RollbackOutlined, FileTextOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import moment from 'moment';

import TemplateLibrary from './TemplateLibrary';
import VersionHistory from './VersionHistory';
import MediaManagerModal from '../../components/MediaManagerModal';

const { Content, Sider } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const LandingPageEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(null);
    const [activeVersion, setActiveVersion] = useState(null);
    const [sites, setSites] = useState([]);

    // Template library
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [mediaModalVisible, setMediaModalVisible] = useState(false);

    // Editors state
    const [htmlContent, setHtmlContent] = useState('');
    const [cssContent, setCssContent] = useState('');
    const [jsContent, setJsContent] = useState('');
    const [fullContent, setFullContent] = useState(''); // [NEW] Combined editor

    const [activeTab, setActiveTab] = useState('full');

    // Block generator state
    const [blockType, setBlockType] = useState('catid');
    const [blockId, setBlockId] = useState('');
    const [blockTheme, setBlockTheme] = useState('theme01');
    const [blockLimit, setBlockLimit] = useState(10);

    // Refs explicit definition for stability
    const fullEditorRef = useRef(null);
    const htmlEditorRef = useRef(null);
    const cssEditorRef = useRef(null);
    const jsEditorRef = useRef(null);

    // Map for dynamic access
    const editorRefs = {
        full: fullEditorRef,
        html: htmlEditorRef,
        css: cssEditorRef,
        js: jsEditorRef,
    };

    // Helper to log editor lifecycle
    const EditorContainer = ({ name, value, language, onChange, editorRef }) => {
        useEffect(() => {
            console.log(`[LandingEditor] ${name} container mounted. Content length: ${value?.length}`);
            return () => console.log(`[LandingEditor] ${name} container UNMOUNTED.`);
        }, []);

        return (
            <div style={{ height: 'calc(100vh - 280px)', border: '1px solid #d9d9d9', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <CodeMirror
                        value={value}
                        height="100%"
                        style={{ height: '100%' }}
                        extensions={[language]}
                        onCreateEditor={(view) => {
                            console.log(`[LandingEditor] ${name} CodeMirror instance created.`);
                            editorRef.current = view;
                        }}
                        onChange={(val) => {
                            onChange(val);
                        }}
                        theme="dark"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            dropCursor: true,
                            allowMultipleSelections: true,
                            indentOnInput: true,
                            bracketMatching: true,
                            closeBrackets: true,
                            autocompletion: true,
                            highlightActiveLine: true,
                        }}
                    />
                </div>
            </div>
        );
    };

    // Construct items array for Tabs
    // ==========================================
    // LOGIC FUNCTIONS
    // ==========================================

    const updateFullContent = (h, c, j) => {
        const combined = `<style>\n${c}\n</style>\n\n${h}\n\n<script>\n${j}\n</script>`;
        setFullContent(combined);
    };

    const parseFullContent = (content) => {
        let h = content;
        let c = '';
        let j = '';

        const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
            c = styleMatch[1].trim();
            h = h.replace(styleMatch[0], '');
        }

        const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
            j = scriptMatch[1].trim();
            h = h.replace(scriptMatch[0], '');
        }

        setHtmlContent(h.trim());
        setCssContent(c);
        setJsContent(j);
    };

    useEffect(() => {
        fetchSites();
        if (id !== 'create') {
            fetchPage();
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'full') {
            updateFullContent(htmlContent, cssContent, jsContent);
        }
    }, [activeTab]);

    const fetchSites = async () => {
        try {
            const response = await axios.get('/api/v2/security/sites');
            if (response.data.code === 200 || response.data.code === 201) {
                setSites(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sites', error);
        }
    };

    const fetchPage = async () => {
        if (!id || id === 'undefined') {
            return;
        }
        setLoading(true);
        try {
            console.log('[LandingEditor] Fetching page data for ID:', id);
            const response = await axios.get(`/api/v2/landing-pages/${id}`);
            if (response.data.code === 200 || response.data.code === 201) {
                const pageData = response.data.data;
                console.log('[LandingEditor] Page data loaded:', pageData);
                setPage(pageData);

                form.setFieldsValue({
                    title: pageData.title,
                    slug: pageData.slug,
                    description: pageData.description,
                    site_id: pageData.site_id,
                    campaign_name: pageData.campaign_name,
                    tags: pageData.tags,
                    meta_title: pageData.seo?.meta_title || pageData.meta_title,
                    meta_description: pageData.seo?.meta_description || pageData.meta_description,
                    meta_keywords: pageData.seo?.meta_keywords || pageData.meta_keywords,
                });

                if (pageData.active_version) {
                    console.log('[LandingEditor] Active version loaded:', pageData.active_version);
                    setActiveVersion(pageData.active_version);
                    const h = pageData.active_version.html_content || '';
                    const c = pageData.active_version.css_custom || '';
                    const j = pageData.active_version.js_custom || '';

                    console.log('[LandingEditor] Content Stats:', {
                        htmlLen: h.length,
                        cssLen: c.length,
                        jsLen: j.length
                    });

                    setHtmlContent(h);
                    setCssContent(c);
                    setJsContent(j);
                    updateFullContent(h, c, j);
                } else {
                    console.warn('[LandingEditor] NO ACTIVE VERSION FOUND');
                }
            }
        } catch (error) {
            console.error('fetchPage error', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            // Log current editor state before saving
            console.log('[LandingEditor] Preparing to save...', {
                title: values.title,
                htmlLength: htmlContent.length,
                cssLength: cssContent.length,
                jsLength: jsContent.length
            });

            const payload = {
                ...values,
                html_content: htmlContent,
                css_custom: cssContent,
                js_custom: jsContent,
            };

            let response;
            if (id === 'create') {
                console.log('[LandingEditor] Creating new page with payload:', payload);
                response = await axios.post('/api/v2/landing-pages', payload);
                if (response.data.code === 200 || response.data.code === 201) {
                    message.success('Landing page created!');
                    navigate(`/landing-pages/${response.data.data.id}/edit`);
                }
            } else {
                console.log('[LandingEditor] Updating page metadata:', payload);
                await axios.put(`/api/v2/landing-pages/${id}`, payload);

                const versionPayload = {
                    version_tag: `v${moment().format('YYYYMMDD-HHmmss')}`,
                    changelog: 'Auto-saved version',
                    html_content: htmlContent,
                    css_custom: cssContent,
                    js_custom: jsContent,
                    auto_activate: true // [FIX] Ensure this version becomes active immediately
                };
                console.log('[LandingEditor] Creating new version with payload:', versionPayload);

                response = await axios.post(`/api/v2/landing-pages/${id}/versions`, versionPayload);

                console.log('[LandingEditor] Version creation response:', response.data);

                if (response.data.code === 200 || response.data.code === 201) {
                    message.success('Saved as new version!');
                    fetchPage();
                }
            }
        } catch (error) {
            message.error('Save failed');
            console.error('[LandingEditor] Save failed error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        if (id === 'create') {
            message.warning('Vui lòng lưu trang trước khi xem trước!');
            return;
        }

        // Auto-save before previewing
        if (!saving) {
            await handleSave();
        }

        setTimeout(() => {
            window.open(`/preview/landing/${id}?ts=${Date.now()}`, '_blank');
        }, 500);
    };

    const handleTemplateSelect = (template) => {
        const h = template.html || '';
        const c = template.css || '';
        const j = template.js || '';
        setHtmlContent(h);
        setCssContent(c);
        setJsContent(j);
        updateFullContent(h, c, j);
        setTemplateModalVisible(false);
        message.success(`Template "${template.name}" loaded!`);
    };

    const handleMediaSelect = (file) => {
        if (!file?.preview_url) return;
        const imgTag = `<img src="${file.preview_url}" alt="${file.alt_text_default || file.original_name || 'image'}" style="max-width:100%; height:auto;" />`;
        insertSnippet(imgTag);
        setMediaModalVisible(false);
    };

    const insertSnippet = (snippet) => {
        const currentRef = editorRefs[activeTab]?.current;
        if (currentRef) {
            const cursor = currentRef.state.selection.main.head;
            currentRef.dispatch({
                changes: { from: cursor, to: cursor, insert: '\n' + snippet + '\n' },
                selection: { anchor: cursor + snippet.length + 2 }
            });
            currentRef.focus();
            message.success('Inserted!');
        } else {
            // Fallback
            if (activeTab === 'full') {
                const next = fullContent + '\n' + snippet;
                setFullContent(next);
                parseFullContent(next);
            } else if (activeTab === 'html') {
                const next = htmlContent + '\n' + snippet;
                setHtmlContent(next);
                updateFullContent(next, cssContent, jsContent);
            }
            message.warning('Editor not focused, appended to end.');
        }
    };

    const getPreviewHtml = () => {
        return `<style>
${cssContent}
</style>

${htmlContent}

<script>
${jsContent}
</script>`;
    };


    // Construct items array for Tabs
    const tabItems = [
        {
            key: 'full',
            label: <><FileTextOutlined /> FULL (HTML/CSS/JS)</>,
            children: ( // Changed from 'content' to 'children' or just use items structure correctly depending on Antd version. V5 uses 'children' in items? No, 'children' was deprecated in Items prop. 'children' is for old JSX. Items prop uses 'children' property? Actually 'children' is valid in items object in some versions, but 'label' and 'key' and 'children' is the stardard for <Tabs items={...} /> in 5.x. Wait, 'children' property in items object is valid.
                <div style={{ display: 'flex', height: 'calc(100vh - 280px)', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ flex: 1, borderRight: '1px solid #d1d5db' }}>
                        <CodeMirror
                            value={fullContent}
                            height="100%"
                            style={{ height: '100%' }}
                            extensions={[html()]} // Mixed content usually treated as HTML
                            onCreateEditor={(view) => {
                                console.log('[LandingEditor] FULL editor created');
                                fullEditorRef.current = view;
                            }}
                            onChange={(value) => {
                                setFullContent(value);
                                parseFullContent(value);
                            }}
                            theme="dark"
                            basicSetup={{ lineNumbers: true }}
                        />
                    </div>
                    <div style={{ flex: 1, background: '#fff' }}>
                        <iframe
                            srcDoc={getPreviewHtml()}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Live Preview"
                            sandbox="allow-scripts"
                        />
                    </div>
                </div>
            )
        },
        {
            key: 'html',
            label: <><FileTextOutlined /> HTML</>,
            children: (
                <EditorContainer
                    name="HTML"
                    value={htmlContent}
                    language={html()}
                    onChange={(v) => { setHtmlContent(v); updateFullContent(v, cssContent, jsContent); }}
                    editorRef={htmlEditorRef}
                />
            )
        },
        {
            key: 'css',
            label: <span>🎨 CSS</span>,
            children: (
                <EditorContainer
                    name="CSS"
                    value={cssContent}
                    language={css()}
                    onChange={(v) => { setCssContent(v); updateFullContent(htmlContent, v, jsContent); }}
                    editorRef={cssEditorRef}
                />
            )
        },
        {
            key: 'js',
            label: <span>⚡ JavaScript</span>,
            children: (
                <EditorContainer
                    name="JS"
                    value={jsContent}
                    language={javascript()}
                    onChange={(v) => { setJsContent(v); updateFullContent(htmlContent, cssContent, v); }}
                    editorRef={jsEditorRef}
                />
            )
        },
    ];

    return (
        <Layout style={{ height: '100vh' }}>
            <Content style={{ padding: 24 }}>
                <Card
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {id === 'create' ? '📝 Tạo Landing Page Mới' : `✏️ Chỉnh sửa: ${page?.title || ''}`}
                            </div>
                            <Space>
                                <Button
                                    icon={<AppstoreOutlined />}
                                    onClick={() => setTemplateModalVisible(true)}
                                >
                                    Chọn Template
                                </Button>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={handlePreview}
                                    disabled={id === 'create'}
                                >
                                    Preview
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSave}
                                    loading={saving}
                                >
                                    Lưu
                                </Button>
                                <Button
                                    icon={<RollbackOutlined />}
                                    onClick={() => navigate('/landing-pages')}
                                >
                                    Quaylại
                                </Button>
                            </Space>
                        </div>
                    }
                    loading={loading}
                >
                    <Row gutter={24}>
                        <Col span={18}>
                            {/* Settings Form */}
                            <Card size="small" style={{ marginBottom: 16 }}>
                                <Form form={form} layout="vertical">
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item
                                                name="title"
                                                label="Tiêu đề"
                                                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                                            >
                                                <Input placeholder="Flash Sale Laptop Dell" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                name="slug"
                                                label="Slug (URL)"
                                                rules={[
                                                    { required: true, message: 'Vui lòng nhập slug' },
                                                    { pattern: /^[a-z0-9-]+$/, message: 'Chỉ chữ thường, số, gạch nối' }
                                                ]}
                                            >
                                                <Input placeholder="flash-sale-laptop-dell" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Form.Item name="site_id" label="Site">
                                                <Select placeholder="Tất cả sites" allowClear>
                                                    {sites.map(site => (
                                                        <Option key={site.id} value={site.id}>{site.name} ({site.code})</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="campaign_name" label="Campaign">
                                                <Input placeholder="Summer Sale 2026" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="tags" label="Tags">
                                                <Select mode="tags" placeholder="sale, laptop, deal" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Form.Item name="description" label="Mô tả">
                                        <TextArea rows={2} placeholder="Mô tả ngắn về trang..." />
                                    </Form.Item>

                                    {/* SEO Section */}
                                    <Card type="inner" title="SEO Metadata" size="small">
                                        <Form.Item name="meta_title" label="Meta Title">
                                            <Input placeholder="Flash Sale Laptop Dell - Giảm 50%" maxLength={60} showCount />
                                        </Form.Item>
                                        <Form.Item name="meta_description" label="Meta Description">
                                            <TextArea rows={2} placeholder="Meta description..." maxLength={160} showCount />
                                        </Form.Item>
                                        <Form.Item name="meta_keywords" label="Meta Keywords">
                                            <Input placeholder="laptop, dell, sale, giảm giá" />
                                        </Form.Item>
                                    </Card>
                                </Form>
                            </Card>

                            {/* Code Editors */}
                            <Card>
                                <Tabs
                                    activeKey={activeTab}
                                    onChange={setActiveTab}
                                    items={tabItems}
                                    destroyInactiveTabPane={true} // [FIX] Ensure editors unmount/remount to fix CodeMirror rendering issues
                                />
                            </Card>
                        </Col>

                        <Col span={6}>
                            {/* Version History */}
                            {id !== 'create' && (
                                <VersionHistory
                                    landingPageId={id}
                                    activeVersionId={activeVersion?.id}
                                    onVersionSelect={(version) => {
                                        console.log('DEBUG: Switching to history version', version.id);
                                        setActiveVersion(version);
                                        setHtmlContent(version.html_content || '');
                                        setCssContent(version.css_custom || '');
                                        setJsContent(version.js_custom || '');
                                        updateFullContent(version.html_content || '', version.css_custom || '', version.js_custom || '');
                                    }}
                                    onVersionActivate={() => fetchPage()}
                                />
                            )}

                            {/* Quick Info */}
                            <Card size="small" title="ℹ️ Thông tin" style={{ marginTop: 16 }}>
                                {page && (
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div>
                                            <strong>Trạng thái:</strong>{' '}
                                            <Tag color={page.status === 'published' ? 'green' : 'orange'}>
                                                {page.status}
                                            </Tag>
                                        </div>
                                        <div>
                                            <strong>Dữ liệu:</strong>
                                            <div style={{ fontSize: '10px', color: '#666' }}>
                                                HTML: {htmlContent?.length || 0} chars (Loaded: {page.active_version ? '✅' : '❌'})
                                                <br />
                                                CSS: {cssContent?.length || 0} chars
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Views:</strong> {page.view_count?.toLocaleString() || 0}
                                        </div>
                                        <div>
                                            <strong>Conversions:</strong> {page.conversion_count || 0}
                                        </div>
                                        {page.view_count > 0 && (
                                            <div>
                                                <strong>CVR:</strong>{' '}
                                                {((page.conversion_count / page.view_count) * 100).toFixed(2)}%
                                            </div>
                                        )}
                                        <div>
                                            <strong>Public URL:</strong>
                                            <br />
                                            <a href={`/landing/${page.slug}`} target="_blank" rel="noreferrer">
                                                /landing/{page.slug}
                                            </a>
                                        </div>
                                    </Space>
                                )}
                            </Card>

                            {/* Variable Helper */}
                            <Card size="small" title="📌 Biến khả dụng" style={{ marginTop: 16 }}>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <ul style={{ paddingLeft: 20, fontSize: '12px' }}>
                                        <li><code>{"{{product.name}}"}</code></li>
                                        <li><code>{"{{product.price}}"}</code></li>
                                        <li><code>{"{{product.main_image}}"}</code></li>
                                        <li><code>{"{{site.name}}"}</code></li>
                                        <li><code>{"{{shop.hot_products_json}}"}</code></li>
                                        <li><code>{"{{shop.categories_json}}"}</code></li>
                                    </ul>
                                </div>
                                <small style={{ color: '#999' }}>Click vào biến để copy (Sắp có)</small>
                            </Card>

                            {/* Dynamic Block Generator */}
                            <Card size="small" title="⚡ Trình tạo Block động" style={{ marginTop: 16 }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Select
                                        defaultValue="catid"
                                        style={{ width: '100%' }}
                                        onChange={(v) => setBlockType(v)}
                                    >
                                        <Option value="catid">Theo Danh mục ID</Option>
                                        <Option value="brandid">Theo Thương hiệu ID</Option>
                                        <Option value="collection">Theo Bộ sưu tập</Option>
                                        <Option value="search">Theo Từ khóa</Option>
                                    </Select>
                                    <Input
                                        placeholder="Nhập ID hoặc từ khóa..."
                                        onChange={(e) => setBlockId(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <Select defaultValue="theme01" style={{ flex: 1 }} onChange={(v) => setBlockTheme(v)}>
                                            <Option value="theme01">Grid (Dàn trang)</Option>
                                            <Option value="theme02">List (Danh sách)</Option>
                                        </Select>
                                        <Input
                                            type="number"
                                            defaultValue={10}
                                            style={{ width: 60 }}
                                            onChange={(e) => setBlockLimit(e.target.value)}
                                        />
                                    </div>
                                    <Button type="primary" ghost block onClick={() => {
                                        const shortcode = `{${blockType || 'catid'}:${blockId || '0'}:${blockTheme || 'theme01'}:sl${blockLimit || 10}}`;
                                        insertSnippet(shortcode);
                                    }}>
                                        Thêm Block động
                                    </Button>

                                    <div style={{ marginTop: 8, borderTop: '1px dashed #ddd', paddingTop: 8 }}>
                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: 4 }}>Custom HTML Template:</div>
                                        <Button size="small" block dashed onClick={() => {
                                            const snippet = `<dynamic-block type="${blockType || 'catid'}" id="${blockId || '66'}" limit="${blockLimit || 10}">
    <div class="product-item" style="border:1px solid #eee; padding:10px; margin-bottom:10px;">
        <img src="{{product.image}}" style="width:100%; height:200px; object-fit:cover;" />
        <h3>{{product.name}}</h3>
        <p style="color:red; font-weight:bold;">{{product.price}} <del style="color:#999; font-size:12px;">{{product.old_price}}</del></p>
        <button class="btn-buy">MUA NGAY</button>
    </div>
</dynamic-block>`;
                                            insertSnippet(snippet);
                                        }}>
                                            Chèn Block tùy chỉnh HTML
                                        </Button>
                                    </div>
                                </Space>
                            </Card>

                            {/* HTML Blocks */}
                            <Card size="small" title="🧱 Quick Snippets" style={{ marginTop: 16 }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Button size="small" block onClick={() => {
                                        const snippet = '<div class="header" style="background:#333; color:white; padding:20px; text-align:center;">\n  <h1>{{site.name}}</h1>\n  <p>Hotline: {{site.phone}}</p>\n</div>';
                                        insertSnippet(snippet);
                                    }}>
                                        Header Mặc định
                                    </Button>
                                    <Button size="small" block onClick={() => {
                                        const snippet = '<div class="footer" style="padding:40px; background:#f5f5f5; text-align:center; margin-top:50px;">\n  <p>© {{site.name}} - {{site.address}}</p>\n</div>';
                                        insertSnippet(snippet);
                                    }}>
                                        Footer Mặc định
                                    </Button>
                                    <Button size="small" block type="primary" ghost onClick={() => setMediaModalVisible(true)} style={{ marginTop: 8 }}>
                                        🖼️ Chèn hình ảnh từ thư viện
                                    </Button>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </Card>
            </Content>

            {/* Template Library Modal */}
            <TemplateLibrary
                visible={templateModalVisible}
                onSelect={handleTemplateSelect}
                onCancel={() => setTemplateModalVisible(false)}
            />

            {/* Media Manager Modal */}
            {mediaModalVisible && (
                <MediaManagerModal
                    isOpen={mediaModalVisible}
                    onClose={() => setMediaModalVisible(false)}
                    onSelect={handleMediaSelect}
                    multiple={false}
                    type="image"
                    title="Chọn hình ảnh chèn vào Landing Page"
                />
            )}
        </Layout>
    );
};

export default LandingPageEditor;

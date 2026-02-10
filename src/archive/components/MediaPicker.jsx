import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Upload, Button, Input, Select, Empty, Spin, Row, Col, Card, message, Image } from 'antd';
import {
    PictureOutlined, VideoCameraOutlined, FileOutlined,
    UploadOutlined, SearchOutlined, CheckOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Search } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const MediaPicker = ({ visible, onSelect, onCancel, acceptTypes = ['image', 'video', 'document'] }) => {
    const [activeTab, setActiveTab] = useState('browse');
    const [mediaFiles, setMediaFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filters, setFilters] = useState({
        type: 'all',
        search: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (visible && activeTab === 'browse') {
            fetchMedia();
        }
    }, [visible, filters.search, filters.type, activeTab]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const params = {
                per_page: 60, // Match backend default pagination
                ...(filters.search && { search: filters.search }),
                ...(filters.type !== 'all' && { type: filters.type })
            };

            const response = await axios.get('/api/v1/admin/media-library', { params });
            if (response.data && response.data.data) {
                setMediaFiles(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load media', error);
        } finally {
            setLoading(false);
        }
    };

    const getMimeFilter = (type) => {
        const mimeMap = {
            image: 'image/*',
            video: 'video/*',
            document: 'application/*'
        };
        return mimeMap[type] || '*';
    };

    const handleUpload = async (file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('temp_context', 'landing-page'); // Match GeneralMediaController@uploadSmart

        try {
            const response = await axios.post('/api/v1/media/smart-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                message.success('Upload thành công!');
                setActiveTab('browse');
                fetchMedia(); // Refresh list
                return response.data;
            }
        } catch (error) {
            message.error('Upload thất bại');
            console.error(error);
        } finally {
            setUploading(false);
        }
        return false;
    };

    const handleSelect = () => {
        if (selectedFile) {
            const url = selectedFile.preview_url || (selectedFile.paths?.original
                ? `/storage/${selectedFile.paths.original}`
                : selectedFile.url);

            onSelect({
                id: selectedFile.id,
                url: url,
                name: selectedFile.original_name,
                type: selectedFile.mime_type,
                width: selectedFile.width,
                height: selectedFile.height
            });
        }
    };

    const getFileIcon = (mimeType) => {
        if (mimeType?.startsWith('image/')) return <PictureOutlined style={{ fontSize: 40, color: '#52c41a' }} />;
        if (mimeType?.startsWith('video/')) return <VideoCameraOutlined style={{ fontSize: 40, color: '#1890ff' }} />;
        return <FileOutlined style={{ fontSize: 40, color: '#faad14' }} />;
    };

    const filterByAcceptTypes = (file) => {
        if (acceptTypes.includes('all')) return true;

        const mimeType = file.mime_type || '';
        if (acceptTypes.includes('image') && mimeType.startsWith('image/')) return true;
        if (acceptTypes.includes('video') && mimeType.startsWith('video/')) return true;
        if (acceptTypes.includes('document') && (mimeType.startsWith('application/') || mimeType.startsWith('text/'))) return true;

        return false;
    };

    const filteredMedia = mediaFiles.filter(filterByAcceptTypes);

    return (
        <Modal
            title="📁 Chọn Media"
            open={visible}
            onCancel={onCancel}
            onOk={handleSelect}
            okText="Chọn"
            cancelText="Hủy"
            width={1000}
            okButtonProps={{ disabled: !selectedFile }}
            bodyStyle={{ height: '70vh', overflowY: 'auto' }}
        >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <Tabs.TabPane tab={<><PictureOutlined /> Thư viện</>} key="browse">
                    {/* Filters */}
                    <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                        <Search
                            placeholder="Tìm media..."
                            style={{ flex: 1 }}
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                            onSearch={fetchMedia}
                            allowClear
                        />
                        <Select
                            style={{ width: 150 }}
                            value={filters.type}
                            onChange={type => setFilters({ ...filters, type })}
                        >
                            <Option value="all">Tất cả</Option>
                            {acceptTypes.includes('image') && <Option value="image">Ảnh</Option>}
                            {acceptTypes.includes('video') && <Option value="video">Video</Option>}
                            {acceptTypes.includes('document') && <Option value="document">Tài liệu</Option>}
                        </Select>
                    </div>

                    {/* Media Grid */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 50 }}>
                            <Spin size="large" />
                        </div>
                    ) : filteredMedia.length === 0 ? (
                        <Empty description="Không có media" />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {filteredMedia.map(file => (
                                <Col span={6} key={file.id}>
                                    <Card
                                        hoverable
                                        className={selectedFile?.id === file.id ? 'media-selected' : ''}
                                        onClick={() => setSelectedFile(file)}
                                        style={{
                                            border: selectedFile?.id === file.id ? '3px solid #1890ff' : '1px solid #d9d9d9',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                        cover={
                                            file.mime_type?.startsWith('image/') ? (
                                                <div style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                                                    <Image
                                                        src={file.preview_url || (file.paths?.webp ? `/storage/${file.paths.webp}` : (file.paths?.original ? `/storage/${file.paths.original}` : file.url))}
                                                        alt={file.original_name}
                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                        preview={false}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                                                    {getFileIcon(file.mime_type)}
                                                </div>
                                            )
                                        }
                                    >
                                        {selectedFile?.id === file.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 5,
                                                right: 5,
                                                background: '#1890ff',
                                                borderRadius: '50%',
                                                width: 28,
                                                height: 28,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <CheckOutlined style={{ color: 'white', fontSize: 14 }} />
                                            </div>
                                        )}
                                        <Card.Meta
                                            title={<div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</div>}
                                            description={
                                                <div style={{ fontSize: 11 }}>
                                                    <div>{(file.size_kb / 1024).toFixed(2)} MB</div>
                                                    {file.width && <div>{file.width}×{file.height}</div>}
                                                </div>
                                            }
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Tabs.TabPane>

                <Tabs.TabPane tab={<><UploadOutlined /> Upload</>} key="upload">
                    <Dragger
                        name="file"
                        multiple={false}
                        customRequest={({ file, onSuccess, onError }) => {
                            handleUpload(file)
                                .then(data => {
                                    if (data) {
                                        onSuccess(data);
                                    } else {
                                        onError(new Error('Upload failed'));
                                    }
                                })
                                .catch(onError);
                        }}
                        accept={acceptTypes.includes('image') ? 'image/*,video/*,application/*' : '*'}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </p>
                        <p className="ant-upload-text">Click hoặc kéo thả file vào đây</p>
                        <p className="ant-upload-hint">
                            Hỗ trợ: Ảnh, Video, Documents
                            <br />
                            <small>File sẽ được tự động phân loại</small>
                        </p>
                    </Dragger>

                    {uploading && (
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <Spin tip="Đang upload..." />
                        </div>
                    )}
                </Tabs.TabPane>
            </Tabs>

            <style>{`
        .media-selected {
          box-shadow: 0 0 0 3px #1890ff40;
        }
      `}</style>
        </Modal>
    );
};

export default MediaPicker;

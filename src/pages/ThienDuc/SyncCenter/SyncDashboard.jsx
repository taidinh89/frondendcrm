import React, { useState, useEffect } from 'react';
import {
    Row,
    Col,
    Card,
    Statistic,
    Button,
    Typography,
    Progress,
    Space,
    Modal,
    message,
    Timeline,
    Tag,
    Divider,
    Input
} from 'antd';
import {
    SyncOutlined,
    RocketOutlined,
    ReloadOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    CloudUploadOutlined
} from '@ant-design/icons';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { thienducApi } from '../../../api/thienducApi';

ChartJS.register(ArcElement, Tooltip, Legend);

const { Title, Text, Paragraph } = Typography;

const SyncDashboard = () => {
    const [stats, setStats] = useState({
        synced: 0,
        mismatch: 0,
        unsynced: 0,
        error: 0,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const resp = await thienducApi.getSyncStats();
            // resp.data is already the 'data' field because of axiosGlobal interceptor
            const data = resp.data;
            if (data && typeof data === 'object') {
                setStats(data);
            } else {
                console.warn('Sync stats data is invalid format:', data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            // Mock data if API not ready
            setStats({
                synced: 4500,
                mismatch: 30,
                unsynced: 120,
                error: 5,
                total: 4655
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeltaSync = async () => {
        Modal.confirm({
            title: 'Xác nhận Đồng bộ Delta',
            content: 'Chỉ đồng bộ những sản phẩm có thay đổi mới nhất từ QVC. Bạn có muốn tiếp tục?',
            okText: 'Bắt đầu',
            cancelText: 'Hủy',
            onOk: async () => {
                setSyncing(true);
                setProgress(0);
                addLog('Đang chuẩn bị danh sách sản phẩm thay đổi...');

                // Simulating progress as per plan "Trả về Response stream / Poll request"
                try {
                    await thienducApi.deltaSync();
                    // Mock progress simulation
                    for (let i = 0; i <= 100; i += 10) {
                        setProgress(i);
                        await new Promise(r => setTimeout(r, 500));
                        if (i === 50) addLog('Đã xử lý 50% dữ liệu...');
                    }
                    addLog('Đồng bộ Delta thành công!');
                    message.success('Đã hoàn thành đồng bộ Delta');
                    fetchStats();
                } catch (error) {
                    addLog('Lỗi trong quá trình đồng bộ!');
                    message.error('Đồng bộ thất bại');
                } finally {
                    setSyncing(false);
                }
            }
        });
    };

    const handleFullSync = () => {
        let confirmText = '';
        Modal.confirm({
            title: 'CẢNH BÁO: ĐỒNG BỘ TOÀN BỘ (FULL SYNC)',
            content: (
                <div>
                    <Paragraph type="danger">Hành động này sẽ gửi yêu cầu cập nhật lại toàn bộ 4000+ sản phẩm lên VPS. Có thể gây nghẽn mạng.</Paragraph>
                    <Paragraph>Vui lòng nhập <Text code>XÁC NHẬN</Text> để tiếp tục:</Paragraph>
                    <Input onChange={e => confirmText = e.target.value} />
                </div>
            ),
            okText: 'Tôi hiểu, bắt đầu Full Sync',
            okType: 'danger',
            onOk: async () => {
                if (confirmText !== 'XÁC NHẬN') {
                    message.error('Vui lòng nhập đúng chữ XÁC NHẬN');
                    return Promise.reject();
                }
                // Logic for Full Sync...
            }
        });
    };

    const addLog = (msg) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 10));
    };

    const chartData = {
        labels: ['Đã khớp', 'Lệch', 'Chưa sync', 'Lỗi'],
        datasets: [
            {
                data: [
                    stats?.synced || 0,
                    stats?.mismatch || 0,
                    stats?.unsynced || 0,
                    stats?.error || 0
                ],
                backgroundColor: ['#52c41a', '#faad14', '#1890ff', '#f5222d'],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Bảng Điều Khiển Đồng Bộ (Sync Center)</Title>

            <Row gutter={[16, 16]}>
                <Col span={16}>
                    <Row gutter={[16, 16]}>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic title="Tổng sản phẩm" value={stats.total} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic title="Đã khớp" value={stats.synced} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic title="Cần đồng bộ" value={stats.mismatch + stats.unsynced} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Statistic title="Lỗi cấu hình" value={stats.error} />
                            </Card>
                        </Col>
                    </Row>

                    <Card title="Trạng thái thực thi" style={{ marginTop: '16px' }}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Progress
                                type="circle"
                                percent={progress}
                                status={syncing ? 'active' : 'normal'}
                                width={120}
                            />
                            <div style={{ marginTop: '16px' }}>
                                <Title level={4}>{syncing ? 'Đang đồng bộ...' : 'Sẵn sàng'}</Title>
                                <Text type="secondary">Tiến độ hiện tại: {progress}/100%</Text>
                            </div>
                        </div>

                        <Space style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<RocketOutlined />}
                                onClick={handleDeltaSync}
                                loading={syncing}
                            >
                                Kích hoạt Delta Sync
                            </Button>
                            <Button
                                danger
                                icon={<CloudUploadOutlined />}
                                onClick={handleFullSync}
                                disabled={syncing}
                            >
                                Full Sync (Lưu ý)
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchStats} disabled={syncing}>
                                Làm mới thống kê
                            </Button>
                        </Space>

                        <Divider orientation="left">Nhật ký hoạt động</Divider>
                        <Timeline>
                            {logs.map((log, i) => (
                                <Timeline.Item key={i} color={i === 0 ? 'blue' : 'gray'}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>[{log.time}]</Text> {log.msg}
                                </Timeline.Item>
                            ))}
                            {logs.length === 0 && <Text type="secondary">Chưa có hoạt động nào...</Text>}
                        </Timeline>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Phân bổ trạng thái">
                        <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                        </div>
                        <div style={{ marginTop: '24px' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span><Tag color="green">Khớp 100%</Tag></span>
                                    <span>{stats?.total > 0 ? ((stats.synced / stats.total) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span><Tag color="orange">Lệch / Chờ sync</Tag></span>
                                    <span>{stats?.total > 0 ? (((stats.mismatch + stats.unsynced) / stats.total) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span><Tag color="red">Lỗi / Thiếu data</Tag></span>
                                    <span>{stats?.total > 0 ? ((stats.error / stats.total) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </Space>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SyncDashboard;

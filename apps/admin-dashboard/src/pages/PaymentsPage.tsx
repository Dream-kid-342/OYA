import React from 'react';
import { Typography, Card, Table, Tag, Space, Button } from 'antd';
import { DollarOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const PaymentsPage: React.FC = () => {
  const columns = [
    { title: 'Receipt No.', dataIndex: 'receipt', key: 'receipt' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val: number) => `KES ${val.toLocaleString()}` },
    { title: 'Method', dataIndex: 'method', key: 'method', render: (val: string) => <Tag color="green">{val}</Tag> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (val: string) => <Tag color={val === 'Success' ? 'blue' : 'red'}>{val}</Tag> },
  ];

  const data = [
    { key: '1', receipt: 'QWE123RTY', customer: 'John Doe', amount: 4500, method: 'MPESA', date: '2026-05-26 10:30', status: 'Success' },
    { key: '2', receipt: 'ASD456FGH', customer: 'Jane Smith', amount: 12000, method: 'MPESA', date: '2026-05-26 09:15', status: 'Success' },
    { key: '3', receipt: 'ZXC789VBN', customer: 'Alice Johnson', amount: 8500, method: 'MPESA', date: '2026-05-25 16:45', status: 'Failed' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}>💸 Payments & Collections</Title>
          <Text type="secondary">Track incoming payments and reconcile transactions.</Text>
        </div>
        <Space>
          <Button icon={<SyncOutlined />}>Refresh</Button>
          <Button type="primary" icon={<DownloadOutlined />} style={{ background: '#4A2E13' }}>Export CSV</Button>
        </Space>
      </div>

      <Card className="stat-card">
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
};

export default PaymentsPage;

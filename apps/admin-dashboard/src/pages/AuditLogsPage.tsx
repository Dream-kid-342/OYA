import React from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import { AuditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AuditLogsPage: React.FC = () => {
  const columns = [
    { title: 'Timestamp', dataIndex: 'time', key: 'time' },
    { title: 'Actor', dataIndex: 'actor', key: 'actor' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (val: string) => <Tag color="purple">{val}</Tag> },
    { title: 'Resource', dataIndex: 'resource', key: 'resource' },
    { title: 'IP Address', dataIndex: 'ip', key: 'ip' },
  ];

  const data = [
    { key: '1', time: '2026-05-26 11:30:00', actor: 'Super Admin', action: 'APPROVE_LOAN', resource: 'Loan #1042', ip: '192.168.1.10' },
    { key: '2', time: '2026-05-26 11:15:22', actor: 'System', action: 'APPLY_PENALTY', resource: 'Loan #998', ip: '127.0.0.1' },
    { key: '3', time: '2026-05-26 10:45:00', actor: 'Finance Admin', action: 'EXPORT_REPORT', resource: 'Monthly Revenue', ip: '192.168.1.15' },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}><AuditOutlined /> Audit Logs</Title>
        <Text type="secondary">Monitor all administrative and system actions for compliance.</Text>
      </div>

      <Card className="stat-card">
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 15 }} size="small" />
      </Card>
    </div>
  );
};

export default AuditLogsPage;

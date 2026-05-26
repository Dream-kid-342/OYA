import React from 'react';
import { Typography, Card, List, Avatar, Button, Space, Tag } from 'antd';
import { BellOutlined, WarningOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const NotificationsPage: React.FC = () => {
  const data = [
    { type: 'warning', title: 'High Default Risk Detected', desc: 'Loan #1042 has missed 3 consecutive payments.', time: '10 mins ago' },
    { type: 'info', title: 'New Registration Spike', desc: '50 new users registered in the last hour.', time: '1 hour ago' },
    { type: 'success', title: 'System Backup Complete', desc: 'Database backup finished successfully.', time: '5 hours ago' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}><BellOutlined /> Notifications Inbox</Title>
          <Text type="secondary">System alerts and manual intervention requests.</Text>
        </div>
        <Button>Mark all as read</Button>
      </div>

      <Card className="stat-card">
        <List
          itemLayout="horizontal"
          dataSource={data}
          renderItem={(item) => (
            <List.Item actions={[<a key="view">View Details</a>]}>
              <List.Item.Meta
                avatar={
                  <Avatar style={{ 
                    backgroundColor: item.type === 'warning' ? '#ffebee' : item.type === 'info' ? '#e3f2fd' : '#e8f5e9',
                    color: item.type === 'warning' ? '#c62828' : item.type === 'info' ? '#1565c0' : '#2e7d32'
                  }}>
                    {item.type === 'warning' ? <WarningOutlined /> : item.type === 'info' ? <InfoCircleOutlined /> : <CheckCircleOutlined />}
                  </Avatar>
                }
                title={<span style={{ fontFamily: 'Poppins', fontWeight: 600 }}>{item.title}</span>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text>{item.desc}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default NotificationsPage;

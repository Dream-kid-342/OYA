import React from 'react';
import { Typography, Card, Row, Col, Progress, Statistic } from 'antd';
import { HeartOutlined, DatabaseOutlined, CloudServerOutlined, ApiOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SystemHealthPage: React.FC = () => {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}><HeartOutlined /> System Health</Title>
        <Text type="secondary">Real-time monitoring of microservices and infrastructure.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card className="stat-card">
            <Statistic title="API Gateway" value="99.9%" suffix="Uptime" prefix={<ApiOutlined />} valueStyle={{ color: '#2E7D32' }} />
            <Progress percent={100} status="success" showInfo={false} style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card className="stat-card">
            <Statistic title="PostgreSQL DB" value="45" suffix="ms" prefix={<DatabaseOutlined />} valueStyle={{ color: '#F9A825' }} />
            <Progress percent={45} status="normal" showInfo={false} style={{ marginTop: 16 }} strokeColor="#F9A825" />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card className="stat-card">
            <Statistic title="Redis Cache" value="12" suffix="ms" prefix={<CloudServerOutlined />} valueStyle={{ color: '#2E7D32' }} />
            <Progress percent={12} status="success" showInfo={false} style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card className="stat-card">
            <Statistic title="Notification Worker" value="Healthy" valueStyle={{ color: '#2E7D32' }} />
            <Progress percent={100} status="success" showInfo={false} style={{ marginTop: 16 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemHealthPage;

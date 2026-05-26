import React from 'react';
import { Typography, Card, Row, Col, Statistic, Button } from 'antd';
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ReportsPage: React.FC = () => {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}>📈 Reports & Analytics</Title>
        <Text type="secondary">Generate and download comprehensive system reports.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="stat-card" actions={[<Button type="link" icon={<DownloadOutlined />}>Download PDF</Button>]}>
            <Statistic title="Portfolio at Risk (PAR 30)" value="4.2%" valueStyle={{ color: '#C62828' }} prefix={<BarChartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="stat-card" actions={[<Button type="link" icon={<DownloadOutlined />}>Download CSV</Button>]}>
            <Statistic title="Monthly Revenue" value={3450000} prefix="KES " valueStyle={{ color: '#2E7D32' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="stat-card" actions={[<Button type="link" icon={<DownloadOutlined />}>Download Report</Button>]}>
            <Statistic title="Total Disbursements" value={12500000} prefix="KES " valueStyle={{ color: '#1565C0' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportsPage;

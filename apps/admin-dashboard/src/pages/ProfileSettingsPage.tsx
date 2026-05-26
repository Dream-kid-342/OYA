import React from 'react';
import { Typography, Card, Form, Input, Button, Switch, Divider } from 'antd';
import { UserOutlined, SettingOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/auth.store';

const { Title, Text } = Typography;

const ProfileSettingsPage: React.FC = () => {
  const { admin } = useAuthStore();

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}><SettingOutlined /> Profile & Settings</Title>
        <Text type="secondary">Manage your admin account and preferences.</Text>
      </div>

      <Card className="stat-card" title={<span style={{ fontFamily: 'Poppins' }}><UserOutlined /> Personal Information</span>}>
        <Form layout="vertical" initialValues={{ fullName: admin?.fullName, email: admin?.email }}>
          <Form.Item label="Full Name" name="fullName">
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Email Address" name="email">
            <Input size="large" disabled />
          </Form.Item>
          <Button type="primary" style={{ background: '#4A2E13' }}>Save Changes</Button>
        </Form>
      </Card>

      <Card className="stat-card" style={{ marginTop: 24 }} title={<span style={{ fontFamily: 'Poppins' }}><LockOutlined /> Security</span>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'Poppins' }}>Two-Factor Authentication (2FA)</div>
            <Text type="secondary">Require an OTP when logging in from a new device.</Text>
          </div>
          <Switch defaultChecked />
        </div>
        <Divider />
        <Button danger type="primary">Change Password</Button>
      </Card>
    </div>
  );
};

export default ProfileSettingsPage;

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Card, Typography } from 'antd';
import { LockOutlined, PhoneOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/admin/auth/login', values);
      setAuth(data.data.accessToken, data.data.admin);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAD2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img
            src="https://oyamicrocredit.co.ke/images/OYA-Microcredit_LOGO-KENYA.png"
            alt="OYA Micro-Credit Logo"
            style={{ height: 56, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <Title level={4} style={{ color: '#4A2E13', marginTop: 16, marginBottom: 4, fontFamily: 'Poppins' }}>
            Admin Portal
          </Title>
          <Text style={{ color: 'rgba(74,46,19,0.7)', fontSize: 13 }}>
            OYA Micro-Credit Company Limited
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: 'none',
          }}
          bodyStyle={{ padding: '36px 32px' }}
        >
          <Title level={4} style={{ marginBottom: 8, fontFamily: 'Poppins', color: '#4A2E13' }}>
            Sign in to Dashboard
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 28, fontSize: 13 }}>
            Enter your admin credentials to continue
          </Text>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          <Form
            name="admin-login"
            layout="vertical"
            onFinish={onFinish}
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label={<span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 13 }}>Email Address</span>}
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input
                id="admin-email"
                prefix={<PhoneOutlined style={{ color: '#9e9e9e' }} />}
                placeholder="admin@oyamicrocredit.co.ke"
                autoComplete="username"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 13 }}>Password</span>}
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                id="admin-password"
                prefix={<LockOutlined style={{ color: '#9e9e9e' }} />}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ borderRadius: 8 }}
                iconRender={(visible) => visible ? <EyeTwoTone twoToneColor="#4A2E13" /> : <EyeInvisibleOutlined />}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                id="admin-login-btn"
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  borderRadius: 8,
                  fontFamily: 'Poppins',
                  fontWeight: 600,
                  fontSize: 15,
                  background: '#4A2E13',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(74,46,19,0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ marginTop: 24, padding: '16px', background: '#F5F5F5', borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: '#9e9e9e', display: 'block', textAlign: 'center' }}>
              🔒 Secured connection · Audit logged · Role-based access
            </Text>
          </div>
        </Card>

        <Text style={{ display: 'block', textAlign: 'center', marginTop: 24, color: 'rgba(74,46,19,0.5)', fontSize: 12 }}>
          OYA Micro-Credit Company Limited · CBK No-Objection: BSD/GEN/62
        </Text>
      </div>
    </div>
  );
};

export default LoginPage;

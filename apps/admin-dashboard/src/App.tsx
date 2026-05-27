import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Badge } from 'antd';
import {
  DashboardOutlined, TeamOutlined, FileTextOutlined, DollarOutlined,
  BarChartOutlined, AuditOutlined, BellOutlined, HeartOutlined,
  LogoutOutlined, UserOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import OverviewDashboard from './pages/OverviewDashboard';
import CustomersPage from './pages/CustomersPage';
import LoansPage from './pages/LoansPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import NotificationsPage from './pages/NotificationsPage';
import SystemHealthPage from './pages/SystemHealthPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import api from './api/client';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

// ─── Protected Route ──────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// ─── Admin Layout ─────────────────────────────────────────
function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed:', e);
    }
    clearAuth();
    navigate('/login');
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
    { key: '/customers', icon: <TeamOutlined />, label: 'Customers' },
    { key: '/loans', icon: <FileTextOutlined />, label: 'Loans' },
    { key: '/payments', icon: <DollarOutlined />, label: 'Payments' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
    { key: '/audit-logs', icon: <AuditOutlined />, label: 'Audit Logs' },
    { key: '/notifications', icon: <BellOutlined />, label: 'Notifications' },
    { key: '/system-health', icon: <HeartOutlined />, label: 'System Health' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        style={{
          background: '#4A2E13',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'auto',
        }}
      >
        {/* Logo */}
        <div className="oya-logo" style={{ padding: '20px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img
            src="/logo.png"
            alt="OYA Logo"
            style={{ height: 32, filter: 'brightness(0) invert(1)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <span style={{ color: '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, display: 'block' }}>OYA Micro-Credit</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Admin Portal</span>
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ background: 'transparent', marginTop: 8, border: 'none' }}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key),
          }))}
        />

        {/* Admin info at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} style={{ background: '#FAFAD2', color: '#4A2E13', fontWeight: 700, fontFamily: 'Poppins' }}>
              {admin?.fullName?.charAt(0)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 12, fontFamily: 'Poppins', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.fullName}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{admin?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 240 }}>
        {/* Header */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="OYA" style={{ height: 28 }} />
            <Text style={{ fontFamily: 'Poppins', fontWeight: 600, color: '#4A2E13', fontSize: 15 }}>
              OYA Micro-Credit — Admin Dashboard
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={5} style={{ background: '#C62828' }}>
              <BellOutlined style={{ fontSize: 18, color: '#616161', cursor: 'pointer' }} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: 'My Profile', onClick: () => navigate('/profile') },
                  { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => navigate('/settings') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: handleLogout },
                ],
              }}
              trigger={['click']}
            >
              <Avatar
                style={{ background: '#4A2E13', color: '#FAFAD2', cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 700 }}
              >
                {admin?.fullName?.charAt(0)}
              </Avatar>
            </Dropdown>
          </div>
        </Header>

        {/* Main content */}
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

// ─── App ──────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<OverviewDashboard />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/loans" element={<LoansPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/system-health" element={<SystemHealthPage />} />
                  <Route path="/profile" element={<ProfileSettingsPage />} />
                  <Route path="/settings" element={<ProfileSettingsPage />} />
                  {/* Additional routes use lazy loading in production */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AdminLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Alert } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, ClockCircleOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/client';

const { Title, Text } = Typography;

const COLORS = ['#2E7D32', '#F9A825', '#C62828', '#1565C0', '#6A1B9A'];

interface DashboardStats {
  totalActiveLoans: { count: number; amount: number };
  disbursedToday: number;
  collectedToday: number;
  overdueLoans: { count: number; amount: number };
  pendingApproval: number;
  newRegistrationsToday: number;
  weeklyCollections: Array<{ week: string; thisWeek: number; lastWeek: number }>;
  monthlyDisbursements: Array<{ month: string; amount: number }>;
  loanStatusDistribution: Array<{ name: string; value: number }>;
}

const StatCard: React.FC<{
  title: string; value: string | number; prefix?: string;
  trend?: 'up' | 'down'; icon?: React.ReactNode; color?: string;
}> = ({ title, value, prefix, trend, icon, color = '#2E7D32' }) => (
  <Card className="stat-card" style={{ height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text style={{ fontSize: 12, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Poppins', fontWeight: 500 }}>
          {title}
        </Text>
        <div style={{ marginTop: 8 }}>
          <span className="stat-value" style={{ color }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>
      </div>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>
          {icon}
        </div>
      )}
    </div>
    {trend && (
      <div style={{ marginTop: 12 }}>
        {trend === 'up'
          ? <Text style={{ color: '#2E7D32', fontSize: 12 }}><ArrowUpOutlined /> vs yesterday</Text>
          : <Text style={{ color: '#C62828', fontSize: 12 }}><ArrowDownOutlined /> vs yesterday</Text>
        }
      </div>
    )}
  </Card>
);

const OverviewDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Lazy load — not on initial page load
        const { data } = await api.get('/admin/dashboard/stats');
        setStats(data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
      <Spin size="large" tip="Loading dashboard..." />
    </div>
  );

  if (error) return <Alert message={error} type="error" showIcon />;

  const activeStats: DashboardStats = stats || {
    totalActiveLoans: { count: 0, amount: 0 },
    disbursedToday: 0,
    collectedToday: 0,
    overdueLoans: { count: 0, amount: 0 },
    pendingApproval: 0,
    newRegistrationsToday: 0,
    weeklyCollections: [],
    monthlyDisbursements: [],
    loanStatusDistribution: [],
  };

  return (
    <div>
      <div className="page-header">
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}>📊 Overview Dashboard</Title>
        <Text type="secondary">Real-time portfolio metrics · Last updated just now</Text>
      </div>

      {/* ─── Key Metrics ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Active Loans"
            value={activeStats.totalActiveLoans.count}
            icon={<CheckCircleOutlined />}
            color="#2E7D32"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Portfolio Value"
            value={`KES ${(activeStats.totalActiveLoans.amount / 1000000).toFixed(1)}M`}
            icon={<ArrowUpOutlined />}
            color="#1565C0"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Collected Today"
            value={activeStats.collectedToday}
            prefix="KES "
            icon={<CheckCircleOutlined />}
            color="#388E3C"
            trend="up"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Disbursed Today"
            value={activeStats.disbursedToday}
            prefix="KES "
            icon={<ArrowUpOutlined />}
            color="#F9A825"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Overdue Loans"
            value={activeStats.overdueLoans.count}
            icon={<ExclamationCircleOutlined />}
            color="#C62828"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="Pending Approval"
            value={activeStats.pendingApproval}
            icon={<ClockCircleOutlined />}
            color="#F57F17"
          />
        </Col>
      </Row>

      {/* ─── Charts ─── */}
      <Row gutter={[16, 16]}>
        {/* Weekly collections bar chart */}
        <Col xs={24} lg={12}>
          <Card
            className="stat-card"
            title={<span style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Collections — This Week vs Last Week</span>}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={activeStats.weeklyCollections} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fontFamily: 'Inter' }} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="thisWeek" name="This Week" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastWeek" name="Last Week" fill="#A5D6A7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Monthly disbursements line chart */}
        <Col xs={24} lg={12}>
          <Card
            className="stat-card"
            title={<span style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Monthly Disbursements (KES)</span>}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={activeStats.monthlyDisbursements}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Inter' }} />
                <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Disbursed']} />
                <Line type="monotone" dataKey="amount" stroke="#2E7D32" strokeWidth={2.5} dot={{ fill: '#2E7D32', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Loan status pie chart */}
        <Col xs={24} lg={8}>
          <Card
            className="stat-card"
            title={<span style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Loan Status Distribution</span>}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={activeStats.loanStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                >
                  {activeStats.loanStatusDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* New registrations today */}
        <Col xs={24} lg={4}>
          <Card className="stat-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#2E7D32', fontFamily: 'Poppins' }}>
                {activeStats.newRegistrationsToday}
              </div>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                New clients today
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewDashboard;

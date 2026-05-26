import React, { useEffect, useState } from 'react';
import { Table, Input, Select, Button, Tag, Space, Typography, Card, Drawer, Descriptions, Avatar, Tabs, Timeline } from 'antd';
import { SearchOutlined, StopOutlined, CheckCircleOutlined, LogoutOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../api/client';

const { Title, Text } = Typography;
const { Search } = Input;

interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  createdAt: string;
  kycStatus: string;
  status: string;
  businessName: string;
  businessLocation: string;
  activeLoan?: { referenceNumber: string; status: string; balanceRemaining: number };
}

const KYC_COLORS: Record<string, string> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'success',
  SUSPENDED: 'error',
  DELETED: 'default',
};

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/customers', {
        params: { page, limit: 20, search, kycStatus: kycFilter, status: statusFilter },
      });
      setCustomers(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [page, search, kycFilter, statusFilter]);

  const handleAction = async (customerId: string, action: 'suspend' | 'unsuspend' | 'force-logout') => {
    try {
      await api.post(`/admin/customers/${customerId}/${action}`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar style={{ background: '#2E7D32', fontFamily: 'Poppins', fontWeight: 600 }}>
            {r.fullName.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'Poppins', fontSize: 14 }}>{r.fullName}</div>
            <div style={{ fontSize: 12, color: '#9e9e9e' }}>{r.businessName}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phone',
      render: (v) => <Text copyable={{ text: v }}>{v}</Text>,
    },
    {
      title: 'National ID',
      dataIndex: 'nationalId',
      key: 'id',
      render: (v) => `**${v.slice(-4)}`,
    },
    {
      title: 'KYC Status',
      dataIndex: 'kycStatus',
      key: 'kyc',
      render: (v) => <Tag color={KYC_COLORS[v] || 'default'}>{v}</Tag>,
      filters: [
        { text: 'Verified', value: 'VERIFIED' },
        { text: 'Pending', value: 'PENDING' },
        { text: 'Rejected', value: 'REJECTED' },
      ],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Active Loan',
      key: 'loan',
      render: (_, r) => r.activeLoan
        ? <Tag color="blue">{r.activeLoan.referenceNumber}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      key: 'date',
      render: (v) => new Date(v).toLocaleDateString('en-KE'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            id={`view-customer-${r.id}`}
            icon={<EyeOutlined />}
            size="small"
            onClick={() => { setSelected(r); setDrawerOpen(true); }}
          >
            View
          </Button>
          {r.status === 'ACTIVE' ? (
            <Button
              id={`suspend-customer-${r.id}`}
              icon={<StopOutlined />}
              size="small"
              danger
              onClick={() => handleAction(r.id, 'suspend')}
            >
              Suspend
            </Button>
          ) : (
            <Button
              id={`unsuspend-customer-${r.id}`}
              icon={<CheckCircleOutlined />}
              size="small"
              style={{ color: '#2E7D32', borderColor: '#2E7D32' }}
              onClick={() => handleAction(r.id, 'unsuspend')}
            >
              Unsuspend
            </Button>
          )}
          <Button
            id={`logout-customer-${r.id}`}
            icon={<LogoutOutlined />}
            size="small"
            onClick={() => handleAction(r.id, 'force-logout')}
          >
            Force Logout
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}>👥 Customer Management</Title>
        <Text type="secondary">Manage and monitor all registered clients</Text>
      </div>

      {/* Filters */}
      <Card className="stat-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Search
            id="customer-search"
            placeholder="Search by name, phone, or ID..."
            allowClear
            style={{ width: 280 }}
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
            prefix={<SearchOutlined />}
          />
          <Select
            id="kyc-filter"
            placeholder="KYC Status"
            allowClear
            style={{ width: 160 }}
            onChange={setKycFilter}
            options={[
              { value: 'VERIFIED', label: 'Verified' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          <Select
            id="status-filter"
            placeholder="Account Status"
            allowClear
            style={{ width: 160 }}
            onChange={setStatusFilter}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
          <Text type="secondary" style={{ lineHeight: '32px' }}>
            {total.toLocaleString()} customers
          </Text>
        </div>
      </Card>

      <Card className="stat-card">
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `${t} customers`,
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Customer Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar size={40} style={{ background: '#2E7D32', fontFamily: 'Poppins', fontWeight: 700 }}>
              {selected?.fullName?.charAt(0)}
            </Avatar>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 16 }}>{selected?.fullName}</div>
              <div style={{ fontSize: 12, color: '#9e9e9e' }}>{selected?.phoneNumber}</div>
            </div>
          </div>
        }
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selected && (
          <Tabs
            items={[
              {
                key: 'personal',
                label: 'Profile',
                children: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Full Name">{selected.fullName}</Descriptions.Item>
                    <Descriptions.Item label="National ID">**{selected.nationalId.slice(-4)}</Descriptions.Item>
                    <Descriptions.Item label="Phone">{selected.phoneNumber}</Descriptions.Item>
                    <Descriptions.Item label="Business">{selected.businessName}</Descriptions.Item>
                    <Descriptions.Item label="Location">{selected.businessLocation}</Descriptions.Item>
                    <Descriptions.Item label="KYC Status">
                      <Tag color={KYC_COLORS[selected.kycStatus]}>{selected.kycStatus}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Account Status">
                      <Tag color={STATUS_COLORS[selected.status]}>{selected.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Registered">
                      {new Date(selected.createdAt).toLocaleString('en-KE')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'loans',
                label: 'Loans',
                children: selected.activeLoan
                  ? (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="Reference">{selected.activeLoan.referenceNumber}</Descriptions.Item>
                      <Descriptions.Item label="Status">{selected.activeLoan.status}</Descriptions.Item>
                      <Descriptions.Item label="Balance Remaining">
                        KES {selected.activeLoan.balanceRemaining?.toLocaleString()}
                      </Descriptions.Item>
                    </Descriptions>
                  )
                  : <Text type="secondary">No active loan</Text>,
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
};

export default CustomersPage;

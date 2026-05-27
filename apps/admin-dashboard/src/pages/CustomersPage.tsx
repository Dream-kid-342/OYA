import React, { useEffect, useState } from 'react';
import { Table, Input, Select, Button, Tag, Space, Typography, Card, Drawer, Descriptions, Avatar, Tabs, Timeline, Modal, Form } from 'antd';
import { SearchOutlined, StopOutlined, CheckCircleOutlined, LogoutOutlined, EyeOutlined, MessageOutlined, DeleteOutlined } from '@ant-design/icons';
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
  isOnline?: boolean;
  businessName: string;
  businessLocation: string;
  activeLoan?: { referenceNumber: string; status: string; balanceRemaining: number };
}

interface DetailedCustomer extends Customer {
  dateOfBirth?: string;
  gender?: string;
  businessType?: string;
  businessDescription?: string;
  loans: any[];
  repayments: any[];
  sessions: any[];
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
  const [detailedCustomer, setDetailedCustomer] = useState<DetailedCustomer | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [form] = Form.useForm();

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

  const handleAction = async (customerId: string, action: 'suspend' | 'unsuspend' | 'force-logout' | 'terminate' | 'reactivate' | 'erase') => {
    try {
      if (action === 'erase') {
        await api.delete(`/admin/customers/${customerId}/erase`);
      } else {
        await api.post(`/admin/customers/${customerId}/${action}`);
      }
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
          <div style={{ position: 'relative' }}>
            <Avatar style={{ background: '#2E7D32', fontFamily: 'Poppins', fontWeight: 600 }}>
              {r.fullName.charAt(0)}
            </Avatar>
            {r.isOnline && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                borderRadius: '50%', background: '#52c41a', border: '2px solid white'
              }} title="Online" />
            )}
          </div>
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
            onClick={async () => {
              setSelected(r);
              setDrawerOpen(true);
              setDrawerLoading(true);
              try {
                const res = await api.get(`/admin/customers/${r.id}`);
                setDetailedCustomer(res.data.data);
              } catch (e) {
                console.error(e);
              } finally {
                setDrawerLoading(false);
              }
            }}
          >
            View
          </Button>
          <Button
            id={`message-customer-${r.id}`}
            icon={<MessageOutlined />}
            size="small"
            onClick={() => { setSelected(r); setMessageModalOpen(true); }}
          >
            Message
          </Button>
          {r.status === 'ACTIVE' && (
            <Button
              id={`suspend-customer-${r.id}`}
              icon={<StopOutlined />}
              size="small"
              danger
              onClick={() => handleAction(r.id, 'suspend')}
            >
              Suspend
            </Button>
          )}
          {r.status === 'SUSPENDED' && (
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
          {r.status !== 'DELETED' && (
            <Button
              id={`terminate-customer-${r.id}`}
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => {
                if (window.confirm('Are you sure you want to terminate this user? This cannot be undone directly (requires reactivation).')) {
                  handleAction(r.id, 'terminate');
                }
              }}
            >
              Terminate
            </Button>
          )}
          {r.status === 'DELETED' && (
            <>
              <Button
                id={`reactivate-customer-${r.id}`}
                icon={<CheckCircleOutlined />}
                size="small"
                style={{ color: '#2E7D32', borderColor: '#2E7D32' }}
                onClick={() => handleAction(r.id, 'reactivate')}
              >
                Reactivate
              </Button>
              <Button
                id={`erase-customer-${r.id}`}
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={() => {
                  if (window.confirm('CRITICAL WARNING: Are you sure you want to PERMANENTLY ERASE this user? All their loans, payments, and data will be destroyed. This allows them to register again with the same number.')) {
                    handleAction(r.id, 'erase');
                  }
                }}
              >
                Erase (Hard Delete)
              </Button>
            </>
          )}
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
              <div style={{ fontSize: 12, color: '#9e9e9e' }}>Customer 360° Profile</div>
            </div>
          </div>
        }
        width={700}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetailedCustomer(null); }}
      >
        {drawerLoading ? (
          <div style={{ textAlign: 'center', marginTop: 50 }}>Loading full customer history...</div>
        ) : detailedCustomer ? (
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Profile & Business" key="1">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Full Name">{detailedCustomer.fullName}</Descriptions.Item>
                <Descriptions.Item label="Phone">{detailedCustomer.phoneNumber}</Descriptions.Item>
                <Descriptions.Item label="National ID">{detailedCustomer.nationalId}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">{detailedCustomer.dateOfBirth ? new Date(detailedCustomer.dateOfBirth).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{detailedCustomer.gender || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="KYC Status">
                  <Tag color={detailedCustomer.kycStatus === 'VERIFIED' ? 'green' : 'orange'}>{detailedCustomer.kycStatus}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Account Status">
                  <Tag color={detailedCustomer.status === 'ACTIVE' ? 'green' : 'red'}>{detailedCustomer.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Business Name">{detailedCustomer.businessName || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Business Type">{detailedCustomer.businessType || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Location">{detailedCustomer.businessLocation || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Description">{detailedCustomer.businessDescription || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>
            <Tabs.TabPane tab="Loan History" key="2">
              <Table 
                dataSource={detailedCustomer.loans} 
                rowKey="id" 
                size="small"
                pagination={false}
                scroll={{ x: 600 }}
                columns={[
                  { title: 'Ref', dataIndex: 'referenceNumber', key: 'ref' },
                  { title: 'Principal', dataIndex: 'principalAmount', key: 'principal', render: (val) => `KES ${val}` },
                  { title: 'Balance', dataIndex: 'balanceRemaining', key: 'balance', render: (val) => `KES ${val}` },
                  { title: 'Repaid', dataIndex: 'totalRepaid', key: 'repaid', render: (val) => `KES ${val}` },
                  { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag>{val}</Tag> },
                  { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (val) => new Date(val).toLocaleDateString() },
                ]}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Repayments Ledger" key="3">
              <Table 
                dataSource={detailedCustomer.repayments} 
                rowKey="id" 
                size="small"
                pagination={false}
                columns={[
                  { title: 'Date', dataIndex: 'transactionDate', key: 'date', render: (val) => new Date(val).toLocaleDateString() },
                  { title: 'Receipt No.', dataIndex: 'mpesaReceiptNumber', key: 'receipt' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>KES {val}</span> },
                  { title: 'Channel', dataIndex: 'paymentMethod', key: 'channel' },
                ]}
              />
            </Tabs.TabPane>
          </Tabs>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 50 }}>Select a customer to view details</div>
        )}
      </Drawer>

      {/* Message Modal */}
      <Modal
        title={`Message ${selected?.fullName}`}
        open={messageModalOpen}
        onCancel={() => { setMessageModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Send Message"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!selected) return;
            try {
              await api.post(`/admin/customers/${selected.id}/message`, values);
              setMessageModalOpen(false);
              form.resetFields();
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <Form.Item name="channel" label="Delivery Channel" initialValue="PUSH" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Push Notification', value: 'PUSH' },
              { label: 'SMS Message', value: 'SMS' },
              { label: 'Email', value: 'EMAIL' }
            ]} />
          </Form.Item>
          <Form.Item name="title" label="Title (For Push/Email)" rules={[{ required: true }]}>
            <Input placeholder="Message subject or title" />
          </Form.Item>
          <Form.Item name="body" label="Message Body" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Type your message here..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomersPage;

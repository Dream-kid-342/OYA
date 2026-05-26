import React, { useEffect, useState } from 'react';
import { Table, Select, Button, Tag, Space, Typography, Card, Modal, Form, Input, DatePicker, Popconfirm, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, DollarOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Loan {
  id: string;
  referenceNumber: string;
  user: { fullName: string; phoneNumber: string };
  principalAmount: number;
  totalAmount: number;
  balanceRemaining: number;
  status: string;
  createdAt: string;
  disbursementDate?: string;
  purpose: string;
  numberOfWeeks: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'blue', KYC_REVIEW: 'orange',
  CREDIT_REVIEW: 'purple', APPROVED: 'cyan', DISBURSED: 'green',
  ACTIVE: 'success', CLOSED: 'default', REJECTED: 'error', DEFAULTED: 'error',
};

const LoansPage: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; loanId: string | null }>({ open: false, loanId: null });
  const [rejectReason, setRejectReason] = useState('');
  const admin = useAuthStore((s) => s.admin);
  const navigate = useNavigate();

  const canApprove = admin?.role === 'SUPER_ADMIN' || admin?.role === 'LOAN_OFFICER';

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/loans', {
        params: { page, limit: 20, status: statusFilter },
      });
      setLoans(data.data);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [page, statusFilter]);

  const handleApprove = async (loanId: string) => {
    try {
      await api.post(`/admin/loans/${loanId}/approve`);
      fetchLoans();
    } catch (err: any) {
      Modal.error({ title: 'Error', content: err.response?.data?.message || 'Failed to approve loan' });
    }
  };

  const handleReject = async () => {
    if (!rejectModal.loanId || !rejectReason.trim()) return;
    try {
      await api.post(`/admin/loans/${rejectModal.loanId}/reject`, { reason: rejectReason });
      setRejectModal({ open: false, loanId: null });
      setRejectReason('');
      fetchLoans();
    } catch (err: any) {
      Modal.error({ title: 'Error', content: err.response?.data?.message || 'Failed to reject loan' });
    }
  };

  const handleDisburse = async (loanId: string) => {
    try {
      await api.post(`/admin/loans/${loanId}/disburse`);
      fetchLoans();
    } catch (err: any) {
      Modal.error({ title: 'Error', content: err.response?.data?.message });
    }
  };

  const columns: ColumnsType<Loan> = [
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'ref',
      render: (v, r) => (
        <Button type="link" style={{ padding: 0, fontFamily: 'Poppins', fontWeight: 600 }}
          onClick={() => navigate(`/loans/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.user?.fullName}</div>
          <div style={{ fontSize: 12, color: '#9e9e9e' }}>{r.user?.phoneNumber}</div>
        </div>
      ),
    },
    {
      title: 'Principal',
      dataIndex: 'principalAmount',
      key: 'principal',
      render: (v) => `KES ${parseFloat(v).toLocaleString()}`,
      sorter: true,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceRemaining',
      key: 'balance',
      render: (v) => `KES ${parseFloat(v || 0).toLocaleString()}`,
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (v) => v?.replace('_', ' '),
    },
    {
      title: 'Weeks',
      dataIndex: 'numberOfWeeks',
      key: 'weeks',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
      filters: Object.keys(STATUS_COLORS).map((s) => ({ text: s, value: s })),
    },
    {
      title: 'Applied',
      dataIndex: 'createdAt',
      key: 'date',
      render: (v) => new Date(v).toLocaleDateString('en-KE'),
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="View details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/loans/${r.id}`)} />
          </Tooltip>
          {canApprove && r.status === 'CREDIT_REVIEW' && (
            <>
              <Popconfirm title="Approve this loan?" onConfirm={() => handleApprove(r.id)} okText="Approve" okButtonProps={{ style: { background: '#2E7D32' } }}>
                <Button id={`approve-loan-${r.id}`} size="small" icon={<CheckOutlined />} style={{ color: '#2E7D32', borderColor: '#2E7D32' }}>
                  Approve
                </Button>
              </Popconfirm>
              <Button id={`reject-loan-${r.id}`} size="small" icon={<CloseOutlined />} danger
                onClick={() => setRejectModal({ open: true, loanId: r.id })}>
                Reject
              </Button>
            </>
          )}
          {canApprove && r.status === 'APPROVED' && (
            <Popconfirm title="Disburse this loan via M-Pesa?" onConfirm={() => handleDisburse(r.id)} okText="Disburse">
              <Button id={`disburse-loan-${r.id}`} size="small" icon={<DollarOutlined />} type="primary">
                Disburse
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3} style={{ fontFamily: 'Poppins', margin: 0 }}>📋 Loan Management</Title>
        <Text type="secondary">Review, approve, and manage all loan applications</Text>
      </div>

      <Card className="stat-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            id="loan-status-filter"
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            onChange={setStatusFilter}
            options={Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s.replace('_', ' ') }))}
          />
          <RangePicker style={{ borderRadius: 8 }} />
          <Text type="secondary" style={{ lineHeight: '32px' }}>{total.toLocaleString()} loans</Text>
        </div>
      </Card>

      <Card className="stat-card">
        <Table
          columns={columns}
          dataSource={loans}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

      {/* Reject Modal */}
      <Modal
        title={<span style={{ fontFamily: 'Poppins' }}><ExclamationCircleOutlined style={{ color: '#C62828', marginRight: 8 }} />Reject Loan Application</span>}
        open={rejectModal.open}
        onCancel={() => setRejectModal({ open: false, loanId: null })}
        onOk={handleReject}
        okText="Reject Loan"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
      >
        <p style={{ marginBottom: 12 }}>Please provide a reason for rejection. This will be sent to the client.</p>
        <Input.TextArea
          id="rejection-reason"
          rows={4}
          placeholder="e.g., Insufficient business revenue documentation..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
};

export default LoansPage;

import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import styles from './AdminRequests.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import RequestModal from "../../components/modals/RequestModal"
import Pagination from '../../components/Pagination/Pagination';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';

interface EquipmentRequest {
  id: string;
  userId: string;
  userFullName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: string;
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  reviewedAtUtc: string | null;
  checkedOutAtUtc: string | null;
  returnedAtUtc: string | null;
  adminComment: string | null;
  returnConditionNotes: string | null;
}

const STATUS_OPTIONS: { value: string; label: string; color: string; icon: string }[] = [
  { value: 'Pending',    label: 'Pending',     color: '#ff9800', icon: 'hourglass_empty' },
  { value: 'Approved',   label: 'Approved',    color: '#4caf50', icon: 'check_circle' },
  { value: 'CheckedOut', label: 'Checked Out', color: '#1976d2', icon: 'sync_alt' },
  { value: 'Returned',   label: 'Returned',    color: '#9c27b0', icon: 'assignment_return' },
  { value: 'Rejected',   label: 'Rejected',    color: '#f44336', icon: 'cancel' },
  { value: 'Overdue',    label: 'Overdue',     color: '#ff9800', icon: 'warning' },
  { value: 'Cancelled',  label: 'Cancelled',   color: '#9e9e9e', icon: 'block' },
];

const AdminRequests = () => {
  const { loading: authLoading } = useAdminGuard();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  const [selectedRequest, setSelectedRequest] = useState<EquipmentRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [wantsRepair, setWantsRepair] = useState(false);

  const fetchRequests = async (currentPage = page) => {
    try {
      const response = await apiFetch(`${API_BASE}/api/requests/all?page=${currentPage}&pageSize=${PAGE_SIZE}`);
      const data = await response.json();
      setRequests(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRequests(page); }, [page]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [statusFilter, searchTerm]);

  // Derive display status from backend status + dates (same logic as user's page)
  const getStatusDisplay = (req: EquipmentRequest) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(req.requestedToUtc); end.setHours(0, 0, 0, 0);
    const start = new Date(req.requestedFromUtc); start.setHours(0, 0, 0, 0);
    const s = req.status.replace(/\s/g, '').toLowerCase();

    if (s === 'returned')  return { text: 'Returned',    color: '#9c27b0', key: 'Returned' };
    if (s === 'rejected')  return { text: 'Rejected',    color: '#f44336', key: 'Rejected' };
    if (s === 'pending')   return { text: 'Pending',     color: '#ff9800', key: 'Pending' };
    if (s === 'cancelled') return { text: 'Cancelled',   color: '#9e9e9e', key: 'Cancelled' };
    if (s === 'overdue')   return { text: 'Overdue',     color: '#ff9800', key: 'Overdue' };

    if (s === 'checkedout') {
      if (today > end) return { text: 'Overdue', color: '#ff9800', key: 'Overdue' };
      return { text: 'Checked Out', color: '#1976d2', key: 'CheckedOut' };
    }

    if (s === 'approved') {
      if (today > end) return { text: 'Overdue', color: '#ff9800', key: 'Overdue' };
      if (today < start) return { text: 'Reserved', color: '#ffc107', key: 'Approved' };
      return { text: 'Approved', color: '#4caf50', key: 'Approved' };
    }

    return { text: s, color: '#999', key: s };
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/api/requests/${requestId}/approve`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to approve request');
      await fetchRequests();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (requestId: string) => {
    setActionLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/api/requests/${requestId}/reject`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to reject request');
      await fetchRequests();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/requests/${selectedRequest.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnConditionNotes: returnNotes, wantsRepair })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Return failed');
      }
      await fetchRequests();
      setReturnDialogOpen(false);
      setDetailsOpen(false);
      setReturnNotes('');
      setWantsRepair(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to return item');
    } finally {
      setActionLoading(false);
    }
  };

  const canAdminReturn = (req: EquipmentRequest) => {
    const s = req.status.replace(/\s/g, '');
    return s === 'CheckedOut' && !req.returnedAtUtc;
  };

  const canCancel = (req: EquipmentRequest) => {
    const s = req.status.replace(/\s/g, '').toLowerCase();
    return s === 'pending' || s === 'approved';
  };

  const handleCancel = async (reqId: string) => {
    if (!confirm('Cancel this request?')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/requests/${reqId}/cancel`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Cancel failed');
      }
      await fetchRequests();
      setDetailsOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const hasActiveFilter = statusFilter !== 'all' || searchTerm !== '';

  // Filter by derived status key + search
  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchTerm === '' ||
      req.userFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipmentSerialNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return getStatusDisplay(req).key === statusFilter;
  });

  if (authLoading || loading) {
    return (
      <PageLayout type="admin">
        <div className={styles.loadingContainer}><div>Loading requests...</div></div>
      </PageLayout>
    );
  }

  return (
    <PageLayout type="admin">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Equipment Requests</h1>
        </div>

        {/* Filters bar */}
        <div className={styles.filterBar}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Statuses</MenuItem>
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search user, equipment, serial..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon className={styles.searchIcon}>search</Icon>
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />

          <Button
            variant="contained"
            startIcon={<Icon>add</Icon>}
            onClick={() => setRequestModalOpen(true)}
          >
            New Request
          </Button>

          <RequestModal
            open={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            onRequestSubmitted={fetchRequests}
          />
        </div>

        {/* Requests Table */}
        <div className={styles.tableContainer}>
          <table className={styles.requestsTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Equipment</th>
                <th>Serial #</th>
                <th>Request Period</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <Icon className={styles.emptyIcon}>inbox</Icon>
                    <p>No requests found</p>
                    <small>When users request equipment, they'll appear here</small>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(request => {
                  const display = getStatusDisplay(request);
                  return (
                    <tr key={request.id}>
                      <td>
                        <div className={styles.userCell}>
                          <Avatar className={styles.userAvatar}>
                            {request.userFullName?.charAt(0) || '?'}
                          </Avatar>
                          <span>{request.userFullName}</span>
                        </div>
                      </td>
                      <td>{request.equipmentName}</td>
                      <td>
                        <code className={styles.serialNumber}>{request.equipmentSerialNumber}</code>
                      </td>
                      <td>
                        <div className={styles.periodCell}>
                          <div>
                            <Icon className={styles.periodIcon}>event</Icon>
                            {formatDate(request.requestedFromUtc).split(',')[0]}
                          </div>
                          <div>
                            <Icon className={styles.periodIcon}>event</Icon>
                            {formatDate(request.requestedToUtc).split(',')[0]}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Chip
                          label={display.text}
                          size="small"
                          className={styles.statusChip}
                          style={{
                            backgroundColor: `${display.color}20`,
                            color: display.color,
                            borderColor: display.color
                          }}
                        />
                      </td>
                      <td>
                        <Tooltip title={formatDate(request.requestedAtUtc)}>
                          <span className={styles.requestedDate}>
                            {new Date(request.requestedAtUtc).toLocaleDateString()}
                          </span>
                        </Tooltip>
                      </td>
                      <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          className={styles.viewButton}
                          onClick={() => { setSelectedRequest(request); setDetailsOpen(true); }}
                        >
                          View
                        </Button>
                        {canCancel(request) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={actionLoading}
                            onClick={() => handleCancel(request.id)}
                            startIcon={<Icon>cancel</Icon>}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span>Showing {filteredRequests.length} of {hasActiveFilter ? filteredRequests.length : totalCount}{hasActiveFilter ? ' (filtered)' : ''}</span>
          {statusFilter !== 'all' && (
            <Chip
              size="small"
              label={`Filter: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? statusFilter}`}
              onDelete={() => setStatusFilter('all')}
              className={styles.filterChip}
            />
          )}
        </div>
        <Pagination page={page} totalPages={hasActiveFilter ? 1 : totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => !actionLoading && setDetailsOpen(false)} maxWidth="md" fullWidth>
        {selectedRequest && (() => {
          const display = getStatusDisplay(selectedRequest);
          return (
            <>
              <DialogTitle className={styles.dialogTitle}>
                <div>
                  <Icon className={styles.dialogIcon}>assignment</Icon>
                  Request Details
                </div>
                <Chip
                  label={display.text}
                  size="small"
                  style={{
                    backgroundColor: `${display.color}20`,
                    color: display.color,
                    borderColor: display.color
                  }}
                />
              </DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <div className={styles.dialogGrid}>
                  <div className={styles.dialogSection}>
                    <h3>User Information</h3>
                    <p><strong>Name:</strong> {selectedRequest.userFullName}</p>
                    <p><strong>User ID:</strong> {selectedRequest.userId}</p>
                  </div>

                  <div className={styles.dialogSection}>
                    <h3>Equipment Information</h3>
                    <p><strong>Name:</strong> {selectedRequest.equipmentName}</p>
                    <p><strong>Serial #:</strong> {selectedRequest.equipmentSerialNumber}</p>
                  </div>

                  <div className={styles.dialogSection}>
                    <h3>Request Period</h3>
                    <p><strong>From:</strong> {formatDate(selectedRequest.requestedFromUtc)}</p>
                    <p><strong>To:</strong> {formatDate(selectedRequest.requestedToUtc)}</p>
                  </div>

                  <div className={styles.dialogSection}>
                    <h3>Timeline</h3>
                    <p><strong>Requested:</strong> {formatDate(selectedRequest.requestedAtUtc)}</p>
                    {selectedRequest.reviewedAtUtc && (
                      <p><strong>Reviewed:</strong> {formatDate(selectedRequest.reviewedAtUtc)}</p>
                    )}
                    {selectedRequest.checkedOutAtUtc && (
                      <p><strong>Checked Out:</strong> {formatDate(selectedRequest.checkedOutAtUtc)}</p>
                    )}
                    {selectedRequest.returnedAtUtc && (
                      <p><strong>Returned:</strong> {formatDate(selectedRequest.returnedAtUtc)}</p>
                    )}
                  </div>

                  {selectedRequest.adminComment && (
                    <div className={styles.dialogSectionFull}>
                      <h3>Admin Comment</h3>
                      <p className={styles.comment}>{selectedRequest.adminComment}</p>
                    </div>
                  )}

                  {selectedRequest.returnConditionNotes && (
                    <div className={styles.dialogSectionFull}>
                      <h3>Return Condition Notes</h3>
                      <p className={styles.comment}>{selectedRequest.returnConditionNotes}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
              <DialogActions className={styles.dialogActions}>
                <Button onClick={() => setDetailsOpen(false)} disabled={actionLoading}>Close</Button>
                {selectedRequest.status === 'Pending' && (
                  <>
                    <Button onClick={() => handleDeny(selectedRequest.id)} color="error" variant="outlined" disabled={actionLoading}>
                      Reject
                    </Button>
                    <Button onClick={() => handleApprove(selectedRequest.id)} color="success" variant="contained" disabled={actionLoading}>
                      Approve
                    </Button>
                  </>
                )}
                {canCancel(selectedRequest) && (
                  <Button
                    onClick={() => handleCancel(selectedRequest.id)}
                    color="error"
                    variant="outlined"
                    disabled={actionLoading}
                    startIcon={<Icon>cancel</Icon>}
                  >
                    Cancel Request
                  </Button>
                )}
                {canAdminReturn(selectedRequest) && (
                  <Button
                    onClick={() => setReturnDialogOpen(true)}
                    color="primary"
                    variant="contained"
                    disabled={actionLoading}
                    startIcon={<Icon>assignment_return</Icon>}
                  >
                    {display.key === 'Overdue' ? 'Force Return' : 'Return'}
                  </Button>
                )}
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => !actionLoading && setReturnDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ color: 'var(--hover-color)' }}>assignment_return</Icon>
          Return Item
        </DialogTitle>
        <DialogContent>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
            Describe the condition of the equipment upon return.
          </p>
          <TextareaAutosize
            minRows={4}
            className={styles.returnNotes}
            value={returnNotes}
            onChange={e => setReturnNotes(e.target.value)}
            placeholder="e.g. Good condition, no visible damage..."
            disabled={actionLoading}
          />
          <FormControlLabel
            control={
              <Checkbox checked={wantsRepair} onChange={e => setWantsRepair(e.target.checked)} disabled={actionLoading} color="warning" />
            }
            label="Equipment needs repair"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setReturnDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleReturn} color="primary" variant="contained" disabled={actionLoading} startIcon={<Icon>check</Icon>}>
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default AdminRequests;

import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import styles from "./PublicRequestTable.module.css";
import { useAuth } from "../../src/context/useAuth";
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import Pagination from '../../components/Pagination/Pagination';

interface Request {
  id: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: string;
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
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

const RequestsTable = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [wantsRepair, setWantsRepair] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  const fetchRequests = async (currentPage = page) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/requests/me?page=${currentPage}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();
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
  useEffect(() => { if (user) fetchRequests(page); }, [user, page]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

  // Compute display status (handles overdue derivation from Approved/CheckedOut)
  const getStatusDisplay = (req: Request) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(req.requestedFromUtc); start.setHours(0, 0, 0, 0);
    const end = new Date(req.requestedToUtc); end.setHours(0, 0, 0, 0);
    const s = req.status.replace(/\s/g, '').toLowerCase();

    if (s === 'returned')  return { text: 'Returned',    color: '#9c27b0', icon: 'assignment_return', key: 'Returned' };
    if (s === 'rejected')  return { text: 'Rejected',    color: '#f44336', icon: 'cancel',            key: 'Rejected' };
    if (s === 'pending')   return { text: 'Pending',     color: '#ff9800', icon: 'hourglass_empty',   key: 'Pending' };
    if (s === 'cancelled') return { text: 'Cancelled',   color: '#9e9e9e', icon: 'block',             key: 'Cancelled' };
    if (s === 'overdue')   return { text: 'Overdue',     color: '#ff9800', icon: 'warning',           key: 'Overdue' };

    if (s === 'checkedout') {
      if (today > end) return { text: 'Overdue', color: '#ff9800', icon: 'warning', key: 'Overdue' };
      return { text: 'Checked Out', color: '#1976d2', icon: 'sync_alt', key: 'CheckedOut' };
    }

    if (s === 'approved') {
      if (today > end) return { text: 'Overdue', color: '#ff9800', icon: 'warning', key: 'Overdue' };
      if (today < start) return { text: 'Reserved', color: '#ffc107', icon: 'event', key: 'Approved' };
      return { text: 'Approved', color: '#4caf50', icon: 'check_circle', key: 'Approved' };
    }

    return { text: 'Unknown', color: '#999', icon: 'help', key: '' };
  };

  // Can the user check out this request?
  const canCheckOut = (req: Request) => {
    const s = req.status.replace(/\s/g, '').toLowerCase();
    if (s !== 'approved') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(req.requestedFromUtc); start.setHours(0, 0, 0, 0);
    const end = new Date(req.requestedToUtc); end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  };

  // Can the user return this request?
  const canReturn = (req: Request) => {
    const s = req.status.replace(/\s/g, '').toLowerCase();
    return s === 'checkedout' && !req.returnedAtUtc;
  };

  const handleCheckout = async (reqId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/requests/${reqId}/checkout`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Checkout failed');
      }
      await fetchRequests();
      // refresh selectedRequest if dialog is open
      if (selectedRequest?.id === reqId) {
        const updated = await apiFetch(`${API_BASE}/api/requests/${reqId}`);
        if (updated.ok) setSelectedRequest(await updated.json());
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Checkout failed');
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  // Filter requests by dropdown
  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    const display = getStatusDisplay(req);
    return display.key === statusFilter;
  });

  if (authLoading || loading) {
    return (
      <PageLayout type="user">
        <div className={styles.loadingContainer}>Loading your requests...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout type="user">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>My Requests</h1>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Statuses</MenuItem>
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon className={styles.emptyIcon}>inbox</Icon>
            <p>{requests.length === 0 ? "You haven't made any requests yet" : 'No requests match this filter'}</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.requestsTable}>
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Serial #</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const display = getStatusDisplay(req);
                  return (
                    <tr key={req.id}>
                      <td>{req.equipmentName}</td>
                      <td><code>{req.equipmentSerialNumber}</code></td>
                      <td>{formatDate(req.requestedFromUtc)} — {formatDate(req.requestedToUtc)}</td>
                      <td>
                        <Chip
                          icon={<Icon className={styles.statusIcon}>{display.icon}</Icon>}
                          label={display.text}
                          size="small"
                          style={{
                            backgroundColor: `${display.color}20`,
                            color: display.color,
                            borderColor: display.color,
                          }}
                        />
                      </td>
                      <td>{formatDate(req.requestedAtUtc)}</td>
                      <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}
                        >
                          View
                        </Button>
                        {canCheckOut(req) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={actionLoading}
                            onClick={() => handleCheckout(req.id)}
                            startIcon={<Icon>login</Icon>}
                          >
                            Check Out
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.footer}>
          Showing {filteredRequests.length} of {statusFilter === 'all' ? totalCount : filteredRequests.length} {statusFilter !== 'all' ? '(filtered)' : ''}
        </div>
        <Pagination page={page} totalPages={statusFilter !== 'all' ? 1 : totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => !actionLoading && setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedRequest && (() => {
          const display = getStatusDisplay(selectedRequest);
          return (
            <>
              <DialogTitle>
                <div className={styles.dialogTitle}>
                  <Icon className={styles.dialogIcon}>assignment</Icon>
                  Request Details
                  <Chip
                    label={display.text}
                    size="small"
                    style={{
                      backgroundColor: `${display.color}20`,
                      color: display.color,
                      borderColor: display.color,
                    }}
                  />
                </div>
              </DialogTitle>
              <DialogContent>
                <div className={styles.dialogGrid}>
                  <div><strong>Equipment:</strong> {selectedRequest.equipmentName}</div>
                  <div><strong>Serial:</strong> {selectedRequest.equipmentSerialNumber}</div>
                  <div><strong>From:</strong> {formatDate(selectedRequest.requestedFromUtc)}</div>
                  <div><strong>To:</strong> {formatDate(selectedRequest.requestedToUtc)}</div>
                  <div><strong>Requested:</strong> {formatDate(selectedRequest.requestedAtUtc)}</div>
                  {selectedRequest.checkedOutAtUtc && (
                    <div><strong>Checked out:</strong> {formatDate(selectedRequest.checkedOutAtUtc)}</div>
                  )}
                  {selectedRequest.returnedAtUtc && (
                    <div><strong>Returned:</strong> {formatDate(selectedRequest.returnedAtUtc)}</div>
                  )}
                  {selectedRequest.adminComment && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Admin comment:</strong> {selectedRequest.adminComment}
                    </div>
                  )}
                </div>
              </DialogContent>
              <DialogActions className={styles.dialogActions}>
                <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                {canCheckOut(selectedRequest) && (
                  <Button
                    onClick={() => handleCheckout(selectedRequest.id)}
                    color="success"
                    variant="contained"
                    disabled={actionLoading}
                    startIcon={<Icon>login</Icon>}
                  >
                    Check Out
                  </Button>
                )}
                {canReturn(selectedRequest) && (
                  <Button
                    onClick={() => setReturnDialogOpen(true)}
                    color="primary"
                    variant="contained"
                    disabled={actionLoading}
                    startIcon={<Icon>assignment_return</Icon>}
                  >
                    {getStatusDisplay(selectedRequest).key === 'Overdue' ? 'Return' : 'Return Early'}
                  </Button>
                )}
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => !actionLoading && setReturnDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
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
              <Checkbox
                checked={wantsRepair}
                onChange={e => setWantsRepair(e.target.checked)}
                disabled={actionLoading}
                color="warning"
              />
            }
            label="Equipment needs repair"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setReturnDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={handleReturn}
            color="primary"
            variant="contained"
            disabled={actionLoading}
            startIcon={<Icon>check</Icon>}
          >
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default RequestsTable;

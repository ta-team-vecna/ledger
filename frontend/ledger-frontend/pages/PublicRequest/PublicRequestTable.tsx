import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import styles from "./PublicRequestTable.module.css";
import { useAuth } from "../../src/context/useAuth";

interface Request {
  id: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned';
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  checkedOutAtUtc: string | null;
  returnedAtUtc: string | null;
  adminComment: string | null;
  returnConditionNotes: string | null;
}

const RequestsTable = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch user's requests directly from the API
  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/requests/me', { 
        credentials: 'include' 
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const handleReturn = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/api/requests/${selectedRequest.id}/return`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnConditionNotes: returnNotes })
        }
      );
      if (!res.ok) throw new Error('Return failed');
      
      await fetchRequests();
      setReturnDialogOpen(false);
      setDetailsOpen(false);
      setReturnNotes('');
    } catch (error) {
      alert('Failed to return item');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusDisplay = (req: Request) => {
    const now = new Date();
    const start = new Date(req.requestedFromUtc);
    const end = new Date(req.requestedToUtc);

    if (req.status === 'Returned') {
      return { text: 'Returned', color: '#9c27b0', icon: 'assignment_return' };
    }
    if (req.status === 'Rejected') {
      return { text: 'Rejected', color: '#f44336', icon: 'cancel' };
    }
    if (req.status === 'Pending') {
      return { text: 'Pending', color: '#ff9800', icon: 'hourglass_empty' };
    }
    if (req.status === 'Approved') {
      if (now < start) return { text: 'Reserved', color: '#ffc107', icon: 'event' };
      if (now > end) return { text: 'Overdue', color: '#ff9800', icon: 'warning' };
      if (req.checkedOutAtUtc) return { text: 'Checked Out', color: '#1976d2', icon: 'sync_alt' };
      return { text: 'Approved', color: '#4caf50', icon: 'check_circle' };
    }
    return { text: 'Unknown', color: '#999', icon: 'help' };
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  if (authLoading || loading) {
    return (
      <>
           <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className={styles.loadingContainer}>Loading your requests...</div>
      </>
    );
  }

  return (
    <>
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.container} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        <div className={styles.header}>
          <h1>My Requests</h1>
        </div>

        {requests.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon className={styles.emptyIcon}>inbox</Icon>
            <p>You haven't made any requests yet</p>
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
                {requests.map(req => {
                  const display = getStatusDisplay(req);
                  return (
                    <tr key={req.id}>
                      <td>{req.equipmentName}</td>
                      <td><code>{req.equipmentSerialNumber}</code></td>
                      <td>
                        {formatDate(req.requestedFromUtc)} → {formatDate(req.requestedToUtc)}
                      </td>
                      <td>
                        <Chip
                          icon={<Icon className={styles.statusIcon}>{display.icon}</Icon>}
                          label={display.text}
                          size="small"
                          style={{
                            backgroundColor: `${display.color}20`,
                            color: display.color,
                            borderColor: display.color
                          }}
                        />
                      </td>
                      <td>{formatDate(req.requestedAtUtc)}</td>
                      <td>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedRequest(req);
                            setDetailsOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => !actionLoading && setDetailsOpen(false)} maxWidth="md" fullWidth>
        {selectedRequest && (
          <>
            <DialogTitle>
              <div className={styles.dialogTitle}>
                <Icon className={styles.dialogIcon}>assignment</Icon>
                Request Details
                <Chip
                  label={getStatusDisplay(selectedRequest).text}
                  size="small"
                  style={{
                    backgroundColor: `${getStatusDisplay(selectedRequest).color}20`,
                    color: getStatusDisplay(selectedRequest).color,
                    borderColor: getStatusDisplay(selectedRequest).color
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
                  <div className={styles.fullWidth}>
                    <strong>Admin comment:</strong> {selectedRequest.adminComment}
                  </div>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              
              {selectedRequest.checkedOutAtUtc && !selectedRequest.returnedAtUtc && (
                <Button
                  onClick={() => setReturnDialogOpen(true)}
                  color="primary"
                  variant="contained"
                  disabled={actionLoading}
                >
                  Return Item
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => !actionLoading && setReturnDialogOpen(false)}>
        <DialogTitle>Return Item</DialogTitle>
        <DialogContent>
          <p>Condition notes:</p>
          <TextareaAutosize
            minRows={4}
            className={styles.returnNotes}
            value={returnNotes}
            onChange={e => setReturnNotes(e.target.value)}
            placeholder="Describe condition..."
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReturn} color="primary" variant="contained">
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestsTable;
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

interface Request {
  id: string;
  userId: string;
  userFullName: string;
  equipmentId: string;
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
  approvedAtUtc: string;
}

const RequestsTable = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    fetch('http://localhost:3001/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCurrentUserId(data.userId))
      .catch(console.error);
  }, []);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/requests/all', { credentials: 'include' });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : Object.values(data));
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Get display status (handles Reserved/Overdue logic)
  const getDisplayStatus = (req: Request) => {
    const now = new Date();
    const start = new Date(req.requestedFromUtc);
    const end = new Date(req.requestedToUtc);
    
    // If returned, show returned
    if (req.status === 'Returned') return { text: 'Returned', color: '#9c27b0', icon: 'assignment_return' };
    
    // If Rejected, show Rejected
    if (req.status === 'Rejected') return { text: 'Rejected', color: '#f44336', icon: 'cancel' };
    
    // If approved, check dates
    if (req.status === 'Approved') {
      if (now < start) return { text: 'Reserved', color: '#ffc107', icon: 'event' };
      if (now > end) return { text: 'Overdue', color: '#ff9800', icon: 'warning' };
      if (req.checkedOutAtUtc) return { text: 'Checked Out', color: '#1976d2', icon: 'sync_alt' };
      return { text: 'Approved', color: '#4caf50', icon: 'check_circle' };
    }
    
    // Pending
    return { text: 'Pending', color: '#ff9800', icon: 'hourglass_empty' };
  };

  // Actions
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

  // Filtering
  const userRequests = requests.filter(r => r.userId === currentUserId);
  
  const filteredRequests = userRequests.filter(req => {
    const matchesSearch = searchTerm === '' || 
      req.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipmentSerialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const displayStatus = getDisplayStatus(req).text;
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const statusButtons = ['all', 'Pending', 'Approved', 'Reserved', 'Checked Out', 'Overdue', 'Returned', 'Rejected'];

  if (loading) {
    return (
      <>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>Loading...</div>
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

        {/* Filters */}
        <div className={styles.filterBar}>
          {statusButtons.map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'contained' : 'outlined'}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon className={styles.searchIcon}>search</Icon>
                </InputAdornment>
              )
            }}
          />
        </div>

        {/* Table */}
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
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <Icon className={styles.emptyIcon}>inbox</Icon>
                    <p>No requests</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const display = getDisplayStatus(req);
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
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          Showing {filteredRequests.length} of {userRequests.length}
        </div>
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
                  label={getDisplayStatus(selectedRequest).text}
                  size="small"
                  style={{
                    backgroundColor: `${getDisplayStatus(selectedRequest).color}20`,
                    color: getDisplayStatus(selectedRequest).color,
                    borderColor: getDisplayStatus(selectedRequest).color
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
              
              {/* Show return button only if checked out and not already returned */}
              {selectedRequest.checkedOutAtUtc || selectedRequest.status === "Approved" && !selectedRequest.returnedAtUtc && (
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
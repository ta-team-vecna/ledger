import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { Divider } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import styles from "./PublicRequestTable.module.css";

interface Request {
  approvedAtUtc: string;
  id: string;
  userId: string;
  userFullName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: 'Pending' | 'Approved' | 'Denied' | 'CheckedOut' | 'Returned'; 
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  reviewedAtUtc: string | null;
  checkedOutAtUtc: string | null;
  returnedAtUtc: string | null;
  adminComment: string | null;
  returnConditionNotes: string | null;
}

const RequestsTable = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/me', {
          credentials: 'include'
        });
        const data = await response.json();
        setCurrentUserId(data.userId);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch all requests (backend doesn't have user filtering)
  const fetchRequests = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/requests/all', {
      credentials: 'include'
    });
    const data = await response.json();
    
    // Convert and validate
    const requestsArray = Object.values(data).map((item: any) => ({
      id: item.id,
      userId: item.userId,
      userFullName: item.userFullName,
      equipmentId: item.equipmentId,
      equipmentName: item.equipmentName,
      equipmentSerialNumber: item.equipmentSerialNumber,
      status: item.status,
      requestedAtUtc: item.requestedAtUtc,
      requestedFromUtc: item.requestedFromUtc,
      requestedToUtc: item.requestedToUtc,
      reviewedAtUtc: item.reviewedAtUtc,
      checkedOutAtUtc: item.checkedOutAtUtc,
      returnedAtUtc: item.returnedAtUtc,
      adminComment: item.adminComment,
      returnConditionNotes: item.returnConditionNotes,
      approvedAtUtc: item.approvedAtUtc
    })) as Request[];
    
    setRequests(requestsArray);
  } catch (error) {
    console.error('Failed to fetch requests:', error);
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter to only current user's requests
  const userRequests = requests.filter(req => req.userId === currentUserId);

  // Handle confirming checkout (borrowing)
const handleConfirmCheckout = async (equipmentId: string) => {
  setActionLoading(true);
  try {
    const response = await fetch(`http://localhost:3001/api/equipment/${equipmentId}/status`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 2 }) // 2 = Checked Out/Borrowed
    });

    if (!response.ok) throw new Error('Failed to confirm checkout');
    
    // Manually update the request status in local state
    if (selectedRequest) {
      const updatedRequest = { 
        ...selectedRequest, 
        status: 'CheckedOut' as const,
        checkedOutAtUtc: new Date().toISOString()
      };
      
      // Update the requests list
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id ? updatedRequest : req
      ));
      
      // Update selected request
      setSelectedRequest(updatedRequest);
    }
    
    setDetailsOpen(false);
  } catch (error) {
    console.error('Failed to confirm checkout:', error);
    alert('Failed to confirm checkout. Please try again.');
  } finally {
    setActionLoading(false);
  }
};

  // Handle return with notes
const handleReturn = async () => {
  if (!selectedRequest) return;
  
  setActionLoading(true);
  try {
    const response = await fetch(`http://localhost:3001/api/requests/${selectedRequest.id}/return`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ returnConditionNotes: returnNotes })
    });

    if (!response.ok) throw new Error('Failed to return item');
    
    // Manually update local state
    const updatedRequest = {
      ...selectedRequest,
      status: 'Returned' as const,
      returnedAtUtc: new Date().toISOString(),
      returnConditionNotes: returnNotes
    };
    
    setRequests(prev => prev.map(req => 
      req.id === selectedRequest.id ? updatedRequest : req
    ));
    
    setReturnDialogOpen(false);
    setDetailsOpen(false);
    setReturnNotes('');
  } catch (error) {
    console.error('Failed to return item:', error);
    alert('Failed to return item. Please try again.');
  } finally {
    setActionLoading(false);
  }
};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

 const getStatusColor = (status: string) => {
  // Normalize by removing spaces and standardizing
  const normalized = status.replace(/\s+/g, '');
  
  const colors: Record<string, string> = {
    'Pending': '#ff9800',
    'Approved': '#4caf50',
    'Denied': '#f44336',
    'CheckedOut': '#1976d2',  // 👈 No space version
    'Returned': '#9c27b0'
  };
  return colors[normalized] || '#999';
};

const getStatusIcon = (status: string) => {
  const normalized = status.replace(/\s+/g, '');
  
  const icons: Record<string, string> = {
    'Pending': 'hourglass_empty',
    'Approved': 'check_circle',
    'Denied': 'cancel',
    'CheckedOut': 'sync_alt',  
    'Returned': 'assignment_return'
  };
  return icons[normalized] || 'help';
};

// For display, format it nicely
const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'CheckedOut': 'Checked Out',
    'Pending': 'Pending',
    'Approved': 'Approved',
    'Denied': 'Denied',
    'Returned': 'Returned'
  };
  return statusMap[status] || status;
};

 const filteredRequests = userRequests.filter(req => {
  const matchesSearch = searchTerm === '' || 
    req.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.equipmentSerialNumber.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Normalize both sides for comparison
  const normalizedReqStatus = req.status.replace(/\s+/g, '');
  const normalizedFilterStatus = statusFilter.replace(/\s+/g, '');
  
  const matchesStatus = statusFilter === 'all' || normalizedReqStatus === normalizedFilterStatus;
  
  return matchesSearch && matchesStatus;
});

const statusButtons = ['all', 'Pending', 'Approved', 'CheckedOut', 'Returned', 'Denied'];



    if (loading) {
    return (
      <>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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

        {/* Status Filter Buttons */}
        <div className={styles.filterBar}>
          {statusButtons.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'contained' : 'outlined'}
              onClick={() => setStatusFilter(status)}
              className={styles.filterButton}
              style={statusFilter === status && status !== 'all' ? {
                backgroundColor: getStatusColor(status),
                borderColor: getStatusColor(status)
              } : {}}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by equipment name or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon className={styles.searchIcon}>search</Icon>
                </InputAdornment>
              ),
            }}
          />
        </div>

        {/* Requests Table */}
        <div className={styles.tableContainer}>
          <table className={styles.requestsTable}>
            <thead>
              <tr>
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
                  <td colSpan={6} className={styles.emptyState}>
                    <Icon className={styles.emptyIcon}>inbox</Icon>
                    <p>No requests found</p>
                    <small>Click "Request Equipment" to get started</small>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.equipmentName}</td>
                    <td>
                      <code className={styles.serialNumber}>
                        {request.equipmentSerialNumber}
                      </code>
                    </td>
                    <td>
                      <div className={styles.periodCell}>
                        <div>{formatDate(request.requestedFromUtc)}</div>
                        <div>→ {formatDate(request.requestedToUtc)}</div>
                      </div>
                    </td>
                    <td>
                     <Chip
                    icon={<Icon className={styles.statusIcon}>{getStatusIcon(request.status)}</Icon>}
                    label={formatStatus(request.status)}  // 👈 Use formatted version for display
                    size="small"
                    className={styles.statusChip}
                    style={{
                        backgroundColor: `${getStatusColor(request.status)}20`,
                        color: getStatusColor(request.status),
                        borderColor: getStatusColor(request.status)
                    }}
                    />
                    </td>
                    <td>
                      <Tooltip title={new Date(request.requestedAtUtc).toLocaleString()}>
                        <span className={styles.requestedDate}>
                          {formatDate(request.requestedAtUtc)}
                        </span>
                      </Tooltip>
                    </td>
                    <td>
                      <Button
                        size="small"
                        variant="outlined"
                        className={styles.viewButton}
                        onClick={() => {
                          setSelectedRequest(request);
                          setDetailsOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span>Showing {filteredRequests.length} of {userRequests.length} requests</span>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => !actionLoading && setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle className={styles.dialogTitle}>
              <div>
                <Icon className={styles.dialogIcon}>assignment</Icon>
                Request Details
              </div>
              <Chip
            icon={<Icon>{getStatusIcon(selectedRequest.status)}</Icon>}
            label={formatStatus(selectedRequest.status)}  // 👈 Use formatted version!
            size="small"
            style={{
                backgroundColor: `${getStatusColor(selectedRequest.status)}20`,
                color: getStatusColor(selectedRequest.status),
                borderColor: getStatusColor(selectedRequest.status)
            }}
            />
            </DialogTitle>
            <DialogContent className={styles.dialogContent}>
              <div className={styles.dialogGrid}>
                <div className={styles.dialogSection}>
                  <h3>Equipment</h3>
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
                  {selectedRequest.approvedAtUtc && (
                    <p><strong>Approved:</strong> {formatDate(selectedRequest.approvedAtUtc)}</p>
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
                    <h3>Return Notes</h3>
                    <p className={styles.comment}>{selectedRequest.returnConditionNotes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button onClick={() => setDetailsOpen(false)} disabled={actionLoading}>
                Close
              </Button>
              
              {selectedRequest.status === 'Approved' && (
                <Button
                  onClick={() => handleConfirmCheckout(selectedRequest.equipmentId)}
                  color="success"
                  variant="contained"
                  disabled={actionLoading}
                  startIcon={<Icon>check</Icon>}
                >
                  Confirm Checkout
                </Button>
              )}
              
            {selectedRequest.status.replace(/\s+/g, '') === 'CheckedOut' && (  // 👈 Normalize here too
                <Button
                    onClick={() => {
                    setReturnDialogOpen(true);  
                    }}
                    color="primary"
                    variant="contained"
                    disabled={actionLoading}
                    startIcon={<Icon>assignment_return</Icon>}
                >
                    Return Item
                </Button>
                )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => !actionLoading && setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return Item</DialogTitle>
        <DialogContent>
          <p>Please provide notes about the item's condition upon return:</p>
          <TextareaAutosize
            minRows={4}
            className={styles.returnNotes}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="e.g., Good condition, minor scratches, fully functional..."
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReturn}
            color="primary"
            variant="contained"
            disabled={actionLoading}
          >
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestsTable;
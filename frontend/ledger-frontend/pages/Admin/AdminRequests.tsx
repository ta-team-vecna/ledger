import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import styles from './AdminRequests.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';      
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';    
import Tooltip from '@mui/material/Tooltip';
import RequestModal from "../../components/modals/RequestModal"


interface EquipmentRequest {
  id: string;
  userId: string;
  userFullName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: string; // Backend sends: 'Pending', 'Approved', 'Rejected', 'Returned'
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  reviewedAtUtc: string | null;
  checkedOutAtUtc: string | null;
  returnedAtUtc: string | null;
  adminComment: string | null;
  returnConditionNotes: string | null;
}

const AdminRequests = () => {
  const { loading: authLoading } = useAdminGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<EquipmentRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/requests/all', {
        credentials: 'include'
      });
      const data = await response.json();
      
      // Handle both array and object-with-keys responses
      const requestsArray = Array.isArray(data) ? data : Object.values(data);
      setRequests(requestsArray as EquipmentRequest[]);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Status display mappings (backend sends these exact strings)
  const statusConfig: Record<string, { color: string; label: string }> = {
    'Pending': { color: '#ff9800', label: 'Pending' },
    'Approved': { color: '#4caf50', label: 'Approved' },
    'Rejected': { color: '#f44336', label: 'Rejected' },
    'Returned': { color: '#9c27b0', label: 'Returned' }
  };

  const getStatusColor = (status: string) => {
    return statusConfig[status]?.color || '#999';
  };



  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/requests/${requestId}/approve`, {
        method: 'PUT',
        credentials: 'include'
      });

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
      const response = await fetch(`http://localhost:3001/api/requests/${requestId}/reject`, {
        method: 'PUT',
        credentials: 'include'  
      });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and search
  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchTerm === '' || 
      req.userFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipmentSerialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  // Normalize status for display
  const getDisplayStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'Pending': 'Pending',
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'CheckedOut': 'Checked Out',
      'Checked Out': 'Checked Out',
      'Returned': 'Returned'
    };
    return statusMap[status] || status;
  };

  const statusButtons = ['all', 'Pending', 'Approved', 'Rejected', 'Returned'];


  if (authLoading || loading) {
    return (
      <>
        <Topbar isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>
          <div>Loading requests...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar isAdmin={true} onMenuClick={() => setSidebarOpen(true)} /> 
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.container} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Equipment Requests</h1>
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
              {status === 'all' ? 'All Requests' : getDisplayStatus(status)}
            </Button>
          ))}
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

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by user, equipment, or serial number..."
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
                filteredRequests.map((request) => (
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
                      <code className={styles.serialNumber}>
                        {request.equipmentSerialNumber}
                      </code>
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
                        label={getDisplayStatus(request.status)}
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
                      <Tooltip title={formatDate(request.requestedAtUtc)}>
                        <span className={styles.requestedDate}>
                          {new Date(request.requestedAtUtc).toLocaleDateString()}
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

        {/* Footer with counts */}
        <div className={styles.footer}>
          <span>Showing {filteredRequests.length} requests</span>
          {statusFilter !== 'all' && (
            <Chip
              size="small"
              label={`Filter: ${getDisplayStatus(statusFilter)}`}
              onDelete={() => setStatusFilter('all')}
              className={styles.filterChip}
            />
          )}
        </div>
      </div>

      {/* Request Details Dialog */}
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
                label={getDisplayStatus(selectedRequest.status)}
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
              <Button onClick={() => setDetailsOpen(false)} disabled={actionLoading}>
                Close
              </Button>
              {selectedRequest.status.replace(/\s+/g, '') === 'Pending' && (
                <>
                  <Button
                    onClick={() => handleDeny(selectedRequest.id)}
                    color="error"
                    variant="outlined"
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedRequest.id)}
                    color="success"
                    variant="contained"
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default AdminRequests;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mui/material/Icon';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Sidebar from '../../components/sideBar/sideBar';
import type { NavItem } from '../../components/sideBar/sideBar';
import RequestModal from '../../components/modals/RequestModal';
import { useAuth } from '../../src/context/useAuth';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import styles from './Dashboard.module.css';

interface EquipmentData {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface RequestData {
  id: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  status: string;
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  checkedOutAtUtc?: string | null;
  returnedAtUtc?: string | null;
  adminComment?: string | null;
  returnConditionNotes?: string | null;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isAdmin = user?.role === 'Admin' || user?.role === '1';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [categories, setCategories] = useState(0);
  const [borrowedItems, setBorrowedItems] = useState(0);
  const [recentRequests, setRecentRequests] = useState<RequestData[]>([]);
  const [activeRequests, setActiveRequests] = useState<RequestData[]>([]);

  // Detail dialog
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Return dialog
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<RequestData | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [wantsRepair, setWantsRepair] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const navItems: NavItem[] = [
    { text: 'DASHBOARD', icon: 'home', path: '/dashboard' },
    { text: 'INVENTORY', icon: 'monitor', path: '/inventory' },
    { text: 'REQUESTS', icon: 'description', path: '/requests' },
  ];
  if (isAdmin) {
    navItems.push({ text: 'ADMIN PANEL', icon: 'admin_panel_settings', path: '/admin' });
  }

  const fetchRequests = () => {
    apiFetch(`${API_BASE}/api/requests/me?page=1&pageSize=20`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: RequestData[]; totalCount: number }) => {
        const items = data.items ?? [];
        setPendingRequests(items.filter(r => r.status.toLowerCase() === 'pending').length);
        const checked = items.filter(r => r.status.toLowerCase() === 'checkedout');
        setBorrowedItems(checked.length);
        setActiveRequests(checked);
        setRecentRequests(items.slice(0, 5));
      })
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch(`${API_BASE}/api/equipment?page=1&pageSize=100`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: EquipmentData[]; totalCount: number }) => {
        setTotalItems(data.totalCount);
        setCategories(new Set((data.items ?? []).map(e => e.type)).size);
      })
      .catch(() => {});

    fetchRequests();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const getStatusDisplay = (req: RequestData) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(req.requestedToUtc); end.setHours(0, 0, 0, 0);
    const s = req.status.replace(/\s/g, '').toLowerCase();

    if (s === 'returned')   return { text: 'Returned',    color: '#9c27b0', icon: 'assignment_return' };
    if (s === 'rejected')   return { text: 'Rejected',    color: '#f44336', icon: 'cancel' };
    if (s === 'pending')    return { text: 'Pending',     color: '#ff9800', icon: 'hourglass_empty' };
    if (s === 'cancelled')  return { text: 'Cancelled',   color: '#9e9e9e', icon: 'block' };
    if (s === 'overdue')    return { text: 'Overdue',     color: '#ff9800', icon: 'warning' };
    if (s === 'checkedout') {
      if (today > end) return { text: 'Overdue',     color: '#ff9800', icon: 'warning' };
      return { text: 'Checked Out', color: '#1976d2', icon: 'sync_alt' };
    }
    if (s === 'approved')   return { text: 'Approved',    color: '#4caf50', icon: 'check_circle' };
    return { text: s, color: '#999', icon: 'help' };
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending') return styles.statusPending;
    if (s === 'overdue') return styles.statusOverdue;
    if (s === 'checkedout') return styles.statusBorrowed;
    if (s === 'returned') return styles.statusReturned;
    if (s === 'approved') return styles.statusApproved;
    if (s === 'rejected') return styles.statusRejected;
    return '';
  };

  const getStatusLabel = (status: string) => {
    if (status.toLowerCase() === 'checkedout') return 'BORROWED';
    return status.toUpperCase();
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/requests/${returnTarget.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnConditionNotes: returnNotes, wantsRepair })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Return failed');
      }
      fetchRequests();
      setReturnDialogOpen(false);
      setReturnNotes('');
      setWantsRepair(false);
      setReturnTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to return item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const userName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className={styles.layout}>
      <Sidebar
        title="School Inventory"
        subtitle="Management System"
        navItems={navItems}
        userName={userName}
        userEmail={user?.email || ''}
        mobileOpen={mobileOpen}
        onMobileToggle={setMobileOpen}
      />

      <div className={styles.mainContent}>
        <div className={styles.header}>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: '#333' }}>
              <MenuIcon />
            </IconButton>
          )}
          <div className={styles.headerSpacer} />
          <div
            className={styles.userDropdown}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar className={styles.headerAvatar}>{userName.charAt(0)}</Avatar>
            <span className={styles.headerUserName}>{userName}</span>
            <KeyboardArrowDownIcon fontSize="small" />
          </div>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </div>

        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeText}>
            <h1>WELCOME BACK, {user?.firstName?.toUpperCase() || 'USER'}!</h1>
            <p>Manage your inventory efficiently</p>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIconBox}>
              <Icon>format_list_bulleted</Icon>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>TOTAL ITEMS</span>
              <span className={styles.statNumber}>{totalItems}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox}>
              <Icon>pending_actions</Icon>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>PENDING REQUESTS</span>
              <span className={styles.statNumber}>{pendingRequests}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox}>
              <Icon>bar_chart</Icon>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>AVAILABLE CATEGORIES</span>
              <span className={styles.statNumber}>{categories}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox}>
              <Icon>grid_view</Icon>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>ITEMS BORROWED</span>
              <span className={styles.statNumber}>{borrowedItems}</span>
            </div>
          </div>
        </div>

        {/* Two tables side by side */}
        <div className={styles.tablesRow}>
          {/* My Requests */}
          <div className={styles.recentRequestsCard}>
            <div className={styles.cardHeader}>
              <h2>My Requests</h2>
              <button className={styles.viewAllBtn} onClick={() => navigate('/requests')}>
                View All &rarr;
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.requestTable}>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>DATE REQUESTED</th>
                    <th>STATUS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyState}>
                        No requests yet.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div className={styles.itemCell}>
                            <Icon className={styles.itemIcon}>inventory_2</Icon>
                            <span>{req.equipmentName}</span>
                          </div>
                        </td>
                        <td>{formatTimeAgo(req.requestedAtUtc)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${getStatusClass(req.status)}`}>
                            <span className={styles.statusDot} />
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.viewBtn}
                            onClick={() => { setSelectedRequest(req); setDetailsOpen(true); }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* My Active Requests */}
          <div className={styles.recentRequestsCard}>
            <div className={styles.cardHeader}>
              <h2>My Active Requests</h2>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.requestTable}>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>DUE DATE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeRequests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyState}>
                        No active checkouts.
                      </td>
                    </tr>
                  ) : (
                    activeRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div className={styles.itemCell}>
                            <Icon className={styles.itemIcon}>inventory_2</Icon>
                            <span>{req.equipmentName}</span>
                          </div>
                        </td>
                        <td>{formatDate(req.requestedToUtc)}</td>
                        <td>
                          <button
                            className={styles.returnBtn}
                            onClick={() => { setReturnTarget(req); setReturnDialogOpen(true); }}
                          >
                            Return
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <RequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={() => {
          setRequestModalOpen(false);
          fetchRequests();
        }}
      />

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedRequest && (() => {
          const display = getStatusDisplay(selectedRequest);
          return (
            <>
              <DialogTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon>assignment</Icon>
                  Request Details
                  <Chip
                    label={display.text}
                    size="small"
                    style={{ backgroundColor: `${display.color}20`, color: display.color, borderColor: display.color }}
                  />
                </div>
              </DialogTitle>
              <DialogContent>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 8, fontSize: 14 }}>
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
              <DialogActions>
                <Button onClick={() => setDetailsOpen(false)}>Close</Button>
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
          <Icon>assignment_return</Icon>
          Return Item
        </DialogTitle>
        <DialogContent>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
            Describe the condition of the equipment upon return.
          </p>
          <TextareaAutosize
            minRows={4}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
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
    </div>
  );
};

export default Dashboard;

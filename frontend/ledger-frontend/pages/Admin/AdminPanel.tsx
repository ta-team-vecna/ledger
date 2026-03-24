import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mui/material/Icon';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Sidebar from '../../components/sideBar/sideBar';
import type { NavItem } from '../../components/sideBar/sideBar';
import { useAuth } from '../../src/context/useAuth';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import styles from './AdminPanel.module.css';

interface EquipmentData {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface RequestData {
  id: string;
  userFullName: string;
  equipmentName: string;
  status: string;
  requestedAtUtc: string;
  requestedFromUtc: string;
  requestedToUtc: string;
  returnedAtUtc: string | null;
  checkedOutAtUtc: string | null;
  reviewedAtUtc: string | null;
}

interface ActionItem {
  icon: string;
  iconColor: string;
  text: string;
  timeAgo: string;
  timestamp: number;
}

const adminNavItems: NavItem[] = [
  { text: 'Main Panel', icon: 'dashboard', path: '/admin' },
  { text: 'Requests', icon: 'description', path: '/admin/requests', hasChevron: true },
  { text: 'Latest Actions', icon: 'history', path: '/admin', hasChevron: true },
  { text: 'Users', icon: 'people', path: '/admin/users', hasChevron: true },
  { text: 'Items', icon: 'inventory_2', path: '/admin/inventory', hasChevron: true },
  { text: 'Reports', icon: 'bar_chart', path: '/admin/reports', hasChevron: true },
];

const AdminPanel = () => {
  const { loading: authLoading } = useAdminGuard();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [totalUsers, setTotalUsers] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [overdueItems, setOverdueItems] = useState(0);
  const [recentRequests, setRecentRequests] = useState<RequestData[]>([]);
  const [latestActions, setLatestActions] = useState<ActionItem[]>([]);

  const formatTimeAgo = useCallback((dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }, []);

  const isOverdueRequest = useCallback((req: RequestData) => {
    const status = req.status.replace(/\s/g, '').toLowerCase();
    if (status === 'overdue') return true;
    if (status !== 'approved' && status !== 'checkedout') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(req.requestedToUtc);
    end.setHours(0, 0, 0, 0);

    return today > end;
  }, []);

  const buildActions = useCallback((requests: RequestData[]) => {
    const actions: ActionItem[] = [];

    requests.forEach(req => {
      if (req.returnedAtUtc) {
        actions.push({
          icon: 'check_circle',
          iconColor: '#16a34a',
          text: `${req.equipmentName} returned from ${req.userFullName}`,
          timeAgo: formatTimeAgo(req.returnedAtUtc),
          timestamp: new Date(req.returnedAtUtc).getTime(),
        });
      }

      if (isOverdueRequest(req)) {
        actions.push({
          icon: 'error',
          iconColor: '#dc2626',
          text: `OVERDUE: ${req.equipmentName} due from ${req.userFullName}`,
          timeAgo: formatTimeAgo(req.requestedToUtc),
          timestamp: new Date(req.requestedToUtc).getTime(),
        });
      }

      if (req.checkedOutAtUtc && req.status.toLowerCase() === 'checkedout') {
        actions.push({
          icon: 'shopping_cart',
          iconColor: '#2563eb',
          text: `${req.equipmentName} checked out by ${req.userFullName}`,
          timeAgo: formatTimeAgo(req.checkedOutAtUtc),
          timestamp: new Date(req.checkedOutAtUtc).getTime(),
        });
      }
    });

    return actions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [formatTimeAgo, isOverdueRequest]);

  useEffect(() => {
    apiFetch(`${API_BASE}/api/users?page=1&pageSize=100`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: UserData[]; totalCount: number }) => {
        setTotalUsers(data.totalCount);
        setAdminCount((data.items ?? []).filter(u => u.role === 'Admin').length);
      })
      .catch(() => {});

    apiFetch(`${API_BASE}/api/equipment?page=1&pageSize=100`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: EquipmentData[]; totalCount: number }) => {
        setTotalItems(data.totalCount);
        setCategories(new Set((data.items ?? []).map(e => e.type)).size);
      })
      .catch(() => {});

    apiFetch(`${API_BASE}/api/requests/all?page=1&pageSize=100`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: RequestData[]; totalCount: number }) => {
        const items = data.items ?? [];
        setPendingRequests(items.filter(r => r.status.toLowerCase() === 'pending').length);
        setOverdueItems(items.filter(isOverdueRequest).length);
        setRecentRequests(items.slice(0, 5));
        setLatestActions(buildActions(items));
      })
      .catch(() => {});
  }, [buildActions, isOverdueRequest]);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending') return styles.statusPending;
    if (s === 'overdue') return styles.statusOverdue;
    if (s === 'checkedout') return styles.statusBorrowed;
    if (s === 'returned') return styles.statusReturned;
    if (s === 'rejected') return styles.statusRejected;
    if (s === 'approved') return styles.statusApproved;
    return '';
  };

  const getStatusLabel = (status: string) => {
    if (status.toLowerCase() === 'checkedout') return 'BORROWED';
    return status.toUpperCase();
  };

  const userName = user ? `${user.firstName} ${user.lastName}` : '';

  if (authLoading) {
    return (
      <div className={styles.layout}>
        <div className={styles.loadingContainer}>Verifying access...</div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        title="Inventory System"
        subtitle="Admin Panel"
        navItems={adminNavItems}
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
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            &larr; User Dashboard
          </button>
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

        <div className={styles.pageTitle}>
          <h1>Dashboard Overview</h1>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.adminStatCard}>
            <div>
              <span className={styles.adminStatLabel}>Total Users</span>
              <span className={styles.adminStatNumber}>{totalUsers}</span>
            </div>
            <div className={`${styles.adminStatIconBox} ${styles.iconBlue}`}>
              <Icon>people</Icon>
            </div>
          </div>

          <div className={styles.adminStatCard}>
            <div>
              <span className={styles.adminStatLabel}>Total Items</span>
              <span className={styles.adminStatNumber}>{totalItems}</span>
            </div>
            <div className={`${styles.adminStatIconBox} ${styles.iconGreen}`}>
              <Icon>inventory_2</Icon>
            </div>
          </div>

          <div className={styles.adminStatCard}>
            <div>
              <span className={styles.adminStatLabel}>Pending Requests</span>
              <span className={styles.adminStatNumber}>{pendingRequests}</span>
            </div>
            <div className={`${styles.adminStatIconBox} ${styles.iconOrange}`}>
              <Icon>pending_actions</Icon>
            </div>
          </div>

          <div className={styles.adminStatCard}>
            <div>
              <span className={styles.adminStatLabel}>Overdue Items</span>
              <span className={`${styles.adminStatNumber} ${styles.overdueNumber}`}>{overdueItems}</span>
            </div>
            <div className={`${styles.adminStatIconBox} ${styles.iconRed}`}>
              <Icon>warning</Icon>
            </div>
          </div>
        </div>

        <div className={styles.twoColumnRow}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Recent Requests</h2>
              <button className={styles.viewAllBtn} onClick={() => navigate('/admin/requests')}>
                View All &rarr;
              </button>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.requestTable}>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>REQUESTED BY</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyState}>No requests yet.</td>
                    </tr>
                  ) : (
                    recentRequests.map(req => {
                      const overdue = isOverdueRequest(req);

                      return (
                      <tr key={req.id}>
                        <td>
                          <div className={styles.itemCell}>
                            <Icon className={styles.itemIcon}>inventory_2</Icon>
                            <span>{req.equipmentName}</span>
                          </div>
                        </td>
                        <td>{req.userFullName}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${overdue ? styles.statusOverdue : getStatusClass(req.status)}`}>
                            <span className={styles.statusDot} />
                            {overdue ? 'OVERDUE' : getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td>{formatTimeAgo(req.requestedAtUtc)}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardHeader} ${styles.systemStatusHeader}`}>
              <h2>System Status</h2>
            </div>
            <div className={styles.systemStatusList}>
              <div className={styles.statusRow}>
                <div className={styles.statusRowLeft}>
                  <Icon className={styles.statusRowIcon}>schedule</Icon>
                  <span>Uptime</span>
                </div>
                <span className={styles.operationalBadge}>Operational</span>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.statusRowLeft}>
                  <Icon className={styles.statusRowIcon}>language</Icon>
                  <span>Version</span>
                </div>
                <span className={styles.statusRowValue}>v1.0.0</span>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.statusRowLeft}>
                  <Icon className={styles.statusRowIcon}>category</Icon>
                  <span>Categories</span>
                </div>
                <span className={styles.statusRowValue}>{categories}</span>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.statusRowLeft}>
                  <Icon className={styles.statusRowIcon}>inventory_2</Icon>
                  <span>Total Items</span>
                </div>
                <span className={styles.statusRowValue}>{totalItems}</span>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.statusRowLeft}>
                  <Icon className={styles.statusRowIcon}>admin_panel_settings</Icon>
                  <span>Admins</span>
                </div>
                <span className={styles.statusRowValue}>{adminCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Latest Actions</h2>
              <button className={styles.viewAllBtn}>View All &rarr;</button>
            </div>
            <div className={styles.actionsList}>
              {latestActions.length === 0 ? (
                <div className={styles.emptyState}>No recent actions.</div>
              ) : (
                latestActions.map((action, i) => (
                  <div key={i} className={styles.actionItem}>
                    <Icon style={{ color: action.iconColor, fontSize: 20 }}>{action.icon}</Icon>
                    <span className={styles.actionText}>{action.text}</span>
                    <span className={styles.actionTime}>{action.timeAgo}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

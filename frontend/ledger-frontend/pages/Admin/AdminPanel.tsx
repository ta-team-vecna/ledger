
// AdminPanel.tsx - Fixed layout
import { useState, useEffect, type ReactNode } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from '../../components/adminSideBar/adminSideBar';
import { Divider } from '@mui/material';
import Icon from '@mui/material/Icon';
import styles from './AdminPanel.module.css';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

const API_BASE = "http://localhost:3001";

const AdminPanel = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalItems, setTotalItems] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/equipment`, { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: unknown[]) => setTotalItems(data.length))
      .catch(() => setTotalItems(null));
  }, []);
  const [actionFilter, setActionFilter] = useState('all');
  const [actionLimit, setActionLimit] = useState(25);
  const [requestFilter, setRequestFilter] = useState('all');
  const [requestLimit, setRequestLimit] = useState(25);   

  return (
    <>
      <Topbar 
        isAdmin={true} 
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      <AdminSidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
        <div style={{ 
  flex: 1, 
  padding: '20px',
  marginTop: 'clamp(3vh, 8vw, 9vh)',
  marginLeft: sidebarOpen ? '240px' : '0',
  transition: 'margin-left 0.3s ease'
}}>
  {/* 3x2 Grid Layout */}
  <div className={styles.dashboardGrid}>
    
    {/* Row 1, Col 1: Quick Stats */}
    <div className={styles.gridCell}>
      <div className={styles.quickStats}>
        <div className={styles.quickStatsHeading}>
          <h2>QUICK STATISTICS</h2>
        </div>
        <Divider />
        
        <div className={styles.statsGrid}>
          {/* Users Section */}
          <div className={styles.statSection}>
            <h3>Users</h3>
            <Divider />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>people</Icon> Total Users:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>admin_panel_settings</Icon> Admins:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>people</Icon> Online:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
          </div>

          {/* Items Section */}
          <div className={styles.statSection}>
            <h3>Items</h3>
            <Divider />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>category</Icon> Categories:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>inventory</Icon> Total Items:
              </span>
              <span className={styles.statValue}>{totalItems ?? "—"}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>inventory</Icon> Low Stock:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
          </div>

          {/* System Status Section */}
          <div className={styles.statSection}>
            <h3>System</h3>
            <Divider />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <AccessTimeIcon className={styles.statIcon} /> Uptime:
              </span>
              <span className={styles.statValue}>—</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>check_circle</Icon> Status:
              </span>
              <span className={`${styles.statValue} ${styles.statusIndicator}`}>Operational</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>
                <Icon className={styles.statIcon}>inventory</Icon> Version:
              </span>
              <span className={styles.statValue}>—</span>
            </div>  
          </div>
        </div>
      </div>
    </div>

    {/* Row 1, Col 2: Recent Requests */}
    <div className={styles.gridCell}>
      <div className={styles.quickStats}>
        <div className={styles.quickStatsHeading}>
          <h2>RECENT REQUESTS</h2>
        </div>
        <Divider />
        
        {/* Filter Controls */}
        <div className={styles.filterControls}>
          <ButtonGroup size="small" variant="outlined" className={styles.filterGroup}>
            <Button 
              variant={requestFilter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setRequestFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={requestFilter === 'pending' ? 'contained' : 'outlined'}
              onClick={() => setRequestFilter('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={requestFilter === 'approved' ? 'contained' : 'outlined'}
              onClick={() => setRequestFilter('approved')}
            >
              Approved
            </Button>
            <Button 
              variant={requestFilter === 'denied' ? 'contained' : 'outlined'}
              onClick={() => setRequestFilter('denied')}
            >
              Denied
            </Button>
            <Button 
              variant={requestFilter === 'overdue' ? 'contained' : 'outlined'}
              onClick={() => setRequestFilter('overdue')}
            >
              Overdue ⚠️
            </Button>
          </ButtonGroup>
          
          <div className={styles.limitSelector}>
            <span>Show:</span>
            <ButtonGroup size="small">
              <Button 
                variant={requestLimit === 10 ? 'contained' : 'outlined'}
                onClick={() => setRequestLimit(10)}
              >
                10
              </Button>
              <Button 
                variant={requestLimit === 25 ? 'contained' : 'outlined'}
                onClick={() => setRequestLimit(25)}
              >
                25
              </Button>
              <Button 
                variant={requestLimit === 50 ? 'contained' : 'outlined'}
                onClick={() => setRequestLimit(50)}
              >
                50
              </Button>
            </ButtonGroup>
          </div>
        </div>
        
        {/* Scrollable Requests List */}
        <div className={styles.requestList}>
          {generateRequests(requestFilter, requestLimit).length === 0 && (
            <div className={styles.emptyState}>No requests yet.</div>
          )}
          {generateRequests(requestFilter, requestLimit).map((request, index) => (
            <div key={index} className={`${styles.requestItem} ${styles[request.status]}`}>
              <div className={styles.requestHeader}>
                <div className={styles.requestUser}>
                  <Avatar className={styles.requestAvatar}>
                    {request.user.charAt(0)}
                  </Avatar>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{request.user}</span>
                    <span className={styles.userRole}>{request.role}</span>
                  </div>
                </div>
                <Chip 
                  label={request.timeAgo} 
                  size="small" 
                  className={styles.timeChip}
                  variant="outlined"
                />
              </div>
              
              <div className={styles.requestDetails}>
                <div className={styles.requestItemInfo}>
                  <Icon className={styles.requestItemIcon}>inventory_2</Icon>
                  <span className={styles.requestItemName}>{request.item}</span>
                  {request.quantity > 1 && (
                    <Chip 
                      label={`x${request.quantity}`} 
                      size="small" 
                      className={styles.quantityChip}
                    />
                  )}
                </div>
                <div className={styles.requestDuration}>
                  <Icon className={styles.durationIcon}>schedule</Icon>
                  <span>{request.duration}</span>
                </div>
              </div>
              
              <div className={styles.requestFooter}>
                <div className={styles.requestStatus}>
                  <span className={`${styles.statusBadge} ${styles[request.status]}`}>
                    {request.status}
                  </span>
                  {request.urgent && (
                    <Tooltip title="Pending for over 48 hours">
                      <span className={styles.urgentTag}> URGENT</span>
                    </Tooltip>
                  )}
                </div>
                
                <div className={styles.requestActions}>
                  {request.status === 'pending' && (
                    <>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success"
                        className={styles.approveBtn}
                        startIcon={<Icon>check</Icon>}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        className={styles.denyBtn}
                        startIcon={<Icon>close</Icon>}
                      >
                        Deny
                      </Button>
                    </>
                  )}
                  {request.status === 'approved' && (
                    <Button 
                      size="small" 
                      variant="text" 
                      disabled
                      className={styles.disabledBtn}
                    >
                      Already Approved
                    </Button>
                  )}
                  {request.status === 'denied' && (
                    <Button 
                      size="small" 
                      variant="text" 
                      disabled
                      className={styles.disabledBtn}
                    >
                      Request Denied
                    </Button>
                  )}
                  {request.status === 'overdue' && (
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="warning"
                      startIcon={<Icon>priority_high</Icon>}
                    >
                      Review Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Row 2, Col 1: Latest Actions */}
    <div className={styles.gridCell}>
      <div className={styles.quickStats}>
        <div className={styles.quickStatsHeading}>
          <h2>LATEST ACTIONS</h2>
        </div>
        <Divider />
        
        {/* Filter Controls */}
        <div className={styles.filterControls}>
          <ButtonGroup size="small" variant="outlined" className={styles.filterGroup}>
            <Button 
              variant={actionFilter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setActionFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={actionFilter === 'borrow' ? 'contained' : 'outlined'}
              onClick={() => setActionFilter('borrow')}
            >
              Borrow
            </Button>
            <Button 
              variant={actionFilter === 'return' ? 'contained' : 'outlined'}
              onClick={() => setActionFilter('return')}
            >
              Return
            </Button>
            <Button 
              variant={actionFilter === 'request' ? 'contained' : 'outlined'}
              onClick={() => setActionFilter('request')}
            >
              Requests
            </Button>
            <Button 
              variant={actionFilter === 'admin' ? 'contained' : 'outlined'}
              onClick={() => setActionFilter('admin')}
            >
              Admin
            </Button>
          </ButtonGroup>
          
          <div className={styles.limitSelector}>
            <span>Show:</span>
            <ButtonGroup size="small">
              <Button 
                variant={actionLimit === 10 ? 'contained' : 'outlined'}
                onClick={() => setActionLimit(10)}
              >
                10
              </Button>
              <Button 
                variant={actionLimit === 25 ? 'contained' : 'outlined'}
                onClick={() => setActionLimit(25)}
              >
                25
              </Button>
              <Button 
                variant={actionLimit === 50 ? 'contained' : 'outlined'}
                onClick={() => setActionLimit(50)}
              >
                50
              </Button>
              <Button 
                variant={actionLimit === 100 ? 'contained' : 'outlined'}
                onClick={() => setActionLimit(100)}
              >
                100
              </Button>
            </ButtonGroup>
          </div>
        </div>
        
        {/* Scrollable Action List */}
        <div className={styles.actionList}>
          {generateActions(actionFilter, actionLimit).length === 0 && (
            <div className={styles.emptyState}>No actions yet.</div>
          )}
          {generateActions(actionFilter, actionLimit).map((action, index) => (
            <div key={index} className={`${styles.actionItem} ${styles[action.type]}`}>
              <div className={styles.actionIcon}>
                {action.icon}
              </div>
              <div className={styles.actionContent}>
                <span className={styles.actionText}>{action.text}</span>
                <Chip 
                  label={action.timeAgo} 
                  size="small" 
                  className={styles.timeChip}
                  variant="outlined"
                />
              </div>
              {action.urgent && <span className={styles.urgentBadge}>!</span>}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className={styles.gridCell}></div>
  </div>
</div>
    </>
  );
};


// Place this before your component or in a separate file
const generateActions = (filter: string, limit: number) => {
  const allActions: Array<{ type: string; icon: ReactNode; text: string; timeAgo: string; urgent: boolean }> = [];

  // Filter actions
  const filtered = filter === 'all' ? allActions : allActions.filter(a => a.type === filter);
  
  // Apply limit and return
  return filtered.slice(0, limit);
};

const generateRequests = (filter: string, limit: number) => {
  const allRequests: Array<{
    user: string;
    role: string;
    item: string;
    quantity: number;
    duration: string;
    timeAgo: string;
    status: string;
    urgent: boolean;
  }> = [];

  // Filter logic
  let filtered = allRequests;
  if (filter === 'pending') filtered = allRequests.filter(r => r.status === 'pending' && !r.urgent);
  else if (filter === 'approved') filtered = allRequests.filter(r => r.status === 'approved');
  else if (filter === 'denied') filtered = allRequests.filter(r => r.status === 'denied');
  else if (filter === 'overdue') filtered = allRequests.filter(r => r.urgent);
  
  return filtered.slice(0, limit);
};

export default AdminPanel;
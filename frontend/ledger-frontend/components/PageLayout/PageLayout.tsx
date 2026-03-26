import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Sidebar from '../sideBar/sideBar';
import type { NavItem } from '../sideBar/sideBar';
import { useAuth } from '../../src/context/useAuth';
import styles from './PageLayout.module.css';

const userBaseNavItems: NavItem[] = [
  { text: 'DASHBOARD', icon: 'home', path: '/dashboard' },
  { text: 'INVENTORY', icon: 'monitor', path: '/inventory' },
  { text: 'REQUESTS', icon: 'description', path: '/requests' },
];

const adminNavItems: NavItem[] = [
  { text: 'Main Panel', icon: 'dashboard', path: '/admin' },
  { text: 'Requests', icon: 'description', path: '/admin/requests', hasChevron: true },
  { text: 'Latest Actions', icon: 'history', path: '/admin/latest-actions', hasChevron: true },
  { text: 'Users', icon: 'people', path: '/admin/users', hasChevron: true },
  { text: 'Items', icon: 'inventory_2', path: '/admin/inventory', hasChevron: true },
  { text: 'Reports', icon: 'bar_chart', path: '/admin/reports', hasChevron: true },
];

interface PageLayoutProps {
  type: 'user' | 'admin';
  children: ReactNode;
}

const PageLayout = ({ type, children }: PageLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isAdmin = user?.role === 'Admin' || user?.role === '1';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const navItems: NavItem[] =
    type === 'admin'
      ? adminNavItems
      : [
          ...userBaseNavItems,
          ...(isAdmin ? [{ text: 'ADMIN PANEL', icon: 'admin_panel_settings', path: '/admin' }] : []),
        ];

  const userName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className={styles.layout}>
      <Sidebar
        title={type === 'admin' ? 'Inventory System' : 'School Inventory'}
        subtitle={type === 'admin' ? 'Admin Panel' : 'Management System'}
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
          {type === 'admin' && (
            <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
              ← User Dashboard
            </button>
          )}
          <div className={styles.userDropdown} onClick={e => setAnchorEl(e.currentTarget)}>
            <Avatar className={styles.headerAvatar}>{userName.charAt(0)}</Avatar>
            <span className={styles.headerUserName}>{userName}</span>
            <KeyboardArrowDownIcon fontSize="small" />
          </div>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            disableScrollLock
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </div>

        {children}
      </div>
    </div>
  );
};

export default PageLayout;

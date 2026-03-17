import * as React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import LogoutIcon from '@mui/icons-material/Logout';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import styles from './topBar.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard'; //Import the hook

interface TopbarProps {
  isAdmin?: boolean;  // This prop is now optional - we'll use the hook instead
  onMenuClick?: () => void;
  adminMenuOpen?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ 
  isAdmin: propIsAdmin, // Rename to avoid confusion
  onMenuClick, 
  adminMenuOpen 
}) => {
  // Use the hook to get REAL admin status
  const { isAdmin: hookIsAdmin, loading } = useAdminGuard();
  
  // Use hook result if available, otherwise fall back to prop
  const isAdmin = hookIsAdmin ?? propIsAdmin ?? false;
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showAdminAlert, setShowAdminAlert] = React.useState(false);
  const open = Boolean(anchorEl);
  const isMobile = useMediaQuery('(max-width: 450px)');
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // Check if trying to access admin panel without admin rights
    if (path === '/admin' && !isAdmin) {
      e.preventDefault();
      setShowAdminAlert(true);
    }
    // For other links, let them navigate normally
  };

  // Don't render until we know admin status
  if (loading) {
    return <div className={styles.topBar} style={{ justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <>
      <Snackbar
        open={showAdminAlert}
        autoHideDuration={4000}
        onClose={() => setShowAdminAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setShowAdminAlert(false)}
          sx={{ width: '100%' }}
        >
          You don't have permission to access the admin panel
        </Alert>
      </Snackbar>

      <div className={styles.topBar}>
        {isMobile ? (
          // Mobile: Hamburger menu with logout
          <>
            <IconButton
              id="menu-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
              sx={{ color: 'white' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              slotProps={{
                list: {
                  'aria-labelledby': 'menu-button',
                },
              }}
            >
              <MenuItem onClick={handleClose}>
                <a href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>Dashboard</a>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <a href="/requests" style={{ textDecoration: 'none', color: 'inherit' }}>Requests</a>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <a href="/reports" style={{ textDecoration: 'none', color: 'inherit' }}>Reports</a>
              </MenuItem>
              <MenuItem 
                onClick={(e) => {
                  if (!isAdmin) {
                    e.preventDefault();
                    setShowAdminAlert(true);
                  } else {
                    handleClose();
                    window.location.href = '/admin';
                  }
                }}
              >
                <span style={{ color: !isAdmin ? '#999' : 'inherit' }}>
                  Admin panel
                </span>
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: '#f44336', borderTop: '1px solid #eee', mt: 1 }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          // Desktop: Row of links with logout button
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {/* Admin menu button - only shown in admin panel */}
            {isAdmin && (
              <IconButton
                onClick={onMenuClick}
                sx={{ color: 'white', mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Regular nav links */}
            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
              <a href="/dashboard">Dashboard</a>
              <a href="/requests">Requests</a>
              <a href="/reports">Reports</a>
              <a 
                href="/admin"
                onClick={(e) => handleNavClick(e, '/admin')}
                style={{ 
                  color: !isAdmin ? '#999' : 'white',
                  cursor: !isAdmin ? 'not-allowed' : 'pointer'
                }}
              >
                Admin panel
              </a>
            </div>
            
            {/* Logout button */}
            <IconButton
              onClick={handleLogout}
              sx={{ 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </div>
        )}
      </div>
    </>
  );
};

export default Topbar;
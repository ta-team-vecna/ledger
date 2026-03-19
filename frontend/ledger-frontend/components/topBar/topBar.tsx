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
import { useAuth } from '../../hooks/useAuth'; 

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { user } = useAuth(); 
  const isAdmin = user?.role === 'Admin';
  
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
    if (path === '/admin' && !isAdmin) {
      e.preventDefault();
      setShowAdminAlert(true);
    }
  };

  return (
    <>
      <Snackbar
        open={showAdminAlert}
        autoHideDuration={4000}
        onClose={() => setShowAdminAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setShowAdminAlert(false)}>
          You don't have permission to access the admin panel
        </Alert>
      </Snackbar>

      <div className={styles.topBar}>
        {isMobile ? (
          // Mobile menu
          <>
            <IconButton onClick={handleClick} sx={{ color: 'white' }}>
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
              <MenuItem onClick={handleClose} component="a" href="/dashboard">Dashboard</MenuItem>
              <MenuItem onClick={handleClose} component="a" href="/requests">Requests</MenuItem>
              <MenuItem onClick={handleClose} component="a" href="/reports">Reports</MenuItem>
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
                sx={{ color: !isAdmin ? '#999' : 'inherit' }}
              >
                Admin panel
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: '#f44336' }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          // Desktop
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {isAdmin && (
              <IconButton onClick={onMenuClick} sx={{ color: 'white', mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            
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
            
            <IconButton onClick={handleLogout} sx={{ color: 'white' }} title="Logout">
              <LogoutIcon />
            </IconButton>
          </div>
        )}
      </div>
    </>
  );
};

export default Topbar;
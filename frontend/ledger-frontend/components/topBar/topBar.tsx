  // components/topBar/topBar.tsx
import * as React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import styles from './topBar.module.css';

interface TopbarProps {
  isAdmin?: boolean;
  onMenuClick?: () => void;
  adminMenuOpen?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ 
  isAdmin = false, 
  onMenuClick, 
  adminMenuOpen 
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isMobile = useMediaQuery('(max-width: 450px)');
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className={styles.topBar}>
      {isMobile ? (
        // Mobile: Hamburger menu
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
            <MenuItem onClick={handleClose}>Dashboard</MenuItem>
            <MenuItem onClick={handleClose}>Requests</MenuItem>
            <MenuItem onClick={handleClose}>Reports</MenuItem>
            <MenuItem onClick={handleClose}>Admin panel</MenuItem>
          </Menu>
        </>
      ) : (
        // Desktop: Row of links
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
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/dashboard">Dashboard</a>
            <a href="/requests">Requests</a>
            <a href="/reports">Reports</a>
            <a href="/admin">Admin panel</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;
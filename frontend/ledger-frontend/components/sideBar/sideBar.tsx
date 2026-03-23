import { Link, useLocation } from 'react-router-dom';
import Icon from '@mui/material/Icon';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import styles from './sideBar.module.css';
import ledgerLightLogo from '../../src/assets/ledger-light.svg';

export interface NavItem {
  text: string;
  icon: string;
  path: string;
  hasChevron?: boolean;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  mobileOpen: boolean;
  onMobileToggle: (open: boolean) => void;
}

const Sidebar = ({ title, subtitle, navItems, userName, userEmail, mobileOpen, onMobileToggle }: SidebarProps) => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const content = (
    <div className={styles.sidebar}>
      <div className={styles.logoSection}>
        <img className={styles.logoImage} src={ledgerLightLogo} alt={`${title} ${subtitle}`.trim()} />
      </div>

      <nav className={styles.nav}>
        {navItems.map((item, index) => {
          const firstMatch = navItems.findIndex(n => n.path === item.path);
          const isActive = location.pathname === item.path && index === firstMatch;

          return (
            <Link
              key={item.text}
              to={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => isMobile && onMobileToggle(false)}
            >
              <Icon className={styles.navIcon}>{item.icon}</Icon>
              <span>{item.text}</span>
              {item.hasChevron && <Icon className={styles.chevron}>chevron_right</Icon>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <Avatar className={styles.userAvatar}>{userName.charAt(0)}</Avatar>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userEmail}>{userEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => onMobileToggle(false)}
        sx={{ '& .MuiDrawer-paper': { width: 260, border: 'none' } }}
      >
        {content}
      </Drawer>
    );
  }

  return content;
};

export default Sidebar;

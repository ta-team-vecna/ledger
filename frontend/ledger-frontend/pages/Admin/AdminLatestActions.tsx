import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import Icon from '@mui/material/Icon';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '../../components/Pagination/Pagination';
import styles from './AdminLatestActions.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';

interface ActionItem {
  type: string;
  icon: string;
  iconColor: string;
  text: string;
  timestamp: string;
}

const TYPE_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  checkedout: 'Checked Out',
  returned: 'Returned',
  overdue: 'Overdue',
};

const PAGE_SIZE = 20;

const formatTimeAgo = (dateStr: string) => {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const AdminLatestActions = () => {
  const { loading: authLoading } = useAdminGuard();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const typeParam = typeFilter !== 'all' ? `&type=${typeFilter}` : '';
    apiFetch(`${API_BASE}/api/requests/latest-actions?page=${page}&pageSize=${PAGE_SIZE}${typeParam}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: ActionItem[]; totalPages: number; totalCount: number }) => {
        setActions(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, typeFilter]);

  useEffect(() => { setPage(1); }, [typeFilter]);

  if (authLoading) {
    return (
      <PageLayout type="admin">
        <div className={styles.loadingContainer}>Loading actions...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout type="admin">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Latest Actions</h1>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="all">All Actions</MenuItem>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>Loading...</div>
        ) : actions.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon className={styles.emptyIcon}>history</Icon>
            <p>No actions match this filter.</p>
          </div>
        ) : (
          <div className={styles.actionsList}>
            {actions.map((action, i) => (
              <div key={i} className={styles.actionItem}>
                <div className={styles.iconWrap}>
                  <Icon style={{ color: action.iconColor, fontSize: 22 }}>{action.icon}</Icon>
                </div>
                <span className={styles.actionText}>{action.text}</span>
                <span className={styles.actionTime}>{formatTimeAgo(action.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </PageLayout>
  );
};

export default AdminLatestActions;

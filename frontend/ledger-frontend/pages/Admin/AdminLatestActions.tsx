import { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import Icon from '@mui/material/Icon';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import styles from './AdminLatestActions.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';

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
  type: string;
  text: string;
  timeAgo: string;
  timestamp: number;
}

const TYPE_LABELS: Record<string, string> = {
  returned: 'Returned',
  overdue: 'Overdue',
  checkedout: 'Checked Out',
  approved: 'Approved',
  rejected: 'Rejected',
};

const AdminLatestActions = () => {
  const { loading: authLoading } = useAdminGuard();
  const [allActions, setAllActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const formatTimeAgo = useCallback((dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }, []);

  const isOverdue = useCallback((req: RequestData) => {
    const s = req.status.replace(/\s/g, '').toLowerCase();
    if (s === 'overdue') return true;
    if (s !== 'approved' && s !== 'checkedout') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(req.requestedToUtc); end.setHours(0, 0, 0, 0);
    return today > end;
  }, []);

  const buildActions = useCallback((requests: RequestData[]) => {
    const actions: ActionItem[] = [];

    requests.forEach(req => {
      if (req.returnedAtUtc) {
        actions.push({
          icon: 'check_circle',
          iconColor: '#16a34a',
          type: 'returned',
          text: `${req.equipmentName} returned by ${req.userFullName}`,
          timeAgo: formatTimeAgo(req.returnedAtUtc),
          timestamp: new Date(req.returnedAtUtc).getTime(),
        });
      }

      if (isOverdue(req)) {
        actions.push({
          icon: 'error',
          iconColor: '#dc2626',
          type: 'overdue',
          text: `OVERDUE: ${req.equipmentName} — ${req.userFullName}`,
          timeAgo: formatTimeAgo(req.requestedToUtc),
          timestamp: new Date(req.requestedToUtc).getTime(),
        });
      }

      if (req.checkedOutAtUtc) {
        const s = req.status.replace(/\s/g, '').toLowerCase();
        if (s === 'checkedout') {
          actions.push({
            icon: 'shopping_cart',
            iconColor: '#2563eb',
            type: 'checkedout',
            text: `${req.equipmentName} checked out by ${req.userFullName}`,
            timeAgo: formatTimeAgo(req.checkedOutAtUtc),
            timestamp: new Date(req.checkedOutAtUtc).getTime(),
          });
        }
      }

      if (req.reviewedAtUtc) {
        const s = req.status.replace(/\s/g, '').toLowerCase();
        if (s === 'approved') {
          actions.push({
            icon: 'thumb_up',
            iconColor: '#059669',
            type: 'approved',
            text: `${req.equipmentName} approved for ${req.userFullName}`,
            timeAgo: formatTimeAgo(req.reviewedAtUtc),
            timestamp: new Date(req.reviewedAtUtc).getTime(),
          });
        } else if (s === 'rejected') {
          actions.push({
            icon: 'thumb_down',
            iconColor: '#dc2626',
            type: 'rejected',
            text: `${req.equipmentName} rejected for ${req.userFullName}`,
            timeAgo: formatTimeAgo(req.reviewedAtUtc),
            timestamp: new Date(req.reviewedAtUtc).getTime(),
          });
        }
      }
    });

    return actions.sort((a, b) => b.timestamp - a.timestamp);
  }, [formatTimeAgo, isOverdue]);

  useEffect(() => {
    apiFetch(`${API_BASE}/api/requests/all?page=1&pageSize=100`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { items: RequestData[] }) => {
        setAllActions(buildActions(data.items ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildActions]);

  const filtered = typeFilter === 'all'
    ? allActions
    : allActions.filter(a => a.type === typeFilter);

  if (authLoading || loading) {
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

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon className={styles.emptyIcon}>history</Icon>
            <p>{allActions.length === 0 ? 'No actions recorded yet.' : 'No actions match this filter.'}</p>
          </div>
        ) : (
          <div className={styles.actionsList}>
            {filtered.map((action, i) => (
              <div key={i} className={styles.actionItem}>
                <div className={styles.iconWrap}>
                  <Icon style={{ color: action.iconColor, fontSize: 22 }}>{action.icon}</Icon>
                </div>
                <span className={styles.actionText}>{action.text}</span>
                <span className={styles.actionTime}>{action.timeAgo}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          {filtered.length} action{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminLatestActions;
